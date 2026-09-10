use ergemd_lib::commands::update::parse_gitee_releases;
use serde_json::json;

#[test]
fn parses_first_release_from_list() {
    let body = json!([
        {
            "tag_name": "v0.4.3",
            "html_url": "https://gitee.com/ErgeAIA/ErgeMD/releases/v0.4.3",
            "created_at": "2026-09-10T02:01:00+08:00",
            "body": "更新内容",
            "assets": [
                {
                    "name": "ErgeMD-v0.4.3-setup.exe",
                    "browser_download_url": "https://gitee.com/ErgeAIA/ErgeMD/releases/download/v0.4.3/ErgeMD-v0.4.3-setup.exe"
                }
            ]
        }
    ]);
    let info = parse_gitee_releases(&body).expect("should parse");
    assert_eq!(info.version, "0.4.3");
    assert_eq!(info.published_at, "2026-09-10T02:01:00+08:00");
    assert!(info.download_url.ends_with("setup.exe"));
    assert_eq!(info.release_notes, "更新内容");
}

#[test]
fn empty_list_means_no_release() {
    let body = json!([]);
    let err = parse_gitee_releases(&body).expect_err("empty list should error");
    assert!(err.contains("no releases"));
}

#[test]
fn non_array_is_format_error() {
    let body = json!({"message": "404 Not Found"});
    assert!(parse_gitee_releases(&body).is_err());
}
