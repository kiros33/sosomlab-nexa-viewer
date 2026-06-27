//! 프론트엔드에서 호출하는 Tauri 커맨드.
//! 소스 종류에 관계없이 `ContentProvider` 트레잇으로 디스패치한다.

use std::path::PathBuf;

use base64::Engine;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

use crate::providers::github::{self, GithubProvider};
use crate::providers::local::LocalProvider;
use crate::providers::{ContentProvider, FileContent, SourceRef, TreeEntry};
use crate::secrets;

/// 앱 로컬 데이터 디렉터리(자격 증명 저장 위치).
fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_local_data_dir().map_err(|e| e.to_string())
}

/// 소스 종류에 맞는 provider 생성. github는 저장된 토큰을 주입한다.
fn provider_for(
    app: &tauri::AppHandle,
    kind: &str,
) -> Result<Box<dyn ContentProvider>, String> {
    match kind {
        "local" => Ok(Box::new(LocalProvider)),
        "github" => {
            let token = data_dir(app).ok().and_then(|d| secrets::load_github_token(&d));
            Ok(Box::new(GithubProvider::new(token)))
        }
        other => Err(format!("지원하지 않는 소스 종류입니다: {other}")),
    }
}

/// 폴더 선택 다이얼로그.
#[tauri::command]
pub async fn pick_folder(app: tauri::AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .blocking_pick_folder()
        .map(|p| p.to_string())
}

/// 단일 마크다운 파일 선택 다이얼로그.
#[tauri::command]
pub async fn pick_markdown_file(app: tauri::AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown", "mdx", "txt"])
        .blocking_pick_file()
        .map(|p| p.to_string())
}

/// 디렉터리 한 단계 나열.
#[tauri::command]
pub async fn source_list_dir(
    app: tauri::AppHandle,
    source: SourceRef,
    path: String,
) -> Result<Vec<TreeEntry>, String> {
    let provider = provider_for(&app, &source.kind)?;
    provider.list_dir(&source, &path).await
}

/// 텍스트 파일 읽기.
#[tauri::command]
pub async fn source_read_file(
    app: tauri::AppHandle,
    source: SourceRef,
    path: String,
) -> Result<FileContent, String> {
    let provider = provider_for(&app, &source.kind)?;
    provider.read_file(&source, &path).await
}

/// 이미지 등 에셋을 data URL 문자열로 반환.
#[tauri::command]
pub async fn source_read_asset(
    app: tauri::AppHandle,
    source: SourceRef,
    path: String,
) -> Result<String, String> {
    let provider = provider_for(&app, &source.kind)?;
    let bytes = provider.read_asset(&source, &path).await?;
    let mime = mime_from_path(&path);
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{mime};base64,{b64}"))
}

/// 현재 파일의 버전(원격 sha 등) 조회 — 갱신 감지용.
#[tauri::command]
pub async fn source_latest_version(
    app: tauri::AppHandle,
    source: SourceRef,
    path: String,
) -> Result<Option<String>, String> {
    let provider = provider_for(&app, &source.kind)?;
    provider.latest_version(&source, &path).await
}

/// 브랜치 목록(원격).
#[tauri::command]
pub async fn source_list_branches(
    app: tauri::AppHandle,
    source: SourceRef,
) -> Result<Vec<String>, String> {
    let provider = provider_for(&app, &source.kind)?;
    provider.list_branches(&source).await
}

/// 내보내기 등으로 사용자가 선택한 임의 경로에 텍스트를 저장한다.
#[tauri::command]
pub async fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| e.to_string())
}

// ===== GitHub 인증 =====

/// PAT로 로그인: 검증 → 로그인명 확인 → 암호화 저장. 로그인명 반환.
#[tauri::command]
pub async fn github_login(app: tauri::AppHandle, token: String) -> Result<String, String> {
    let login = github::fetch_login(token.trim()).await?;
    let dir = data_dir(&app)?;
    secrets::save_github(&dir, &login, token.trim())?;
    Ok(login)
}

/// 현재 로그인 상태(로그인명) 반환.
#[tauri::command]
pub async fn github_status(app: tauri::AppHandle) -> Result<Option<String>, String> {
    Ok(data_dir(&app).ok().and_then(|d| secrets::load_github_login(&d)))
}

/// 로그아웃(저장된 자격 증명 삭제).
#[tauri::command]
pub async fn github_logout(app: tauri::AppHandle) -> Result<(), String> {
    let dir = data_dir(&app)?;
    secrets::clear_github(&dir)
}

/// 로그인 계정이 접근 가능한 저장소 목록.
#[tauri::command]
pub async fn github_list_repos(
    app: tauri::AppHandle,
) -> Result<Vec<github::RepoInfo>, String> {
    let dir = data_dir(&app)?;
    let token = secrets::load_github_token(&dir).ok_or("로그인이 필요합니다")?;
    github::list_user_repos(&token).await
}

/// 저장소 기본 브랜치 조회.
#[tauri::command]
pub async fn github_default_branch(
    app: tauri::AppHandle,
    owner_repo: String,
) -> Result<String, String> {
    let token = data_dir(&app).ok().and_then(|d| secrets::load_github_token(&d));
    github::default_branch(token.as_deref(), &owner_repo).await
}

/// 확장자로 간단히 MIME 타입을 추정한다.
fn mime_from_path(path: &str) -> &'static str {
    let ext = path.rsplit('.').next().unwrap_or("").to_lowercase();
    match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "avif" => "image/avif",
        _ => "application/octet-stream",
    }
}
