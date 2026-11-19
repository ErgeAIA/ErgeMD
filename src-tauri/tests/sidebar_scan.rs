//! 侧边栏目录扫描回归测试。
//! 规模基准（手动）：cargo test --test sidebar_scan -- --ignored --nocapture

use ergemd_lib::commands::{scan_directory, search_workspace_files, FileNode};
use std::fs;
use std::path::PathBuf;
use std::time::Instant;

fn tmp_root(tag: &str) -> PathBuf {
    let p = std::env::temp_dir().join(format!("ergemd-sidebar-{}-{}", tag, std::process::id()));
    let _ = fs::remove_dir_all(&p);
    fs::create_dir_all(&p).unwrap();
    p
}

fn names(nodes: &[FileNode]) -> Vec<String> {
    nodes.iter().map(|n| n.name.clone()).collect()
}

#[test]
fn lists_one_level_naturally_sorted_and_skips_noise() {
    let root = tmp_root("sort");
    fs::create_dir_all(root.join("chapter-10")).unwrap();
    fs::create_dir_all(root.join("chapter-2")).unwrap();
    fs::create_dir_all(root.join("node_modules")).unwrap();
    fs::create_dir_all(root.join(".hidden-dir")).unwrap();
    for name in ["第10章.md", "第2章.md", "第1章.md", "a.md", "image.png", ".hidden.md"] {
        fs::write(root.join(name), "x").unwrap();
    }

    let listing = tauri::async_runtime::block_on(scan_directory(
        root.to_string_lossy().to_string(),
        None,
    ))
    .unwrap();

    assert_eq!(
        names(&listing.entries),
        vec![
            "chapter-2",
            "chapter-10",
            "a.md",
            "第1章.md",
            "第2章.md",
            "第10章.md"
        ],
        "目录在前、自然排序、隐藏项与 node_modules 被跳过、非 md 不出现"
    );
    assert!(!listing.truncated);
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn truncates_at_limit() {
    let root = tmp_root("limit");
    for i in 0..5 {
        fs::write(root.join(format!("f{i}.md")), "x").unwrap();
    }
    let listing = tauri::async_runtime::block_on(scan_directory(
        root.to_string_lossy().to_string(),
        Some(3),
    ))
    .unwrap();
    assert_eq!(listing.entries.len(), 3);
    assert!(listing.truncated);
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn search_matches_name_and_skips_hidden_and_node_modules() {
    let root = tmp_root("search");
    fs::create_dir_all(root.join("notes")).unwrap();
    fs::create_dir_all(root.join("node_modules")).unwrap();
    fs::write(root.join("notes").join("daily-note.md"), "x").unwrap();
    fs::write(root.join("notes").join("other.md"), "x").unwrap();
    fs::write(root.join("node_modules").join("note-in-modules.md"), "x").unwrap();
    fs::write(root.join(".note-hidden.md"), "x").unwrap();

    let results = tauri::async_runtime::block_on(search_workspace_files(
        root.to_string_lossy().to_string(),
        "NOTE".to_string(),
        None,
    ))
    .unwrap();

    assert_eq!(names(&results), vec!["daily-note.md"]);
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn search_ignores_empty_query() {
    let root = tmp_root("search-empty");
    fs::write(root.join("a.md"), "x").unwrap();
    let results = tauri::async_runtime::block_on(search_workspace_files(
        root.to_string_lossy().to_string(),
        "   ".to_string(),
        None,
    ))
    .unwrap();
    assert!(results.is_empty());
    let _ = fs::remove_dir_all(&root);
}

#[cfg(windows)]
#[test]
fn unreadable_dir_fails_on_expand_but_not_on_parent_listing() {
    let root = tmp_root("perm");
    let locked = root.join("locked");
    fs::create_dir_all(&locked).unwrap();
    fs::write(locked.join("secret.md"), "x").unwrap();
    fs::write(root.join("visible.md"), "x").unwrap();

    let user = std::env::var("USERNAME").unwrap_or_default();
    let deny = std::process::Command::new("icacls")
        .arg(&locked)
        .arg("/deny")
        .arg(format!("{user}:(OI)(CI)R"))
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);
    if !deny {
        println!("icacls deny unavailable, skipped");
        let _ = fs::remove_dir_all(&root);
        return;
    }

    let parent = tauri::async_runtime::block_on(scan_directory(
        root.to_string_lossy().to_string(),
        None,
    ))
    .unwrap();
    assert!(parent.entries.iter().any(|n| n.name == "locked"));
    assert!(parent.entries.iter().any(|n| n.name == "visible.md"));

    let expand = tauri::async_runtime::block_on(scan_directory(
        locked.to_string_lossy().to_string(),
        None,
    ));
    assert!(expand.is_err(), "不可读目录展开时应报错而不是静默返回空");

    let _ = std::process::Command::new("icacls")
        .arg(&locked)
        .args(["/remove:d", &user])
        .output();
    let _ = fs::remove_dir_all(&root);
}

/// 回归基准：5k 文件的根目录只读一层，返回体积应与条目数成正比而非全树。
#[test]
#[ignore]
fn benchmark_single_level_listing() {
    let root = tmp_root("bench");
    for d in 0..50 {
        let dir = root.join(format!("chapter-{:03}", d));
        fs::create_dir_all(&dir).unwrap();
        for f in 0..100 {
            fs::write(dir.join(format!("note-{:04}.md", f)), "x").unwrap();
        }
    }

    let t = Instant::now();
    let listing = tauri::async_runtime::block_on(scan_directory(
        root.to_string_lossy().to_string(),
        None,
    ))
    .unwrap();
    let elapsed = t.elapsed();
    let payload = serde_json::to_vec(&listing).unwrap().len();
    println!(
        "[bench] root entries={} scan={:?} payload={} bytes",
        listing.entries.len(),
        elapsed,
        payload
    );

    let t = Instant::now();
    let hits = tauri::async_runtime::block_on(search_workspace_files(
        root.to_string_lossy().to_string(),
        "note-0042".to_string(),
        None,
    ))
    .unwrap();
    println!("[bench] name search hits={} elapsed={:?}", hits.len(), t.elapsed());

    let _ = fs::remove_dir_all(&root);
}