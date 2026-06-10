use ergemd_lib::commands::build_reveal_command;
use std::path::Path;

#[test]
fn build_windows_reveal_command_uses_explorer_select() {
    let (program, args) =
        build_reveal_command("windows", Path::new("C:\\Users\\test\\note.md"));
    assert_eq!(program, "explorer");
    assert_eq!(args, vec!["/select,", "C:\\Users\\test\\note.md"]);
}

#[test]
fn build_macos_reveal_command_uses_open_select() {
    let (program, args) = build_reveal_command("macos", Path::new("/Users/test/note.md"));
    assert_eq!(program, "open");
    assert_eq!(args, vec!["-R", "/Users/test/note.md"]);
}

#[test]
fn build_linux_reveal_command_uses_xdg_open_on_parent() {
    let (program, args) = build_reveal_command("linux", Path::new("/home/test/notes/note.md"));
    assert_eq!(program, "xdg-open");
    assert_eq!(args, vec!["/home/test/notes"]);
}

#[test]
fn build_linux_reveal_command_falls_back_to_root_when_no_parent() {
    // 仅有文件名（无父目录组件）时回退到根目录
    let (program, args) = build_reveal_command("linux", Path::new("note.md"));
    assert_eq!(program, "xdg-open");
    assert_eq!(args, vec!["/"]);
}

#[test]
fn build_unknown_platform_falls_back_to_xdg_open() {
    let (program, args) = build_reveal_command("freebsd", Path::new("/tmp/note.md"));
    // 未知平台回退到 xdg-open 行为
    assert_eq!(program, "xdg-open");
    assert_eq!(args, vec!["/tmp"]);
}
