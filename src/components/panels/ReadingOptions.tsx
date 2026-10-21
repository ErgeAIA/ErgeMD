import { ConfigLevelSelector } from "@/components/settings/ConfigLevelSelector";
import { useSettingsStore } from "@/stores/settingsStore";
import type { MindmapLayout, MindmapStyle, ThemeMode } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/** 每个主题的预览色（4 个特征色圆点） */
const themePreviewColors: Record<string, string[]> = {
  cyberpunk: ["#0A0A0F", "#00FFFF", "#BF00FF", "#FF6496"],
  dark: ["#1E1E1E", "#569CD6", "#CE9178", "#DCDCAA"],
  light: ["#F5F5F5", "#1565C0", "#E65100", "#6A1B9A"],
  falcon: ["#282A36", "#65BCD9", "#9876AA", "#6AAB73"],
  aurora: ["#0B1628", "#00D4AA", "#4FC3F7", "#7C4DFF"],
  "cherry-blossom": ["#1A1220", "#FFB7C5", "#D4A5FF", "#A5D6A7"],
  "desert-sunset": ["#1A1410", "#FFB347", "#E07A5F", "#F2CC8F"],
  forest: ["#0D1A12", "#4CAF50", "#AED581", "#FFD54F"],
  monochrome: ["#1A1A1A", "#BDBDBD", "#9E9E9E", "#757575"],
  ocean: ["#0A1628", "#42A5F5", "#26C6DA", "#80DEEA"],
  "solar-flare": ["#1A1408", "#FFD740", "#FF9100", "#FFAB40"],
  "tokyo-night": ["#1A1B2E", "#7AA2F7", "#BB9AF7", "#7DCFFF"],
  "neon-cyberpunk": ["#0A0010", "#00FFFF", "#FF00FF", "#FFFF00"],
  "solarized-light": ["#fdf6e3", "#2aa198", "#268bd2", "#b58900"],
};

/** 主题分类：14 套主题均为内置，不再按明暗分组；默认品牌色双主题（亮/暗）置顶 */
const themeCategories = [
  {
    key: "builtin",
    themes: [
      "light",
      "dark",
      "cyberpunk",
      "solarized-light",
      "falcon",
      "aurora",
      "cherry-blossom",
      "desert-sunset",
      "forest",
      "monochrome",
      "ocean",
      "solar-flare",
      "tokyo-night",
      "neon-cyberpunk",
    ] as ThemeMode[],
  },
  {
    key: "system",
    themes: ["system"] as ThemeMode[],
  },
];

