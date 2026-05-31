import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { generatePdfHtml } from "./export";
import { useReaderStore } from "@/stores/readerStore";

export interface ExportPdfOptions {
  grayscale?: boolean;
}

export async function exportPdf(options: ExportPdfOptions = {}): Promise<void> {
  const { grayscale = false } = options;

  const htmlContent = generatePdfHtml(".markdown-body", {
    inlineCss: true,
    grayscale,
  });

  const filePath = await save({
    filters: [{ name: "PDF", extensions: ["pdf"] }],
    defaultPath: "export.pdf",
  });

  if (!filePath) return;

  try {
    await invoke("export_pdf", {
      htmlContent,
      filePath,
    });
  } catch (err) {
    console.error("PDF export failed:", err);
    useReaderStore.getState().addToast({ type: "error", message: "导出 PDF 失败" });
  }
}
