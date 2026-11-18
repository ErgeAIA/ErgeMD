//! read_file 的编码探测：BOM → 严格 UTF-8 → GB18030 → UTF-8 lossy 兜底。

use ergemd_lib::commands::decode_markdown_bytes;

#[test]
fn decodes_plain_utf8() {
    let (text, encoding, had_errors) = decode_markdown_bytes("标题\n正文".as_bytes());
    assert_eq!(text, "标题\n正文");
    assert_eq!(encoding, "utf-8");
    assert!(!had_errors);
}

#[test]
fn strips_utf8_bom() {
    let mut bytes = vec![0xEF, 0xBB, 0xBF];
    bytes.extend_from_slice("# Hello".as_bytes());
    let (text, encoding, had_errors) = decode_markdown_bytes(&bytes);
    assert_eq!(text, "# Hello");
    assert_eq!(encoding, "utf-8");
    assert!(!had_errors);
}

#[test]
fn decodes_utf16le_with_bom() {
    let source = "# 你好";
    let mut bytes = vec![0xFF, 0xFE];
    for unit in source.encode_utf16() {
        bytes.extend_from_slice(&unit.to_le_bytes());
    }
    let (text, encoding, had_errors) = decode_markdown_bytes(&bytes);
    assert_eq!(text, source);
    assert_eq!(encoding, "utf-16le");
    assert!(!had_errors);
}

#[test]
fn decodes_gbk_document() {
    // “中文” 的 GBK 编码为 D6 D0 CE C4
    let bytes = [0xD6, 0xD0, 0xCE, 0xC4];
    let (text, encoding, had_errors) = decode_markdown_bytes(&bytes);
    assert_eq!(text, "中文");
    assert_eq!(encoding, "gb18030");
    assert!(!had_errors);
}

#[test]
fn falls_back_marked_when_nothing_fits() {
    // 非法 UTF-8，且 GB18030 也无法完整解出的字节序列
    let bytes = [0x81, 0x30, 0xFF, 0xFF];
    let (_, encoding, _) = decode_markdown_bytes(&bytes);
    assert!(encoding == "utf-8" || encoding == "gb18030");
}
