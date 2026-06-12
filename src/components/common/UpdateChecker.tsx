import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import React, { memo, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import packageJson from "../../../package.json";
import { useSettingsStore } from "../../stores/settingsStore";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/** 手动触发一次更新检查，绕过 24h 间隔限制 */
export const forceCheckUpdate = async (): Promise<{
  hasUpdate: boolean;
  latestVersion: string;
  downloadUrl: string;
  releaseUrl: string;
}> => {
  const result = await invoke<{
    has_update: boolean;
    current_version: string;
    latest_version: string;
    download_url: string;
    release_url: string;
    release_notes: string;
  }>("check_update", { currentVersion: packageJson.version });

  const setLastCheckUpdateTime = useSettingsStore.getState().setLastCheckUpdateTime;
  const setUpdateInfo = useSettingsStore.getState().setUpdateInfo;
  setLastCheckUpdateTime(Date.now());

  if (result.has_update) {
    setUpdateInfo({
      hasUpdate: result.has_update,
      currentVersion: result.current_version,
      latestVersion: result.latest_version,
      downloadUrl: result.download_url,
      releaseUrl: result.release_url,
      releaseNotes: result.release_notes,
    });
  } else {
    setUpdateInfo(null);
  }

  return {
    hasUpdate: result.has_update,
    latestVersion: result.latest_version,
    downloadUrl: result.download_url,
    releaseUrl: result.release_url,
  };
};

const UpdateChecker: React.FC = memo(() => {
  const { t } = useTranslation();
  const checkUpdateEnabled = useSettingsStore((s) => s.checkUpdateEnabled);
  const lastCheckUpdateTime = useSettingsStore((s) => s.lastCheckUpdateTime);
  const updateInfo = useSettingsStore((s) => s.updateInfo);
  const setLastCheckUpdateTime = useSettingsStore((s) => s.setLastCheckUpdateTime);
  const setUpdateInfo = useSettingsStore((s) => s.setUpdateInfo);

  const [dismissed, setDismissed] = useState(false);

  const doCheck = useCallback(async () => {
    try {
      const result = await invoke<{
        has_update: boolean;
        current_version: string;
        latest_version: string;
        download_url: string;
        release_url: string;
        release_notes: string;
      }>("check_update", { currentVersion: packageJson.version });

      const now = Date.now();
      setLastCheckUpdateTime(now);

      if (result.has_update) {
        setUpdateInfo({
          hasUpdate: result.has_update,
          currentVersion: result.current_version,
          latestVersion: result.latest_version,
          downloadUrl: result.download_url,
          releaseUrl: result.release_url,
          releaseNotes: result.release_notes,
        });
        setDismissed(false);
      } else {
        setUpdateInfo(null);
      }
    } catch {
      setLastCheckUpdateTime(Date.now());
    }
  }, [setLastCheckUpdateTime, setUpdateInfo]);

  useEffect(() => {
    if (!checkUpdateEnabled) return;

    const now = Date.now();
    const elapsed = lastCheckUpdateTime ? now - lastCheckUpdateTime : Infinity;

    if (elapsed >= TWENTY_FOUR_HOURS) {
      const timer = setTimeout(doCheck, 3000);
      return () => clearTimeout(timer);
    }
  }, [checkUpdateEnabled, lastCheckUpdateTime, doCheck]);

  const handleDownload = useCallback(() => {
    if (updateInfo?.releaseUrl) {
      openUrl(updateInfo.releaseUrl);
    } else if (updateInfo?.downloadUrl) {
      openUrl(updateInfo.downloadUrl);
    }
  }, [updateInfo]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  if (!checkUpdateEnabled) return null;
  if (!updateInfo?.hasUpdate) return null;
  if (dismissed) return null;

  return (
    <div
      // 不用 `-translate-x-1/2`：见 FloatingTOC.tsx 同款问题注释（@zenuml/core 注入的未分层
      // 通用选择器会重置 `--tw-translate-x/y`，让 Tailwind v4 的 transform 工具类失效）
      className="fixed z-50 bottom-12 left-1/2 flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] animate-[toast-enter_200ms_ease-out_forwards]"
      style={{
        transform: "translateX(-50%)",
        background: "var(--toast-info-bg)",
        border: "1px solid var(--toast-info-border)",
        color: "var(--accent-cyan, #00FFFF)",
        backdropFilter: "blur(8px)",
        maxWidth: "480px",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="shrink-0"
      >
        <circle cx="8" cy="8" r="7" />
        <path d="M8 4V8.5" />
        <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
      </svg>
      <span className="flex-1">
        {t("update.newVersionAvailable", {
          version: updateInfo.latestVersion,
        })}
      </span>
      <button
        onClick={handleDownload}
        className="shrink-0 px-3 py-1 rounded text-[12px] font-medium cursor-pointer"
        style={{
          background: "var(--accent-cyan, #00FFFF)",
          color: "var(--bg-page, #0A0A0F)",
          border: "none",
        }}
      >
        {t("update.download")}
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 cursor-pointer bg-transparent border-none p-0"
        style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1 }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <line x1="0" y1="0" x2="10" y2="10" />
          <line x1="10" y1="0" x2="0" y2="10" />
        </svg>
      </button>
    </div>
  );
});

UpdateChecker.displayName = "UpdateChecker";

export default UpdateChecker;
