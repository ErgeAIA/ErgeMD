use ergemd_lib::commands::update::is_newer_version;

#[test]
fn detects_patch_upgrade() {
    assert!(is_newer_version("0.3.6", "0.3.7"));
}

#[test]
fn detects_minor_upgrade() {
    assert!(is_newer_version("0.3.7", "0.4.0"));
}

#[test]
fn detects_major_upgrade() {
    assert!(is_newer_version("0.9.9", "1.0.0"));
}

#[test]
fn rejects_equal_version() {
    assert!(!is_newer_version("0.3.7", "0.3.7"));
}

#[test]
fn rejects_downgrade() {
    assert!(!is_newer_version("0.4.0", "0.3.7"));
}

#[test]
fn handles_unequal_segment_count() {
    // 0.3.7 vs 0.3.7.1：后者更新
    assert!(is_newer_version("0.3.7", "0.3.7.1"));
    // 0.3 vs 0.3.0：相等
    assert!(!is_newer_version("0.3", "0.3.0"));
}

#[test]
fn returns_false_on_invalid_input() {
    assert!(!is_newer_version("invalid", "0.3.7"));
    assert!(!is_newer_version("0.3.7", "invalid"));
}
