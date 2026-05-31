import React, { memo, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../hooks/useTheme";
import SVGPreview from "./SVGPreview";

import vizGlobalUrl from "@plantuml/core/viz-global.js?url";

const plantumlCache = new Map<string, { svgHtml: string; timestamp: number }>();
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24;
const CACHE_MAX_SIZE = 100;

const cleanupCache = () => {
  const now = Date.now();
  for (const [key, value] of plantumlCache.entries()) {
    if (now - value.timestamp > CACHE_MAX_AGE) {
      plantumlCache.delete(key);
    }
  }
  if (plantumlCache.size > CACHE_MAX_SIZE) {
    const entries = Array.from(plantumlCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, entries.length - CACHE_MAX_SIZE);
    toDelete.forEach(([key]) => plantumlCache.delete(key));
  }
};

interface RenderTask {
  lines: string[];
  isDark: boolean;
  resolve: (svg: string) => void;
  reject: (err: unknown) => void;
}

const plantumlRenderQueue: RenderTask[] = [];
let isPlantumlRendering = false;

const processPlantumlQueue = async () => {
  if (isPlantumlRendering) return;
  isPlantumlRendering = true;

  while (plantumlRenderQueue.length > 0) {
    const task = plantumlRenderQueue.shift()!;
    try {
      await ensureVizGlobal();

      if (!plantumlModulePromise) {
        plantumlModulePromise = import("@plantuml/core");
      }
      const { renderToString } = await plantumlModulePromise;

      const svg = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("PlantUML render timeout (30s)"));
        }, 30000);

        renderToString(
          task.lines,
          (svgStr: string) => {
            clearTimeout(timeout);
            resolve(svgStr);
          },
          (errMsg: string) => {
            clearTimeout(timeout);
            reject(new Error(errMsg));
          },
          { dark: task.isDark },
        );
      });

      task.resolve(svg);
    } catch (err) {
      task.reject(err);
    }
  }

  isPlantumlRendering = false;
};

const enqueueRender = (
  lines: string[],
  isDark: boolean,
): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    plantumlRenderQueue.push({ lines, isDark, resolve, reject });
    processPlantumlQueue();
  });
};

const DARK_THEMES = new Set([
  "dark",
  "cyberpunk",
  "falcon",
  "aurora",
  "cherry-blossom",
  "desert-sunset",
  "forest",
  "monochrome",
  "ocean",
  "solar-flare",
  "tokyo-night",
  "neon-cyberpunk",
]);

const getCSSVar = (name: string): string => {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
};

const getRelativeLuminance = (hexColor: string): number => {
  const { r, g, b } = hexToRgb(hexColor);
  const sR = r / 255;
  const sG = g / 255;
  const sB = b / 255;
  const R = sR <= 0.03928 ? sR / 12.92 : Math.pow((sR + 0.055) / 1.055, 2.4);
  const G = sG <= 0.03928 ? sG / 12.92 : Math.pow((sG + 0.055) / 1.055, 2.4);
  const B = sB <= 0.03928 ? sB / 12.92 : Math.pow((sB + 0.055) / 1.055, 2.4);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

const isDarkByTheme = (resolvedTheme: string): boolean => {
  if (DARK_THEMES.has(resolvedTheme)) return true;
  const bgRaw = getCSSVar("--bg-page");
  if (bgRaw && bgRaw.startsWith("#")) {
    return getRelativeLuminance(bgRaw) <= 0.5;
  }
  return false;
};

const injectThemeStyles = (svgHtml: string, isDark: boolean): string => {
  if (!isDark) return svgHtml;

  const chartText = getCSSVar("--chart-text") || "#E0E0E0";
  const chartEdge = getCSSVar("--chart-edge") || "#808080";
  const chartSurface1 = getCSSVar("--chart-surface-1") || "#2E2E38";

  const darkStyle = `<style>
text { fill: ${chartText} !important; }
rect { stroke: ${chartEdge} !important; }
ellipse { stroke: ${chartEdge} !important; }
polygon { stroke: ${chartEdge} !important; }
line { stroke: ${chartEdge} !important; }
path[fill="none"] { stroke: ${chartEdge} !important; }
path:not([fill="none"]):not([fill]) { fill: ${chartSurface1} !important; stroke: ${chartEdge} !important; }
circle { stroke: ${chartEdge} !important; }
polyline { stroke: ${chartEdge} !important; }
rect[style*="fill:rgb("] { fill: ${chartSurface1} !important; }
rect[style*="fill:#"] { fill: ${chartSurface1} !important; }
</style>`;

  const svgIdx = svgHtml.indexOf("<svg");
  if (svgIdx === -1) return svgHtml;

  const afterSvgTag = svgHtml.indexOf(">", svgIdx);
  if (afterSvgTag === -1) return svgHtml;

  return (
    svgHtml.substring(0, afterSvgTag + 1) +
    darkStyle +
    svgHtml.substring(afterSvgTag + 1)
  );
};

interface PlantUMLDiagramProps {
  chart: string;
  onEdit?: () => void;
}

let plantumlModulePromise: Promise<any> | null = null;
let vizGlobalLoadPromise: Promise<void> | null = null;

const ensureVizGlobal = (): Promise<void> => {
  if ((window as any).Viz) return Promise.resolve();
  if (vizGlobalLoadPromise) return vizGlobalLoadPromise;

  vizGlobalLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = vizGlobalUrl;
    script.onload = () => {
      if ((window as any).Viz) {
        resolve();
      } else {
        reject(new Error("viz-global.js loaded but window.Viz not available"));
      }
    };
    script.onerror = () =>
      reject(new Error("Failed to load viz-global.js"));
    document.head.appendChild(script);
  });

  return vizGlobalLoadPromise;
};

