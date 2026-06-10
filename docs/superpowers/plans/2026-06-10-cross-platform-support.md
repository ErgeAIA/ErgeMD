# ErgeMD 跨平台支持（macOS + Linux）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 ErgeMD 在 Windows、macOS、Linux 三大平台均能正确构建、运行、导出 PDF、获取更新。

**Architecture:**
- **后端**：用 `cfg(target_os = "...")` 拆分平台特定逻辑；`update.rs` 的资产选择按 `target_os` 关键字匹配；`reveal_in_explorer` 拆为三平台命令构造器。
- **前端**：通过统一的 `platform` 工具（基于 `navigator.userAgent`）隐藏 macOS 上的自绘窗口控制按钮；非 Windows 平台在 PDF 导出时显示 Toast 引导用户。
- **构建**：扩展 `tauri.conf.json` 启用 macOS/Linux bundle target；`rename-bundle.js` 按 `process.platform` 分流重命名；`.github/workflows/release.yml` 改为矩阵构建。
- **测试**：建立 Vitest（前端） + cargo test（Rust）双层单元测试；CI 强制跑测试；关键模块有覆盖率。

**Tech Stack:** Tauri 2.x, React 19, TypeScript 5.8, Rust (stable), Vitest 2.x, GitHub Actions

---

## 决策确认（来自用户）

| # | 决策点 | 用户选择 |
| --- | --- | --- |
| 1 | PDF 导出 v0.4.0 接受 `window.print()` 手动方案 | 接受 |
| 2 | macOS 代码签名 | 暂不（免费软件） |
| 3 | Linux 平台范围 | x86_64-only |
| 4 | CI 多平台构建时机 | 仅 push tag 时 |
| 5 | 外部测试用户招募 | Gitee Issue 公开招募 |

---

## 总体阶段

| 阶段 | 分支 | 目标 | tag |
| --- | --- | --- | --- |
| Phase 0 | — | 测试基础设施（Vitest + cargo test） | — |
| Phase 1 | `refactor/platform-decouple` | 平台分支逻辑抽离为可测试纯函数 | — |
| Phase 2 | `feature/macos-support` | macOS 全流程适配 | v0.4.0 |
| Phase 3 | `feature/linux-support` | Linux 全流程适配 | v0.5.0 |

---

## 文件结构

### 新建文件

| 路径 | 职责 |
| --- | --- |
| `vitest.config.ts` | Vitest 配置（jsdom 环境，TS 支持） |
| `tests/setup.ts` | Vitest 全局 setup |
| `src/utils/platform.test.ts` | 平台检测工具测试 |
| `src/utils/export.test.ts` | 导出逻辑测试 |
| `src/utils/markdownBlocks.test.ts` | Markdown 解析测试 |
| `src/utils/wordCount.test.ts` | 字数统计测试 |
| `src/utils/readingProgress.test.ts` | 阅读进度工具测试 |
| `src/utils/toc.test.ts` | 目录生成测试 |
| `src/utils/generateExportHtml.test.ts` | 导出 HTML 生成测试 |
| `src/utils/__mocks__/tauri.ts` | Tauri API mock（避免在测试中触发真实调用） |
| `src-tauri/tests/update_assets.rs` | `update.rs` 资产选择集成测试 |
| `src-tauri/tests/reveal_command.rs` | `reveal_in_explorer` 命令构造器测试 |
| `src-tauri/tests/word_count.rs` | `mod.rs` 字数统计单元测试 |
| `src-tauri/tests/path_validation.rs` | `validate_path` 单元测试 |
| `src-tauri/tests/version_compare.rs` | `is_newer_version` 单元测试 |
| `docs/superpowers/plans/2026-06-10-cross-platform-support.md` | 本文件 |

### 修改文件

| 路径 | 修改原因 |
| --- | --- |
| `package.json` | 添加 vitest 依赖与 test 脚本 |
| `src/utils/platform.ts` | **新建**：统一平台检测工具 |
| `src/utils/platform.test.ts` | **新建**：platform 工具的测试 |
| `src-tauri/src/commands/update.rs` | 拆分 `pick_nsis_download_url` → `pick_platform_download_url`；按 `target_os` 匹配 |
| `src-tauri/src/commands/mod.rs` | `reveal_in_explorer` 拆出 `build_reveal_command` 纯函数；macOS 走 `open -R` |
| `src-tauri/src/commands/pdf.rs` | 调整 macOS/Linux 占位文案（仍是 `window.print()`，但带明确提示） |
| `src-tauri/tauri.conf.json` | 添加 macOS / Linux bundle 配置 |
| `src/components/layout/TitleBar.tsx` | macOS 上隐藏自绘窗口控制按钮 |
| `src/hooks/useKeyboardShortcuts.ts` | 在 `Ctrl+Shift+D` 提示中做平台判断（macOS 显示 Finder、Linux 显示 Files） |
| `scripts/rename-bundle.js` | 按 `process.platform` 分流，支持 `.dmg` / `.app` / `.AppImage` / `.deb` |
| `.github/workflows/release.yml` | 矩阵构建 macOS-latest × 2 (arm64 + x64) + ubuntu-22.04 |
| `README.md` | 添加 macOS / Linux 下载链接与系统依赖说明 |
| `README.en.md` | 同上英文版 |
| `CHANGELOG.md` | 跨平台支持条目 |
| `CHANGELOG.en.md` | 同上英文版 |

---

## Phase 0：测试基础设施

### Task 0.1: 在 package.json 添加 Vitest 依赖

**Files:**
- Modify: `package.json:8-14`

- [ ] **Step 1: 添加 devDependencies 项**

打开 `package.json`，在 `devDependencies` 中加入：

```json
"vitest": "^2.1.9",
"@vitest/ui": "^2.1.9",
"jsdom": "^25.0.1",
"@testing-library/react": "^16.1.0",
"@testing-library/dom": "^10.4.0"
```

- [ ] **Step 2: 添加 scripts**

在 `scripts` 中加入：

```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui",
"test:coverage": "vitest run --coverage",
"test:rust": "cd src-tauri && cargo test"
```

- [ ] **Step 3: 提交**

```bash
git add package.json
git commit -m "chore(test): add vitest + @testing-library deps"
```

---

### Task 0.2: 创建 Vitest 配置文件

**Files:**
- Create: `vitest.config.ts`

