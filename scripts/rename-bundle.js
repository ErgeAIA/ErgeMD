import {
  readFileSync,
  renameSync,
  readdirSync,
  existsSync,
  copyFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf-8")).version;
const platform = process.env.BUILD_PLATFORM || process.platform; // "darwin" | "linux" | "win32" | "windows-x64" ...
const buildTarget = process.env.BUILD_TARGET; // e.g. "x86_64-pc-windows-msvc" / "aarch64-apple-darwin" / "x86_64-apple-darwin" / "x86_64-unknown-linux-gnu"

// --target <triple> 时输出在 target/<triple>/release/，否则在 target/release/
const targetSubdir = buildTarget ? join("target", buildTarget, "release") : join("target", "release");
const releaseDir = join(root, "src-tauri", targetSubdir);
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
  if (platform.includes("darwin") || platform.includes("macos")) {
    // macOS 产物：
    //   src-tauri/target/release/bundle/macos/ErgeMD.app
    //   src-tauri/target/release/bundle/dmg/ErgeMD_0.4.0_x64.dmg
    const macosDir = join(bundleDir, "macos");
    const renamedAppName = `ErgeMD-v${version}.app`;
    renameDir(macosDir, "ErgeMD.app", renamedAppName);
    const dmgDir = join(bundleDir, "dmg");
    // BUILD_PLATFORM 可能是 macos-arm64 或 macos-x64，用它区分两个产物
    const dmgSuffix = platform === "macos-arm64" ? "arm64" : "x64";
    rename(dmgDir, ".dmg", `ErgeMD-v${version}-macos-${dmgSuffix}.dmg`, true);

    // 打包 .app 目录为 tar.gz，供命令行解压安装的用户使用
    const appDir = join(macosDir, renamedAppName);
    if (existsSync(appDir)) {
      const tarPath = join(releaseDir, `ErgeMD-v${version}-macos.app.tar.gz`);
      try {
        // Windows 10+ / macOS / Linux 自带 tar 均支持 -C
        execSync(`tar -czf "${tarPath}" -C "${macosDir}" "${renamedAppName}"`, {
          stdio: "pipe",
        });
        console.log(`[rename-bundle] ${renamedAppName} -> ${tarPath}`);
      } catch (e) {
        // tar.gz 失败不阻塞整个流程；asset 上传时缺这个文件即可
        console.warn(`[rename-bundle] WARN: failed to create .app.tar.gz: ${e.message}`);
      }
    }

    // 当前 macOS CI 仅编译 arm64；把 arm64 dmg 复制为 macos.dmg，
    // 让 README 中"通用 dmg"链接不再 404（Intel Mac 用户仍需自行编译）
    if (platform === "macos-arm64") {
      const arm64Dmg = join(dmgDir, `ErgeMD-v${version}-macos-arm64.dmg`);
      const universalDmg = join(dmgDir, `ErgeMD-v${version}-macos.dmg`);
      if (existsSync(arm64Dmg) && !existsSync(universalDmg)) {
        copyFileSync(arm64Dmg, universalDmg);
        console.log(`[rename-bundle] copied ${arm64Dmg} -> ${universalDmg} (note: arm64-only)`);
      }
    }
  } else if (platform.includes("linux")) {
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
    rename(nsisDir, "_x64-setup.exe", `ErgeMD-v${version}-setup.exe`, true);
    rename(releaseDir, "ergemd.exe", `ErgeMD-v${version}.exe`, true);
  }
  console.log(`[rename-bundle] Done. Version: ${version}, Platform: ${platform}`);
} catch (e) {
  console.error(`[rename-bundle] FAILED: ${e.message}`);
  process.exit(1);
}
