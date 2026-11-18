import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enUS from "./en-US.json";
import zhCN from "./zh-CN.json";

// 从 settingsStore 的 persist 存储中读取语言设置
const savedLanguage = localStorage.getItem("ergemd-settings");
let defaultLanguage = "auto";

if (savedLanguage) {
  try {
    const parsed = JSON.parse(savedLanguage);
    defaultLanguage = parsed?.state?.readingSettings?.language || "auto";
  } catch {
    // ignore
  }
}

function resolveLanguage(lang: string): string {
  if (lang === "auto") {
    // Tauri webview 的 navigator.language 在中文系统上可能返回 "en-US"
    // 因此默认回退到中文，只有明确检测到非中文语言才用英文
    const navLang = navigator.language;
    if (navLang.startsWith("zh")) return "zh-CN";
    if (navLang.startsWith("en")) return "en-US";
    // 其他语言（日语、韩语等）也回退到中文，因为主要面向中文用户
    return "zh-CN";
  }
  return lang;
}

i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { translation: zhCN },
    "en-US": { translation: enUS },
  },
  lng: resolveLanguage(defaultLanguage),
  fallbackLng: "zh-CN",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