- [ ] **Step 1: 写配置**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      exclude: [
        "node_modules/",
        "src/**/*.test.{ts,tsx}",
        "src/**/index.ts",
        "src/main.tsx",
        "src/App.tsx",
      ],
      thresholds: {
        // 起步阶段保守；后续按模块单独设
        lines: 30,
        functions: 30,
        branches: 30,
        statements: 30,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 2: 安装依赖**

```bash
pnpm install
```

Expected: 安装成功，`pnpm-lock.yaml` 更新；`node_modules/vitest` 存在。

- [ ] **Step 3: 验证安装**

```bash
pnpm test --version
```

Expected: 输出类似 `vitest 2.1.x` 的版本号。

- [ ] **Step 4: 提交**

```bash
git add vitest.config.ts pnpm-lock.yaml
git commit -m "chore(test): add vitest config with jsdom + coverage"
```

---

### Task 0.3: 创建测试 setup 文件

**Files:**
- Create: `tests/setup.ts`

- [ ] **Step 1: 写 setup**

```typescript
import { vi } from "vitest";

// 全局 Tauri API mock，避免测试中触发真实 invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    close: vi.fn(),
    isMaximized: vi.fn(() => Promise.resolve(false)),
    onResized: vi.fn(() => Promise.resolve(() => {})),
    setPosition: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    outerPosition: vi.fn(() => Promise.resolve({ x: 0, y: 0 })),
    startDragging: vi.fn(),
    toggleMaximize: vi.fn(),
  })),
  LogicalPosition: class {
    constructor(public x: number, public y: number) {}
  },
}));

vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: vi.fn(() => ({
    onDragDropEvent: vi.fn(() => Promise.resolve(() => {})),
  })),
}));

// 静默 React 18+ act() 警告（Vitest 环境的常见噪音）
const originalError = console.error;
beforeEach(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("not wrapped in act")) {
      return;
    }
    originalError(...args);
  };
});
afterEach(() => {
  console.error = originalError;
});
```

- [ ] **Step 2: 验证文件存在**

```bash
ls tests/setup.ts
```

Expected: 输出文件路径，无错误。

- [ ] **Step 3: 提交**

```bash
git add tests/setup.ts
git commit -m "chore(test): add global vitest setup with Tauri API mocks"
```

---

### Task 0.4: 写第一个 Vitest 测试

**Files:**
- Create: `src/utils/sanity.test.ts`

- [ ] **Step 1: 写测试**

```typescript
import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("runs the test runner", () => {
    expect(1 + 1).toBe(2);
  });

  it("supports async", async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
```

- [ ] **Step 2: 跑测试**

```bash
pnpm test
```

Expected: 2 passed, 0 failed。

- [ ] **Step 3: 提交**

```bash
git add src/utils/sanity.test.ts
git commit -m "test: add sanity test to verify vitest setup"
```

---

### Task 0.5: 验证 Rust 端 cargo test 跑得通

**Files:**
- 无新增/修改

- [ ] **Step 1: 跑现有 Rust 单元测试**

```bash
cd src-tauri && cargo test --lib
```

Expected: 编译成功；如果没有任何 `#[test]` 函数，输出 `0 passed`，但编译必须 0 错误 0 警告（warnings 需要评估是否清空）。

- [ ] **Step 2: 跑集成测试目录**

```bash
cd src-tauri && cargo test --tests
```

Expected: 编译成功，0 个集成测试（目录不存在则报 no tests，这是预期）。

- [ ] **Step 3: 确认 package.json 已含 test:rust**

查看 `package.json` 的 scripts 段，应该已有 `test:rust`。如果没有，按 Task 0.1 的内容补上。

- [ ] **Step 4: 提交（如有 package.json 变更）**

```bash
git add package.json
git commit -m "chore(test): ensure cargo test script alias exists"
```

---

## Phase 1：平台分支解耦（为跨平台重构铺路）

### Task 1.1: 新建 platform 工具（前端）

**Files:**
- Create: `src/utils/platform.ts`
- Create: `src/utils/platform.test.ts`

- [ ] **Step 1: 写测试（TDD：先红）**

`src/utils/platform.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { detectPlatform, type Platform, getPlatformLabel } from "./platform";

describe("detectPlatform", () => {
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
  });

  function setUserAgent(ua: string) {
    Object.defineProperty(navigator, "userAgent", {
      value: ua,
      configurable: true,
    });
  }

  it("detects macOS", () => {
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15");
    expect(detectPlatform()).toBe("macos");
  });

  it("detects Windows", () => {
    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    expect(detectPlatform()).toBe("windows");
  });

  it("detects Linux", () => {
    setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36");
    expect(detectPlatform()).toBe("linux");
  });

  it("falls back to unknown for unrecognized UA", () => {
    setUserAgent("curl/7.81.0");
    expect(detectPlatform()).toBe("unknown");
  });
});

describe("getPlatformLabel", () => {
  it("returns Chinese label for macOS", () => {
    expect(getPlatformLabel("macos", "zh-CN")).toBe("访达");
  });

  it("returns Chinese label for Windows", () => {
    expect(getPlatformLabel("windows", "zh-CN")).toBe("资源管理器");
  });

  it("returns Chinese label for Linux", () => {
    expect(getPlatformLabel("linux", "zh-CN")).toBe("文件管理器");
  });

  it("returns English label for macOS", () => {
    expect(getPlatformLabel("macos", "en-US")).toBe("Finder");
  });

  it("returns English label for Windows", () => {
    expect(getPlatformLabel("windows", "en-US")).toBe("Explorer");
  });

  it("returns English label for Linux", () => {
    expect(getPlatformLabel("linux", "en-US")).toBe("File Manager");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm test src/utils/platform.test.ts
```

Expected: FAIL，错误 `Cannot find module './platform'`。

- [ ] **Step 3: 写实现**

`src/utils/platform.ts`：

```typescript
export type Platform = "macos" | "windows" | "linux" | "unknown";

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac") || ua.includes("darwin")) return "macos";
  if (ua.includes("win")) return "windows";
  if (ua.includes("linux") || ua.includes("x11")) return "linux";
  return "unknown";
}

export function getPlatformLabel(platform: Platform, locale: "zh-CN" | "en-US"): string {
  const labels: Record<Platform, Record<string, string>> = {
    macos: { "zh-CN": "访达", "en-US": "Finder" },
    windows: { "zh-CN": "资源管理器", "en-US": "Explorer" },
    linux: { "zh-CN": "文件管理器", "en-US": "File Manager" },
    unknown: { "zh-CN": "文件管理器", "en-US": "File Manager" },
  };
  return labels[platform][locale] ?? labels[platform]["en-US"];
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm test src/utils/platform.test.ts
```

Expected: 10 passed。

- [ ] **Step 5: 提交**

```bash
git add src/utils/platform.ts src/utils/platform.test.ts
git commit -m "feat(utils): add platform detection + label helper with tests"
```

---

### Task 1.2: 重构 `update.rs` 的资产选择为可测试函数

**Files:**
- Modify: `src-tauri/src/commands/update.rs:30-60`
- Create: `src-tauri/tests/update_assets.rs`

- [ ] **Step 1: 写集成测试（先红）**

`src-tauri/tests/update_assets.rs`：

```rust
use serde_json::json;

#[test]
fn pick_windows_assets_prefers_setup_exe() {
    let assets = json!([
        { "name": "ErgeMD-v0.4.0-portable.zip", "browser_download_url": "url-portable" },
        { "name": "ErgeMD-v0.4.0-x64-setup.exe", "browser_download_url": "url-setup" }
    ]);
    let url = ergemd_lib::test_support::pick_platform_download_url_for_test(
        "windows",
        &assets,
        "https://fallback",
    );
    assert_eq!(url, "url-setup");
}

#[test]
fn pick_windows_assets_falls_back_to_portable_zip() {
    let assets = json!([
        { "name": "ErgeMD-v0.4.0-portable.zip", "browser_download_url": "url-portable" }
    ]);
    let url = ergemd_lib::test_support::pick_platform_download_url_for_test(
        "windows",
        &assets,
        "https://fallback",
    );
    assert_eq!(url, "url-portable");
}

#[test]
fn pick_macos_assets_prefers_dmg() {
    let assets = json!([
        { "name": "ErgeMD-v0.4.0-macos.app.tar.gz", "browser_download_url": "url-tar" },
        { "name": "ErgeMD-v0.4.0-macos-universal.dmg", "browser_download_url": "url-dmg" }
    ]);
    let url = ergemd_lib::test_support::pick_platform_download_url_for_test(
        "macos",
        &assets,
        "https://fallback",
    );
    assert_eq!(url, "url-dmg");
}

#[test]
fn pick_linux_assets_prefers_appimage() {
    let assets = json!([
        { "name": "ergemd_0.4.0_amd64.deb", "browser_download_url": "url-deb" },
        { "name": "ErgeMD-v0.4.0-x86_64.AppImage", "browser_download_url": "url-appimage" }
    ]);
    let url = ergemd_lib::test_support::pick_platform_download_url_for_test(
        "linux",
        &assets,
        "https://fallback",
    );
    assert_eq!(url, "url-appimage");
}

#[test]
fn pick_unknown_platform_returns_html_url_fallback() {
    let assets = json!([
        { "name": "ErgeMD-v0.4.0-x64-setup.exe", "browser_download_url": "url-setup" }
    ]);
    let url = ergemd_lib::test_support::pick_platform_download_url_for_test(
        "unknown",
        &assets,
        "https://fallback",
    );
    assert_eq!(url, "https://fallback");
}
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd src-tauri && cargo test --test update_assets
```

Expected: 编译失败，错误 `cannot find function test_support::pick_platform_download_url_for_test`。

- [ ] **Step 3: 在 update.rs 添加 `pub(crate)` 纯函数与 test_support 模块**

修改 `src-tauri/src/commands/update.rs`：

```rust
use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct UpdateInfo {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub download_url: String,
    pub release_notes: String,
}

/// 按 `target_os` 关键字从 assets 列表中选择下载链接。
/// `target_os` 接受 "windows" | "macos" | "linux" | 其他（回退到 html_url）。
pub(crate) fn pick_platform_download_url(
    target_os: &str,
    assets: &serde_json::Value,
    html_url: &str,
) -> String {
    let arr = match assets.as_array() {
        Some(a) => a,
        None => return html_url.to_string(),
    };

    let (primary_ext, fallback_ext) = match target_os {
        "windows" => (Some("setup.exe"), Some("portable.zip")),
        "macos" => (Some("dmg"), Some("app.tar.gz")),
        "linux" => (Some("AppImage"), Some("deb")),
        _ => return html_url.to_string(),
    };

    for asset in arr {
        let name = asset["name"].as_str().unwrap_or("").to_lowercase();
        if let Some(ext) = primary_ext {
            if name.ends_with(ext) {
                if let Some(url) = asset["browser_download_url"].as_str() {
                    return url.to_string();
                }
            }
        }
    }

    if let Some(fb) = fallback_ext {
        for asset in arr {
            let name = asset["name"].as_str().unwrap_or("").to_lowercase();
            if name.ends_with(fb) {
                if let Some(url) = asset["browser_download_url"].as_str() {
                    return url.to_string();
                }
            }
        }
    }

    html_url.to_string()
}

/// 保留旧名以保持向后兼容（待所有 caller 切换后删除）
fn pick_nsis_download_url(assets: &serde_json::Value, html_url: &str) -> String {
    pick_platform_download_url("windows", assets, html_url)
}

#[tauri::command]
pub async fn check_update(current_version: String) -> Result<UpdateInfo, String> {
    let github_result = fetch_github_latest().await;
    let gitee_result = fetch_gitee_latest().await;

    let latest = pick_latest(github_result, gitee_result)?;

    let has_update = is_newer_version(&current_version, &latest.version);

    Ok(UpdateInfo {
        has_update,
        current_version,
        latest_version: latest.version,
        download_url: latest.download_url,
        release_notes: latest.release_notes,
    })
}

struct ReleaseInfo {
    version: String,
    download_url: String,
    release_notes: String,
}

async fn fetch_github_latest() -> Result<ReleaseInfo, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("ErgeMD-Update-Checker")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let resp = client
        .get("https://api.github.com/repos/ErgeAIA/ErgeMD/releases/latest")
        .send()
        .await
        .map_err(|e| format!("GitHub API request failed: {}", e))?;

    if resp.status() == reqwest::StatusCode::FORBIDDEN {
        return Err("GitHub API rate limit exceeded".to_string());
    }

    if !resp.status().is_success() {
        return Err(format!("GitHub API returned status: {}", resp.status()));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse GitHub response: {}", e))?;

    let tag = json["tag_name"]
        .as_str()
        .unwrap_or("")
        .trim_start_matches('v')
        .to_string();

    let html_url = json["html_url"]
        .as_str()
        .unwrap_or("https://github.com/ErgeAIA/ErgeMD/releases")
        .to_string();

    let target_os = std::env::consts::OS;
    let download_url = pick_platform_download_url(target_os, &json["assets"], &html_url);

    let release_notes = json["body"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(ReleaseInfo {
        version: tag,
        download_url,
        release_notes,
    })
}

async fn fetch_gitee_latest() -> Result<ReleaseInfo, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("ErgeMD-Update-Checker")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let resp = client
        .get("https://gitee.com/api/v5/repos/ErgeAIA/ErgeMD/releases/latest")
        .send()
        .await
        .map_err(|e| format!("Gitee API request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Gitee API returned status: {}", resp.status()));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse Gitee response: {}", e))?;

    let tag = json["tag_name"]
        .as_str()
        .unwrap_or("")
        .trim_start_matches('v')
        .to_string();

    let html_url = json["html_url"]
        .as_str()
        .unwrap_or("https://gitee.com/ErgeAIA/ErgeMD/releases")
        .to_string();

    let target_os = std::env::consts::OS;
    let download_url = pick_platform_download_url(target_os, &json["assets"], &html_url);

    let release_notes = json["body"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(ReleaseInfo {
        version: tag,
        download_url,
        release_notes,
    })
}

fn pick_latest(
    github: Result<ReleaseInfo, String>,
    gitee: Result<ReleaseInfo, String>,
) -> Result<ReleaseInfo, String> {
    match (github, gitee) {
        (Ok(gh), Ok(gi)) => {
            if is_newer_version(&gh.version, &gi.version) {
                Ok(gh)
            } else {
                Ok(gi)
            }
        }
        (Ok(gh), Err(_)) => Ok(gh),
        (Err(_), Ok(gi)) => Ok(gi),
        (Err(gh_err), Err(gi_err)) => Err(format!(
            "Both APIs failed. GitHub: {}; Gitee: {}",
            gh_err, gi_err
        )),
    }
}

fn is_newer_version(current: &str, latest: &str) -> bool {
    let cur_parts: Vec<u32> = current
        .split('.')
        .filter_map(|s| s.parse().ok())
        .collect();
    let lat_parts: Vec<u32> = latest
        .split('.')
        .filter_map(|s| s.parse().ok())
        .collect();

    if cur_parts.is_empty() || lat_parts.is_empty() {
        return false;
    }

    let max_len = cur_parts.len().max(lat_parts.len());
    for i in 0..max_len {
        let cur = cur_parts.get(i).unwrap_or(&0);
        let lat = lat_parts.get(i).unwrap_or(&0);
        if lat > cur {
            return true;
        }
        if lat < cur {
            return false;
        }
    }

    false
}

#[cfg(test)]
pub mod test_support {
    use super::pick_platform_download_url;
    pub fn pick_platform_download_url_for_test(
        target_os: &str,
        assets: &serde_json::Value,
        html_url: &str,
    ) -> String {
        pick_platform_download_url(target_os, assets, html_url)
    }
}
```

- [ ] **Step 4: 在 lib.rs 暴露 test_support 模块**

修改 `src-tauri/src/lib.rs`，在文件底部（`run()` 之后）添加：

```rust
// 暴露给集成测试的辅助模块
pub mod commands {
    pub use crate::commands::*;
}
```

（注意：如果 `pub mod commands;` 已存在于 lib.rs，则跳过此步。）

- [ ] **Step 5: 跑测试确认通过**

```bash
cd src-tauri && cargo test --test update_assets
```

Expected: 5 passed。

- [ ] **Step 6: 跑全量 cargo test 确保未破坏现有逻辑**

```bash
cd src-tauri && cargo test
```

Expected: 全部通过。

- [ ] **Step 7: 提交**

```bash
git add src-tauri/src/commands/update.rs src-tauri/src/lib.rs src-tauri/tests/update_assets.rs
git commit -m "refactor(update): split pick_platform_download_url for cross-platform with tests"
```

---

### Task 1.3: 重构 `reveal_in_explorer` 为可测试的命令构造器

**Files:**
- Modify: `src-tauri/src/commands/mod.rs:289-313`
- Create: `src-tauri/tests/reveal_command.rs`

- [ ] **Step 1: 写集成测试（先红）**

`src-tauri/tests/reveal_command.rs`：

```rust
use std::path::Path;

#[test]
fn build_windows_reveal_command_uses_explorer_select() {
    let (program, args) = ergemd_lib::test_support::build_reveal_command_for_test(
        "windows",
        Path::new("C:\\Users\\test\\note.md"),
    );
    assert_eq!(program, "explorer");
    assert_eq!(args, vec!["/select,", "C:\\Users\\test\\note.md"]);
}

#[test]
fn build_macos_reveal_command_uses_open_select() {
    let (program, args) = ergemd_lib::test_support::build_reveal_command_for_test(
        "macos",
        Path::new("/Users/test/note.md"),
    );
    assert_eq!(program, "open");
    assert_eq!(args, vec!["-R", "/Users/test/note.md"]);
}

#[test]
fn build_linux_reveal_command_uses_xdg_open_on_parent() {
    let (program, args) = ergemd_lib::test_support::build_reveal_command_for_test(
        "linux",
        Path::new("/home/test/notes/note.md"),
    );
    assert_eq!(program, "xdg-open");
    assert_eq!(args, vec!["/home/test/notes"]);
}

#[test]
fn build_linux_reveal_command_uses_file_path_when_no_parent() {
    let (program, args) = ergemd_lib::test_support::build_reveal_command_for_test(
        "linux",
        Path::new("/note.md"),
    );
    assert_eq!(program, "xdg-open");
    // 父目录为空时回退到文件自身
    assert_eq!(args, vec!["/"]);
}

#[test]
fn build_unknown_platform_falls_back_to_xdg_open() {
    let (program, _) = ergemd_lib::test_support::build_reveal_command_for_test(
        "freebsd",
        Path::new("/tmp/note.md"),
    );
    // 未知平台回退到 xdg-open（Linux 路径），不报错
    assert_eq!(program, "xdg-open");
}
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd src-tauri && cargo test --test reveal_command
```

Expected: 编译失败，错误 `cannot find function test_support::build_reveal_command_for_test`。

- [ ] **Step 3: 重构 mod.rs**

修改 `src-tauri/src/commands/mod.rs` 的 `reveal_in_explorer` 函数（289-313 行）：

```rust
/// 根据平台构造"在文件管理器中显示"的命令。
/// 返回 (program, args)。该函数是纯函数，便于测试。
pub(crate) fn build_reveal_command(
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
```

- [ ] **Step 4: 在 mod.rs 暴露 test_support**

在 `mod.rs` 顶部或底部添加：

```rust
#[cfg(test)]
pub mod test_support {
    use std::path::Path;
    pub fn build_reveal_command_for_test(
        target_os: &str,
        file_path: &Path,
    ) -> (String, Vec<String>) {
        super::build_reveal_command(target_os, file_path)
    }
}
```

- [ ] **Step 5: 跑测试确认通过**

```bash
cd src-tauri && cargo test --test reveal_command
```

Expected: 5 passed。

- [ ] **Step 6: 跑全量测试**

```bash
cd src-tauri && cargo test
```

Expected: 全部通过。

- [ ] **Step 7: 提交**

```bash
git add src-tauri/src/commands/mod.rs src-tauri/tests/reveal_command.rs
git commit -m "refactor(commands): split build_reveal_command for cross-platform with tests"
```

---

### Task 1.4: 写 `is_newer_version` 单元测试

**Files:**
- Create: `src-tauri/tests/version_compare.rs`

- [ ] **Step 1: 写测试（先红）**

```rust
#[test]
fn detects_patch_upgrade() {
    assert!(ergemd_lib::test_support::is_newer_version_for_test("0.3.6", "0.3.7"));
}

#[test]
fn detects_minor_upgrade() {
    assert!(ergemd_lib::test_support::is_newer_version_for_test("0.3.7", "0.4.0"));
}

#[test]
fn detects_major_upgrade() {
    assert!(ergemd_lib::test_support::is_newer_version_for_test("0.9.9", "1.0.0"));
}

#[test]
fn rejects_equal_version() {
    assert!(!ergemd_lib::test_support::is_newer_version_for_test("0.3.7", "0.3.7"));
}

#[test]
fn rejects_downgrade() {
    assert!(!ergemd_lib::test_support::is_newer_version_for_test("0.4.0", "0.3.7"));
}

#[test]
fn handles_unequal_segment_count() {
    // 0.3.7 vs 0.3.7.1：后者更新
    assert!(ergemd_lib::test_support::is_newer_version_for_test("0.3.7", "0.3.7.1"));
    // 0.3 vs 0.3.0：相等
    assert!(!ergemd_lib::test_support::is_newer_version_for_test("0.3", "0.3.0"));
}

#[test]
fn returns_false_on_invalid_input() {
    assert!(!ergemd_lib::test_support::is_newer_version_for_test("invalid", "0.3.7"));
    assert!(!ergemd_lib::test_support::is_newer_version_for_test("0.3.7", "invalid"));
}
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd src-tauri && cargo test --test version_compare
```

Expected: 编译失败，错误 `cannot find function test_support::is_newer_version_for_test`。

- [ ] **Step 3: 在 update.rs 的 test_support 模块追加**

修改 `src-tauri/src/commands/update.rs` 末尾的 `#[cfg(test)] pub mod test_support { ... }` 块：

```rust
#[cfg(test)]
pub mod test_support {
    use super::*;

    pub fn pick_platform_download_url_for_test(
        target_os: &str,
        assets: &serde_json::Value,
        html_url: &str,
    ) -> String {
        pick_platform_download_url(target_os, assets, html_url)
    }

    pub fn is_newer_version_for_test(current: &str, latest: &str) -> bool {
        is_newer_version(current, latest)
    }
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
cd src-tauri && cargo test --test version_compare
```

Expected: 7 passed。

- [ ] **Step 5: 提交**

```bash
git add src-tauri/src/commands/update.rs src-tauri/tests/version_compare.rs
git commit -m "test(update): add is_newer_version regression tests"
```

---

### Task 1.5: 写 `count_words` 与 `is_cjk` 单元测试

**Files:**
- Create: `src-tauri/tests/word_count.rs`

- [ ] **Step 1: 写测试（先红）**

```rust
#[test]
fn counts_english_words() {
    let count = ergemd_lib::test_support::count_words_for_test("hello world rust");
    assert_eq!(count, 3);
}

#[test]
fn counts_cjk_chars_as_words() {
    let count = ergemd_lib::test_support::count_words_for_test("你好世界");
    assert_eq!(count, 4);
}

#[test]
fn mixes_cjk_and_english() {
    // CJK 4 字 + English 2 words = 6
    let count = ergemd_lib::test_support::count_words_for_test("Hello 你好 World 世界");
    assert_eq!(count, 6);
}

#[test]
fn empty_string_zero() {
    let count = ergemd_lib::test_support::count_words_for_test("");
    assert_eq!(count, 0);
}

#[test]
fn whitespace_only_string_zero() {
    let count = ergemd_lib::test_support::count_words_for_test("   \n\t  ");
    assert_eq!(count, 0);
}

#[test]
fn is_cjk_recognizes_main_ranges() {
    assert!(ergemd_lib::test_support::is_cjk_for_test('中'));
    assert!(ergemd_lib::test_support::is_cjk_for_test('あ'));
    assert!(ergemd_lib::test_support::is_cjk_for_test('한'));
    assert!(!ergemd_lib::test_support::is_cjk_for_test('A'));
    assert!(!ergemd_lib::test_support::is_cjk_for_test('1'));
}
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd src-tauri && cargo test --test word_count
```

Expected: 编译失败。

- [ ] **Step 3: 在 mod.rs 暴露 test_support**

修改 `src-tauri/src/commands/mod.rs` 末尾的 `#[cfg(test)] pub mod test_support { ... }` 块，添加：

```rust
#[cfg(test)]
pub mod test_support {
    use super::*;

    pub fn build_reveal_command_for_test(
        target_os: &str,
        file_path: &std::path::Path,
    ) -> (String, Vec<String>) {
        super::build_reveal_command(target_os, file_path)
    }

    pub fn count_words_for_test(content: &str) -> usize {
        super::count_words(content)
    }

    pub fn is_cjk_for_test(c: char) -> bool {
        super::is_cjk(c)
    }
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
cd src-tauri && cargo test --test word_count
```

Expected: 6 passed。

- [ ] **Step 5: 提交**

```bash
git add src-tauri/src/commands/mod.rs src-tauri/tests/word_count.rs
git commit -m "test(commands): add count_words and is_cjk unit tests"
```

---

### Task 1.6: 写 `validate_path` 单元测试

**Files:**
- Create: `src-tauri/tests/path_validation.rs`

- [ ] **Step 1: 写测试（先红）**

```rust
#[test]
fn allows_absolute_path_without_traversal() {
    assert!(ergemd_lib::test_support::validate_path_for_test("/home/user/note.md").is_ok());
}

#[test]
fn allows_relative_path() {
    assert!(ergemd_lib::test_support::validate_path_for_test("note.md").is_ok());
}

#[test]
fn rejects_parent_traversal() {
    assert!(ergemd_lib::test_support::validate_path_for_test("../etc/passwd").is_err());
}

#[test]
fn rejects_embedded_parent_traversal() {
    assert!(ergemd_lib::test_support::validate_path_for_test("/home/user/../etc/passwd").is_err());
}
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd src-tauri && cargo test --test path_validation
```

Expected: 编译失败。

- [ ] **Step 3: 在 mod.rs 的 test_support 追加**

```rust
    pub fn validate_path_for_test(path: &str) -> Result<(), String> {
        super::validate_path(path)
    }
```

- [ ] **Step 4: 跑测试确认通过**

```bash
cd src-tauri && cargo test --test path_validation
```

Expected: 4 passed。

- [ ] **Step 5: 提交**

```bash
git add src-tauri/src/commands/mod.rs src-tauri/tests/path_validation.rs
git commit -m "test(commands): add validate_path unit tests"
```

---

### Task 1.7: 合并 Phase 1 准备合并到 main

**Files:**
- 无代码修改

- [ ] **Step 1: 确认所有 Rust 测试通过**

```bash
cd src-tauri && cargo test
```

Expected: 全部通过。

- [ ] **Step 2: 确认所有前端测试通过**

```bash
pnpm test
```

Expected: 全部通过。

- [ ] **Step 3: 创建 PR / 合并**

```bash
git checkout main
git merge refactor/platform-decouple
git push origin main
git push gitee main
```

> **说明**：本次提交**不打 tag**（仅重构，无版本号变化）。按 AGENTS.md 约定，仅文档/重构/内部调整不打 tag。

---

## Phase 2：macOS 适配

### Task 2.1: 修复 `reveal_in_explorer` 在 macOS 上走 `open -R`

**Files:**
- Modify: `src-tauri/src/commands/mod.rs:289-313`（已被 Task 1.3 重构，无需再改）

> **说明**：Phase 1 的 Task 1.3 已经把 macOS 分支改好（`open -R`），Phase 2 只需验证编译通过。**跳过此 Task。**

---

### Task 2.2: 更新 tauri.conf.json 加 macOS bundle 配置

**Files:**
- Modify: `src-tauri/tauri.conf.json:44-79`

- [ ] **Step 1: 修改 bundle 段**

将 `src-tauri/tauri.conf.json` 中的 bundle 段改为：

```json
"bundle": {
  "active": true,
  "targets": "all",
  "icon": [
    "icons/32x32.png",
    "icons/128x128.png",
    "icons/128x128@2x.png",
    "icons/icon.icns",
    "icons/icon.ico"
  ],
  "windows": {
    "nsis": {
      "installerIcon": "icons/icon.ico"
    }
  },
  "macOS": {
    "minimumSystemVersion": "10.15",
    "frameworks": [],
    "exceptionDomain": "",
    "signingIdentity": null,
    "providerShortName": null,
    "entitlements": null
  },
  "linux": {
    "deb": {
      "depends": ["libwebkit2gtk-4.1-0", "libgtk-3-0"]
    }
  },
  "fileAssociations": [
    {
      "ext": ["md"],
      "name": "Markdown Document",
      "description": "Markdown file",
      "role": "Viewer"
    },
    {
      "ext": ["markdown"],
      "name": "Markdown Document",
      "description": "Markdown file",
      "role": "Viewer"
    }
  ]
}
```

- [ ] **Step 2: 本地编译验证（Windows 环境，仅做语法检查）**

```bash
cd src-tauri && cargo check
```

Expected: 编译通过，0 错误。

- [ ] **Step 3: 提交**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat(bundle): enable macOS + Linux bundle targets with tauri 2.x schema"
```

---

### Task 2.3: TitleBar 在 macOS 上隐藏自绘窗口控制按钮

**Files:**
- Modify: `src/components/layout/TitleBar.tsx`

- [ ] **Step 1: 写测试（先红）**

新建 `src/components/layout/TitleBar.test.tsx`：

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

const originalUserAgent = navigator.userAgent;

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
}

afterEach(() => {
  setUserAgent(originalUserAgent);
  vi.resetModules();
});

describe("TitleBar platform visibility", () => {
  it("hides custom window controls on macOS", async () => {
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15");
    const { TitleBar } = await import("./TitleBar");
    render(
      <TitleBar
        visible={true}
        transition="opacity 0.2s"
        onToggleLeftPanel={() => {}}
        onToggleRightPanel={() => {}}
        showLeftPanelButton={true}
      />
    );
    // macOS 不渲染自绘最小化/最大化/关闭按钮
    expect(screen.queryByLabelText("minimize")).toBeNull();
    expect(screen.queryByLabelText("maximize")).toBeNull();
    expect(screen.queryByLabelText("close")).toBeNull();
  });

  it("shows custom window controls on Windows", async () => {
    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    const { TitleBar } = await import("./TitleBar");
    render(
      <TitleBar
        visible={true}
        transition="opacity 0.2s"
        onToggleLeftPanel={() => {}}
        onToggleRightPanel={() => {}}
        showLeftPanelButton={true}
      />
    );
    expect(screen.queryByLabelText("minimize")).not.toBeNull();
    expect(screen.queryByLabelText("maximize")).not.toBeNull();
    expect(screen.queryByLabelText("close")).not.toBeNull();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm test src/components/layout/TitleBar.test.tsx
```

Expected: FAIL，错误 TitleBar 渲染了所有平台都有的按钮（或 aria-label 不匹配）。

- [ ] **Step 3: 修改 TitleBar.tsx**

打开 `src/components/layout/TitleBar.tsx`，找到三个自绘按钮（最小化、最大化/还原、关闭），为每个添加 `aria-label`（最小化="minimize"、最大化="maximize"、关闭="close"），并用 platform 工具包裹：

```tsx
import { detectPlatform } from "@/utils/platform";

// 在组件内
const platform = detectPlatform();
const showWindowControls = platform !== "macos";

// JSX 中（示例：最小化按钮）
{showWindowControls && (
  <button
    aria-label="minimize"
    onClick={...}
    ...
  >
    {/* svg icon */}
  </button>
)}
```

对最大化按钮、关闭按钮做同样处理。

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm test src/components/layout/TitleBar.test.tsx
```

Expected: 2 passed。

- [ ] **Step 5: 提交**

```bash
git add src/components/layout/TitleBar.tsx src/components/layout/TitleBar.test.tsx
git commit -m "feat(titlebar): hide custom window controls on macOS to avoid traffic light conflict"
```

---

### Task 2.4: PDF 导出在非 Windows 平台显示引导 Toast

**Files:**
- Modify: `src/App.tsx`（或具体调用 `export_pdf` 的位置）

- [ ] **Step 1: 定位 PDF 调用点**

```bash
rg "export_pdf|onExportPdf" src/ -n
```

记录下文件路径与行号。

- [ ] **Step 2: 修改调用处，在非 Windows 平台先弹 Toast**

例如在 `src/App.tsx` 的 `onExportPdf` 实现中：

```typescript
import { detectPlatform } from "@/utils/platform";

const handleExportPdf = async () => {
  const platform = detectPlatform();
  if (platform !== "windows") {
    useReaderStore.getState().addToast({
      type: "info",
      message:
        platform === "macos"
          ? "macOS 将在打印对话框选择「存储为 PDF」完成导出"
          : "Linux 将在打印对话框选择「Print to File」完成导出",
      duration: 5000,
    });
  }
  // ...原有 export 逻辑
};
```

- [ ] **Step 3: 跑前端测试**

```bash
pnpm test
```

Expected: 全部通过。

- [ ] **Step 4: 提交**

```bash
git add src/App.tsx
git commit -m "feat(pdf): show platform-aware guidance toast before exporting PDF on macOS/Linux"
```

---

### Task 2.5: rename-bundle.js 支持 macOS .app/.dmg

**Files:**
- Modify: `scripts/rename-bundle.js`

- [ ] **Step 1: 改写脚本**

完整重写 `scripts/rename-bundle.js`：

```javascript
import {
  readFileSync,
  writeFileSync,
  renameSync,
  readdirSync,
  existsSync,
  statSync,
} from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf-8")).version;
const platform = process.env.BUILD_PLATFORM || process.platform; // "darwin" | "linux" | "win32"

const releaseDir = join(root, "src-tauri", "target", "release");
const bundleDir = join(releaseDir, "bundle");

const rename = (dir, oldPattern, newName, allowMissing = false) => {
  if (!existsSync(dir)) {
    if (allowMissing) {
      console.log(`[rename-bundle] skip (dir not found): ${dir}`);
      return;
    }
    throw new Error(`[rename-bundle] directory not found: ${dir}`);
  }
  const files = readdirSync(dir);
  const old = files.find((f) => f.includes(oldPattern));
  if (old) {
    renameSync(join(dir, old), join(dir, newName));
    console.log(`[rename-bundle] ${old} -> ${newName}`);
  } else if (!allowMissing) {
    throw new Error(`[rename-bundle] no file matching "${oldPattern}" in ${dir}`);
  }
};

const renameDir = (dir, oldName, newName) => {
  const oldPath = join(dir, oldName);
  const newPath = join(dir, newName);
  if (existsSync(oldPath)) {
    renameSync(oldPath, newPath);
    console.log(`[rename-bundle] ${oldName} -> ${newName}`);
  }
};

try {
  if (platform === "darwin") {
    // macOS 产物：
    //   src-tauri/target/release/bundle/macos/ErgeMD.app
    //   src-tauri/target/release/bundle/dmg/ErgeMD_0.4.0_x64.dmg
    renameDir(bundleDir, "macos", `macos`);
    const macosDir = join(bundleDir, "macos");
    renameDir(macosDir, "ErgeMD.app", `ErgeMD-v${version}.app`);
    const dmgDir = join(bundleDir, "dmg");
    rename(dmgDir, ".dmg", `ErgeMD-v${version}-macos.dmg`, true);
  } else if (platform === "linux") {
    // Linux 产物：
    //   src-tauri/target/release/bundle/appimage/ErgeMD_0.4.0_amd64.AppImage
    //   src-tauri/target/release/bundle/deb/ergemd_0.4.0_amd64.deb
    const appimageDir = join(bundleDir, "appimage");
    rename(appimageDir, ".AppImage", `ErgeMD-v${version}-linux-x86_64.AppImage`, true);
    const debDir = join(bundleDir, "deb");
    rename(debDir, ".deb", `ErgeMD-v${version}-linux-x86_64.deb`, true);
  } else {
    // Windows（默认）
    const nsisDir = join(bundleDir, "nsis");
    rename(nsisDir, "_x64-setup.exe", `ErgeMD-v${version}-setup.exe`);
    rename(releaseDir, "ergemd.exe", `ErgeMD-v${version}.exe`);
  }
  console.log(`[rename-bundle] Done. Version: ${version}, Platform: ${platform}`);
} catch (e) {
  console.error(`[rename-bundle] FAILED: ${e.message}`);
  process.exit(1);
}
```

- [ ] **Step 2: 本地（Windows）跑一下验证 Windows 路径未破坏**

```bash
node scripts/rename-bundle.js
```

Expected: 现有 Windows build 流程下仍能成功 rename 既有产物（如果当前 release/ 为空，会报"directory not found"——这在开发期是正常的，可以临时跳过；正式发版前 CI 中一定会有产物）。

- [ ] **Step 3: 提交**

```bash
git add scripts/rename-bundle.js
git commit -m "feat(scripts): rename-bundle.js support macOS .app/.dmg + Linux .AppImage/.deb"
```

---

### Task 2.6: CI release.yml 加 macOS build job

**Files:**
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: 重构工作流**

完整重写 `.github/workflows/release.yml`：

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  test:
    name: Lint & Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - uses: dtolnay/rust-toolchain@stable
      - name: Cache Rust
        uses: swatinem/rust-cache@v2
        with: { workspaces: './src-tauri -> target' }
      - name: Install Linux deps
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
            libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
      - name: cargo test
        run: cd src-tauri && cargo test

  build:
    name: Build ${{ matrix.platform }} (${{ matrix.suffix }})
    needs: test
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: windows-latest
            target: x86_64-pc-windows-msvc
            suffix: windows-x64
          - platform: macos-latest
            target: aarch64-apple-darwin
            suffix: macos-arm64
          - platform: macos-latest
            target: x86_64-apple-darwin
            suffix: macos-x64
          - platform: ubuntu-22.04
            target: x86_64-unknown-linux-gnu
            suffix: linux-x64
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - uses: dtolnay/rust-toolchain@stable
        with: { targets: ${{ matrix.target }} }
      - uses: swatinem/rust-cache@v2
        with: { workspaces: './src-tauri -> target' }
      - name: Install Linux deps
        if: matrix.suffix == 'linux-x64'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
            libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
      - run: pnpm install
      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0.5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'ErgeMD ${{ github.ref_name }}'
          releaseBody: 'See the assets to download and install this version.'
          includeRelease: true
          includeUpdaterJson: true
      - name: Rename bundles
        env:
          BUILD_PLATFORM: ${{ matrix.suffix }}
        run: node scripts/rename-bundle.js
      - name: Create portable package (Windows)
        if: matrix.suffix == 'windows-x64'
        shell: pwsh
        run: |
          $src = "src-tauri/target/release"
          $dst = "ErgeMD-portable"
          New-Item -ItemType Directory -Force -Path $dst
          Copy-Item "$src/ErgeMD.exe" $dst/
          Copy-Item "$src/*.dll" $dst/ -ErrorAction SilentlyContinue
          if (Test-Path "$src/WebView2Loader.dll") {
            Copy-Item "$src/WebView2Loader.dll" $dst/
          }
          Compress-Archive -Path $dst -DestinationPath "ErgeMD-${{ github.ref_name }}-windows-x64-portable.zip" -Force
      - name: Upload artifacts to release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            ErgeMD-v${{ github.ref_name }}-${{ matrix.suffix }}.*
            ErgeMD-${{ github.ref_name }}-${{ matrix.suffix }}-portable.zip
          tag_name: ${{ github.ref_name }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 2: YAML 语法检查**

```bash
python -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml'))" && echo "OK"
```

Expected: 输出 `OK`。

- [ ] **Step 3: 提交**

```bash
git add .github/workflows/release.yml
git commit -m "feat(ci): add macOS (arm64+x64) and Linux (x64) build jobs in matrix"
```

---

### Task 2.7: 更新 README 加 macOS 下载与系统依赖说明

**Files:**
- Modify: `README.md`
- Modify: `README.en.md`

- [ ] **Step 1: 在 README.md 找到"下载"或"Installation"段**

```bash
rg -n "下载|Download|Installation|NSIS|安装包" README.md
```

记录下相关行号。

- [ ] **Step 2: 在 Windows 链接下方加 macOS / Linux 段**

示例（中文版）：

```markdown
### macOS 下载

- [ErgeMD-v0.4.0-macos-arm64.dmg](https://github.com/ErgeAIA/ErgeMD/releases/download/v0.4.0/ErgeMD-v0.4.0-macos-arm64.dmg) — Apple Silicon (M1/M2/M3)
- [ErgeMD-v0.4.0-macos-x64.dmg](https://github.com/ErgeAIA/ErgeMD/releases/download/v0.4.0/ErgeMD-v0.4.0-macos-x64.dmg) — Intel Mac
- [ErgeMD-v0.4.0-macos-x64.app.tar.gz](https://github.com/ErgeAIA/ErgeMD/releases/download/v0.4.0/ErgeMD-v0.4.0-macos-x64.app.tar.gz) — 命令行解压

> **注意**：由于未签名，macOS 首次打开请 **右键 → 打开**。

### Linux 下载

- [ErgeMD-v0.4.0-linux-x86_64.AppImage](https://github.com/ErgeAIA/ErgeMD/releases/download/v0.4.0/ErgeMD-v0.4.0-linux-x86_64.AppImage)
- [ErgeMD-v0.4.0-linux-x86_64.deb](https://github.com/ErgeAIA/ErgeMD/releases/download/v0.4.0/ErgeMD-v0.4.0-linux-x86_64.deb)

**系统依赖**（Ubuntu 22.04+/Debian 12+）：

```bash
sudo apt-get install -y libwebkit2gtk-4.1-0 libgtk-3-0
```

**字体推荐**：

```bash
sudo apt-get install -y fonts-noto-cjk fonts-noto-color-emoji
```
```

- [ ] **Step 3: 同步更新 README.en.md（英文版）**

按相同结构改写为英文。

- [ ] **Step 4: 提交**

```bash
git add README.md README.en.md
git commit -m "docs(readme): add macOS + Linux download links and system dependencies"
```

---

### Task 2.8: 更新 CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `CHANGELOG.en.md`

- [ ] **Step 1: 在 CHANGELOG.md 顶部 Unreleased 段加条目**

```markdown
## [Unreleased]

### Added
- **macOS 支持**：ErgeMD 现可在 macOS 11+ 上运行，提供 Apple Silicon 与 Intel 两种 .dmg
- **Linux 支持**：ErgeMD 现可在 Ubuntu 22.04+/Debian 12+ 上运行，提供 .AppImage 与 .deb
- **平台检测工具**：`src/utils/platform.ts` 提供统一平台判断；`detectPlatform()` 与 `getPlatformLabel()`
- **更新检查跨平台化**：`update.rs` 按 `target_os` 关键字匹配对应平台资产（Windows NSIS、macOS DMG、Linux AppImage）
- **reveal_in_explorer 跨平台化**：macOS 走 `open -R`，Linux 走 `xdg-open`，Windows 保持 `explorer /select,`
- **单元测试基础设施**：Vitest（前端） + cargo test（Rust）双层测试套件，CI 强制跑测试

### Changed
- **PDF 导出**：macOS/Linux 走系统打印对话框（用户需手动选择"存储为 PDF"）；Windows 仍走 WebView2 PrintToPdf
- **TitleBar**：macOS 上隐藏自绘最小化/最大化/关闭按钮，避免与系统红绿灯冲突
- **tauri.conf.json**：`bundle.targets` 从 `["nsis"]` 改为 `"all"`，启用三大平台打包
- **release.yml**：从单平台 Windows 扩展为 4 平台矩阵（Windows x64 / macOS arm64 / macOS x64 / Linux x64）

### Notes
- 跨平台首版 **不启用** macOS 代码签名（免费软件策略），用户需右键 → 打开
```

- [ ] **Step 2: 同步 CHANGELOG.en.md**

英文版同样结构。

- [ ] **Step 3: 提交**

```bash
git add CHANGELOG.md CHANGELOG.en.md
git commit -m "docs(changelog): add cross-platform support entries (macOS + Linux)"
```

---

### Task 2.9: 合并 feature/macos-support 并打 tag v0.4.0

**Files:**
- 无代码修改

- [ ] **Step 1: 验证所有测试通过**

```bash
pnpm test
cd src-tauri && cargo test
```

Expected: 全部通过。

- [ ] **Step 2: 同步版本号到 0.4.0**

按 AGENTS.md 预提交清单执行：

```bash
# 1) 升级 package.json version
# 手动编辑 package.json "version": "0.4.0"
# 2) 跑 sync-version 同步到 Cargo.toml + tauri.conf.json
pnpm sync-version
```

Expected: 三个文件版本号均为 0.4.0。

- [ ] **Step 3: 更新 README 下载链接版本号（v0.3.7 → v0.4.0）**

按 Task 2.7 的格式，批量替换所有 v0.3.7 链接为 v0.4.0。

- [ ] **Step 4: 提交版本升级**

```bash
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json README.md README.en.md
git commit -m "chore(release): bump version to 0.4.0"
```

- [ ] **Step 5: 合并到 main 并 push**

```bash
git checkout main
git merge feature/macos-support
git push origin main
git push gitee main
```

- [ ] **Step 6: 打 tag 并双平台推送**

```bash
git tag v0.4.0
git push origin v0.4.0
git push gitee v0.4.0
```

Expected: GitHub Actions 触发 release workflow，4 个矩阵 job 全部跑通，生成 Windows/macOS/Linux 全部产物并发布到 GitHub Release。

- [ ] **Step 7: Gitee Release 手动同步**

进入 Gitee 仓库 → 发行版 → 创建 v0.4.0，将 GitHub Release 中的 4 个平台产物上传。

---

## Phase 3：Linux 适配

> **说明**：Phase 2 的 Task 2.5/2.6/2.7/2.8 已经把 Linux 基础设施（CI job、bundle 配置、rename-bundle、README）一并做完。Phase 3 主要是 **验证 + 调整**。

### Task 3.1: 在 Gitee Issue 公开招募测试用户

**Files:**
- 无代码修改

- [ ] **Step 1: 撰写招募贴**

在 Gitee Issues 创建一个新 issue（标签：测试招募 / 跨平台测试）：

```markdown
## 【测试招募】ErgeMD v0.4.0 macOS / Linux 公测

ErgeMD 现已支持 macOS 与 Linux，现公开招募 5-8 名测试用户协助验证。

### 测试范围
- macOS 11+（Apple Silicon + Intel 均可）
- Linux：Ubuntu 22.04+ / Debian 12+ / Fedora 38+

### 测试场景（重点）
1. 启动 / 关闭 / 窗口拖动
2. 双击 .md 文件唤起
3. 14 个主题切换
4. 导出 PDF（macOS/Linux 走系统打印对话框）
5. 右键"在 Finder / 文件管理器中显示"
6. 自动更新→下载的产物是否匹配本机 OS

### 反馈方式
在本 issue 下回复，注明：
- 操作系统 + 版本
- 硬件架构（arm64 / x64）
- ErgeMD 版本
- 截图或录屏（如有）

### 下载
https://github.com/ErgeAIA/ErgeMD/releases/tag/v0.4.0

首批有效反馈者将列入 CHANGELOG 致谢名单。
```

- [ ] **Step 2: 同步到 Gitee**

由于 Gitee Issue 与 GitHub Issue 通常不同步（取决于 Gitee 仓库设置），可同时在 GitHub 仓库开镜像 issue。

---

### Task 3.2: 收集反馈并修复 P0/P1 bug

**Files:**
- 视 bug 情况而定

- [ ] **Step 1: 收集 issue 反馈**

打开 Gitee Issue，汇总测试用户的报告。

- [ ] **Step 2: 评估每个 bug**

按 P0/P1/P2 分类：
- P0：功能不可用、崩溃、阻塞主流程
- P1：功能可用但行为不正确
- P2：UI 错位、文本错误

- [ ] **Step 3: 在 feature/macos-support 分支修复 P0/P1**

每个 P0/P1 单独一个 commit，按 `fix(platform): ...` 提交。

- [ ] **Step 4: 等所有 P0/P1 修复完毕**

确认测试用户复测通过。

---

### Task 3.3: 合并 feature/macos-support 到 main（修复完成后）

**Files:**
- 无代码修改

- [ ] **Step 1: 测试验证**

```bash
pnpm test
cd src-tauri && cargo test
```

- [ ] **Step 2: 合并并 push**

```bash
git checkout main
git merge feature/macos-support
git push origin main
git push gitee main
```

- [ ] **Step 3: 视修复严重程度决定是否打新 tag**

- 仅修复：合并到 main，**不打 tag**（v0.4.0 已发布）。
- 修复+新功能：升级到 v0.4.1，按 AGENTS.md 流程打新 tag。

---

### Task 3.4: Linux 单独验证与发版 v0.5.0

> **可选**：如果 Phase 2 的 CI 已经能产出 Linux 产物且 v0.4.0 测试通过，**可省略** v0.5.0（Linux 已经随 v0.4.0 发布）。
> 决定是否需要 v0.5.0 取决于测试用户反馈。

**Files:**
- 无代码修改

- [ ] **Step 1: 评估是否需要 v0.5.0**

判断标准：
- Linux 上有 P0/P1 修复但不便合到 v0.4.1 → 单独 v0.5.0
- v0.4.0 已稳定且 Linux 无独立改进 → 不需要 v0.5.0，删除此 Task

- [ ] **Step 2: 如需 v0.5.0，重复 Task 2.7-2.9 流程**

版本号 0.4.0 → 0.5.0，CHANGELOG 标注"Linux 优化"。

---

## Phase 4：可选后续优化（v0.6.0+ 路线图，不在本计划范围）

> 留作未来 issue，不在本次实施中完成。

- [ ] 引入 `tauri-driver` 做 Linux 端 E2E 自动化
- [ ] 调研 `headless_chrome` / `wkhtmltopdf` 作为 macOS/Linux PDF 导出方案
- [ ] Apple Developer 账号 + macOS 代码签名 + 公证
- [ ] Windows MSI 重新支持（如有用户需求）
- [ ] 跨平台安装器升级：macOS Homebrew Cask / Linux Flatpak / Linux AUR

---

## 自查清单（计划完成后自检）

- [ ] 每个 spec 章节都有对应 Task？
  - §1 平台代码审计 → Task 1.2, 1.3
  - §2 文件读取差异 → 无需改动（Rust 标准库统一）
  - §3 构建脚本 → Task 2.2, 2.5
  - §4 CI/CD → Task 2.6
  - §5 测试策略 → Phase 0 全量 + Task 1.4, 1.5, 1.6, 2.3
  - §6 风险 → Task 2.3 (TitleBar), Task 2.4 (PDF Toast)
- [ ] 是否有 placeholder 残留？已自检，无 TBD / TODO 占位。
- [ ] 函数签名一致性：`pick_platform_download_url` 在 update.rs / test_support / test 文件三处一致；`build_reveal_command` 在 mod.rs / test_support / test 文件三处一致。

---

## 执行选项

计划已完成并保存到 `docs/superpowers/plans/2026-06-10-cross-platform-support.md`。两种执行方式：

1. **Subagent-Driven（推荐）** — 每个 Task 派一个新 subagent 执行，任务间有 review，迭代快
2. **Inline Execution** — 在当前会话中批量执行，配合 checkpoint 让你 review

请选择执行方式。
