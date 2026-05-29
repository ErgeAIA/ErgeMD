import { openUrl } from "@tauri-apps/plugin-opener";
import React, { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import packageJson from "../../../package.json";
import AppIcon from "./AppIcon";

// 静态资源路径
const AVATAR_IMG = "/images/avatar.png";
const BILIBILI_LOGO = "/images/bilibili.png";
const QR_TIP_IMG = "/images/qr-tip.png";
const QR_FRIEND_IMG = "/images/qr-friend.png";
const QR_BILIBILI_QR = "/images/qr-bilibili.png";
const ICO_REWARD = "/images/reward-ico.png";
const ICO_WECHAT = "/images/Wechat-ico.png";
const ICO_BILIBILI = "/images/bilibili-ico.png";

interface AboutPageProps {
  onClose: () => void;
}

/** 互动图标按钮（纯触发，不含弹窗） */
const QrButton: React.FC<{
  icon?: string;
  imgSrc?: string;
  hovered: boolean;
  onHover: (v: boolean) => void;
}> = memo(({ icon, imgSrc, hovered, onHover }) => (
  <div onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)}>
    <div
      className="flex items-center justify-center"
      style={{
        width: "36px",
        height: "36px",
        borderRadius: "8px",
        border: hovered
          ? "1px solid var(--accent-cyan)"
          : "1px solid var(--divider)",
        background: hovered
          ? "var(--hover-bg)"
          : "var(--bg-tertiary, rgba(255,255,255,0.02))",
        cursor: "pointer",
        fontSize: "18px",
        transition: "border-color 0.2s, background 0.2s",
        overflow: "hidden",
      }}
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt=""
          style={{ width: "22px", height: "22px", objectFit: "contain" }}
        />
      ) : (
        icon
      )}
    </div>
  </div>
));
QrButton.displayName = "QrButton";

