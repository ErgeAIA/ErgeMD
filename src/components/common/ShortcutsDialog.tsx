import Portal from "@/components/Portal";
import { SHORTCUT_GROUPS } from "@/config/shortcuts";
import React, { memo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 快捷键总览弹窗：欢迎页之外的全局入口（标题栏键盘图标 / Ctrl+K）。
 * 模态浮面：Esc、Ctrl+K、点遮罩、关闭按钮都能收起；打开时锁焦点。
 */
const ShortcutsDialog: React.FC<ShortcutsDialogProps> = memo(
  ({ open, onClose }) => {
    const { t } = useTranslation();
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    const focusables = useCallback((): HTMLElement[] => {
      if (!dialogRef.current) return [];
      return Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
    }, []);

    useEffect(() => {
      if (!open) return;
      closeRef.current?.focus();

      const onKeyDown = (event: KeyboardEvent) => {
        const ctrl = event.ctrlKey || event.metaKey;
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
          return;
        }
        if (ctrl && (event.key === "k" || event.key === "K")) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
          return;
        }
        if (event.key !== "Tab") return;
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };

      // 捕获阶段拦截：避免 Esc 同时关掉侧栏/搜索，Ctrl+K 再次触发
      window.addEventListener("keydown", onKeyDown, true);
      return () => window.removeEventListener("keydown", onKeyDown, true);
    }, [open, onClose, focusables]);

    if (!open) return null;

    return (
      <Portal>
        <div
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.45)",
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-dialog-title"
            style={{
              width: "min(760px, calc(100vw - 64px))",
              maxHeight: "72vh",
              display: "flex",
              flexDirection: "column",
              background: "var(--bg-secondary)",
              border: "1px solid var(--divider)",
              borderRadius: 12,
              boxShadow: "var(--shadow-floating-card)",
              overflow: "hidden",
            }}
          >
            <div
              className="flex items-center gap-3"
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--divider)",
              }}
            >
              <h2
                id="shortcuts-dialog-title"
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {t("shortcuts.title")}
              </h2>
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                {t("shortcuts.hint")}
              </span>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={t("shortcuts.close")}
                data-hint={t("shortcuts.close")}
                className="flex items-center justify-center cursor-pointer"
                style={{
                  width: 24,
                  height: 24,
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  color: "var(--text-muted)",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 2L10 10M10 2L2 10"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div
              style={{
                padding: "16px 20px 20px",
                overflowY: "auto",
                scrollbarWidth: "thin",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "18px 28px",
                }}
              >
                {SHORTCUT_GROUPS.map((group) => (
                  <section key={group.id}>
                    <h3
                      style={{
                        margin: "0 0 8px",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                      }}
                    >
                      {t(`shortcuts.groups.${group.id}`)}
                    </h3>
                    <div className="flex flex-col" style={{ gap: 6 }}>
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between"
                          style={{ gap: 12 }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              color: "var(--text-secondary)",
                            }}
                          >
                            {t(`shortcuts.items.${item.labelKey}`)}
                          </span>
                          <kbd
                            style={{
                              flexShrink: 0,
                              fontFamily:
                                'ui-monospace, SFMono-Regular, Consolas, monospace',
                              fontSize: 11,
                              lineHeight: 1.4,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "var(--bg-code)",
                              border: "1px solid var(--divider)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {item.keys}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Portal>
    );
  },
);

ShortcutsDialog.displayName = "ShortcutsDialog";

export default ShortcutsDialog;