/** 预设字体（跨平台通用回退） */
const fontPresets = [
  {
    label: "System Default",
    value: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  { label: "Windows", value: "'Segoe UI', 'Microsoft YaHei', sans-serif" },
  { label: "macOS", value: "'SF Pro Text', 'PingFang SC', sans-serif" },
  { label: "Ubuntu/Linux", value: "'Ubuntu', 'Noto Sans SC', sans-serif" },
  { label: "Serif", value: "'Georgia', 'Songti SC', serif" },
  {
    label: "Monospace",
    value: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
  },
];

/** 从 fontFamily 值匹配预设索引，未匹配到返回 -1 */
function matchPresetIndex(fontFamily: string): number {
  return fontPresets.findIndex((p) => p.value === fontFamily);
}

interface SystemFont {
  name: string;
  family: string;
  category: string;
}

interface FontCategory {
  label: string;
  fonts: SystemFont[];
}

interface ReadingOptionsProps {
  onShowAbout?: () => void;
}

const ReadingOptions: React.FC<ReadingOptionsProps> = memo(
  ({ onShowAbout }) => {
    const { t } = useTranslation();
    const readingSettings = useSettingsStore((s) => s.readingSettings);
    const updateReadingSettings = useSettingsStore(
      (s) => s.updateReadingSettings,
    );
    const setTheme = useSettingsStore((s) => s.setTheme);

    const [systemFonts, setSystemFonts] = useState<FontCategory[]>([]);
    const [fontSearchOpen, setFontSearchOpen] = useState(false);
    const [fontSearchQuery, setFontSearchQuery] = useState("");
    const [fontSearchLoading, setFontSearchLoading] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setFontSearchLoading(true);
      invoke<{
        sans_serif: SystemFont[];
        serif: SystemFont[];
        monospace: SystemFont[];
      }>("get_system_fonts")
        .then((result) => {
          const categories: FontCategory[] = [];
          if (result.sans_serif.length > 0) {
            categories.push({
              label: t("settings.fontCategory.sansSerif"),
              fonts: result.sans_serif,
            });
          }
          if (result.serif.length > 0) {
            categories.push({
              label: t("settings.fontCategory.serif"),
              fonts: result.serif,
            });
          }
          if (result.monospace.length > 0) {
            categories.push({
              label: t("settings.fontCategory.monospace"),
              fonts: result.monospace,
            });
          }
          setSystemFonts(categories);
        })
        .catch(() => {})
        .finally(() => setFontSearchLoading(false));
    }, [t]);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          searchRef.current &&
          !searchRef.current.contains(e.target as Node)
        ) {
          setFontSearchOpen(false);
        }
      };
      if (fontSearchOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [fontSearchOpen]);

    const isPreset = matchPresetIndex(readingSettings.fontFamily) >= 0;

    const filteredCategories = fontSearchQuery
      ? systemFonts
          .map((cat) => ({
            ...cat,
            fonts: cat.fonts.filter((f) =>
              f.name.toLowerCase().includes(fontSearchQuery.toLowerCase()),
            ),
          }))
          .filter((cat) => cat.fonts.length > 0)
      : systemFonts;

    const handleThemeSelect = useCallback(
      (theme: ThemeMode, e?: React.MouseEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        setTheme(theme);
      },
      [setTheme],
    );

    const handleSystemFontClick = useCallback(
      (font: SystemFont) => {
        updateReadingSettings({ fontFamily: `'${font.name}'` });
        setFontSearchOpen(false);
        setFontSearchQuery("");
      },
      [updateReadingSettings],
    );

    const handleFontSizeChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        updateReadingSettings({ fontSize: Number(e.target.value) });
      },
      [updateReadingSettings],
    );

    const handleLineHeightChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateReadingSettings({ lineHeight: Number(e.target.value) });
      },
      [updateReadingSettings],
    );

    const handleLetterSpacingChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        updateReadingSettings({ letterSpacing: Number(e.target.value) });
      },
      [updateReadingSettings],
    );

    const handleParagraphSpacingChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        updateReadingSettings({ paragraphSpacing: Number(e.target.value) });
      },
      [updateReadingSettings],
    );

    const handlePageWidthChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        updateReadingSettings({ pageWidth: Number(e.target.value) });
      },
      [updateReadingSettings],
    );

    const handleMindmapLayoutChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateReadingSettings({
          mindmapLayout: e.target.value as MindmapLayout,
        });
      },
      [updateReadingSettings],
    );

    const handleMindmapStyleChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateReadingSettings({
          mindmapStyle: e.target.value as MindmapStyle,
        });
      },
      [updateReadingSettings],
    );

    const sliderTrack = (value: number, min: number, max: number) =>
      `linear-gradient(to right, var(--accent-cyan) ${((value - min) / (max - min)) * 100}%, var(--bg-code) ${((value - min) / (max - min)) * 100}%)`;

    const labelStyle: React.CSSProperties = {
      fontSize: "13px",
      marginBottom: "8px",
      color: "var(--text-secondary)",
    };

    const isActive = (theme: ThemeMode) => readingSettings.theme === theme;

    return (
      <div className="flex flex-col" style={{ padding: "16px", gap: "20px" }}>
        {/* 主题选择 — 网格 */}
        <div>
          <div className="block" style={labelStyle}>
            {t("settings.theme")}
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {themeCategories.map((cat) => (
              <div key={cat.key}>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {t(`themeCategory.${cat.key}`)}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      cat.key === "system"
                        ? "1fr"
                        : "repeat(auto-fill, minmax(100px, 1fr))",
                    gap: "6px",
                  }}
                >
                  {cat.themes.map((theme) => {
                    const colors = themePreviewColors[theme] || [
                      "#333",
                      "#666",
                      "#999",
                      "#ccc",
                    ];
                    const active = isActive(theme);
                    return (
                      <button
                        key={theme}
                        onClick={(e) => handleThemeSelect(theme, e)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "6px 8px",
                          borderRadius: "6px",
                          border: active
                            ? "1px solid var(--accent-cyan)"
                            : "1px solid var(--border-subtle)",
                          background: active
                            ? "var(--hover-bg-light)"
                            : "transparent",
                          cursor: "pointer",
                          transition:
                            "background 100ms ease, border-color 100ms ease",
                          outline: "none",
                        }}
                        onMouseEnter={(e) => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.background =
                              "var(--hover-bg-subtle)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.background =
                              "transparent";
                          }
                        }}
                      >
                        {/* 色块预览 */}
                        <div
                          style={{ display: "flex", gap: "3px", flexShrink: 0 }}
                        >
                          {colors.map((color, i) => (
                            <div
                              key={i}
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background: color,
                              }}
                            />
                          ))}
                        </div>
                        {/* 主题名 */}
                        <span
                          style={{
                            fontSize: "12px",
                            color: active
                              ? "var(--accent-cyan)"
                              : "var(--text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {t(`theme.${theme}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 分隔线 */}
        <div style={{ height: "1px", background: "var(--divider)" }} />

        {/* 固定目录 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            id="reading-pin-toc"
            type="checkbox"
            checked={readingSettings.pinToc}
            onChange={(e) => updateReadingSettings({ pinToc: e.target.checked })}
            className="cursor-pointer"
            style={{ width: "16px", height: "16px", accentColor: "var(--accent-cyan)" }}
          />
          <label
            htmlFor="reading-pin-toc"
            className="cursor-pointer"
            style={{ ...labelStyle, marginBottom: 0 }}
          >
            {t("settings.pinToc")}
          </label>
        </div>

        {/* 字号 */}
        <div>
          <label
            htmlFor="reading-font-size"
            className="block"
            style={labelStyle}
          >
            {t("settings.fontSize")}
            <span style={{ marginLeft: "8px", color: "var(--accent-cyan)" }}>
              {readingSettings.fontSize}px
            </span>
          </label>
          <input
            id="reading-font-size"
            type="range"
            min="14"
            max="32"
            step="1"
            value={readingSettings.fontSize}
            onChange={handleFontSizeChange}
            className="cursor-pointer"
            style={{
              width: "100%",
              height: "4px",
              borderRadius: "2px",
              appearance: "none",
              background: sliderTrack(readingSettings.fontSize, 14, 32),
              accentColor: "var(--accent-cyan)",
            }}
          />
        </div>

        {/* 行间距 */}
        <div>
          <label
            htmlFor="reading-line-height"
            className="block"
            style={labelStyle}
          >
            {t("settings.lineHeight")}
            <span style={{ marginLeft: "8px", color: "var(--accent-cyan)" }}>
              {readingSettings.lineHeight}
            </span>
          </label>
          <select
            id="reading-line-height"
            value={readingSettings.lineHeight}
            onChange={handleLineHeightChange}
            style={{
              width: "100%",
              padding: "6px 12px",
              borderRadius: "4px",
              fontSize: "14px",
              background: "var(--bg-code)",
              color: "var(--text-primary)",
              border: "1px solid var(--divider)",
              outline: "none",
            }}
          >
            <option value="1.0">1.0</option>
            <option value="1.5">1.5</option>
            <option value="1.8">1.8</option>
            <option value="2.0">2.0</option>
          </select>
        </div>

        {/* 字间距 */}
        <div>
          <label
            htmlFor="reading-letter-spacing"
            className="block"
            style={labelStyle}
          >
            {t("settings.letterSpacing")}
            <span style={{ marginLeft: "8px", color: "var(--accent-cyan)" }}>
              {readingSettings.letterSpacing}px
            </span>
          </label>
          <input
            id="reading-letter-spacing"
            type="range"
            min="0"
            max="8"
            step="0.5"
            value={readingSettings.letterSpacing}
            onChange={handleLetterSpacingChange}
            className="cursor-pointer"
            style={{
              width: "100%",
              height: "4px",
              borderRadius: "2px",
              appearance: "none",
              background: sliderTrack(readingSettings.letterSpacing, 0, 8),
              accentColor: "var(--accent-cyan)",
            }}
          />
        </div>

        {/* 段落间距 */}
        <div>
          <label
            htmlFor="reading-paragraph-spacing"
            className="block"
            style={labelStyle}
          >
            {t("settings.paragraphSpacing")}
            <span style={{ marginLeft: "8px", color: "var(--accent-cyan)" }}>
              {readingSettings.paragraphSpacing}px
            </span>
          </label>
          <input
            id="reading-paragraph-spacing"
            type="range"
            min="0"
            max="40"
            step="2"
            value={readingSettings.paragraphSpacing}
            onChange={handleParagraphSpacingChange}
            className="cursor-pointer"
            style={{
              width: "100%",
              height: "4px",
              borderRadius: "2px",
              appearance: "none",
              background: sliderTrack(readingSettings.paragraphSpacing, 0, 40),
              accentColor: "var(--accent-cyan)",
            }}
          />
        </div>

        {/* 页面宽度 */}
        <div>
          <label
            htmlFor="reading-page-width"
            className="block"
            style={labelStyle}
          >
            {t("settings.pageWidth")}
            <span style={{ marginLeft: "8px", color: "var(--accent-cyan)" }}>
              {readingSettings.pageWidth}px
            </span>
          </label>
          <input
            id="reading-page-width"
            type="range"
            min="600"
            max="1400"
            step="50"
            value={readingSettings.pageWidth}
            onChange={handlePageWidthChange}
            className="cursor-pointer"
            style={{
              width: "100%",
              height: "4px",
              borderRadius: "2px",
              appearance: "none",
              background: sliderTrack(readingSettings.pageWidth, 600, 1400),
              accentColor: "var(--accent-cyan)",
            }}
          />
        </div>

        {/* Mermaid 思维导图布局 */}
        <div>
          <label
            htmlFor="reading-mindmap-layout"
            className="block"
            style={labelStyle}
          >
            {t("settings.mindmapLayout")}
          </label>
          <select
            id="reading-mindmap-layout"
            value={readingSettings.mindmapLayout}
            onChange={handleMindmapLayoutChange}
            style={{
              width: "100%",
              padding: "6px 12px",
              borderRadius: "4px",
              fontSize: "14px",
              background: "var(--bg-code)",
              color: "var(--text-primary)",
              border: "1px solid var(--divider)",
              outline: "none",
            }}
          >
            <option value="radial">{t("settings.mindmapLayoutRadial")}</option>
            <option value="tree">{t("settings.mindmapLayoutTree")}</option>
            <option value="logic">{t("settings.mindmapLayoutLogic")}</option>
          </select>
        </div>

        {/* Mermaid 思维导图样式（节点观感，与布局正交） */}
        <div>
          <label
            htmlFor="reading-mindmap-style"
            className="block"
            style={labelStyle}
          >
            {t("settings.mindmapStyle")}
          </label>
          <select
            id="reading-mindmap-style"
            value={readingSettings.mindmapStyle}
            onChange={handleMindmapStyleChange}
            style={{
              width: "100%",
              padding: "6px 12px",
              borderRadius: "4px",
              fontSize: "14px",
              background: "var(--bg-code)",
              color: "var(--text-primary)",
              border: "1px solid var(--divider)",
              outline: "none",
            }}
          >
            <option value="depth">{t("settings.mindmapStyleDepth")}</option>
            <option value="brand">{t("settings.mindmapStyleBrand")}</option>
            <option value="outline">{t("settings.mindmapStyleOutline")}</option>
            <option value="classic">{t("settings.mindmapStyleClassic")}</option>
          </select>
        </div>

        {/* 配置级别 */}
        <div>
          <label className="block" style={labelStyle}>
            {t("settings.configLevel")}
          </label>
          <ConfigLevelSelector />
        </div>

        {/* 分隔线 */}
        <div style={{ height: "1px", background: "var(--divider)" }} />

        {/* 字体 */}
        <div>
          <label className="block" style={labelStyle}>
            {t("settings.fontFamily")}
          </label>
          {/* 预设字体按钮 */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginBottom: "8px",
            }}
          >
            {fontPresets.map((preset) => {
              const isActive = readingSettings.fontFamily === preset.value;
              return (
                <button
                  key={preset.label}
                  onClick={() =>
                    updateReadingSettings({ fontFamily: preset.value })
                  }
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "14px",
                    background: isActive
                      ? "var(--accent-cyan)"
                      : "var(--bg-code)",
                    color: isActive
                      ? "var(--bg-primary)"
                      : "var(--text-primary)",
                    border: isActive
                      ? "1px solid var(--accent-cyan)"
                      : "1px solid var(--divider)",
                    cursor: "pointer",
                    fontFamily: preset.value,
                    transition: "all 100ms ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t(`settings.fontPresets.${preset.label}`)}
                </button>
              );
            })}
          </div>
          {/* 系统字体选择 */}
          <div style={{ position: "relative" }} ref={searchRef}>
            <button
              onClick={() => setFontSearchOpen(!fontSearchOpen)}
              style={{
                width: "100%",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "14px",
                background: "var(--bg-code)",
                color: isPreset
                  ? "var(--text-secondary)"
                  : "var(--text-primary)",
                border: "1px solid var(--divider)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 100ms ease",
              }}
            >
              {fontSearchLoading
                ? t("settings.loadingFonts")
                : isPreset
                  ? t("settings.systemFont")
                  : readingSettings.fontFamily}
            </button>

            {fontSearchOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: "4px",
                  background: "var(--bg-code)",
                  border: "1px solid var(--divider)",
                  borderRadius: "6px",
                  maxHeight: "300px",
                  overflowY: "auto",
                  zIndex: 100,
                }}
              >
                <div
                  style={{
                    padding: "8px",
                    borderBottom: "1px solid var(--divider)",
                    position: "sticky",
                    top: 0,
                    background: "var(--bg-code)",
                  }}
                >
                  <input
                    type="text"
                    value={fontSearchQuery}
                    onChange={(e) => setFontSearchQuery(e.target.value)}
                    placeholder={t("settings.searchFonts")}
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      borderRadius: "4px",
                      fontSize: "14px",
                      background: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--divider)",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {fontSearchLoading && (
                  <div
                    style={{
                      padding: "16px",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "14px",
                    }}
                  >
                    {t("settings.loadingFonts")}
                  </div>
                )}

                {!fontSearchLoading && filteredCategories.length === 0 && (
                  <div
                    style={{
                      padding: "16px",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "14px",
                    }}
                  >
                    {t("settings.noFontsFound")}
                  </div>
                )}

                {!fontSearchLoading &&
                  filteredCategories.map((cat) => (
                    <div key={cat.label}>
                      <div
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          background: "var(--hover-bg-subtle)",
                        }}
                      >
                        {cat.label}
                      </div>
                      {cat.fonts.map((font) => (
                        <button
                          key={font.name}
                          onClick={() => handleSystemFontClick(font)}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "6px 12px",
                            fontSize: "14px",
                            textAlign: "left",
                            background: "transparent",
                            color: "var(--text-primary)",
                            border: "none",
                            cursor: "pointer",
                            fontFamily: `'${font.name}'`,
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              "var(--hover-bg-subtle)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              "transparent";
                          }}
                        >
                          {font.name}
                        </button>
                      ))}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* 分隔线 */}
        <div style={{ height: "1px", background: "var(--divider)" }} />

        {/* 关于 */}
        {onShowAbout && (
          <button
            onClick={onShowAbout}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              width: "100%",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: "14px",
              cursor: "pointer",
              transition: "background 100ms ease, border-color 100ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--hover-bg-subtle)";
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--accent-cyan)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--border-subtle)";
            }}
          >
            <span>ℹ️</span>
            <span>{t("about.menuLabel")}</span>
          </button>
        )}
      </div>
    );
  },
);

ReadingOptions.displayName = "ReadingOptions";

export default ReadingOptions;
