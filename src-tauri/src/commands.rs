//! 프론트엔드에서 호출하는 Tauri 커맨드.
//! 소스 종류에 관계없이 `ContentProvider` 트레잇으로 디스패치한다.

use base64::Engine;
use tauri_plugin_dialog::DialogExt;

use crate::providers::{provider_for, FileContent, SourceRef, TreeEntry};

/// 폴더 선택 다이얼로그. 선택한 절대 경로를 반환(취소 시 None).
#[tauri::command]
pub async fn pick_folder(app: tauri::AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .blocking_pick_folder()
        .map(|p| p.to_string())
}

/// 단일 마크다운 파일 선택 다이얼로그. 선택한 절대 경로를 반환(취소 시 None).
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
pub async fn source_list_dir(source: SourceRef, path: String) -> Result<Vec<TreeEntry>, String> {
    let provider = provider_for(&source.kind)?;
    provider.list_dir(&source, &path).await
}

/// 텍스트 파일 읽기.
#[tauri::command]
pub async fn source_read_file(source: SourceRef, path: String) -> Result<FileContent, String> {
    let provider = provider_for(&source.kind)?;
    provider.read_file(&source, &path).await
}

/// 이미지 등 에셋을 data URL 문자열로 반환(마크다운 내 상대 이미지 표시용).
#[tauri::command]
pub async fn source_read_asset(source: SourceRef, path: String) -> Result<String, String> {
    let provider = provider_for(&source.kind)?;
    let bytes = provider.read_asset(&source, &path).await?;
    let mime = mime_from_path(&path);
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{mime};base64,{b64}"))
}

/// 내보내기 등으로 사용자가 선택한 임의 경로에 텍스트를 저장한다.
#[tauri::command]
pub async fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| e.to_string())
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
