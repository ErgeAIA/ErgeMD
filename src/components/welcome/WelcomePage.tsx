import { invoke } from "@tauri-apps/api/core";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import AppIcon from "./AppIcon";

interface RecentFileItem {
  file_path: string;
  file_name: string;
  opened_at: number;
}

interface WelcomePageProps {
  onOpenFile: (filePath?: string) => void;
  onOpenFolder: (folderPath?: string) => void;
  onShowAbout?: () => void;
  dbReady?: boolean;
}

/** 快捷键分组 */
const SHORTCUT_GROUPS = [
  {
    label: "file" as const,
    items: [
      { key: "openFile", keys: "Ctrl+O" },
      { key: "openFolder", keys: "Ctrl+Alt+O" },
      { key: "newWindow", keys: "Ctrl+N" },
      { key: "saveHint", keys: "Ctrl+S" },
      { key: "closeTab", keys: "Ctrl+W" },
      { key: "switchTab", keys: "Ctrl+Tab" },
      { key: "pinTab", keys: "Ctrl+⇧+P" },
      { key: "copyFilePath", keys: "Ctrl+⇧+C" },
      { key: "revealInExplorer", keys: "Ctrl+⇧+D" },
    ],
  },
  {
    label: "export" as const,
    items: [
      { key: "exportHtml", keys: "Ctrl+E" },
      { key: "exportWord", keys: "Ctrl+⇧+E" },
      { key: "exportPdf", keys: "Ctrl+P" },
      { key: "exportPdfGrayscale", keys: "Ctrl+⇧+P" },
    ],
  },
  {
    label: "view" as const,
    items: [
      { key: "search", keys: "Ctrl+F" },
      { key: "toggleSidebar", keys: "Ctrl+L" },
      { key: "goHome", keys: "Ctrl+⇧+R" },
      { key: "toggleTheme", keys: "Ctrl+⇧+T" },
      { key: "settings", keys: "Ctrl+," },
      { key: "adjustFont", keys: "Ctrl+↑/↓" },
      { key: "resetFont", keys: "Ctrl+0" },
      { key: "fullscreen", keys: "F11" },
      { key: "esc", keys: "Esc" },
    ],
  },
] as const;

/**
 * 欢迎页 — 上中下三段布局。
 *
 * 比例：上 35% / 中 flex-1 / 下 15%
 *
 * - 上部：Logo + 虚线拖拽框 + 操作按钮
 * - 中部：快捷键（左）+ 最近打开（右），可滚动，隐藏滚动条
 * - 下部：品牌信息（极简 Markdown 阅读器 by 宝藏二哥AIA）
 *
 * ⚠️ 拖拽文件功能由 App.tsx 通过 Tauri 原生 onDragDropEvent 处理，
 *    此处禁止使用 DOM drag 事件，否则会干扰窗口拖拽。
 */
