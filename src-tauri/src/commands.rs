//! 프론트엔드에서 호출하는 Tauri 커맨드.
//! 소스 종류에 관계없이 `ContentProvider` 트레잇으로 디스패치한다.

use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

use base64::Engine;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

use crate::providers::github::{self, GithubProvider};
use crate::providers::local::LocalProvider;
use crate::providers::{ContentProvider, FileContent, SourceRef, TreeEntry};
use crate::{access, secrets};

/// 앱 로컬 데이터 디렉터리(자격 증명 저장 위치).
fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_local_data_dir().map_err(|e| e.to_string())
}

/// 소스 종류에 맞는 provider 생성. github는 저장된 토큰을 주입한다.
/// local은 사용자가 직접 연 폴더(허용 목록)인지 먼저 확인한다.
fn provider_for(
    app: &tauri::AppHandle,
    source: &SourceRef,
) -> Result<Box<dyn ContentProvider>, String> {
    match source.kind.as_str() {
        "local" => {
            let dir = data_dir(app)?;
            if !access::is_allowed(&dir, Path::new(&source.root)) {
                return Err("이 폴더를 읽을 권한이 없습니다 — 폴더를 다시 열어 주세요".into());
            }
            Ok(Box::new(LocalProvider))
        }
        "github" => {
            let token = data_dir(app).ok().and_then(|d| secrets::load_github_token(&d));
            Ok(Box::new(GithubProvider::new(token)))
        }
        other => Err(format!("지원하지 않는 소스 종류입니다: {other}")),
    }
}

/// 실행 시 외부 인자로 전달된 시작 대상(파일/폴더).
/// - 폴더면: `root`=폴더 절대경로, `file`=None
/// - 파일이면: `root`=상위 폴더 절대경로, `file`=파일명(root 기준 상대)
#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupTarget {
    pub root: String,
    pub file: Option<String>,
}

/// 시작 대상의 폴더를 접근 허용 목록에 넣는다(argv·`Opened`는 사용자가 직접 연 것).
pub fn grant_target(app: &tauri::AppHandle, target: &StartupTarget) {
    if let Ok(dir) = data_dir(app) {
        access::grant(&dir, Path::new(&target.root));
    }
}

/// macOS `Opened`(파일 열기 Apple Event)로 전달된 열기 대상을 보관하는 **전역** 버퍼.
///
/// 콜드스타트(앱이 파일 열기로 실행)에서는 프론트엔드 리스너가 붙기 전에 이벤트가 도착한다.
/// 런루프 클로저에서 Tauri managed state 접근이 불안정할 수 있어, 의존성 없는 전역 버퍼에
/// 쌓아 두었다가 마운트 시 `take_opened_targets`로 비운다(drain).
fn opened_buffer() -> &'static Mutex<Vec<StartupTarget>> {
    static BUF: OnceLock<Mutex<Vec<StartupTarget>>> = OnceLock::new();
    BUF.get_or_init(|| Mutex::new(Vec::new()))
}

/// 런루프(`RunEvent::Opened`)에서 받은 열기 대상을 전역 버퍼에 적재한다.
pub fn push_opened(targets: Vec<StartupTarget>) {
    if let Ok(mut g) = opened_buffer().lock() {
        g.extend(targets);
    }
}

/// 임의의 경로 하나를 시작 대상으로 해석한다(존재하지 않으면 `None`).
/// argv·macOS `Opened` 양쪽에서 공용으로 쓴다.
pub fn resolve_target(path: &str) -> Option<StartupTarget> {
    let abs = std::path::absolute(path).unwrap_or_else(|_| PathBuf::from(path));
    if !abs.exists() {
        return None;
    }
    if abs.is_dir() {
        Some(StartupTarget {
            root: abs.to_string_lossy().to_string(),
            file: None,
        })
    } else {
        let parent = abs.parent()?.to_string_lossy().to_string();
        let name = abs.file_name()?.to_string_lossy().to_string();
        Some(StartupTarget {
            root: parent,
            file: Some(name),
        })
    }
}

/// 외부 인자(CLI 인자 / "연결 프로그램" / 파일 끌어다 놓기)로 받은 경로를 해석한다.
///
/// `argv[0]`(실행 파일)을 건너뛰고, 플래그(`-…`)가 아니면서 **실제로 존재하는**
/// 첫 경로를 시작 대상으로 사용한다. 인자가 없거나 존재하지 않으면 `None`.
/// 데스크톱(특히 Windows·포터블)에서 `Viewer.exe "C:\docs\guide.md"` 형태로 동작.
/// (macOS Finder 더블클릭/"다음으로 열기"는 argv가 아니라 `Opened` 이벤트로 오므로
/// 그쪽은 `take_opened_targets` + `open-targets` 이벤트로 처리한다.)
#[tauri::command]
pub fn startup_target(app: tauri::AppHandle) -> Option<StartupTarget> {
    // args_os: UTF-8이 아닌 인자(예: Latin-1 파일명)에서 panic하지 않도록
    let arg = std::env::args_os()
        .skip(1)
        .map(PathBuf::from)
        .find(|a| !a.to_string_lossy().starts_with('-') && a.exists())?;
    let target = resolve_target(&arg.to_string_lossy())?;
    grant_target(&app, &target);
    Some(target)
}

