mod commands;
mod providers;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::pick_folder,
            commands::pick_markdown_file,
            commands::source_list_dir,
            commands::source_read_file,
            commands::source_read_asset,
            commands::write_text_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
