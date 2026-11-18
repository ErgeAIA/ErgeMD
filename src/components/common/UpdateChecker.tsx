import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { openUrl } from "@tauri-apps/plugin-opener";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import packageJson from "../../../package.json";
import { formatReleaseDate, parseReleaseNotes } from "../../utils/releaseNotes";
import { useSettingsStore } from "../../stores/settingsStore";
import { useReaderStore } from "../../stores/readerStore";

const CHECK_TIMEOUT_MS = 10_000;
const RELEASES_URL = "https://github.com/ErgeAIA/ErgeMD/releases";
/** 每组默认展示的发布说明条数；其余折叠为「还有 N 项」 */
const NOTES_PER_GROUP = 3;

/** 主动检查（关于页「检查更新」）后广播，让卡片以展开态呈现 */
const UPDATE_CARD_EXPAND_EVENT = "ergemd:update-card-expand";

export interface ForceCheckResult {
  hasUpdate: boolean;
  latestVersion: string;
  releaseUrl: string;
}

// updater check() 返回的 Update 对象在模块级共享（forceCheckUpdate 与卡片组件）
let pendingUpdate: Update | null = null;

/** 手动触发一次更新检查，绕过 24h 间隔限制；失败抛错由调用方提示 */
export const forceCheckUpdate = async (): Promise<ForceCheckResult> => {
  const update = await check({ timeout: CHECK_TIMEOUT_MS });
  pendingUpdate = update;
  if (update) {
    // 主动检查带着明确意图，卡片直接展开显示更新内容
    window.dispatchEvent(new CustomEvent(UPDATE_CARD_EXPAND_EVENT));
  }
  return {
    hasUpdate: update !== null,
    latestVersion: update?.version ?? packageJson.version,
    releaseUrl: RELEASES_URL,
  };
};

