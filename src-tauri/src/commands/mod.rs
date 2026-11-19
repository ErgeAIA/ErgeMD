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
    pub encoding: String,
    pub had_errors: bool,
}

/// 解码顺序：BOM → 严格 UTF-8 → GB18030 → UTF-8 lossy 兜底。
/// Windows 中文用户在用的 .md 大量是 GBK/GB18030；此前直接按 UTF-8 lossy
/// 解码会把整页变成替换字符且不报错。
pub fn decode_markdown_bytes(bytes: &[u8]) -> (String, &'static str, bool) {
    const UTF8_BOM: &[u8] = &[0xEF, 0xBB, 0xBF];
    const UTF16_LE_BOM: &[u8] = &[0xFF, 0xFE];
    const UTF16_BE_BOM: &[u8] = &[0xFE, 0xFF];

    if bytes.starts_with(UTF8_BOM) {
        let (text, _, had_errors) = encoding_rs::UTF_8.decode(&bytes[UTF8_BOM.len()..]);
        return (text.into_owned(), "utf-8", had_errors);
    }
    if bytes.starts_with(UTF16_LE_BOM) {
        let (text, _, had_errors) =
            encoding_rs::UTF_16LE.decode(&bytes[UTF16_LE_BOM.len()..]);
        return (text.into_owned(), "utf-16le", had_errors);
    }
    if bytes.starts_with(UTF16_BE_BOM) {
        let (text, _, had_errors) =
            encoding_rs::UTF_16BE.decode(&bytes[UTF16_BE_BOM.len()..]);
        return (text.into_owned(), "utf-16be", had_errors);
    }
    if let Ok(text) = std::str::from_utf8(bytes) {
        return (text.to_string(), "utf-8", false);
    }
    // 非 UTF-8 时优先按 GB18030 解（GBK/GB2312 的超集，覆盖绝大多数中文文档）
    let (text, _, had_errors) = encoding_rs::GB18030.decode(bytes);
    if !had_errors {
        return (text.into_owned(), "gb18030", false);
    }
    let (text, _, had_errors) = encoding_rs::UTF_8.decode(bytes);
    (text.into_owned(), "utf-8", had_errors)
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<ReadFileResult, String> {
    validate_path(&path)?;
    let bytes = fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    let (content, encoding, had_errors) = decode_markdown_bytes(&bytes);
    let word_count = count_words(&content);
    Ok(ReadFileResult {
        content,
        word_count,
        encoding: encoding.to_string(),
        had_errors,
    })
}

#[tauri::command]
pub async fn get_file_mtime(path: String) -> Result<u64, String> {
    validate_path(&path)?;
    let metadata = fs::metadata(&path).map_err(|e| format!("Failed to stat file: {}", e))?;
    let modified = metadata
        .modified()
        .map_err(|e| format!("Failed to read mtime: {}", e))?;
    let millis = modified
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("Invalid mtime: {}", e))?
        .as_millis() as u64;
    Ok(millis)
}

pub fn validate_path(path: &str) -> Result<(), String> {
    let path_buf = PathBuf::from(path);
    if path_buf.components().any(|c| c.as_os_str() == "..") {
        return Err("Path traversal not allowed".to_string());
    }
    Ok(())
}

/// webview 可写的文件类型白名单：文档导出（md/html/svg/docx/pdf）与图片保存。
/// 防止被入侵的 webview 覆写系统可执行文件/脚本。
const WRITABLE_EXTENSIONS: &[&str] = &[
    "md", "markdown", "mdx", "html", "htm", "svg", "docx", "pdf", "png", "jpg", "jpeg", "gif",
    "webp", "ico", "avif", "bmp",
];