const WelcomePage: React.FC<WelcomePageProps> = memo(
  ({ onOpenFile, onOpenFolder, onShowAbout, dbReady }) => {
    const { t } = useTranslation();
    const [recentFiles, setRecentFiles] = useState<RecentFileItem[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [ripples, setRipples] = useState<
      { id: number; x: number; y: number }[]
    >([]);
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(
      null,
    );

    useEffect(() => {
      if (!dbReady) return;
      invoke<RecentFileItem[]>("get_recent_files", { limit: 10 })
        .then(setRecentFiles)
        .catch(() => {});
    }, [dbReady]);

    const handleRecentClick = useCallback(
      (filePath: string) => {
        onOpenFile(filePath);
      },
      [onOpenFile],
    );

    const handleClearRecent = useCallback(async () => {
      try {
        await Promise.all([
          invoke("clear_recent_files"),
          invoke("clear_all_reading_progress"),
        ]);
        setRecentFiles([]);
      } catch {
        setRecentFiles([]);
      }
    }, []);

    const formatTime = useCallback(
      (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return t("welcome.timeJustNow");
        if (diffMin < 60) return `${diffMin}${t("welcome.timeMinutes")}`;
        if (diffHour < 24) return `${diffHour}${t("welcome.timeHours")}`;
        if (diffDay < 7) return `${diffDay}${t("welcome.timeDays")}`;
        return date.toLocaleDateString();
      },
      [t],
    );

    // 流星雨 + 背景星星动画
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      resize();
      window.addEventListener("resize", resize);

      // 背景星星
      interface Star {
        x: number;
        y: number;
        size: number;
        baseOpacity: number;
        speed: number;
        phase: number;
      }
      const stars: Star[] = Array.from({ length: 80 }, () => ({
        x: Math.random(),
        y: Math.random(),
        size: 0.5 + Math.random() * 1,
        baseOpacity: 0.3 + Math.random() * 0.4,
        speed: 0.005 + Math.random() * 0.015,
        phase: Math.random() * Math.PI * 2,
      }));

      // 流星
      interface Meteor {
        x: number;
        y: number;
        length: number;
        speed: number;
        opacity: number;
        angle: number;
        thickness: number;
      }

      const createMeteor = (w: number, h: number): Meteor => ({
        x: w * 0.3 + Math.random() * w * 0.9,
        y: -50 + Math.random() * h * 0.35,
        length: 80 + Math.random() * 120,
        speed: 4 + Math.random() * 6,
        opacity: 0.7 + Math.random() * 0.3,
        angle: (210 + Math.random() * 30) * (Math.PI / 180),
        thickness: 1 + Math.random(),
      });

      const meteors: Meteor[] = [];
      let lastSpawn = 0;
      let nextSpawnDelay = 200 + Math.random() * 400;

      let time = 0;
      let animId: number;

      const draw = () => {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        time++;

        // 绘制背景星星（闪烁）
        for (const s of stars) {
          const opacity =
            s.baseOpacity + Math.sin(time * s.speed + s.phase) * 0.25;
          ctx.beginPath();
          ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${Math.max(0.1, Math.min(0.8, opacity))})`;
          ctx.fill();
        }

        // 生成新流星
        lastSpawn += 16; // ~60fps
        if (lastSpawn >= nextSpawnDelay && meteors.length < 20) {
          meteors.push(createMeteor(w, h));
          lastSpawn = 0;
          nextSpawnDelay = 200 + Math.random() * 400;
        }

        // 更新和绘制流星
        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i];
          // 移动
          m.x += Math.cos(m.angle) * m.speed;
          m.y += Math.sin(m.angle) * m.speed;

          // 计算尾部坐标
          const tailX = m.x - Math.cos(m.angle) * m.length;
          const tailY = m.y - Math.sin(m.angle) * m.length;

          // 绘制流星线段（渐变）
          const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
          grad.addColorStop(0, `rgba(255,255,255,${m.opacity * 0.9})`);
          grad.addColorStop(0.3, `rgba(180,160,255,${m.opacity * 0.5})`);
          grad.addColorStop(1, "rgba(139,92,246,0)");

          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(tailX, tailY);
          ctx.strokeStyle = grad;
          ctx.lineWidth = m.thickness;
          ctx.lineCap = "round";
          ctx.stroke();

          // 头部发光圆点
          ctx.beginPath();
          ctx.arc(m.x, m.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${m.opacity * 0.8})`;
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(139,92,246,0.5)";
          ctx.fill();
          ctx.shadowBlur = 0;

          // 移出画布则移除
          if (m.x < -200 || m.y > h + 200) {
            meteors.splice(i, 1);
          }
        }

        animId = requestAnimationFrame(draw);
      };
      animId = requestAnimationFrame(draw);

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("resize", resize);
      };
    }, []);

    return (
      <div
        className="flex flex-col w-full h-full"
        style={{ background: "var(--bg-page, #0A0A0F)" }}
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        onClick={() => {
          const id = Date.now();
          setRipples((prev) => [...prev, { id, x: mousePos.x, y: mousePos.y }]);
          setTimeout(
            () => setRipples((prev) => prev.filter((r) => r.id !== id)),
            800,
          );
          setCtxMenu(null);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setCtxMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        {/* 流星雨画布 */}
        <canvas
          ref={canvasRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* 鼠标跟随光晕 */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)",
            transform: `translate(${mousePos.x - 250}px, ${mousePos.y - 250}px)`,
            transition: "transform 0.08s ease-out",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* 点击涟漪 */}
        {ripples.map((r) => (
          <div
            key={r.id}
            style={{
              position: "fixed",
              left: r.x,
              top: r.y,
              width: 0,
              height: 0,
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              border: "2px solid rgba(139,92,246,0.6)",
              pointerEvents: "none",
              zIndex: 0,
              animation: "welcome-ripple 0.8s ease-out forwards",
            }}
          />
        ))}
        <style>{`
          @keyframes welcome-ripple {
            0% { width: 0; height: 0; opacity: 0.6; }
            100% { width: 200px; height: 200px; opacity: 0; }
          }
        `}</style>

        {/* ===== 上部：Logo + 拖拽框 ===== */}
        <div
          className="flex flex-col items-center justify-end"
          style={{
            flex: "1.618",
            paddingTop: "4vh",
            marginBottom: "1.5vh",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Logo */}
          <AppIcon size="min(160px, 20vh)" style={{ marginBottom: "2vh" }} />

          {/* 虚线拖拽框（左键=打开文件） */}
          <div
            className="flex flex-col items-center justify-center cursor-pointer"
            style={{
              width: "min(560px, 70vw)",
              height: "min(240px, 28vh)",
              padding: "0",
              borderRadius: "10px",
              border: "1px dashed var(--drop-zone-border)",
              gap: "10px",
            }}
            onClick={() => onOpenFile()}
          >
            {/* 主提示 */}
            <span
              style={{
                fontSize: "clamp(14px, 1.8vh, 18px)",
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              {t("welcome.dragHint")}
            </span>

            {/* 操作提示 */}
            <div
              className="flex items-center gap-4"
              style={{
                fontSize: "clamp(12px, 1.5vh, 15px)",
                color: "var(--text-muted)",
                marginTop: "12px",
              }}
            >
              <span>{t("welcome.clickToOpen")}</span>
              <span
                style={{
                  width: "1px",
                  height: "10px",
                  background: "var(--divider)",
                }}
              />
              <span>{t("welcome.rightClickToOpenFolder")}</span>
            </div>
          </div>
        </div>

        {/* 右键菜单（全局） */}
        {ctxMenu && (
          <div
            style={{
              position: "fixed",
              left: ctxMenu.x,
              top: ctxMenu.y,
              zIndex: 50,
              background: "var(--bg-sidebar, #1A1A2E)",
              border: "1px solid var(--divider)",
              borderRadius: "4px",
              padding: "4px 0",
              minWidth: "120px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            {(
              [
                { label: t("welcome.openFile"), action: () => onOpenFile() },
                {
                  label: t("welcome.openFolder"),
                  action: () => onOpenFolder(),
                },
              ] as const
            ).map((item, i) => (
              <React.Fragment key={i}>
                {i === 2 && (
                  <div
                    style={{
                      height: "1px",
                      background: "var(--divider)",
                      margin: "4px 8px",
                    }}
                  />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    item.action();
                    setCtxMenu(null);
                  }}
                  className="w-full text-left border-none cursor-pointer bg-transparent"
                  style={{
                    padding: "6px 12px",
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--hover-bg-subtle)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                  }}
                >
                  {item.label}
                </button>
              </React.Fragment>
            ))}
            {onShowAbout && (
              <>
                <div
                  style={{
                    height: "1px",
                    background: "var(--divider)",
                    margin: "4px 8px",
                  }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowAbout();
                    setCtxMenu(null);
                  }}
                  className="w-full text-left border-none cursor-pointer bg-transparent"
                  style={{
                    padding: "6px 12px",
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--hover-bg-subtle)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                  }}
                >
                  {t("about.menuLabel")}
                </button>
              </>
            )}
          </div>
        )}

        {/* ===== 中部：快捷键（左）+ 最近打开（右） ===== */}
        <div
          className="welcome-scroll flex flex-col items-center justify-start"
          style={{
            flex: "1",
            minHeight: 0,
            overflowY: "auto",
            padding: "0 5vw 2vh",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            className="flex gap-12 w-full"
            style={{
              maxWidth: "min(720px, 80vw)",
              padding: "2vh 0",
            }}
          >
            {/* 快捷键 */}
            <div className="flex-shrink-0" style={{ width: "300px" }}>
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  color: "var(--text-muted)",
                  marginBottom: "10px",
                }}
              >
                {t("welcome.shortcuts")}
              </h3>

              <div className="flex flex-col gap-3">
                {SHORTCUT_GROUPS.map((group) => (
                  <div key={group.label} className="flex flex-col gap-px">
                    {group.items.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between"
                        style={{ padding: "3px 0" }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {t(`welcome.${item.key}`)}
                        </span>
                        <kbd
                          style={{
                            fontSize: "11px",
                            fontFamily: "var(--font-mono)",
                            color: "var(--text-muted)",
                            background: "var(--bg-code)",
                            padding: "2px 6px",
                            borderRadius: "2px",
                            border: "1px solid var(--border-subtle)",
                            lineHeight: "1.4",
                          }}
                        >
                          {item.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* 最近打开 */}
            <div className="flex-1" style={{ minWidth: 0 }}>
              <div
                className="flex items-center justify-between"
                style={{ marginBottom: "10px" }}
              >
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    color: "var(--text-muted)",
                  }}
                >
                  {t("welcome.recentFiles")}
                </h3>
                {recentFiles.length > 0 && (
                  <button
                    onClick={handleClearRecent}
                    className="border-none cursor-pointer bg-transparent"
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      padding: "2px 6px",
                      borderRadius: "3px",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--accent-cyan)";
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--hover-bg-subtle)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--text-muted)";
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                    }}
                  >
                    {t("welcome.clearRecent")}
                  </button>
                )}
              </div>

              {recentFiles.length === 0 ? (
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-muted)",
                    marginTop: "12px",
                  }}
                >
                  {t("welcome.noRecentFiles")}
                </p>
              ) : (
                <div className="flex flex-col gap-px">
                  {recentFiles.map((file) => (
                    <div
                      key={file.file_path}
                      className="flex items-center group"
                      style={{ padding: "0 4px" }}
                    >
                      <button
                        onClick={() => handleRecentClick(file.file_path)}
                        className="flex items-center justify-between text-left border-none cursor-pointer flex-1"
                        style={{
                          padding: "6px 4px",
                          borderRadius: "3px",
                          background: "transparent",
                          minWidth: 0,
                          transition: "background 80ms ease",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--hover-bg-subtle)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "transparent";
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            color: "var(--text-secondary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "calc(100% - 50px)",
                          }}
                        >
                          {file.file_name}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            flexShrink: 0,
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {formatTime(file.opened_at)}
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          invoke("delete_recent_file", { filePath: file.file_path }).catch(() => {});
                          setRecentFiles((prev) =>
                            prev.filter((f) => f.file_path !== file.file_path),
                          );
                        }}
                        className="border-none cursor-pointer bg-transparent flex items-center justify-center opacity-0 group-hover:opacity-100"
                        style={{
                          width: "18px",
                          height: "18px",
                          flexShrink: 0,
                          borderRadius: "3px",
                          color: "var(--text-muted)",
                          transition: "opacity 100ms ease, color 80ms ease",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.color =
                            "var(--toast-error-border)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.color =
                            "var(--text-muted)";
                        }}
                        aria-label="移除"
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <line x1="1" y1="1" x2="9" y2="9" />
                          <line x1="9" y1="1" x2="1" y2="9" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== 下部：品牌信息 + 关于 ===== */}
        <div
          className="flex-shrink-0 flex items-center justify-center gap-3"
          style={{
            padding: "2vh 0",
            position: "relative",
            zIndex: 1,
          }}
        >
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            {t("welcome.subtitlePrefix")}
            <a
              href="https://space.bilibili.com/67221461"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--accent-cyan)",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.textDecoration =
                  "underline";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.textDecoration = "none";
              }}
            >
              {t("welcome.subtitleAuthor")}
            </a>
          </p>
          {onShowAbout && (
            <button
              onClick={onShowAbout}
              title={t("about.menuLabel")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                fontSize: "16px",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "4px",
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--accent-cyan)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-muted)";
              }}
            >
              💗
            </button>
          )}
        </div>
      </div>
    );
  },
);

WelcomePage.displayName = "WelcomePage";

export default WelcomePage;
