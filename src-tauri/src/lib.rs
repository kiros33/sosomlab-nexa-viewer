mod commands;
mod providers;
mod secrets;

/// 앱 목적 요약 — macOS About 패널(comments)과 메뉴 등에 노출.
const APP_NAME: &str = "Nexa Markdown Viewer";
const APP_DESCRIPTION: &str =
    "GitHub 스타일 Markdown 뷰어 — 로컬·GitHub 등 저장소의 문서를 읽고, 탐색·목차·내보내기까지. by SosomLab";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // macOS: About 패널에 아이콘 + 요약 설명이 보이도록 커스텀 메뉴 구성
            #[cfg(target_os = "macos")]
            {
                use tauri::menu::{AboutMetadata, MenuBuilder, SubmenuBuilder};

                let about = AboutMetadata {
                    name: Some(APP_NAME.into()),
                    version: Some(env!("CARGO_PKG_VERSION").into()),
                    authors: Some(vec!["SosomLab".into()]),
                    comments: Some(APP_DESCRIPTION.into()),
                    copyright: Some("© 2026 SosomLab".into()),
                    website: Some("https://github.com/kiros33/sosomlab-nexa-viewer".into()),
                    website_label: Some("GitHub".into()),
                    icon: app.default_window_icon().cloned(),
                    ..Default::default()
                };

                let app_menu = SubmenuBuilder::new(app, APP_NAME)
                    .about(Some(about))
                    .separator()
                    .services()
                    .separator()
                    .hide()
                    .hide_others()
                    .show_all()
                    .separator()
                    .quit()
                    .build()?;

                let edit_menu = SubmenuBuilder::new(app, "Edit")
                    .undo()
                    .redo()
                    .separator()
                    .cut()
                    .copy()
                    .paste()
                    .select_all()
                    .build()?;

                let window_menu = SubmenuBuilder::new(app, "Window")
                    .minimize()
                    .separator()
                    .close_window()
                    .build()?;

                let menu = MenuBuilder::new(app)
                    .items(&[&app_menu, &edit_menu, &window_menu])
                    .build()?;
                app.set_menu(menu)?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::startup_target,
            commands::pick_folder,
            commands::pick_markdown_file,
            commands::source_list_dir,
            commands::source_read_file,
            commands::source_read_asset,
            commands::source_latest_version,
            commands::source_list_branches,
            commands::write_text_file,
            commands::github_login,
            commands::github_status,
            commands::github_logout,
            commands::github_default_branch,
            commands::github_list_repos,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
