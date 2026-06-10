use ergemd_lib::commands::update::pick_platform_download_url;
use serde_json::json;

#[test]
fn pick_windows_assets_prefers_setup_exe() {
    let assets = json!([
        { "name": "ErgeMD-v0.4.0-portable.zip", "browser_download_url": "url-portable" },
        { "name": "ErgeMD-v0.4.0-x64-setup.exe", "browser_download_url": "url-setup" }
    ]);
    let url = pick_platform_download_url("windows", &assets, "https://fallback");
    assert_eq!(url, "url-setup");
}

#[test]
fn pick_windows_assets_falls_back_to_portable_zip() {
    let assets = json!([
        { "name": "ErgeMD-v0.4.0-portable.zip", "browser_download_url": "url-portable" }
    ]);
    let url = pick_platform_download_url("windows", &assets, "https://fallback");
    assert_eq!(url, "url-portable");
}

#[test]
fn pick_macos_assets_prefers_dmg() {
    let assets = json!([
        { "name": "ErgeMD-v0.4.0-macos.app.tar.gz", "browser_download_url": "url-tar" },
        { "name": "ErgeMD-v0.4.0-macos-universal.dmg", "browser_download_url": "url-dmg" }
    ]);
    let url = pick_platform_download_url("macos", &assets, "https://fallback");
    assert_eq!(url, "url-dmg");
}

#[test]
fn pick_linux_assets_prefers_appimage() {
    let assets = json!([
        { "name": "ergemd_0.4.0_amd64.deb", "browser_download_url": "url-deb" },
        { "name": "ErgeMD-v0.4.0-x86_64.AppImage", "browser_download_url": "url-appimage" }
    ]);
    let url = pick_platform_download_url("linux", &assets, "https://fallback");
    assert_eq!(url, "url-appimage");
}

#[test]
fn pick_unknown_platform_returns_html_url_fallback() {
    let assets = json!([
        { "name": "ErgeMD-v0.4.0-x64-setup.exe", "browser_download_url": "url-setup" }
    ]);
    let url = pick_platform_download_url("unknown", &assets, "https://fallback");
    assert_eq!(url, "https://fallback");
}

#[test]
fn pick_non_array_assets_returns_html_url() {
    let assets = json!(null);
    let url = pick_platform_download_url("windows", &assets, "https://fallback");
    assert_eq!(url, "https://fallback");
}
