use font_enumeration::Collection;
use serde::Serialize;
use std::collections::HashSet;

#[derive(Debug, Serialize, Clone)]
pub struct SystemFont {
    pub name: String,
    pub family: String,
    pub category: String,
}

#[derive(Debug, Serialize)]
pub struct FontListResult {
    pub sans_serif: Vec<SystemFont>,
    pub serif: Vec<SystemFont>,
    pub monospace: Vec<SystemFont>,
}

const BLOCKLIST: &[&str] = &[
    "wingdings",
    "webdings",
    "symbol",
    "segoe mdl2 assets",
    "segoe ui symbol",
    "segoe ui emoji",
    "noto color emoji",
    "apple color emoji",
    "emoji",
    "comicsans",
    "comic sans",
    "papyrus",
    "jokerman",
    "curlz",
    "chiller",
    "vivaldi",
    "harlow solid",
    "old english",
    "blackletter",
    "fraktur",
    "impact",
    "broadway",
    "colonna",
    "showcard gothic",
    "stencil",
    "tempus sans itc",
    "forte",
    "snap itc",
    "niagara",
    "matura",
    "playbill",
    "poor richard",
    "pristina",
    "ravie",
    "viner hand",
    "gigi",
    "harrington",
    "juice itc",
    "kristen itc",
    "lucida handwriting",
    "mistral",
    "palace script",
    "script mt bold",
];

fn is_blocked(name: &str) -> bool {
    let lower = name.to_lowercase();
    BLOCKLIST.iter().any(|b| lower.contains(b))
}

fn categorize_font(name: &str) -> &'static str {
    let lower = name.to_lowercase();

    if lower.contains("mono")
        || lower.contains("consolas")
        || lower.contains("courier")
        || lower.contains("fira code")
        || lower.contains("jetbrains")
        || lower.contains("source code")
        || lower.contains("roboto mono")
        || lower.contains("ubuntu mono")
        || lower.contains("cascadia")
        || lower.contains("hack")
        || lower.contains("inconsolata")
        || lower.contains("menlo")
        || lower.contains("monaco")
        || lower.contains("terminus")
        || lower.contains("dejavu sans mono")
    {
        return "monospace";
    }

    if lower.contains("serif")
        || lower.contains("times")
        || lower.contains("georgia")
        || lower.contains("garamond")
        || lower.contains("palatino")
        || lower.contains("baskerville")
        || lower.contains("bookman")
        || lower.contains("cambria")
        || lower.contains("constantia")
        || lower.contains("didot")
        || lower.contains("bodoni")
        || lower.contains("songti")
        || lower.contains("simsum")
        || lower.contains("mingliu")
        || lower.contains("pmingliu")
        || lower.contains("fangsong")
        || lower.contains("kaiti")
        || lower.contains("stsong")
        || lower.contains("stfangsong")
        || lower.contains("stkaiti")
        || lower.contains("stxihei")
        || lower.contains("ms mincho")
        || lower.contains("ms gothic")
        || lower.contains("yu mincho")
        || lower.contains("hiragino mincho")
        || lower.contains("batang")
        || lower.contains("gungsuh")
        || lower.contains("dotum")
    {
        return "serif";
    }

    "sans-serif"
}

#[tauri::command]
pub async fn get_system_fonts() -> Result<FontListResult, String> {
    // 字体枚举是同步阻塞操作，放入线程池避免占住主线程
    tauri::async_runtime::spawn_blocking(move || -> Result<FontListResult, String> {
        let collection = Collection::new().map_err(|e| format!("Failed to list fonts: {}", e))?;

        let mut seen = HashSet::new();
        let mut sans_serif: Vec<SystemFont> = Vec::new();
        let mut serif: Vec<SystemFont> = Vec::new();
        let mut monospace: Vec<SystemFont> = Vec::new();

        for font in collection.all() {
            let family = font.family_name.clone();

            if seen.contains(&family) {
                continue;
            }
            seen.insert(family.clone());

            if is_blocked(&family) {
                continue;
            }

            let category = categorize_font(&family);
            let sys_font = SystemFont {
                name: family.clone(),
                family,
                category: category.to_string(),
            };

            match category {
                "monospace" => monospace.push(sys_font),
                "serif" => serif.push(sys_font),
                _ => sans_serif.push(sys_font),
            }
        }

        sans_serif.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        serif.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        monospace.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

        Ok(FontListResult {
            sans_serif,
            serif,
            monospace,
        })
    })
    .await
    .map_err(|e| format!("Font enumeration task failed: {}", e))?
}
