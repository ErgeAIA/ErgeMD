use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct UpdateInfo {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub published_at: String,
    pub download_url: String,
    pub release_url: String,
    pub release_notes: String,
}

#[tauri::command]
pub async fn check_update(current_version: String) -> Result<UpdateInfo, String> {
    let github_result = fetch_github_latest().await;
    let gitee_result = fetch_gitee_latest().await;

    match pick_latest(github_result, gitee_result) {
        Some(latest) => {
            let has_update = is_newer_version(&current_version, &latest.version);
            Ok(UpdateInfo {
                has_update,
                current_version,
                latest_version: latest.version,
                published_at: latest.published_at,
                download_url: latest.download_url,
                release_url: latest.release_url,
                release_notes: latest.release_notes,
            })
        }
        None => {
            // 双源皆不可达：如实返回错误，让手动检查能给用户明确提示
            // （自动检查的前端 catch 本就静默，不会打扰）；不再伪装成
            // 「已是最新版」误导用户
            Err("GitHub/Gitee 更新源均不可达".to_string())
        }
    }
}

#[derive(Debug)]
pub struct ReleaseInfo {
    pub version: String,
    pub published_at: String,
    pub download_url: String,
    pub release_url: String,
    pub release_notes: String,
}

/// 按 `target_os` 关键字从 assets 列表中选择下载链接。
/// `target_os` 接受 "windows" | "macos" | "linux" | 其他（回退到 html_url）。
pub fn pick_platform_download_url(
    target_os: &str,
    assets: &serde_json::Value,
    html_url: &str,
) -> String {
    let arr = match assets.as_array() {
        Some(a) => a,
        None => return html_url.to_string(),
    };

    let (primary_ext, fallback_ext) = match target_os {
        "windows" => (Some("setup.exe"), Some("portable.zip")),
        "macos" => (Some("dmg"), Some("app.tar.gz")),
        "linux" => (Some("appimage"), Some("deb")),
        _ => return html_url.to_string(),
    };

    for asset in arr {
        let name = asset["name"].as_str().unwrap_or("").to_lowercase();
        if let Some(ext) = primary_ext {
            if name.ends_with(ext) {
                if let Some(url) = asset["browser_download_url"].as_str() {
                    return url.to_string();
                }
            }
        }
    }

    if let Some(fb) = fallback_ext {
        for asset in arr {
            let name = asset["name"].as_str().unwrap_or("").to_lowercase();
            if name.ends_with(fb) {
                if let Some(url) = asset["browser_download_url"].as_str() {
                    return url.to_string();
                }
            }
        }
    }

    html_url.to_string()
}

/// 本机 gh CLI 登录凭证（进程内只取一次缓存；token 零落盘、不进日志）。
/// 带 Authorization 头后 GitHub API 额度为 5000/h，不受匿名共享出口 IP
/// 60/h 限流拖累；未安装 gh 或未登录时静默回退匿名请求。
fn github_auth_token() -> Option<String> {
    static CACHE: std::sync::OnceLock<Option<String>> = std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let output = std::process::Command::new("gh")
                .args(["auth", "token"])
                .output()
                .ok()?;
            if !output.status.success() {
                return None;
            }
            let token = String::from_utf8_lossy(&output.stdout).trim().to_string();
            (!token.is_empty()).then_some(token)
        })
        .clone()
}

async fn fetch_github_latest() -> Result<ReleaseInfo, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("ErgeMD-Update-Checker")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let mut request = client.get("https://api.github.com/repos/ErgeAIA/ErgeMD/releases/latest");
    if let Some(token) = github_auth_token() {
        request = request.bearer_auth(&token);
    }

    let resp = request
        .send()
        .await
        .map_err(|e| format!("GitHub API request failed: {}", e))?;

    if resp.status() == reqwest::StatusCode::FORBIDDEN {
        return Err("GitHub API rate limit exceeded".to_string());
    }

    if !resp.status().is_success() {
        return Err(format!("GitHub API returned status: {}", resp.status()));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse GitHub response: {}", e))?;

    let tag = json["tag_name"]
        .as_str()
        .unwrap_or("")
        .trim_start_matches('v')
        .to_string();

    let html_url = json["html_url"]
        .as_str()
        .unwrap_or("https://github.com/ErgeAIA/ErgeMD/releases")
        .to_string();

    let download_url = pick_platform_download_url(std::env::consts::OS, &json["assets"], &html_url);

    let release_notes = json["body"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(ReleaseInfo {
        version: tag,
        published_at: json["published_at"]
            .as_str()
            .unwrap_or("")
            .to_string(),
        download_url,
        release_url: html_url,
        release_notes,
    })
}

async fn fetch_gitee_latest() -> Result<ReleaseInfo, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("ErgeMD-Update-Checker")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Gitee Open API 没有 /releases/latest 子路径（GitHub 才有），
    // 必须用列表接口按 created_at 倒序取第一条
    let resp = client
        .get("https://gitee.com/api/v5/repos/ErgeAIA/ErgeMD/releases?per_page=1&page=1&direction=desc")
        .send()
        .await
        .map_err(|e| format!("Gitee API request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Gitee API returned status: {}", resp.status()));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse Gitee response: {}", e))?;

    parse_gitee_releases(&json)
}

/// 解析 Gitee releases 列表响应，取第一条；空列表视为仓库无 release
pub fn parse_gitee_releases(json: &serde_json::Value) -> Result<ReleaseInfo, String> {
    let arr = json
        .as_array()
        .ok_or_else(|| "Gitee API 返回格式异常（非列表）".to_string())?;
    let first = arr
        .first()
        .ok_or_else(|| "Gitee: no releases".to_string())?;

    let tag = first["tag_name"]
        .as_str()
        .unwrap_or("")
        .trim_start_matches('v')
        .to_string();

    let html_url = first["html_url"]
        .as_str()
        .unwrap_or("https://gitee.com/ErgeAIA/ErgeMD/releases")
        .to_string();

    // Gitee API 返回的 assets 结构为 [{ "name": "...", "browser_download_url": "..." }]
    let download_url = pick_platform_download_url(std::env::consts::OS, &first["assets"], &html_url);

    let release_notes = first["body"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(ReleaseInfo {
        version: tag,
        published_at: first["created_at"].as_str().unwrap_or("").to_string(),
        download_url,
        release_url: html_url,
        release_notes,
    })
}

fn pick_latest(
    github: Result<ReleaseInfo, String>,
    gitee: Result<ReleaseInfo, String>,
) -> Option<ReleaseInfo> {
    match (github, gitee) {
        (Ok(gh), Ok(gi)) => {
            if is_newer_version(&gh.version, &gi.version) {
                Some(gh)
            } else {
                Some(gi)
            }
        }
        (Ok(gh), Err(_)) => Some(gh),
        (Err(_), Ok(gi)) => Some(gi),
        (Err(_), Err(_)) => None,
    }
}

pub fn is_newer_version(current: &str, latest: &str) -> bool {
    let cur_parts: Vec<u32> = current
        .split('.')
        .filter_map(|s| s.parse().ok())
        .collect();
    let lat_parts: Vec<u32> = latest
        .split('.')
        .filter_map(|s| s.parse().ok())
        .collect();

    if cur_parts.is_empty() || lat_parts.is_empty() {
        return false;
    }

    let max_len = cur_parts.len().max(lat_parts.len());
    for i in 0..max_len {
        let cur = cur_parts.get(i).unwrap_or(&0);
        let lat = lat_parts.get(i).unwrap_or(&0);
        if lat > cur {
            return true;
        }
        if lat < cur {
            return false;
        }
    }

    false
}
