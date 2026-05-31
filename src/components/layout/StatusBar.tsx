import ProgressBar from "@/components/common/ProgressBar";
import React, { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";

interface StatusBarProps {
  wordCount: number;
  percentage: number;
  /** 由父组件计算的综合透明度 */
  opacity: number;
  /** 鼠标进入/离开 StatusBar 区域时通知父组件 */
  onHoverChange: (hovered: boolean) => void;
}

/**
 * 底部状态栏 — position: fixed 浮动叠加。
 *
 * 沉浸式阅读逻辑（由父组件 App.tsx 控制）：
 * - 鼠标移到底部 → opacity 升至 0.8
 * - 鼠标离开 → opacity 降至 0.6
 * - 滚动中 → opacity 降至 0.2
 */
const StatusBar: React.FC<StatusBarProps> = memo(
  ({ wordCount, percentage, opacity, onHoverChange }) => {
    const { t } = useTranslation();
    const handleMouseEnter = useCallback(() => {
      onHoverChange(true);
    }, [onHoverChange]);

    const handleMouseLeave = useCallback(() => {
      onHoverChange(false);
    }, [onHoverChange]);

    return (
      <div
        className="status-bar fixed inset-x-0 bottom-0 z-50"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* 进度条 */}
        <div
          className="transition-opacity duration-700"
          style={{
            opacity,
          }}
        >
          <ProgressBar percentage={percentage} />
        </div>

        {/* 状态栏文字 — 右下角 */}
        <div
          className="flex items-center justify-end h-6 text-xs select-none pr-3 transition-opacity duration-700"
          style={{
            color: "var(--text-muted, #50505A)",
            opacity,
          }}
        >
          <span>
            {t("statusBar.wordCount", { count: wordCount.toLocaleString() })}{" "}
            &middot;{" "}
            {t("statusBar.progress", { percent: Math.round(percentage) })}
          </span>
        </div>
      </div>
    );
  },
);

StatusBar.displayName = "StatusBar";

export default StatusBar;
