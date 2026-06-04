import { useReaderStore } from "@/stores/readerStore";
import type { ToastMessage } from "@/types";
import React, { memo } from "react";

// Toast 类型对应的颜色配置
const colorMap: Record<
  ToastMessage["type"],
  { bg: string; border: string; text: string }
> = {
  info: {
    bg: "var(--toast-info-bg)",
    border: "var(--toast-info-border)",
    text: "var(--accent-cyan, #00FFFF)",
  },
  success: {
    bg: "var(--toast-success-bg)",
    border: "var(--toast-success-border)",
    text: "var(--accent-green, #00FF64)",
  },
  error: {
    bg: "var(--toast-error-bg)",
    border: "var(--toast-error-border)",
    text: "var(--accent-red, #FF0040)",
  },
  warning: {
    bg: "var(--toast-warning-bg)",
    border: "var(--toast-warning-border)",
    text: "var(--accent-orange, #FF8000)",
  },
};

const ToastItem: React.FC<{
  toast: ToastMessage;
  onClose: () => void;
}> = memo(({ toast, onClose }) => {
  const colors = colorMap[toast.type] || colorMap.info;

  return (
    <div
      role="alert"
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] animate-[toast-enter_200ms_ease-out_forwards]"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        backdropFilter: "blur(8px)",
      }}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={onClose}
        aria-label="关闭通知"
        className="hover-btn-icon flex items-center justify-center shrink-0 bg-transparent border-none cursor-pointer p-0 text-inherit"
        style={{ opacity: 0.6 }}
      >
        <svg
          aria-hidden="true"
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

ToastItem.displayName = "ToastItem";

/**
 * Toast 通知容器 — 固定在右上角，从 readerStore 读取 toasts。
 * Task 4 集成时将挂载到 App.tsx。
 */
const ToastContainer: React.FC = memo(() => {
  const toasts = useReaderStore((s) => s.toasts);
  const removeToast = useReaderStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed z-[400] top-12 right-4 max-w-[360px] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={() => removeToast(toast.id)} />
        </div>
      ))}
    </div>
  );
});

ToastContainer.displayName = "ToastContainer";

export default ToastContainer;
