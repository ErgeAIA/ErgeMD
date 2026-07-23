pub mod commands;
mod db;

use db::models::{ReadingProgress, RecentFile};
use sqlx::SqlitePool;
use std::sync::Arc;
use tauri::{Emitter, Listener, State};
use tokio::sync::Mutex;

struct AppState {
    db_pool: Arc<Mutex<Option<SqlitePool>>>,
    pending_file: Arc<Mutex<Option<String>>>,
}

#[tauri::command]
async fn init_database(state: State<'_, AppState>) -> Result<(), String> {
    let pool = db::init_db().await.map_err(|e| e.to_string())?;
    let mut guard = state.db_pool.lock().await;
    *guard = Some(pool);
    Ok(())
}

#[tauri::command]
async fn get_reading_progress(
    state: State<'_, AppState>,
    file_path: String,
) -> Result<Option<ReadingProgress>, String> {
    let pool = {
        let guard = state.db_pool.lock().await;
        guard.as_ref().ok_or("Database not initialized")?.clone()
    };

    let result = sqlx::query_as::<_, ReadingProgress>(
        "SELECT file_path, scroll_percentage, last_read_at, word_count FROM reading_progress WHERE file_path = ?"
    )
    .bind(&file_path)
    .fetch_optional(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
async fn save_reading_progress(
    state: State<'_, AppState>,
    file_path: String,
    scroll_percentage: f64,
    word_count: i64,
) -> Result<(), String> {
    let pool = {
        let guard = state.db_pool.lock().await;
        guard.as_ref().ok_or("Database not initialized")?.clone()
    };
    let now = chrono::Utc::now().timestamp();

    sqlx::query(
        "INSERT INTO reading_progress (file_path, scroll_percentage, last_read_at, word_count) VALUES (?, ?, ?, ?) ON CONFLICT(file_path) DO UPDATE SET scroll_percentage = ?, last_read_at = ?, word_count = ?"
    )
    .bind(&file_path)
    .bind(scroll_percentage)
    .bind(now)
    .bind(word_count)
    .bind(scroll_percentage)
    .bind(now)
    .bind(word_count)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_recent_files(
    state: State<'_, AppState>,
    limit: Option<i64>,
) -> Result<Vec<RecentFile>, String> {
    let pool = {
        let guard = state.db_pool.lock().await;
        guard.as_ref().ok_or("Database not initialized")?.clone()
    };
    let limit = limit.unwrap_or(10);

    let results = sqlx::query_as::<_, RecentFile>(
        "SELECT file_path, file_name, opened_at FROM recent_files ORDER BY opened_at DESC LIMIT ?",
    )
    .bind(limit)
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(results)
}

#[tauri::command]
async fn add_recent_file(
    state: State<'_, AppState>,
    file_path: String,
    file_name: String,
) -> Result<(), String> {
    let pool = {
        let guard = state.db_pool.lock().await;
        guard.as_ref().ok_or("Database not initialized")?.clone()
    };
    let now = chrono::Utc::now().timestamp();

    sqlx::query(
        "INSERT INTO recent_files (file_path, file_name, opened_at) VALUES (?, ?, ?) ON CONFLICT(file_path) DO UPDATE SET opened_at = ?"
    )
    .bind(&file_path)
    .bind(&file_name)
    .bind(now)
    .bind(now)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn delete_recent_file(
    state: State<'_, AppState>,
    file_path: String,
) -> Result<(), String> {
    let pool = {
        let guard = state.db_pool.lock().await;
        guard.as_ref().ok_or("Database not initialized")?.clone()
    };

    sqlx::query("DELETE FROM recent_files WHERE file_path = ?")
        .bind(&file_path)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn clear_recent_files(state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let guard = state.db_pool.lock().await;
        guard.as_ref().ok_or("Database not initialized")?.clone()
    };

    sqlx::query("DELETE FROM recent_files")
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn delete_reading_progress(
    state: State<'_, AppState>,
    file_path: String,
) -> Result<(), String> {
    let pool = {
        let guard = state.db_pool.lock().await;
        guard.as_ref().ok_or("Database not initialized")?.clone()
    };

    sqlx::query("DELETE FROM reading_progress WHERE file_path = ?")
        .bind(&file_path)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn clear_all_reading_progress(state: State<'_, AppState>) -> Result<(), String> {
    let pool = {
        let guard = state.db_pool.lock().await;
        guard.as_ref().ok_or("Database not initialized")?.clone()
    };

    sqlx::query("DELETE FROM reading_progress")
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_setting(state: State<'_, AppState>, key: String) -> Result<Option<String>, String> {
    let pool = {
        let guard = state.db_pool.lock().await;
        guard.as_ref().ok_or("Database not initialized")?.clone()
    };

    let result: Option<(String,)> = sqlx::query_as("SELECT value FROM settings WHERE key = ?")
        .bind(&key)
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.map(|r| r.0))
}

#[tauri::command]
async fn save_setting(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    let pool = {
        let guard = state.db_pool.lock().await;
        guard.as_ref().ok_or("Database not initialized")?.clone()
    };

    sqlx::query(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
    )
    .bind(&key)
    .bind(&value)
    .bind(&value)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_pending_file(state: State<'_, AppState>) -> Result<Option<String>, String> {
    let mut guard = state.pending_file.lock().await;
    let file_path = guard.take();
    Ok(file_path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let pending_file: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        // 单实例插件：已运行时新进程启动参数会转发给已运行实例
        // 用于 Windows/Linux 热启动场景（右键 MD 文件 → 用 ErgeMD 打开）
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // argv[0] 是 exe 路径，argv[1..] 是文件路径
            for arg in argv.iter().skip(1) {
                let path = std::path::Path::new(arg);
                if path.exists()
                    && path.extension().map_or(false, |ext| {
                        ext.eq_ignore_ascii_case("md") || ext.eq_ignore_ascii_case("markdown")
                    })
                {
                    // 热启动场景：前端已加载，emit 可被监听到
                    let _ = app.emit("file-opened", arg);
                    break;
                }
            }
        }))
        .manage(AppState {
            db_pool: Arc::new(Mutex::new(None)),
            pending_file: pending_file.clone(),
        })
        .invoke_handler(tauri::generate_handler![
            init_database,
            get_reading_progress,
            save_reading_progress,
            get_recent_files,
            add_recent_file,
            delete_recent_file,
            clear_recent_files,
            delete_reading_progress,
            clear_all_reading_progress,
            get_setting,
            save_setting,
            get_pending_file,
            commands::read_file,
            commands::write_file,
            commands::write_binary_file,
            commands::scan_workspace,
            commands::window::new_window,
            commands::reveal_in_explorer,
            commands::fonts::get_system_fonts,
            commands::resolve_image_path,
            commands::read_image_as_data_url,
            commands::fetch_remote_image_as_data_url,
            commands::pdf::export_pdf,
            commands::update::check_update,
        ])
        .setup(move |app| {
            let handle = app.handle().clone();
            let pending = pending_file.clone();

            // Windows/Linux 冷启动：从命令行参数中提取文件路径
            // 当用户右键 MD 文件选择"使用 ErgeMD 打开"时，系统将文件路径作为命令行参数传递
            // 使用 args_os() 以兼容非 UTF-8 路径（避免 panic）
            for arg in std::env::args_os().skip(1) {
                let path = std::path::Path::new(&arg);
                if path.exists()
                    && path
                        .extension()
                        .map_or(false, |ext| ext.eq_ignore_ascii_case("md") || ext.eq_ignore_ascii_case("markdown"))
                {
                    // 转 String 失败时跳过该参数（非 UTF-8 路径暂不支持，避免 panic）
                    if let Ok(fp) = arg.into_string() {
                        let pending_clone = pending.clone();
                        tauri::async_runtime::block_on(async {
                            let mut guard = pending_clone.lock().await;
                            *guard = Some(fp);
                        });
                        // 冷启动场景：webview 尚未加载完成，emit 必然丢失
                        // 前端通过 get_pending_file 命令主动拉取，无需 emit
                        break;
                    }
                }
            }

            // macOS：监听 tauri://file-open 事件（系统文件关联打开）
            // 冷启动时 webview 可能未就绪，靠 get_pending_file 兜底；
            // 热启动时 emit 可被前端监听
            app.listen("tauri://file-open", move |event| {
                if let Ok(paths) = serde_json::from_str::<Vec<String>>(event.payload()) {
                    let file_path: Option<String> = paths.into_iter().next();
                    if let Some(ref path) = file_path {
                        let pending_clone = pending.clone();
                        let handle_clone = handle.clone();
                        let fp = path.clone();
                        tauri::async_runtime::block_on(async {
                            let mut guard = pending_clone.lock().await;
                            *guard = Some(fp);
                        });
                        let _ = handle_clone.emit("file-opened", path);
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            eprintln!("Error while running ErgeMD: {e}");
            std::process::exit(1);
        });
}
