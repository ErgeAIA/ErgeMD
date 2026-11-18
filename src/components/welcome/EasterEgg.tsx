import React, { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const QR_TIP_IMG = "/images/qr-tip.png";
const QR_FRIEND_IMG = "/images/qr-friend.png";
const QR_BILIBILI_QR = "/images/qr-bilibili.png";
const ICO_REWARD = "/images/reward-ico.png";
const ICO_WECHAT = "/images/Wechat-ico.png";
const ICO_BILIBILI = "/images/bilibili-ico.png";

interface EasterEggProps {
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
        width: "48px",
        height: "48px",
        borderRadius: "10px",
        border: hovered
          ? "1px solid var(--accent-cyan)"
          : "1px solid var(--divider)",
        background: hovered
          ? "rgba(var(--accent-cyan-rgb), 0.08)"
          : "var(--bg-tertiary)",
        cursor: "pointer",
        fontSize: "24px",
        transition: "border-color 0.2s, background 0.2s, transform 0.2s",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt=""
          style={{ width: "28px", height: "28px", objectFit: "contain" }}
        />
      ) : (
        icon
      )}
    </div>
  </div>
));
QrButton.displayName = "QrButton";

const EasterEgg: React.FC<EasterEggProps> = memo(({ onClose }) => {
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

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <>
      {/* 背景遮罩 */}
      <div
        data-tauri-drag-region
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "var(--overlay-bg)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        onClick={onClose}
      />

      {/* 卡片 */}
      <div
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        onMouseLeave={() => setHoveredQr(null)}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 101,
          background: "var(--bg-secondary)",
          border: "1px solid var(--divider)",
          borderRadius: "16px",
          boxShadow: "var(--shadow-floating-card)",
          padding: "32px",
          textAlign: "center",
          maxWidth: "320px",
          width: "90%",
        }}
      >
        {/* 标题 */}
        <div
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "12px",
          }}
        >
          {t("about.easterEggTitle")}
        </div>

        {/* 调侃文案 */}
        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.7,
            color: "var(--text-secondary)",
            margin: "0 0 24px 0",
          }}
        >
          {t("about.easterEggDesc")}
        </p>

        {/* 互动图标 */}
        <div
          className="flex items-center justify-center gap-4"
          style={{ marginBottom: "24px" }}
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

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{
            padding: "8px 20px",
            borderRadius: "8px",
            border: "1px solid var(--divider)",
            background: "transparent",
            color: "var(--text-muted)",
            fontSize: "13px",
            cursor: "pointer",
            transition: "background 0.2s, border-color 0.2s",
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
              "var(--divider)";
          }}
        >
          {t("about.easterEggClose")}
        </button>
      </div>

      {/* 居中弹窗（放在卡片外层，避免 transform 影响 fixed 定位） */}
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
            boxShadow: "var(--shadow-floating-card)",
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
    </>
  );
});

EasterEgg.displayName = "EasterEgg";

export default EasterEgg;