const AboutPage: React.FC<AboutPageProps> = memo(({ onClose }) => {
  const { t } = useTranslation();
  const [hoveredQr, setHoveredQr] = useState<
    "tip" | "friend" | "bilibili" | null
  >(null);

  // 弹窗数据映射
  const qrMap: Record<string, { src: string; label: string }> = {
    tip: { src: QR_TIP_IMG, label: t("about.qrTipLabel") },
    friend: { src: QR_FRIEND_IMG, label: t("about.qrFriendLabel") },
    bilibili: { src: QR_BILIBILI_QR, label: t("about.bilibiliTitle") },
  };

  return (
    <>
      {/* 背景遮罩 — 支持拖拽窗口 */}
      <div
        data-tauri-drag-region
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "var(--overlay-bg, rgba(0,0,0,0.6))",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        onClick={onClose}
      />

      {/* 卡片 */}
      <div
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 101,
          maxWidth: "680px",
          width: "90%",
          maxHeight: "85vh",
          background: "var(--bg-secondary, #1e1e1e)",
          border: "1px solid var(--divider)",
          borderRadius: "12px",
          boxShadow: "var(--shadow-popup)",
          overflowY: "auto",
          color: "var(--text-primary, #e0e0e0)",
        }}
        onMouseLeave={() => setHoveredQr(null)}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          title="按 Esc 可关闭"
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "18px",
            cursor: "pointer",
            padding: "4px 8px",
            lineHeight: 1,
            borderRadius: "4px",
            zIndex: 1,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color =
              "var(--toast-error-border)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
          }}
        >
          ✕
        </button>

        <div style={{ padding: "24px 24px 16px" }}>
          {/* ===== 上部：图标 + 名称 + 版本 + 描述 + slogan ===== */}
          <div
            className="flex items-start gap-4"
            style={{ marginBottom: "12px" }}
          >
            <AppIcon
              size={104}
              style={{ flexShrink: 0, borderRadius: "12px" }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="flex items-center gap-2"
                style={{ marginBottom: "6px" }}
              >
                <h2
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  ErgeMD
                </h2>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    background: "var(--hover-bg)",
                    color: "var(--accent-cyan)",
                    border: "1px solid var(--active-border)",
                    flexShrink: 0,
                  }}
                >
                  v{packageJson.version}
                </span>
              </div>
              <p
                style={{
                  fontSize: "13px",
                  lineHeight: 1.8,
                  color: "var(--text-secondary)",
                  margin: 0,
                  whiteSpace: "pre-line",
                }}
              >
                {t("about.appDescription")}
              </p>
              <p
                style={{
                  fontSize: "11px",
                  fontStyle: "italic",
                  color: "var(--text-muted)",
                  margin: "6px 0 0 0",
                  opacity: 0.6,
                }}
              >
                — {t("about.slogan")}
              </p>
            </div>
          </div>

          {/* ===== 特性标签 ===== */}
          <div
            className="flex flex-wrap justify-center gap-2"
            style={{ marginBottom: "14px" }}
          >
            {[
              { icon: "📖", label: t("about.feature1") },
              { icon: "🎨", label: t("about.feature2") },
              { icon: "⚡", label: t("about.feature3") },
              { icon: "🔍", label: t("about.feature4") },
              { icon: "📤", label: t("about.feature5") },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-1"
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "var(--bg-tertiary, rgba(255,255,255,0.02))",
                  border:
                    "1px solid var(--border-subtle, rgba(255,255,255,0.04))",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {/* ===== 分隔线 ===== */}
          <div
            style={{
              height: "1px",
              background: "var(--divider)",
              margin: "0 0 14px 0",
            }}
          />

          {/* ===== 中部：作者名片 ===== */}
          <div style={{ marginBottom: "16px" }}>
            {/* 头像（居中） */}
            <div
              className="flex justify-center"
              style={{ marginBottom: "8px" }}
            >
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  border: "2px solid var(--divider)",
                  boxShadow:
                    "0 0 20px var(--hover-bg), 0 0 40px var(--hover-bg)",
                  overflow: "hidden",
                }}
              >
                <img
                  src={AVATAR_IMG}
                  alt="宝藏二哥 AIA"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.style.display = "none";
                    const parent = img.parentElement!;
                    parent.style.fontSize = "32px";
                    parent.style.display = "flex";
                    parent.style.alignItems = "center";
                    parent.style.justifyContent = "center";
                    parent.style.background =
                      "var(--bg-tertiary, rgba(255,255,255,0.03))";
                    parent.style.color = "var(--text-muted)";
                    parent.textContent = "😊";
                  }}
                />
              </div>
            </div>

            {/* 作者名（居中） */}
            <div
              style={{
                textAlign: "center",
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: "6px",
              }}
            >
              宝藏二哥 AIA
            </div>

            {/* 签名（居中，斜体，弱化） */}
            <p
              style={{
                textAlign: "center",
                fontSize: "12px",
                fontStyle: "italic",
                color: "var(--text-secondary)",
                margin: "0 0 10px 0",
                opacity: 0.6,
              }}
            >
              — {t("about.authorQuote")}
            </p>

            {/* 身份标签胶囊组（居中） */}
            <div
              className="flex justify-center flex-wrap gap-2"
              style={{ marginBottom: "20px" }}
            >
              {[
                t("about.authorTag1"),
                t("about.authorTag2"),
                t("about.authorTag3"),
                t("about.authorTag4"),
              ].map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    background: "var(--hover-bg)",
                    border: "1px solid var(--active-border)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* ===== 左右分栏 ===== */}
            <div className="about-split-layout">
              {/* 左侧：个人介绍卡片（青色主题） */}
              <div
                style={{
                  flex: "5 1 0",
                  minWidth: 0,
                  padding: "20px 16px 20px 24px",
                  borderRadius: "12px",
                  background: "var(--hover-bg)",
                  border: "1px solid var(--active-border)",
                  borderLeft: "3px solid var(--accent-cyan)",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.8,
                    color: "var(--text-secondary)",
                    margin: "0 0 18px 0",
                    textAlign: "left",
                    whiteSpace: "pre-line",
                  }}
                >
                  {t("about.authorBio")}
                </p>
                {/* 互动图标（嵌入左侧底部，居中） */}
                <div
                  className="flex items-center justify-center gap-5"
                  style={{ paddingTop: "8px" }}
                >
                  <QrButton
                    imgSrc={ICO_REWARD}
                    hovered={hoveredQr === "tip"}
                    onHover={(v) => setHoveredQr(v ? "tip" : null)}
                  />
                  <QrButton
                    imgSrc={ICO_WECHAT}
                    hovered={hoveredQr === "friend"}
                    onHover={(v) => setHoveredQr(v ? "friend" : null)}
                  />
                  <QrButton
                    imgSrc={ICO_BILIBILI}
                    hovered={hoveredQr === "bilibili"}
                    onHover={(v) => setHoveredQr(v ? "bilibili" : null)}
                  />
                </div>
              </div>

              {/* 右侧：B站卡片（粉色主题） */}
              <div
                style={{
                  flex: "5 1 0",
                  minWidth: 0,
                  padding: "20px 24px",
                  borderRadius: "12px",
                  background: "var(--hover-bg)",
                  border: "1px solid var(--active-border)",
                  borderLeft: "3px solid var(--accent-pink)",
                  textAlign: "center",
                }}
              >
                {/* B站 logo + 标题 */}
                <div
                  className="flex items-center justify-center gap-2"
                  style={{ marginBottom: "8px" }}
                >
                  <img
                    src={BILIBILI_LOGO}
                    alt="B站"
                    style={{ width: "56px", height: "56px" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                      const fallback = document.createElement("span");
                      fallback.textContent = "📺";
                      fallback.style.fontSize = "18px";
                      e.currentTarget.parentNode?.insertBefore(
                        fallback,
                        e.currentTarget,
                      );
                    }}
                  />
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {t("about.bilibiliTitle")}
                  </span>
                </div>

                {/* B站按钮 */}
                <div style={{ marginBottom: "12px" }}>
                  <a
                    href="https://space.bilibili.com/67221461"
                    onClick={(e) => {
                      e.preventDefault();
                      openUrl("https://space.bilibili.com/67221461");
                    }}
                    className="flex items-center justify-center gap-1"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "8px 18px",
                      borderRadius: "8px",
                      border: "1px solid var(--accent-pink)",
                      color: "var(--accent-pink)",
                      fontSize: "13px",
                      fontWeight: 500,
                      textDecoration: "none",
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--hover-bg)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                    }}
                  >
                    {t("about.bilibiliButton")}
                    <span style={{ fontSize: "14px" }}>↗</span>
                  </a>
                </div>

                {/* 副标题（弱化） */}
                <p
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.7,
                    color: "var(--text-secondary)",
                    margin: 0,
                    opacity: 0.6,
                    whiteSpace: "pre-line",
                  }}
                >
                  {t("about.bilibiliDesc")}
                </p>
              </div>
            </div>
          </div>

          {/* ===== 居中弹窗 ===== */}
          {hoveredQr && qrMap[hoveredQr] && (
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 300,
                background: "var(--bg-secondary)",
                border: "1px solid var(--divider)",
                borderRadius: "12px",
                padding: "16px",
                boxShadow: "var(--shadow-popup)",
              }}
              onMouseEnter={() => setHoveredQr(hoveredQr)}
              onMouseLeave={() => setHoveredQr(null)}
            >
              <div
                style={{
                  background: "var(--bg-page, #fff)",
                  borderRadius: "8px",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={qrMap[hoveredQr].src}
                  alt={qrMap[hoveredQr].label}
                  style={{
                    maxHeight: "400px",
                    width: "auto",
                    objectFit: "contain",
                  }}
                />
              </div>
              <p
                style={{
                  margin: "12px 0 0 0",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                {qrMap[hoveredQr].label}
              </p>
            </div>
          )}

          {/* ===== 底部 ===== */}
          <div
            style={{
              borderTop: "1px solid var(--divider)",
              marginTop: "16px",
              paddingTop: "12px",
              textAlign: "center",
              fontSize: "12px",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
            }}
          >
            <a
              href="https://github.com/ErgeAIA/ErgeMD"
              onClick={(e) => {
                e.preventDefault();
                openUrl("https://github.com/ErgeAIA/ErgeMD");
              }}
              className="flex items-center justify-center gap-2"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 10px",
                borderRadius: "6px",
                border: "1px solid var(--divider)",
                color: "var(--text-secondary)",
                fontSize: "12px",
                textDecoration: "none",
                cursor: "pointer",
                transition: "background 0.2s, border-color 0.2s",
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget as HTMLElement;
                target.style.background = "var(--hover-bg)";
                target.style.borderColor = "var(--accent-cyan)";
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget as HTMLElement;
                target.style.background = "transparent";
                target.style.borderColor = "var(--divider)";
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ width: "14px", height: "14px" }}
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>{t("about.githubStar")}</span>
            </a>
            <span style={{ opacity: 0.4 }}>|</span>
            {t("about.footer")}
          </div>
        </div>
      </div>
    </>
  );
});

AboutPage.displayName = "AboutPage";

export default AboutPage;
