import { openUrl } from "@tauri-apps/plugin-opener";
import React, { memo, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import packageJson from "../../../package.json";
import { forceCheckUpdate } from "../common/UpdateChecker";
import { useReaderStore } from "../../stores/readerStore";
import AppIcon from "./AppIcon";

const AVATAR_IMG = "/images/avatar.png";
const BILIBILI_LOGO = "/images/bilibili.png";
const QR_FRIEND_IMG = "/images/qr-friend.png";
const ICO_WECHAT = "/images/Wechat-ico.png";

const GITHUB_URL = "https://github.com/ErgeAIA/ErgeMD";
const BILIBILI_URL = "https://space.bilibili.com/67221461";
const SERIF =
  '"Songti SC", "Source Han Serif SC", "Noto Serif CJK SC", "SimSun", "STSong", serif';

interface AboutPageProps {
  onClose: () => void;
}

const linkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: 0,
  background: "none",
  border: "none",
  color: "var(--brand-primary)",
  font: "inherit",
  fontSize: 13,
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: 4,
  textDecorationThickness: 1,
};

/**
 * 关于页 —— 暗纸宋体的「版权页」版式（F 版）。
 * 单列左轴、72px 应用图标、口号先行、身份与简介两段、入口居中；
 * 二维码点击展开（Esc 先收码、再关页），不再使用悬停弹层。
 */
