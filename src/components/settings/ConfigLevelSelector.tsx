import {
  ConfigLevel,
  ConfigLevelInfoMap,
  PresetConfigs,
} from "@/config/readerConfig";
import { useSettingsStore } from "@/stores/settingsStore";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface ConfigLevelSelectorProps {
  className?: string;
}

/**
 * 配置级别选择器组件
 *
 * 提供三级预设配置方案的选择界面，包括低档、中档、高档三种级别。
 * 用户可以通过下拉菜单选择级别，并在选择前预览不同级别对应的效果差异。
 *
 * 性能优化：
 * - 使用 React.memo 避免不必要的重渲染
 * - 使用 useCallback 缓存事件处理函数
 * - 使用 useMemo 缓存计算结果
 * - 使用 CSS 变量实现主题自适应
 * - 减少 DOM 操作次数
 *
 * 主题自适应：
 * - 使用项目统一的 CSS 变量体系
 * - 实现平滑过渡动画
 * - 支持亮色/暗色主题切换
 */
export const ConfigLevelSelector: React.FC<ConfigLevelSelectorProps> =
  React.memo(({ className = "" }) => {
    const configLevel = useSettingsStore((state) => state.configLevel);
    const setConfigLevel = useSettingsStore((state) => state.setConfigLevel);
    const [isExpanded, setIsExpanded] = useState(false);
    const { t } = useTranslation();
    const [previewLevel, setPreviewLevel] = useState<ConfigLevel | null>(null);

    // 语言化后的级别说明：数值参数保留，文案走 i18n
    const localizedInfo = useCallback(
      (level: ConfigLevel) => ({
        ...ConfigLevelInfoMap[level],
        name: t(`settings.configLevels.${level}.name`),
        description: t(`settings.configLevels.${level}.description`),
        scenario: t(`settings.configLevels.${level}.scenario`),
        effects: t(`settings.configLevels.${level}.effects`, {
          returnObjects: true,
        }) as string[],
      }),
      [t],
    );

    // 缓存级别列表
    const levels: ConfigLevel[] = useMemo(() => ["low", "medium", "high"], []);
    const currentLevelInfo = localizedInfo(configLevel);
    const previewLevelInfo = previewLevel
      ? localizedInfo(previewLevel)
      : null;

    // 缓存事件处理函数
    const handleSelectLevel = useCallback(
      (level: ConfigLevel) => {
        setConfigLevel(level);
        setIsExpanded(false);
        setPreviewLevel(null);
      },
      [setConfigLevel],
    );

    const handleMouseEnter = useCallback((level: ConfigLevel) => {
      setPreviewLevel(level);
    }, []);

    const handleMouseLeave = useCallback(() => {
      setPreviewLevel(null);
    }, []);

    const toggleExpanded = useCallback(() => {
      setIsExpanded((prev) => !prev);
    }, []);

    // 获取级别图标
    const getLevelIcon = useCallback((level: ConfigLevel) => {
      switch (level) {
        case "low":
          return "1";
        case "medium":
          return "2";
        case "high":
          return "3";
      }
    }, []);

    // 获取级别颜色（使用CSS变量）
    const getLevelColorClass = useCallback((level: ConfigLevel) => {
      switch (level) {
        case "low":
          return "level-icon-low";
        case "medium":
          return "level-icon-medium";
        case "high":
          return "level-icon-high";
      }
    }, []);

    // 缓存预设配置参数
    const presetParams = useMemo(() => {
      return levels.map((level) => ({
        level,
        virtualThreshold:
          PresetConfigs[level].performance.virtualThreshold.toLocaleString(),
        maxCacheSize: PresetConfigs[level].performance.maxCacheSize,
      }));
    }, [levels]);

    // 点击外部关闭下拉菜单
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        const selectorElement = document.querySelector(
          ".config-level-selector",
        );
        if (selectorElement && !selectorElement.contains(target)) {
          setIsExpanded(false);
        }
      };

      if (isExpanded) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isExpanded]);

    return (
      <div className={`config-level-selector relative ${className}`}>
        {/* 主选择按钮 */}
        <button
          onClick={toggleExpanded}
          className="config-level-btn flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200"
        >
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${getLevelColorClass(configLevel)}`}
          >
            {getLevelIcon(configLevel)}
          </div>
          <div className="flex flex-col items-start">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {currentLevelInfo.name}
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              {currentLevelInfo.description}
            </span>
          </div>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
            style={{ color: "var(--text-secondary)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* 下拉菜单 */}
        {isExpanded && (
          <div className="config-level-dropdown absolute top-full left-0 mt-2 w-full min-w-[240px] rounded-xl shadow-2xl z-[100] overflow-hidden animate-slide-down">
            {/* 预览面板 */}
            {(previewLevel || configLevel) && (
              <div
                className="p-4 border-b animate-fade-in"
                style={{
                  background: "var(--bg-secondary)",
                  borderColor: "var(--divider)",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${getLevelColorClass(previewLevel || configLevel)}`}
                  >
                    {getLevelIcon(previewLevel || configLevel)}
                  </div>
                  <div>
                    <h4
                      className="font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {(previewLevelInfo || currentLevelInfo).name}
                    </h4>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {(previewLevelInfo || currentLevelInfo).description}
                    </p>
                  </div>
                </div>
                <p
                  className="text-xs mb-3"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {previewLevel
                    ? t("settings.configLevelUI.preview")
                    : t("settings.configLevelUI.current")}
                  {(previewLevelInfo || currentLevelInfo).scenario}
                </p>
                <div className="space-y-1">
                  {(previewLevelInfo || currentLevelInfo).effects.map(
                    (effect, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <svg
                          className="w-3 h-3"
                          style={{ color: "var(--accent-cyan)" }}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {effect}
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* 级别列表 */}
            <div className="divide-y" style={{ borderColor: "var(--divider)" }}>
              {levels.map((level) => {
                const info = localizedInfo(level);
                const isSelected = level === configLevel;
                const isPreviewing = level === previewLevel;

                return (
                  <button
                    key={level}
                    onClick={() => handleSelectLevel(level)}
                    onMouseEnter={() => handleMouseEnter(level)}
                    onMouseLeave={handleMouseLeave}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors duration-150`}
                    style={{
                      background: isPreviewing
                        ? "var(--hover-bg-light)"
                        : isSelected
                          ? "var(--selected-bg)"
                          : "transparent",
                    }}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${getLevelColorClass(level)}`}
                    >
                      {getLevelIcon(level)}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {info.name}
                        </span>
                        {isSelected && (
                          <svg
                            className="w-4 h-4"
                            style={{ color: "var(--accent-cyan)" }}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {info.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 参数对比提示 */}
            <div
              className="p-3 border-t"
              style={{
                background: "var(--bg-secondary)",
                borderColor: "var(--divider)",
              }}
            >
              <div
                className="text-xs mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {t("settings.configLevelUI.params")}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {presetParams.map(({ level, virtualThreshold }) => (
                  <div key={level} className="text-xs">
                    <div style={{ color: "var(--text-secondary)" }}>
                      {t("settings.configLevelUI.virtualThreshold")}
                    </div>
                    <div
                      className="font-mono"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {virtualThreshold}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mt-2">
                {presetParams.map(({ level, maxCacheSize }) => (
                  <div key={level} className="text-xs">
                    <div style={{ color: "var(--text-secondary)" }}>
                      {t("settings.configLevelUI.cacheSize")}
                    </div>
                    <div
                      className="font-mono"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {maxCacheSize}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <style>{`
          .config-level-btn {
            background: var(--bg-code);
            border: 1px solid var(--divider);
            color: var(--text-primary);
          }

          .config-level-btn:hover {
            background: var(--hover-bg-light);
            border-color: var(--accent-cyan);
          }

          .config-level-btn:focus {
            outline: none;
            box-shadow: 0 0 0 2px var(--accent-cyan);
          }

          .config-level-dropdown {
            background: var(--bg-sidebar, #1A1A2E);
            border: 1px solid var(--divider);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(100, 200, 200, 0.1);
            backdrop-filter: none;
            overflow-x: hidden;
            overflow-y: auto;
            max-height: calc(100vh - 120px);
          }

          /* 级别图标颜色 */
          .level-icon-low {
            background: var(--accent-orange);
          }

          .level-icon-medium {
            background: var(--accent-yellow);
          }

          .level-icon-high {
            background: var(--accent-green);
          }

          /* 动画效果 */
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-8px);
              pointer-events: none;
            }
            to {
              opacity: 1;
              transform: translateY(0);
              pointer-events: auto;
            }
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .animate-slide-down {
            animation: slideDown 0.2s ease-out forwards;
          }

          .animate-fade-in {
            animation: fadeIn 0.15s ease-out forwards;
          }

          /* 响应式适配 */
          @media (max-width: 480px) {
            .config-level-dropdown {
              width: calc(100vw - 32px);
              left: 50%;
              transform: translateX(-50%);
            }
          }

          /* 高对比度模式 */
          @media (prefers-contrast: high) {
            .level-icon-low,
            .level-icon-medium,
            .level-icon-high {
              border: 2px solid currentColor;
            }
          }

          /* 减少动画模式 */
          @media (prefers-reduced-motion: reduce) {
            .animate-slide-down,
            .animate-fade-in {
              animation-duration: 0.01ms !important;
            }
          }
        `}</style>
      </div>
    );
  });

ConfigLevelSelector.displayName = "ConfigLevelSelector";
