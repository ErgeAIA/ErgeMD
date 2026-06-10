use ergemd_lib::commands::{count_words, is_cjk};

#[test]
fn counts_english_words() {
    assert_eq!(count_words("hello world rust"), 3);
}

#[test]
fn counts_cjk_chars_as_words() {
    assert_eq!(count_words("你好世界"), 4);
}

#[test]
fn mixes_cjk_and_english() {
    // CJK 4 字 + English 2 words = 6
    assert_eq!(count_words("Hello 你好 World 世界"), 6);
}

#[test]
fn empty_string_zero() {
    assert_eq!(count_words(""), 0);
}

#[test]
fn whitespace_only_string_zero() {
    assert_eq!(count_words("   \n\t  "), 0);
}

#[test]
fn is_cjk_recognizes_main_ranges() {
    // CJK Unified Ideographs
    assert!(is_cjk('中'));
    // CJK Extension A
    assert!(is_cjk('\u{3400}'));
    // CJK Compatibility Ideographs
    assert!(is_cjk('\u{F900}'));
    // 负例
    assert!(!is_cjk('A'));
    assert!(!is_cjk('1'));
}