const AboutPage: React.FC<AboutPageProps> = memo(({ onClose }) => {
  const { t } = useTranslation();
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [latestAvailable, setLatestAvailable] = useState<{
    version: string;
    releaseUrl: string;
  } | null>(null);
  const [wechatOpen, setWechatOpen] = useState(false);
  const addToast = useReaderStore((s) => s.addToast);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const result = await forceCheckUpdate();
        if (cancelled) return;
        if (result.hasUpdate && result.releaseUrl) {
          setLatestAvailable({
            version: result.latestVersion,
            releaseUrl: result.releaseUrl,
          });
        }
      } catch {
        // 静默失败，不打扰用户
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (wechatOpen) {
        setWechatOpen(false);
      } else {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, wechatOpen]);

  const handleCheckUpdate = async () => {
    if (checkingUpdate) return;
    if (latestAvailable) {
      void openUrl(latestAvailable.releaseUrl);
      return;
    }
    setCheckingUpdate(true);
    try {
      const { hasUpdate, latestVersion, releaseUrl } =
        await forceCheckUpdate();
      if (hasUpdate) {
        if (releaseUrl) {
          setLatestAvailable({ version: latestVersion, releaseUrl });
        }
        addToast({
          type: "info",
          message: t("about.newVersionAvailable", { version: latestVersion }),
          duration: 8000,
          action: { label: t("about.viewRelease"), url: releaseUrl },
        });
      } else {
        setLatestAvailable(null);
        addToast({
          type: "info",
          message: t("about.noUpdate", { version: latestVersion }),
          duration: 3000,
        });
      }
    } catch {
      addToast({
        type: "error",
        message: t("about.updateCheckFailed"),
        duration: 3000,
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const versionLabel = checkingUpdate
    ? t("about.checking")
    : latestAvailable
      ? t("about.updateRowNew", { version: latestAvailable.version })
      : t("about.noUpdate", { version: packageJson.version });

  return (
    <>
      <div
        data-tauri-drag-region
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "var(--overlay-bg, rgba(0,0,0,0.6))",
        }}
        onClick={onClose}
      />

      <div
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 101,
          width: "min(600px, calc(100vw - 48px))",
          maxHeight: "85vh",
          overflowY: "auto",
          background: "var(--bg-reader)",
          border: "1px solid var(--divider)",
          borderRadius: 2,
          boxShadow: "var(--shadow-popup)",
          color: "var(--text-primary)",
          fontFamily: SERIF,
        }}
      >
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label={t("about.escToClose")}
          data-hint={t("about.escToClose")}
          style={{
            position: "absolute",
            top: 10,
            right: 12,
            width: 24,
            height: 24,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            zIndex: 1,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>

        <div style={{ padding: "28px 36px 26px" }}>
          {/* 头部：Logo + 书名 + 副标题 + 元数据 + 更新状态 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              paddingRight: 24,
            }}
          >
            <AppIcon size={72} style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  lineHeight: 1.2,
                  color: "var(--text-primary)",
                }}
              >
                ErgeMD
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 14,
                  letterSpacing: "0.01em",
                  color: "var(--text-muted)",
                }}
              >
                {t("about.subtitle")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCheckUpdate}
              data-hint={
                latestAvailable
                  ? t("about.latestVersionHint", {
                      version: latestAvailable.version,
                    })
                  : t("about.checkUpdateHint")
              }
              style={{
                alignSelf: "center",
                flexShrink: 0,
                whiteSpace: "nowrap",
                padding: 0,
                background: "none",
                border: "none",
                fontFamily: "inherit",
                fontSize: 12,
                lineHeight: 1.4,
                cursor: checkingUpdate ? "wait" : "pointer",
                color: latestAvailable
                  ? "var(--brand-primary)"
                  : "var(--text-muted)",
              }}
            >
              {versionLabel}
            </button>
          </div>

          {/* 元数据：与正文同一条左轴 */}
          <p
            style={{
              margin: "10px 0 0",
              fontFamily:
                "ui-monospace, SFMono-Regular, Consolas, monospace",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            v{packageJson.version} · {t("about.license")}
          </p>

          {/* 口号 */}
          <p
            style={{
              margin: "20px 0 0",
              fontSize: 16,
              lineHeight: 1.7,
              letterSpacing: "0.01em",
              color: "var(--text-primary)",
            }}
          >
            {t("about.lead")}
          </p>

          {/* 功能 */}
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 13,
              lineHeight: 1.85,
              color: "var(--text-primary)",
            }}
          >
            {t("about.intro")}
          </p>

          {/* 平台 */}
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              lineHeight: 1.85,
              color: "var(--text-muted)",
            }}
          >
            {t("about.platform")}
          </p>

          <div
            style={{
              height: 1,
              background: "var(--divider)",
              margin: "18px 0 16px",
            }}
          />

          {/* 作者 */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <img
              src={AVATAR_IMG}
              alt=""
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                border: "1px solid var(--divider)",
                objectFit: "cover",
                flexShrink: 0,
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {t("about.authorName")}
              </div>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                {t("about.role")}
              </p>
            </div>
          </div>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 13,
              lineHeight: 1.8,
              color: "var(--text-muted)",
            }}
          >
            {t("about.bio")}
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              lineHeight: 1.8,
              color: "var(--text-muted)",
            }}
          >
            {t("about.share")}
          </p>

          <div
            style={{
              height: 1,
              background: "var(--divider)",
              margin: "18px 0 16px",
            }}
          />

          {/* 连接入口 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
            }}
          >
            <button
              type="button"
              onClick={() => void openUrl(GITHUB_URL)}
              style={linkStyle}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ width: 14, height: 14 }}
                aria-hidden="true"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>{t("about.gitHub")}</span>
            </button>

            <button
              type="button"
              onClick={() => void openUrl(BILIBILI_URL)}
              style={linkStyle}
            >
              <img
                src={BILIBILI_LOGO}
                alt=""
                style={{ width: 14, height: 14, objectFit: "contain" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <span>{t("about.bilibili")}</span>
            </button>

            <button
              type="button"
              onClick={() => setWechatOpen((v) => !v)}
              aria-expanded={wechatOpen}
              aria-controls="about-wechat-qr"
              style={linkStyle}
            >
              <img
                src={ICO_WECHAT}
                alt=""
                style={{ width: 14, height: 14, objectFit: "contain" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <span>{t("about.wechat")}</span>
            </button>
          </div>

          {wechatOpen && (
            <div
              id="about-wechat-qr"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                marginTop: 14,
              }}
            >
              <img
                src={QR_FRIEND_IMG}
                alt={t("about.qrFriendLabel")}
                style={{
                  width: 132,
                  height: 132,
                  borderRadius: 2,
                  border: "1px solid var(--divider)",
                  background: "var(--bg-page)",
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  lineHeight: 1.7,
                  color: "var(--text-muted)",
                }}
              >
                {t("about.qrFriendLabel")}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
});

AboutPage.displayName = "AboutPage";

export default AboutPage;