const UpdateChecker: React.FC = memo(() => {
  const { t } = useTranslation();
  const checkUpdateEnabled = useSettingsStore((s) => s.checkUpdateEnabled);
  const skippedVersion = useSettingsStore((s) => s.skippedVersion);
  const setLastCheckUpdateTime = useSettingsStore((s) => s.setLastCheckUpdateTime);
  const setSkippedVersion = useSettingsStore((s) => s.setSkippedVersion);

  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [update, setUpdate] = useState<Update | null>(null);
  const [installProgress, setInstallProgress] = useState<number | null>(null);
  const [installError, setInstallError] = useState(false);
  const [installed, setInstalled] = useState(false);
  const updateRef = useRef<Update | null>(null);
  updateRef.current = update;
  const receivedRef = useRef(0);
  const contentLengthRef = useRef(0);

  const doCheck = useCallback(async () => {
    try {
      const result = await check({ timeout: CHECK_TIMEOUT_MS });
      setLastCheckUpdateTime(Date.now());
      if (result) {
        setUpdate(result);
        setDismissed(false);
      }
    } catch {
      // 自动检查失败保持静默（dev 模式 / 网络不通）
      setLastCheckUpdateTime(Date.now());
    }
  }, [setLastCheckUpdateTime]);

  // 每次启动自动检查一次更新（3s 延迟等窗口就绪；失败静默，不打扰启动流程）
  useEffect(() => {
    if (!checkUpdateEnabled) return;
    const timer = setTimeout(doCheck, 3000);
    return () => clearTimeout(timer);
  }, [checkUpdateEnabled, doCheck]);

  // 关于页手动检查 → 拉取共享的 update 对象并展开卡片
  useEffect(() => {
    const onExpand = () => {
      if (pendingUpdate) {
        setUpdate(pendingUpdate);
        setDismissed(false);
      }
      setExpanded(true);
    };
    window.addEventListener(UPDATE_CARD_EXPAND_EVENT, onExpand);
    return () => window.removeEventListener(UPDATE_CARD_EXPAND_EVENT, onExpand);
  }, []);

  const groups = useMemo(
    () => (update ? parseReleaseNotes(update.body ?? "") : []),
    [update],
  );
  const releasedOn = useMemo(
    () => (update ? formatReleaseDate(update.date ?? "") : ""),
    [update],
  );

  const handleInstall = useCallback(async () => {
    const current = updateRef.current;
    if (!current || installProgress !== null) return;
    receivedRef.current = 0;
    contentLengthRef.current = 0;
    setInstallError(false);
    setInstallProgress(0);
    try {
      await current.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLengthRef.current = event.data.contentLength ?? 0;
            break;
          case "Progress":
            receivedRef.current += event.data.chunkLength;
            if (contentLengthRef.current > 0) {
              setInstallProgress(
                Math.min(99, Math.round((receivedRef.current / contentLengthRef.current) * 100)),
              );
            }
            break;
          case "Finished":
            setInstallProgress(100);
            break;
        }
      });
      setInstalled(true);
    } catch {
      setInstallProgress(null);
      setInstallError(true);
    }
  }, [installProgress]);

  const handleRelaunch = useCallback(async () => {
    await relaunch();
  }, []);

  const handleSkip = useCallback(() => {
    if (!update) return;
    const version = update.version;
    setSkippedVersion(version);
    setMenuOpen(false);
    // 跳过是永久动作，给一次可撤销的机会
    useReaderStore.getState().addToast({
      type: "info",
      message: t("update.skipped", { version }),
      action: {
        label: t("update.undoSkip"),
        onClick: () => setSkippedVersion(null),
      },
    });
  }, [update, setSkippedVersion, t]);

  if (!checkUpdateEnabled) return null;
  if (!update) return null;
  if (dismissed) return null;
  // 用户选择跳过的版本不再提醒
  if (update.version === skippedVersion) return null;

  const glassStyle: React.CSSProperties = {
    background: "rgba(var(--accent-cyan-rgb), 0.04)",
    border: "1px solid rgba(var(--accent-cyan-rgb), 0.12)",
    color: "var(--text-primary)",
    backdropFilter: "blur(8px)",
  };

  const ctaStyle: React.CSSProperties = {
    background: "var(--accent-cyan)",
    color: "var(--text-on-accent, var(--bg-page))",
    border: "none",
  };

  const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0);
  const visibleItems = groups.reduce(
    (sum, group) => sum + Math.min(group.items.length, NOTES_PER_GROUP),
    0,
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed z-[45] bottom-14 right-6 rounded-xl text-[12px] animate-[toast-enter_200ms_ease-out_forwards]"
      style={{
        width: expanded
          ? "min(420px, calc(100vw - 48px))"
          : "min(360px, calc(100vw - 48px))",
        boxShadow: "var(--shadow-floating-card, 0 12px 40px rgba(0, 0, 0, 0.4))",
        ...glassStyle,
      }}
    >
      {!expanded ? (
        // ── 折叠态：一条窄条，不压住正文 ──
        <div className="flex items-center gap-2 px-3 py-2">
          <UpdateIcon size={14} />
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex-1 min-w-0 truncate text-left cursor-pointer bg-transparent border-none p-0"
            style={{ color: "var(--text-primary)", fontSize: 12 }}
          >
            {t("update.newVersionAvailable", { version: update.version })}
          </button>
          {installProgress !== null ? (
            <span
              className="shrink-0 tabular-nums"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("update.installing")} {Math.round(installProgress)}%
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="shrink-0 px-2.5 py-1 rounded-full text-[12px] cursor-pointer"
                style={ctaStyle}
              >
                {t("update.details")}
              </button>
              <CloseButton onClick={() => setDismissed(true)} label={t("titleBar.close")} />
            </>
          )}
        </div>
      ) : (
        // ── 展开态：更新内容 + 应用内更新 ──
        <div className="px-4 pt-3.5 pb-3.5">
          <div className="flex items-center gap-2">
            <UpdateIcon size={14} />
            <span className="font-semibold text-[13px]">{t("update.whatsNew")}</span>
            <span
              className="px-2 py-0.5 rounded-full text-[12px]"
              style={{ background: "var(--bg-code)", color: "var(--text-primary)" }}
            >
              v{update.version}
            </span>
            <span className="flex-1" />
            <button
              type="button"
              aria-label={t("update.moreActions")}
              onClick={() => setMenuOpen((v) => !v)}
              className="shrink-0 cursor-pointer bg-transparent border-none p-0 text-[14px] leading-none"
              style={{ color: "var(--text-secondary)" }}
            >
              ⋯
            </button>
            <CloseButton onClick={() => setDismissed(true)} label={t("titleBar.close")} />
          </div>
          {releasedOn && (
            <div className="mt-1 text-[12px]" style={{ color: "var(--text-secondary)" }}>
              {releasedOn}
            </div>
          )}

          {groups.length > 0 && (
            <div className="mt-3 flex flex-col gap-3">
              {groups.map((group) => {
                const shown = showAllNotes
                  ? group.items
                  : group.items.slice(0, NOTES_PER_GROUP);
                const hidden = group.items.length - shown.length;
                return (
                  <div key={group.category}>
                    <div
                      className="text-[12px] mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {group.category}
                    </div>
                    <ul
                      className="flex flex-col gap-1 m-0 pl-2 list-none"
                      style={{ borderLeft: "2px solid var(--border-subtle)" }}
                    >
                      {shown.map((item, idx) => (
                        <li
                          key={idx}
                          className="text-[12px] leading-relaxed"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                    {hidden > 0 && (
                      <div
                        className="text-[12px] mt-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {t("update.moreItems", { count: hidden })}
                      </div>
                    )}
                  </div>
                );
              })}
              {totalItems > visibleItems && (
                <button
                  type="button"
                  onClick={() => setShowAllNotes((v) => !v)}
                  className="self-start cursor-pointer bg-transparent border-none p-0 text-[12px]"
                  style={{ color: "var(--accent-cyan)" }}
                >
                  {showAllNotes
                    ? t("update.showLessItems")
                    : t("update.showAllItems", { count: totalItems })}
                </button>
              )}
            </div>
          )}

          {installProgress !== null && (
            <div
              className="mt-3 flex items-center gap-2"
              role="progressbar"
              aria-valuenow={installProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-1 rounded-full flex-1 overflow-hidden"
                style={{ background: "var(--bg-code)" }}
              >
                <div
                  className="h-full w-full rounded-full"
                  style={{
                    background: "var(--accent-cyan)",
                    transform: `scaleX(${installProgress / 100})`,
                    transformOrigin: "left",
                    transition: "transform 200ms ease",
                  }}
                />
              </div>
              <span
                className="text-[12px] tabular-nums shrink-0"
                style={{ color: "var(--text-secondary)" }}
              >
                {installProgress}%
              </span>
            </div>
          )}

          {installError && (
            <div className="mt-2" style={{ color: "var(--accent-red, #FF6B6B)" }}>
              {t("update.installFailed")}
            </div>
          )}

          <div
            className="relative flex items-center gap-2 mt-3 pt-3"
            style={{ borderTop: "1px solid var(--border-subtle)" }}
          >
            {installed ? (
              <button
                onClick={handleRelaunch}
                className="px-4 py-1.5 rounded-full text-[12px] font-medium cursor-pointer"
                style={ctaStyle}
              >
                {t("update.restartToUpdate")}
              </button>
            ) : (
              <button
                onClick={handleInstall}
                disabled={installProgress !== null}
                className="px-4 py-1.5 rounded-full text-[12px] font-medium cursor-pointer tabular-nums"
                style={{
                  ...ctaStyle,
                  opacity: installProgress !== null ? 0.6 : 1,
                }}
              >
                {installProgress === null
                  ? t("update.installNow")
                  : `${t("update.downloading")} ${Math.round(installProgress)}%`}
              </button>
            )}
            <span className="flex-1" />
            {/* 安装中不提供收起：否则唯一的进度指示会消失 */}
            {installProgress === null && (
              <TextButton onClick={() => setExpanded(false)}>
                {t("update.collapse")}
              </TextButton>
            )}
            {menuOpen && (
              <div
                className="absolute bottom-full right-0 mb-1 rounded-lg py-1 flex flex-col"
                style={{
                  minWidth: 150,
                  background: "var(--bg-sidebar)",
                  border: "1px solid var(--divider)",
                  boxShadow: "var(--shadow-menu)",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void openUrl(RELEASES_URL);
                  }}
                  className="text-left px-3 py-1.5 text-[12px] cursor-pointer bg-transparent border-none"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("update.viewFullLog")}
                </button>
                {!installed && installProgress === null && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-left px-3 py-1.5 text-[12px] cursor-pointer bg-transparent border-none"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {t("update.skipVersion")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

const UpdateIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
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

const CloseButton: React.FC<{ onClick: () => void; label: string }> = ({
  onClick,
  label,
}) => (
  <button
    onClick={onClick}
    className="shrink-0 flex items-center justify-center cursor-pointer bg-transparent border-none p-0"
    style={{ color: "var(--text-muted)", width: 24, height: 24 }}
    aria-label={label}
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
