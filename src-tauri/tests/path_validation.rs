use ergemd_lib::commands::validate_path;

#[test]
fn allows_absolute_path_without_traversal() {
    assert!(validate_path("/home/user/note.md").is_ok());
}

#[test]
fn allows_relative_path() {
    assert!(validate_path("note.md").is_ok());
}

#[test]
fn rejects_parent_traversal() {
    assert!(validate_path("../etc/passwd").is_err());
}

#[test]
fn rejects_embedded_parent_traversal() {
    assert!(validate_path("/home/user/../etc/passwd").is_err());
}
