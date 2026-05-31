import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

export async function exportDocx(markdownContent: string): Promise<void> {
  if (!markdownContent) {
    throw new Error("No markdown content found");
  }

  const filePath = await save({
    filters: [{ name: "Word", extensions: ["docx"] }],
    defaultPath: "export.docx",
  });

  if (!filePath) return;

  const { markdownDocx, Packer } = await import("markdown-docx");

  const doc = await markdownDocx(markdownContent, {
    gfm: true,
    ignoreHtml: false,
  });

  const blob = await Packer.toBlob(doc);
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Data = btoa(binary);

  await invoke("write_binary_file", { path: filePath, base64Data });
}
