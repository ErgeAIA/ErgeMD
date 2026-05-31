use std::fs;
use std::path::PathBuf;

#[cfg(target_os = "windows")]
use std::sync::mpsc;

use tauri::{command, WebviewUrl, WebviewWindowBuilder};

#[cfg(target_os = "windows")]
use windows_core::Interface;

#[cfg(target_os = "windows")]
use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2_18;

#[cfg(target_os = "windows")]
use webview2_com::PrintToPdfCompletedHandler;

fn write_temp_html(html_content: &str) -> Result<PathBuf, String> {
    let temp_dir = std::env::temp_dir().join("ergemd");
    fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create temp dir: {}", e))?;

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    let temp_path = temp_dir.join(format!("pdf_export_{}.html", timestamp));
    fs::write(&temp_path, html_content)
        .map_err(|e| format!("Failed to write temp HTML: {}", e))?;

    Ok(temp_path)
}

fn cleanup_temp(path: &PathBuf) {
    if path.exists() {
        let _ = fs::remove_file(path);
    }
}

#[command]
pub async fn export_pdf(
    app: tauri::AppHandle,
    html_content: String,
    file_path: String,
) -> Result<(), String> {
    let temp_path = write_temp_html(&html_content)?;

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    let label = format!("pdf-export-{}", timestamp);

    let temp_path_str = temp_path.to_string_lossy().to_string();
    let asset_url = format!("https://asset.localhost/{}", temp_path_str.replace('\\', "/"));

    let window = WebviewWindowBuilder::new(
        &app,
        &label,
        WebviewUrl::External(asset_url.parse().map_err(|e| format!("Invalid URL: {}", e))?),
    )
    .title("ErgeMD PDF Export")
    .inner_size(800.0, 1100.0)
    .visible(false)
    .decorations(false)
    .center()
    .build()
    .map_err(|e| format!("Failed to create export window: {}", e))?;

    let result = export_pdf_inner(&window, &file_path).await;

    let _ = window.close();
    cleanup_temp(&temp_path);

    result
}

#[cfg(target_os = "windows")]
async fn export_pdf_inner(
    window: &tauri::WebviewWindow,
    file_path: &str,
) -> Result<(), String> {
    tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;

    let (tx, rx) = mpsc::channel::<Result<(), String>>();
    let file_path_owned = file_path.to_string();

    window
        .with_webview(move |webview| {
            let controller = webview.controller();

            let core_webview = match unsafe { controller.CoreWebView2() } {
                Ok(wv) => wv,
                Err(e) => {
                    let _ = tx.send(Err(format!("Failed to get CoreWebView2: {:?}", e)));
                    return;
                }
            };

            let core_webview_18: ICoreWebView2_18 = match core_webview.cast() {
                Ok(wv18) => wv18,
                Err(e) => {
                    let _ = tx.send(Err(format!(
                        "WebView2 runtime too old for PrintToPdf: {:?}",
                        e
                    )));
                    return;
                }
            };

            let file_path_h: windows_core::HSTRING = file_path_owned.into();

            let tx_err = tx.clone();

            let completed: PrintToPdfCompletedHandlerClosure =
                Box::new(move |_result: windows_core::Result<()>, is_success: bool| {
                    if is_success {
                        let _ = tx.send(Ok(()));
                    } else {
                        let _ = tx.send(Err("PrintToPdf returned failure".to_string()));
                    }
                    Ok(())
                });

            let handler = PrintToPdfCompletedHandler::create(completed);

            if let Err(e) = unsafe { core_webview_18.PrintToPdf(&file_path_h, None, &handler) } {
                let _ = tx_err.send(Err(format!("PrintToPdf call failed: {:?}", e)));
            }
        })
        .map_err(|e| format!("Failed to access webview: {}", e))?;

    match rx.recv_timeout(std::time::Duration::from_secs(30)) {
        Ok(result) => result,
        Err(_) => Err("PrintToPdf timed out after 30 seconds".to_string()),
    }
}

#[cfg(target_os = "windows")]
type PrintToPdfCompletedHandlerClosure = webview2_com::CompletedClosure<
    windows_core::HRESULT,
    windows_core::BOOL,
>;

#[cfg(not(target_os = "windows"))]
async fn export_pdf_inner(
    window: &tauri::WebviewWindow,
    _file_path: &str,
) -> Result<(), String> {
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    window
        .eval("window.print()")
        .map_err(|e| format!("Failed to trigger print: {}", e))?;

    Ok(())
}