const PlantUMLDiagram: React.FC<PlantUMLDiagramProps> = memo(
  ({ chart, onEdit }) => {
    const [svgHtml, setSvgHtml] = useState("");
    const [error, setError] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const lastContextMenuTime = useRef(0);
    const { getResolvedTheme } = useTheme();
    const { t } = useTranslation();

    const resolvedTheme = getResolvedTheme();
    const isDark = isDarkByTheme(resolvedTheme);

    const cacheKey = JSON.stringify({
      isDark,
      chart,
      _version: "v3",
    });

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { rootMargin: "200px 0px" },
      );

      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      if (!isVisible) return;

      const cached = plantumlCache.get(cacheKey);
      if (cached) {
        setSvgHtml(cached.svgHtml);
        setError(false);
        return;
      }

      let cancelled = false;
      setIsLoading(true);

      const renderTask = async () => {
        try {
          const lines = chart.split("\n");
          let svg = await enqueueRender(lines, isDark);

          if (cancelled) return;

          svg = injectThemeStyles(svg, isDark);

          cleanupCache();
          plantumlCache.set(cacheKey, {
            svgHtml: svg,
            timestamp: Date.now(),
          });

          setSvgHtml(svg);
          setError(false);
        } catch (err) {
          if (!cancelled) {
            console.error("PlantUML render error:", err);
            setError(true);
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      };

      renderTask();

      return () => {
        cancelled = true;
      };
    }, [isVisible, cacheKey, chart, isDark]);

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      if (now - lastContextMenuTime.current < 500) return;
      lastContextMenuTime.current = now;
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    };

    useEffect(() => {
      const handleClick = () => setShowContextMenu(false);
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }, []);

    return (
      <div
        ref={containerRef}
        className="plantuml-diagram-wrapper"
        onContextMenu={handleContextMenu}
      >
        <div className="plantuml-container">
          {isLoading && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-pulse text-text-muted">
                {t("reader.rendering")}
              </div>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="text-accent-red mb-2">
                {t("reader.renderError")}
              </div>
              <div className="text-text-muted text-sm max-w-md">
                {t("reader.plantumlError")}
              </div>
            </div>
          )}
          {svgHtml && !error && (
            <div
              className="plantuml-svg-wrapper"
              dangerouslySetInnerHTML={{ __html: svgHtml }}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest("svg")) {
                  setShowPreview(true);
                }
              }}
              title={t("chart.clickToZoom")}
            />
          )}
        </div>

        {showPreview && svgHtml && (
          <SVGPreview
            svgHtml={svgHtml}
            onClose={() => setShowPreview(false)}
          />
        )}

        {showContextMenu && (
          <div
            ref={contextMenuRef}
            className="fixed bg-bg-secondary border border-divider rounded-lg shadow-lg py-1 z-50 min-w-32"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          >
            <button
              className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-hover-bg-subtle transition-colors"
              onClick={() => {
                setShowPreview(true);
                setShowContextMenu(false);
              }}
            >
              {t("common.preview")}
            </button>
            {onEdit && (
              <button
                className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-hover-bg-subtle transition-colors"
                onClick={() => {
                  onEdit();
                  setShowContextMenu(false);
                }}
              >
                {t("common.edit")}
              </button>
            )}
          </div>
        )}
      </div>
    );
  },
);

PlantUMLDiagram.displayName = "PlantUMLDiagram";

export default PlantUMLDiagram;
