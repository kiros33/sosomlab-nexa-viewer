//! GitHub 원격 provider (REST contents API).

use base64::Engine;
use serde_json::Value;

use super::{ContentProvider, FileContent, ProviderResult, SourceRef, TreeEntry};

const API: &str = "https://api.github.com";
const UA: &str = "NexaMarkdownViewer";

pub struct GithubProvider {
    client: reqwest::Client,
    token: Option<String>,
}

impl GithubProvider {
    pub fn new(token: Option<String>) -> Self {
        Self {
            client: reqwest::Client::new(),
            token,
        }
    }

    fn req(&self, url: &str) -> reqwest::RequestBuilder {
        let mut rb = self
            .client
            .get(url)
            .header("User-Agent", UA)
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28");
        if let Some(t) = &self.token {
            rb = rb.header("Authorization", format!("Bearer {t}"));
        }
        rb
    }

    async fn get_json(&self, url: &str) -> ProviderResult<Value> {
        let resp = self.req(url).send().await.map_err(|e| e.to_string())?;
        let status = resp.status();
        let body = resp.text().await.map_err(|e| e.to_string())?;
        if !status.is_success() {
            // GitHub 오류 메시지 추출
            let msg = serde_json::from_str::<Value>(&body)
                .ok()
                .and_then(|v| v.get("message").and_then(|m| m.as_str()).map(String::from))
                .unwrap_or_else(|| body.clone());
            return Err(format!("GitHub {}: {}", status.as_u16(), msg));
        }
        serde_json::from_str(&body).map_err(|e| e.to_string())
    }

    /// contents API URL 구성. root="owner/repo", path는 root 기준 상대.
    fn contents_url(ctx: &SourceRef, path: &str) -> String {
        let p = path.trim_start_matches('/');
        let mut url = format!("{API}/repos/{}/contents/{}", ctx.root, p);
        if let Some(r) = &ctx.git_ref {
            if !r.is_empty() {
                url.push_str(&format!("?ref={r}"));
            }
        }
        url
    }
}

#[async_trait::async_trait]
impl ContentProvider for GithubProvider {
    fn kind(&self) -> &'static str {
        "github"
    }

    async fn list_dir(&self, ctx: &SourceRef, path: &str) -> ProviderResult<Vec<TreeEntry>> {
        let v = self.get_json(&Self::contents_url(ctx, path)).await?;
        let arr = v.as_array().ok_or("디렉터리가 아닙니다")?;
        let mut entries: Vec<TreeEntry> = arr
            .iter()
            .filter_map(|e| {
                let name = e.get("name")?.as_str()?.to_string();
                let path = e.get("path")?.as_str()?.to_string();
                let is_dir = e.get("type")?.as_str()? == "dir";
                Some(TreeEntry { name, path, is_dir })
            })
            .collect();
        entries.sort_by(|a, b| {
            b.is_dir
                .cmp(&a.is_dir)
                .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });
        Ok(entries)
    }

    async fn read_file(&self, ctx: &SourceRef, path: &str) -> ProviderResult<FileContent> {
        let v = self.get_json(&Self::contents_url(ctx, path)).await?;
        let sha = v.get("sha").and_then(|s| s.as_str()).map(String::from);
        let encoding = v.get("encoding").and_then(|s| s.as_str()).unwrap_or("");
        let text = if encoding == "base64" {
            let raw = v.get("content").and_then(|c| c.as_str()).unwrap_or("");
            let cleaned: String = raw.chars().filter(|c| !c.is_whitespace()).collect();
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(cleaned)
                .map_err(|e| e.to_string())?;
            String::from_utf8(bytes).map_err(|e| e.to_string())?
        } else {
            // 큰 파일 등: download_url 원문 사용
            let dl = v
                .get("download_url")
                .and_then(|d| d.as_str())
                .ok_or("파일 내용을 가져올 수 없습니다")?;
            self.req(dl)
                .send()
                .await
                .map_err(|e| e.to_string())?
                .text()
                .await
                .map_err(|e| e.to_string())?
        };
        Ok(FileContent {
            path: path.to_string(),
            text,
            version: sha,
        })
    }

    async fn read_asset(&self, ctx: &SourceRef, path: &str) -> ProviderResult<Vec<u8>> {
        let v = self.get_json(&Self::contents_url(ctx, path)).await?;
        let encoding = v.get("encoding").and_then(|s| s.as_str()).unwrap_or("");
        if encoding == "base64" {
            let raw = v.get("content").and_then(|c| c.as_str()).unwrap_or("");
            let cleaned: String = raw.chars().filter(|c| !c.is_whitespace()).collect();
            return base64::engine::general_purpose::STANDARD
                .decode(cleaned)
                .map_err(|e| e.to_string());
        }
        let dl = v
            .get("download_url")
            .and_then(|d| d.as_str())
            .ok_or("에셋을 가져올 수 없습니다")?;
        let bytes = self
            .req(dl)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .bytes()
            .await
            .map_err(|e| e.to_string())?;
        Ok(bytes.to_vec())
    }

    async fn list_branches(&self, ctx: &SourceRef) -> ProviderResult<Vec<String>> {
        let url = format!("{API}/repos/{}/branches?per_page=100", ctx.root);
        let v = self.get_json(&url).await?;
        let arr = v.as_array().ok_or("브랜치 목록을 가져올 수 없습니다")?;
        Ok(arr
            .iter()
            .filter_map(|b| b.get("name")?.as_str().map(String::from))
            .collect())
    }

    async fn latest_version(&self, ctx: &SourceRef, path: &str) -> ProviderResult<Option<String>> {
        let v = self.get_json(&Self::contents_url(ctx, path)).await?;
        Ok(v.get("sha").and_then(|s| s.as_str()).map(String::from))
    }
}