pub fn validate_writable_path(path: &str) -> Result<(), String> {
    validate_path(path)?;
    let ext = PathBuf::from(path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();
    if WRITABLE_EXTENSIONS.contains(&ext.as_str()) {
        Ok(())
    } else {
        Err(format!(
            "Writing not allowed for this file type (allowed: {})",
            WRITABLE_EXTENSIONS.join(", ")
        ))
    }
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    validate_writable_path(&path)?;
    fs::write(&path, &content).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn write_binary_file(path: String, base64_data: String) -> Result<(), String> {
    validate_writable_path(&path)?;
    let bytes = general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Failed to decode base64 data: {}", e))?;
    fs::write(&path, bytes).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}

/// 单次目录列出的硬上限：与 AGENTS.md「单次 IPC ≤1000 条」对齐。
const MAX_DIR_ENTRIES: usize = 1000;
/// 文件名搜索的目录深度上限，防止异常嵌套。
const MAX_SEARCH_DEPTH: usize = 32;
const IGNORED_DIRS: &[&str] = &["node_modules", "target"];

#[derive(Debug, Serialize)]
pub struct DirListing {
    pub entries: Vec<FileNode>,
    /// 条目数超过上限时为 true，剩余条目未列出
    pub truncated: bool,
}

fn is_markdown(path: &std::path::Path) -> bool {
    path.extension().is_some_and(|ext| {
        ext.eq_ignore_ascii_case("md")
            || ext.eq_ignore_ascii_case("markdown")
            || ext.eq_ignore_ascii_case("mdx")
    })
}

/// 自然排序：忽略大小写，数字段按数值比较（第2章 < 第10章）。
fn natural_cmp(a: &str, b: &str) -> std::cmp::Ordering {
    use std::cmp::Ordering;
    let a = a.to_lowercase();
    let b = b.to_lowercase();
    let (ab, bb) = (a.as_bytes(), b.as_bytes());
    let (mut i, mut j) = (0usize, 0usize);

    while i < ab.len() && j < bb.len() {
        if ab[i].is_ascii_digit() && bb[j].is_ascii_digit() {
            let si = i;
            while i < ab.len() && ab[i].is_ascii_digit() {
                i += 1;
            }
            let sj = j;
            while j < bb.len() && bb[j].is_ascii_digit() {
                j += 1;
            }
            let na = &ab[si..i];
            let nb = &bb[sj..j];
            let za = na.iter().take_while(|&&c| c == b'0').count();
            let zb = nb.iter().take_while(|&&c| c == b'0').count();
            let ord = (na.len() - za)
                .cmp(&(nb.len() - zb))
                .then_with(|| na[za..].cmp(&nb[zb..]));
            if ord != Ordering::Equal {
                return ord;
            }
            continue;
        }
        if ab[i] != bb[j] {
            return ab[i].cmp(&bb[j]);
        }
        i += 1;
        j += 1;
    }
    (ab.len() - i).cmp(&(bb.len() - j))
}

fn sort_entries(nodes: &mut [FileNode]) {
    nodes.sort_by(|a, b| natural_cmp(&a.name, &b.name));
}

/// 列出单个目录的直接子项（目录在前、文件在后，各自自然排序）。
/// 懒加载的最小单元：只读一层，单次返回 ≤ MAX_DIR_ENTRIES 条。
#[tauri::command]
pub async fn scan_directory(
    dir_path: String,
    limit: Option<usize>,
) -> Result<DirListing, String> {
    validate_path(&dir_path)?;
    let dir = PathBuf::from(&dir_path);
    let meta = fs::metadata(&dir).map_err(|e| format!("Failed to read dir: {}", e))?;
    if !meta.is_dir() {
        return Err("Not a directory".to_string());
    }

    let limit = limit.unwrap_or(MAX_DIR_ENTRIES).clamp(1, MAX_DIR_ENTRIES);
    let entries = fs::read_dir(&dir).map_err(|e| format!("Failed to read dir: {}", e))?;

    let mut dirs: Vec<FileNode> = Vec::new();
    let mut files: Vec<FileNode> = Vec::new();
    let mut truncated = false;

    for entry in entries.flatten() {
        let path = entry.path();
        let name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        if name.starts_with('.') || IGNORED_DIRS.contains(&name.as_str()) {
            continue;
        }

        if dirs.len() + files.len() >= limit {
            truncated = true;
            break;
        }

        let Ok(file_type) = entry.file_type() else {
            continue;
        };

        // 链接只跟随文件；目录链接一律不展开，避免环
        if file_type.is_symlink() {
            if is_markdown(&path) && path.is_file() {
                files.push(FileNode {
                    name,
                    path: path.to_string_lossy().to_string(),
                    is_dir: false,
                    children: Vec::new(),
                });
            }
            continue;
        }

        if file_type.is_dir() {
            dirs.push(FileNode {
                name,
                path: path.to_string_lossy().to_string(),
                is_dir: true,
                children: Vec::new(),
            });
        } else if is_markdown(&path) {
            files.push(FileNode {
                name,
                path: path.to_string_lossy().to_string(),
                is_dir: false,
                children: Vec::new(),
            });
        }
    }

    sort_entries(&mut dirs);
    sort_entries(&mut files);
    dirs.extend(files);

    Ok(DirListing {
        entries: dirs,
        truncated,
    })
}

/// 按文件名在工作区里搜索（不含全文），返回扁平结果，供侧边栏筛选使用。
#[tauri::command]
pub async fn search_workspace_files(
    root: String,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<FileNode>, String> {
    validate_path(&root)?;
    let root_path = PathBuf::from(&root);
    if !root_path.is_dir() {
        return Err("Folder does not exist".to_string());
    }

    let needle = query.trim().to_lowercase();
    if needle.is_empty() {
        return Ok(Vec::new());
    }
    let limit = limit.unwrap_or(200).clamp(1, 500);

    let mut out: Vec<FileNode> = Vec::new();
    let mut stack: Vec<(PathBuf, usize)> = vec![(root_path, 0)];

    while let Some((dir, depth)) = stack.pop() {
        if depth > MAX_SEARCH_DEPTH {
            continue;
        }
        let Ok(entries) = fs::read_dir(&dir) else {
            continue; // 单个子目录不可读时跳过，不中断搜索
        };

        for entry in entries.flatten() {
            let path = entry.path();
            let name = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            if name.starts_with('.') || IGNORED_DIRS.contains(&name.as_str()) {
                continue;
            }
            let Ok(file_type) = entry.file_type() else {
                continue;
            };
            if file_type.is_dir() {
                if !file_type.is_symlink() {
                    stack.push((path, depth + 1));
                }
            } else if is_markdown(&path) && name.to_lowercase().contains(&needle) {
                out.push(FileNode {
                    name,
                    path: path.to_string_lossy().to_string(),
                    is_dir: false,
                    children: Vec::new(),
                });
                if out.len() >= limit {
                    break;
                }
            }
        }
        if out.len() >= limit {
            break;
        }
    }

    out.sort_by(|a, b| natural_cmp(&a.name, &b.name));
    Ok(out)
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
    // 防止超大图片撑爆内存（base64 后体积再增 1/3）
    const MAX_REMOTE_IMAGE_BYTES: usize = 20 * 1024 * 1024;

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

    if let Some(len) = response.content_length() {
        if len as usize > MAX_REMOTE_IMAGE_BYTES {
            return Err(format!("Image too large: {} bytes", len));
        }
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

    // 无 content-length 时（分块传输）兜底校验实际字节数
    if bytes.len() > MAX_REMOTE_IMAGE_BYTES {
        return Err(format!("Image too large: {} bytes", bytes.len()));
    }

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
