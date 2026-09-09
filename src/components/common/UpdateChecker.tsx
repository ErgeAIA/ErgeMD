import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import packageJson from "../../../package.json";
import { formatReleaseDate, parseReleaseNotes } from "../../utils/releaseNotes";
import { useSettingsStore } from "../../stores/settingsStore";

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/** 主动检查（关于页「检查更新」）后广播，让卡片以展开态呈现 */
const UPDATE_CARD_EXPAND_EVENT = "ergemd:update-card-expand";

interface CheckUpdateResult {
  has_update: boolean;
  current_version: string;
  latest_version: string;
  published_at: string;
  download_url: string;
  release_url: string;
  release_notes: string;
}

/** 手动触发一次更新检查，绕过 24h 间隔限制 */
export const forceCheckUpdate = async (): Promise<{
  hasUpdate: boolean;
  latestVersion: string;
  downloadUrl: string;
  releaseUrl: string;
}> => {
  const result = await invoke<CheckUpdateResult>("check_update", {
    currentVersion: packageJson.version,
  });

  const setLastCheckUpdateTime = useSettingsStore.getState().setLastCheckUpdateTime;
  const setUpdateInfo = useSettingsStore.getState().setUpdateInfo;
  setLastCheckUpdateTime(Date.now());

  if (result.has_update) {
    setUpdateInfo({
      hasUpdate: result.has_update,
      currentVersion: result.current_version,
      latestVersion: result.latest_version,
      publishedAt: result.published_at,
      downloadUrl: result.download_url,
      releaseUrl: result.release_url,
      releaseNotes: result.release_notes,
    });
    // 主动检查带着明确意图，卡片直接展开显示更新内容
    window.dispatchEvent(new CustomEvent(UPDATE_CARD_EXPAND_EVENT));
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
  const skippedVersion = useSettingsStore((s) => s.skippedVersion);
  const setLastCheckUpdateTime = useSettingsStore((s) => s.setLastCheckUpdateTime);
  const setUpdateInfo = useSettingsStore((s) => s.setUpdateInfo);
  const setSkippedVersion = useSettingsStore((s) => s.setSkippedVersion);

  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const doCheck = useCallback(async () => {
    try {
      const result = await invoke<CheckUpdateResult>("check_update", {
        currentVersion: packageJson.version,
      });

      const now = Date.now();
      setLastCheckUpdateTime(now);

      if (result.has_update) {
        setUpdateInfo({
          hasUpdate: result.has_update,
          currentVersion: result.current_version,
          latestVersion: result.latest_version,
          publishedAt: result.published_at,
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

  // 关于页手动检查 → 卡片展开
  useEffect(() => {
    const onExpand = () => setExpanded(true);
    window.addEventListener(UPDATE_CARD_EXPAND_EVENT, onExpand);
    return () => window.removeEventListener(UPDATE_CARD_EXPAND_EVENT, onExpand);
  }, []);

  const groups = useMemo(
    () => (updateInfo ? parseReleaseNotes(updateInfo.releaseNotes) : []),
    [updateInfo],
  );
  const releasedOn = useMemo(
    () => (updateInfo ? formatReleaseDate(updateInfo.publishedAt) : ""),
    [updateInfo],
  );

  const handleDownload = useCallback(() => {
    if (!updateInfo) return;
    // download_url 是按平台资产匹配好的安装包直链
    openUrl(updateInfo.downloadUrl || updateInfo.releaseUrl);
  }, [updateInfo]);

  const handleViewLog = useCallback(() => {
    if (updateInfo?.releaseUrl) openUrl(updateInfo.releaseUrl);
  }, [updateInfo]);

  const handleSkip = useCallback(() => {
    if (updateInfo) setSkippedVersion(updateInfo.latestVersion);
  }, [updateInfo, setSkippedVersion]);

  if (!checkUpdateEnabled) return null;
  if (!updateInfo?.hasUpdate) return null;
  if (dismissed) return null;
  // 用户选择跳过的版本不再提醒
  if (updateInfo.latestVersion === skippedVersion) return null;

  const glassStyle: React.CSSProperties = {
    background: "var(--toast-info-bg)",
    border: "1px solid var(--toast-info-border)",
    color: "var(--text-primary)",
    backdropFilter: "blur(8px)",
  };

  return (
    <div
      // 不用 `-translate-x-1/2`：见 FloatingTOC.tsx 同款问题注释（@zenuml/core 注入的未分层
      // 通用选择器会重置 `--tw-translate-x/y`，让 Tailwind v4 的 transform 工具类失效）
      className="fixed z-50 bottom-12 left-1/2 rounded-lg text-[13px] animate-[toast-enter_200ms_ease-out_forwards]"
      style={{
        transform: "translateX(-50%)",
        maxWidth: "560px",
        width: "min(560px, calc(100vw - 48px))",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
        ...glassStyle,
      }}
    >
      {!expanded ? (
        // ── 折叠态：一秒略过 ──
        <div className="flex items-center gap-3 px-4 py-2.5">
          <UpdateIcon />
          <span className="flex-1" style={{ color: "var(--accent-cyan, #00FFFF)" }}>
            {t("update.newVersionAvailable", { version: updateInfo.latestVersion })}
            {releasedOn && (
              <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>{releasedOn}</span>
            )}
          </span>
          <button
            onClick={() => setExpanded(true)}
            className="shrink-0 px-3 py-1 rounded text-[12px] font-medium cursor-pointer"
            style={{
              background: "var(--accent-cyan, #00FFFF)",
              color: "var(--bg-page, #0A0A0F)",
              border: "none",
            }}
          >
            {t("update.details")}
          </button>
          <TextButton onClick={handleSkip}>{t("update.skipVersion")}</TextButton>
          <CloseButton onClick={() => setDismissed(true)} />
        </div>
      ) : (
        // ── 展开态：决策信息 + 操作 ──
        <div className="px-4 pt-3 pb-3">
          <div className="flex items-center gap-2">
            <UpdateIcon />
            <span className="font-medium" style={{ color: "var(--accent-cyan, #00FFFF)" }}>
              {t("update.whatsNew")} · v{updateInfo.latestVersion}
            </span>
            {releasedOn && (
              <span style={{ color: "var(--text-muted)" }}>{releasedOn}</span>
            )}
            <span className="flex-1" />
            <CloseButton onClick={() => setDismissed(true)} />
          </div>

          {groups.length > 0 && (
            <div
              className="mt-2 pr-1 flex flex-col gap-2"
              style={{ maxHeight: 240, overflowY: "auto" }}
            >
              {groups.map((group) => (
                <div key={group.category}>
                  <div
                    className="text-[11px] uppercase tracking-wide mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {group.category}
                  </div>
                  <ul className="flex flex-col gap-1 m-0 pl-0 list-none">
                    {group.items.map((item, idx) => (
                      <li key={idx} className="flex gap-2 leading-relaxed">
                        <span style={{ color: "var(--accent-cyan, #00FFFF)" }}>·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded text-[12px] font-medium cursor-pointer"
              style={{
                background: "var(--accent-cyan, #00FFFF)",
                color: "var(--bg-page, #0A0A0F)",
                border: "none",
              }}
            >
              {t("update.download")}
            </button>
            <TextButton onClick={handleViewLog}>{t("update.viewFullLog")}</TextButton>
            <span className="flex-1" />
            <TextButton onClick={() => setExpanded(false)}>{t("update.collapse")}</TextButton>
          </div>
        </div>
      )}
    </div>
  );
});

const UpdateIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className="shrink-0"
    style={{ color: "var(--accent-cyan, #00FFFF)" }}
  >
    <circle cx="8" cy="8" r="7" />
    <path d="M8 4V8.5" />
    <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
  </svg>
);

const CloseButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="shrink-0 cursor-pointer bg-transparent border-none p-0"
    style={{ color: "var(--text-muted)", lineHeight: 0 }}
    aria-label="close"
  >
    <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
      <line x1="0" y1="0" x2="10" y2="10" />
      <line x1="10" y1="0" x2="0" y2="10" />
    </svg>
  </button>
);

const TextButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({
  onClick,
  children,
}) => (
  <button
    onClick={onClick}
    className="shrink-0 px-2 py-1 rounded text-[12px] cursor-pointer bg-transparent"
    style={{ color: "var(--text-secondary)", border: "none" }}
  >
    {children}
  </button>
);

UpdateChecker.displayName = "UpdateChecker";

export default UpdateChecker;