/// PAT 검증 → 로그인명 반환. 기본 브랜치 조회 등 인증 유틸.
pub async fn fetch_login(token: &str) -> ProviderResult<String> {
    let p = GithubProvider::new(Some(token.to_string()));
    let v = p.get_json(&format!("{API}/user")).await?;
    v.get("login")
        .and_then(|l| l.as_str())
        .map(String::from)
        .ok_or_else(|| "로그인 정보를 확인할 수 없습니다".to_string())
}

/// 인증 계정이 접근 가능한 저장소 목록(최근 갱신순).
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoInfo {
    pub full_name: String,
    pub is_private: bool,
    pub default_branch: String,
}

pub async fn list_user_repos(token: &str) -> ProviderResult<Vec<RepoInfo>> {
    let p = GithubProvider::new(Some(token.to_string()));
    let mut out = Vec::new();
    // 최대 3페이지(300개)까지
    for page in 1..=3 {
        let url = format!(
            "{API}/user/repos?per_page=100&page={page}&sort=updated&affiliation=owner,collaborator,organization_member"
        );
        let v = p.get_json(&url).await?;
        let arr = match v.as_array() {
            Some(a) if !a.is_empty() => a.clone(),
            _ => break,
        };
        for r in &arr {
            if let Some(full_name) = r.get("full_name").and_then(|s| s.as_str()) {
                out.push(RepoInfo {
                    full_name: full_name.to_string(),
                    is_private: r.get("private").and_then(|b| b.as_bool()).unwrap_or(false),
                    default_branch: r
                        .get("default_branch")
                        .and_then(|b| b.as_str())
                        .unwrap_or("main")
                        .to_string(),
                });
            }
        }
        if arr.len() < 100 {
            break;
        }
    }
    Ok(out)
}

pub async fn default_branch(token: Option<&str>, owner_repo: &str) -> ProviderResult<String> {
    let p = GithubProvider::new(token.map(String::from));
    let v = p.get_json(&format!("{API}/repos/{owner_repo}")).await?;
    Ok(v.get("default_branch")
        .and_then(|b| b.as_str())
        .unwrap_or("main")
        .to_string())
}