/// 이전 버전에서 등록한 로컬 폴더를 허용 목록으로 들여온다 — 목록 파일이 없을 때 **한 번만** 동작.
#[tauri::command]
pub fn migrate_local_roots(app: tauri::AppHandle, roots: Vec<String>) -> Result<bool, String> {
    Ok(access::migrate(&data_dir(&app)?, &roots))
}

/// macOS `Opened` 콜드스타트 버퍼를 비워서 반환한다(없으면 빈 배열).
/// 다른 OS에서는 항상 빈 배열.
#[tauri::command]
pub fn take_opened_targets() -> Vec<StartupTarget> {
    match opened_buffer().lock() {
        Ok(mut g) => std::mem::take(&mut *g),
        Err(_) => Vec::new(),
    }
}

/// 폴더 선택 다이얼로그.
#[tauri::command]
pub async fn pick_folder(app: tauri::AppHandle) -> Option<String> {
    let picked = app.dialog().file().blocking_pick_folder()?.into_path().ok()?;
    if let Ok(dir) = data_dir(&app) {
        access::grant(&dir, &picked);
    }
    Some(picked.to_string_lossy().into_owned())
}

/// 단일 마크다운 파일 선택 다이얼로그.
#[tauri::command]
pub async fn pick_markdown_file(app: tauri::AppHandle) -> Option<String> {
    let picked = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown", "mdx", "txt"])
        .blocking_pick_file()?
        .into_path()
        .ok()?;
    if let (Ok(dir), Some(parent)) = (data_dir(&app), picked.parent()) {
        access::grant(&dir, parent);
    }
    Some(picked.to_string_lossy().into_owned())
}

/// 디렉터리 한 단계 나열.
#[tauri::command]
pub async fn source_list_dir(
    app: tauri::AppHandle,
    source: SourceRef,
    path: String,
) -> Result<Vec<TreeEntry>, String> {
    let provider = provider_for(&app, &source)?;
    provider.list_dir(&source, &path).await
}

/// 텍스트 파일 읽기.
#[tauri::command]
pub async fn source_read_file(
    app: tauri::AppHandle,
    source: SourceRef,
    path: String,
) -> Result<FileContent, String> {
    let provider = provider_for(&app, &source)?;
    provider.read_file(&source, &path).await
}

/// 이미지 등 에셋을 data URL 문자열로 반환.
#[tauri::command]
pub async fn source_read_asset(
    app: tauri::AppHandle,
    source: SourceRef,
    path: String,
) -> Result<String, String> {
    let provider = provider_for(&app, &source)?;
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
    let provider = provider_for(&app, &source)?;
    provider.latest_version(&source, &path).await
}

/// 브랜치 목록(원격).
#[tauri::command]
pub async fn source_list_branches(
    app: tauri::AppHandle,
    source: SourceRef,
) -> Result<Vec<String>, String> {
    let provider = provider_for(&app, &source)?;
    provider.list_branches(&source).await
}

/// 저장 다이얼로그를 **백엔드에서** 띄우고, 사용자가 고른 경로에만 텍스트를 쓴다.
/// (웹뷰가 임의 경로를 지정해 쓰지 못하게) 반환 = 저장했는지(취소 시 false).
#[tauri::command]
pub async fn save_text_file(
    app: tauri::AppHandle,
    default_name: String,
    filter_name: String,
    extensions: Vec<String>,
    contents: String,
) -> Result<bool, String> {
    let exts: Vec<&str> = extensions.iter().map(String::as_str).collect();
    let Some(picked) = app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter(&filter_name, &exts)
        .blocking_save_file()
    else {
        return Ok(false);
    };
    let path = picked.into_path().map_err(|e| e.to_string())?;
    std::fs::write(&path, contents).map_err(|e| e.to_string())?;
    Ok(true)
}

// ===== GitHub 인증 =====

/// 로그인 결과 — `persisted=false`면 OS 키체인을 쓸 수 없어 이번 실행 동안만 유지된다.
#[derive(serde::Serialize)]
pub struct LoginResult {
    login: String,
    persisted: bool,
}

/// PAT로 로그인: 검증 → 로그인명 확인 → OS 키체인 저장.
#[tauri::command]
pub async fn github_login(app: tauri::AppHandle, token: String) -> Result<LoginResult, String> {
    let login = github::fetch_login(token.trim()).await?;
    let dir = data_dir(&app)?;
    let persisted = secrets::save_github(&dir, &login, token.trim())?;
    Ok(LoginResult { login, persisted })
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
