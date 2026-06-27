//! 콘텐츠 소스 추상화 계층.
//!
//! 로컬 파일 시스템, GitHub, (추후) Bitbucket/GitLab 등 서로 다른 출처를
//! 동일한 인터페이스(`ContentProvider`)로 다룬다. UI/커맨드 계층은 구현체를
//! 몰라도 되며, 신규 소스는 트레잇 구현 + `provider_for` 분기 추가만으로 끼워진다.

use serde::{Deserialize, Serialize};

pub mod github;
pub mod local;

/// 어떤 소스의 어느 위치를 가리키는지 식별하는 컨텍스트.
/// - local: `root`는 열린 폴더의 절대 경로.
/// - remote(github 등): `root`는 "owner/repo", `git_ref`는 브랜치/태그/커밋.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceRef {
    pub kind: String,
    pub root: String,
    #[serde(default)]
    pub git_ref: Option<String>,
}

/// 디렉터리(트리) 한 항목.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TreeEntry {
    pub name: String,
    /// root 기준 상대 경로(슬래시 구분).
    pub path: String,
    pub is_dir: bool,
}

/// 파일 텍스트 내용.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContent {
    pub path: String,
    pub text: String,
    /// 버전 식별자(원격: blob sha 등). 갱신 감지에 사용. 로컬은 None.
    #[serde(default)]
    pub version: Option<String>,
}

pub type ProviderResult<T> = Result<T, String>;

#[async_trait::async_trait]
pub trait ContentProvider: Send + Sync {
    /// `path`(root 기준 상대 경로) 디렉터리의 한 단계 항목들을 나열.
    async fn list_dir(&self, ctx: &SourceRef, path: &str) -> ProviderResult<Vec<TreeEntry>>;

    /// 텍스트 파일을 읽어 내용 반환.
    async fn read_file(&self, ctx: &SourceRef, path: &str) -> ProviderResult<FileContent>;

    /// 이미지 등 바이너리 에셋을 바이트로 반환.
    async fn read_asset(&self, ctx: &SourceRef, path: &str) -> ProviderResult<Vec<u8>>;

    /// 원격 소스 전용. 로컬은 빈 목록(기본 구현).
    async fn list_branches(&self, _ctx: &SourceRef) -> ProviderResult<Vec<String>> {
        Ok(vec![])
    }

    /// 현재 파일의 버전 식별자(갱신 감지용). 로컬은 None(기본 구현).
    async fn latest_version(&self, _ctx: &SourceRef, _path: &str) -> ProviderResult<Option<String>> {
        Ok(None)
    }
}
