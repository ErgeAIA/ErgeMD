use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct UpdateInfo {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub download_url: String,
    pub release_notes: String,
}

#[tauri::command]
pub async fn check_update(current_version: String) -> Result<UpdateInfo, String> {
    let github_result = fetch_github_latest().await;
    let gitee_result = fetch_gitee_latest().await;

    let latest = pick_latest(github_result, gitee_result)?;

    let has_update = is_newer_version(&current_version, &latest.version);

    Ok(UpdateInfo {
        has_update,
        current_version,
        latest_version: latest.version,
        download_url: latest.download_url,
        release_notes: latest.release_notes,
    })
}

struct ReleaseInfo {
    version: String,
    download_url: String,
    release_notes: String,
}

async fn fetch_github_latest() -> Result<ReleaseInfo, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("ErgeMD-Update-Checker")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let resp = client
        .get("https://api.github.com/repos/ErgeAIA/ErgeMD/releases/latest")
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

    let download_url = json["html_url"]
        .as_str()
        .unwrap_or("https://github.com/ErgeAIA/ErgeMD/releases")
        .to_string();

    let release_notes = json["body"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(ReleaseInfo {
        version: tag,
        download_url,
        release_notes,
    })
}

async fn fetch_gitee_latest() -> Result<ReleaseInfo, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("ErgeMD-Update-Checker")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let resp = client
        .get("https://gitee.com/api/v5/repos/ErgeAIA/ErgeMD/releases/latest")
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

    let tag = json["tag_name"]
        .as_str()
        .unwrap_or("")
        .trim_start_matches('v')
        .to_string();

    let download_url = json["html_url"]
        .as_str()
        .unwrap_or("https://gitee.com/ErgeAIA/ErgeMD/releases")
        .to_string();

    let release_notes = json["body"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(ReleaseInfo {
        version: tag,
        download_url,
        release_notes,
    })
}

fn pick_latest(
    github: Result<ReleaseInfo, String>,
    gitee: Result<ReleaseInfo, String>,
) -> Result<ReleaseInfo, String> {
    match (github, gitee) {
        (Ok(gh), Ok(gi)) => {
            if is_newer_version(&gh.version, &gi.version) {
                Ok(gh)
            } else {
                Ok(gi)
            }
        }
        (Ok(gh), Err(_)) => Ok(gh),
        (Err(_), Ok(gi)) => Ok(gi),
        (Err(gh_err), Err(gi_err)) => Err(format!(
            "Both APIs failed. GitHub: {}; Gitee: {}",
            gh_err, gi_err
        )),
    }
}

fn is_newer_version(current: &str, latest: &str) -> bool {
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
