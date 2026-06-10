use base64::{engine::general_purpose, Engine as _};
use encoding_rs;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

pub mod fonts;
pub mod pdf;
pub mod update;
pub mod window;

#[derive(Debug, Serialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Vec<FileNode>,
}

#[derive(Debug, Serialize)]
pub struct ReadFileResult {
    pub content: String,
    pub word_count: usize,
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<ReadFileResult, String> {
    validate_path(&path)?;
    let bytes = fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    let (content, _, _) = encoding_rs::UTF_8.decode(&bytes);
    let word_count = count_words(&content);
    Ok(ReadFileResult {
        content: content.into_owned(),
        word_count,
    })
}

pub fn validate_path(path: &str) -> Result<(), String> {
    let path_buf = PathBuf::from(path);
    if path_buf.components().any(|c| c.as_os_str() == "..") {
        return Err("Path traversal not allowed".to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    validate_path(&path)?;
    fs::write(&path, &content).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn write_binary_file(path: String, base64_data: String) -> Result<(), String> {
    validate_path(&path)?;
    let bytes = general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Failed to decode base64 data: {}", e))?;
    fs::write(&path, bytes).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn scan_workspace(folder_path: String) -> Result<Vec<FileNode>, String> {
    validate_path(&folder_path)?;
    let root = PathBuf::from(&folder_path);
    if !root.exists() {
        return Err("Folder does not exist".to_string());
    }

    let mut tree = build_file_tree(&root, &root)?;
    sort_file_tree(&mut tree);
    Ok(vec![tree])
}

fn build_file_tree(dir: &PathBuf, root: &PathBuf) -> Result<FileNode, String> {
    let name = dir
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let mut children = Vec::new();

    if dir.is_dir() {
        let entries = fs::read_dir(dir).map_err(|e| format!("Failed to read dir: {}", e))?;

        let mut dirs: Vec<FileNode> = Vec::new();
        let mut files: Vec<FileNode> = Vec::new();

        for entry in entries.flatten() {
            let path = entry.path();
            let file_name = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();

            // Skip hidden files and node_modules
            if file_name.starts_with('.') || file_name == "node_modules" || file_name == "target" {
                continue;
            }

            if path.is_dir() {
                dirs.push(build_file_tree(&path, root)?);
            } else if path.extension().map_or(false, |ext| {
                ext.eq_ignore_ascii_case("md")
                    || ext.eq_ignore_ascii_case("markdown")
                    || ext.eq_ignore_ascii_case("mdx")
            }) {
                files.push(FileNode {
                    name: file_name,
                    path: path.to_string_lossy().to_string(),
                    is_dir: false,
                    children: Vec::new(),
                });
            }
        }

        children.extend(dirs);
        children.extend(files);
    }

    Ok(FileNode {
        name,
        path: dir.to_string_lossy().to_string(),
        is_dir: true,
        children,
    })
}

fn sort_file_tree(node: &mut FileNode) {
    // Directories first, then files, both alphabetically
    node.children.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    for child in &mut node.children {
        sort_file_tree(child);
    }
}

pub fn count_words(content: &str) -> usize {
    // Count CJK characters + English words
    let cjk_count = content.chars().filter(|c| is_cjk(*c)).count();
    let ascii_words = content
        .split_whitespace()
        .filter(|w| !w.chars().any(is_cjk))
        .count();
    cjk_count + ascii_words
}

pub fn is_cjk(c: char) -> bool {
    matches!(
        c,
        '\u{4E00}'..='\u{9FFF}' |   // CJK Unified Ideographs
        '\u{3400}'..='\u{4DBF}' |   // CJK Extension A
        '\u{F900}'..='\u{FAFF}' |   // CJK Compatibility Ideographs
        '\u{3000}'..='\u{303F}' |   // CJK Symbols and Punctuation
        '\u{FF00}'..='\u{FFEF}'     // Halfwidth and Fullwidth Forms
    )
}

#[tauri::command]
pub async fn resolve_image_path(base_path: String, relative_path: String) -> Result<String, String> {
    let base = PathBuf::from(&base_path);
    let base_dir = if base.is_file() {
        base.parent().ok_or("Invalid base path")?.to_path_buf()
    } else {
        base
    };
    let image_path = base_dir.join(relative_path);
    let canonical = image_path.canonicalize().map_err(|e| format!("Failed to resolve path: {}", e))?;
    Ok(canonical.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn read_image_as_data_url(base_path: String, relative_path: String) -> Result<String, String> {
    let base = PathBuf::from(&base_path);
    let base_dir = if base.is_file() {
        base.parent().ok_or("Invalid base path")?.to_path_buf()
    } else {
        base
    };
    let image_path = base_dir.join(relative_path);
    let canonical = image_path
        .canonicalize()
        .map_err(|e| format!("Failed to resolve image path: {}", e))?;

    if !canonical.exists() {
        return Err(format!("Image file not found: {}", canonical.display()));
    }

    let bytes = fs::read(&canonical).map_err(|e| format!("Failed to read image: {}", e))?;
    let base64_data = general_purpose::STANDARD.encode(&bytes);

    let mime_type = match canonical
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase()
        .as_str()
    {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "avif" => "image/avif",
        _ => "image/png",
    };

    Ok(format!("data:{};base64,{}", mime_type, base64_data))
}

#[tauri::command]
pub async fn fetch_remote_image_as_data_url(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(&url)
        .header("Referer", "")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch image: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/png")
        .to_string();

    // Extract MIME from content-type (strip parameters like charset)
    let mime_type = content_type
        .split(';')
        .next()
        .unwrap_or("image/png")
        .trim()
        .to_string();

    // If content-type is not an image, try to infer from URL extension
    let mime_type = if mime_type.starts_with("image/") {
        mime_type
    } else {
        let ext = url
            .split('?')
            .next()
            .unwrap_or("")
            .rsplit('.')
            .next()
            .unwrap_or("")
            .to_lowercase();
        match ext.as_str() {
            "png" => "image/png".to_string(),
            "jpg" | "jpeg" => "image/jpeg".to_string(),
            "gif" => "image/gif".to_string(),
            "webp" => "image/webp".to_string(),
            "svg" => "image/svg+xml".to_string(),
            "bmp" => "image/bmp".to_string(),
            "ico" => "image/x-icon".to_string(),
            "avif" => "image/avif".to_string(),
            _ => "image/png".to_string(),
        }
    };

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read image data: {}", e))?;

    let base64_data = general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime_type, base64_data))
}

/// 根据平台构造"在文件管理器中显示"的命令。
/// 返回 (program, args)。该函数是纯函数，便于测试。
pub fn build_reveal_command(
    target_os: &str,
    file_path: &std::path::Path,
) -> (String, Vec<String>) {
    match target_os {
        "windows" => (
            "explorer".to_string(),
            vec!["/select,".to_string(), file_path.to_string_lossy().to_string()],
        ),
        "macos" => (
            "open".to_string(),
            vec!["-R".to_string(), file_path.to_string_lossy().to_string()],
        ),
        // Linux / 其他 Unix
        _ => {
            let dir = file_path
                .parent()
                .filter(|p| !p.as_os_str().is_empty())
                .map(|p| p.to_path_buf())
                .unwrap_or_else(|| std::path::PathBuf::from("/"));
            (
                "xdg-open".to_string(),
                vec![dir.to_string_lossy().to_string()],
            )
        }
    }
}

#[tauri::command]
pub async fn reveal_in_explorer(file_path: String) -> Result<(), String> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    let (program, args) = build_reveal_command(std::env::consts::OS, &path);
    Command::new(&program)
        .args(&args)
        .spawn()
        .map_err(|e| format!("Failed to open file manager: {}", e))?;

    Ok(())
}
