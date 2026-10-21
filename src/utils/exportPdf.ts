import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { captureExportDocument } from "./export";
import { useFileStore } from "@/stores/fileStore";
import { useReaderStore } from "@/stores/readerStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { detectPlatform } from "./platform";

async function doExportPdf(grayscale: boolean): Promise<void> {
  const fileStore = useFileStore.getState();
  const content = fileStore.currentContent;

  if (!content || !content.trim()) {
    useReaderStore.getState().addToast({ type: "error", message: "没有可导出的内容" });
    return;
  }

  // macOS / Linux 暂未实现原生 PDF 导出（v0.4.0 走系统打印对话框）
  // 这里在执行 export_pdf 命令之前先弹 Toast 给用户引导
  const platform = detectPlatform();
  if (platform === "macos") {
    useReaderStore.getState().addToast({
      type: "info",
      message: "macOS 将在打印对话框中选择「存储为 PDF」完成导出",
      duration: 5000,
    });
  } else if (platform === "linux") {
    useReaderStore.getState().addToast({
      type: "info",
      message: "Linux 将在打印对话框中选择「Print to File」完成导出",
      duration: 5000,
    });
  }

  const defaultFileName = fileStore.currentFilePath
    ? fileStore.currentFilePath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") || "export"
    : "export";

  const fontSize = useSettingsStore.getState().readingSettings.fontSize;

  // PDF 与 HTML 共用同一份 DOM 复制产物：从「屏幕上所见」直接派生，杜绝渲染漂移。
  const filePathPromise = save({
    filters: [{ name: "PDF", extensions: ["pdf"] }],
    defaultPath: `${defaultFileName}.pdf`,
  });

  try {
    const [filePath, htmlContent] = await Promise.all([
      filePathPromise,
      captureExportDocument({ grayscale, forPdf: true, fontSize }),
    ]);

    if (!filePath) return;

    await invoke("export_pdf", {
      htmlContent,
      filePath,
    });
    useReaderStore.getState().addToast({ type: "success", message: "PDF 导出成功" });
  } catch (err) {
    console.error("PDF export failed:", err);
    useReaderStore.getState().addToast({ type: "error", message: "导出 PDF 失败" });
  }
}

export async function exportPdf(): Promise<void> {
  return doExportPdf(false);
}

export async function exportPdfGrayscale(): Promise<void> {
  return doExportPdf(true);
}
