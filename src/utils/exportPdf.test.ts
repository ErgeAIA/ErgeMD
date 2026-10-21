import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const addToastMock = vi.fn();
const saveMock = vi.fn();
const captureExportDocumentMock = vi.fn();
const invokeMock = vi.fn();
const detectPlatformMock = vi.fn();

const currentContentRef = { current: "" };
const currentFilePathRef = { current: "" };
const readingSettingsRef = { current: { fontSize: 16 } };

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: (...args: unknown[]) => saveMock(...args),
}));

vi.mock("@/utils/export", () => ({
  captureExportDocument: (...args: unknown[]) => captureExportDocumentMock(...args),
}));

vi.mock("@/stores/fileStore", () => ({
  useFileStore: {
    getState: () => ({
      get currentContent() {
        return currentContentRef.current;
      },
      get currentFilePath() {
        return currentFilePathRef.current;
      },
    }),
  },
}));

vi.mock("@/stores/readerStore", () => ({
  useReaderStore: {
    getState: () => ({
      addToast: addToastMock,
    }),
  },
}));

vi.mock("@/stores/settingsStore", () => ({
  useSettingsStore: {
    getState: () => ({
      get readingSettings() {
        return readingSettingsRef.current;
      },
    }),
  },
}));

vi.mock("./platform", () => ({
  detectPlatform: () => detectPlatformMock(),
}));

describe("exportPdf platform-aware toast", () => {
  beforeEach(() => {
    currentContentRef.current = "# Hello";
    currentFilePathRef.current = "/tmp/note.md";
    addToastMock.mockClear();
    saveMock.mockReset();
    captureExportDocumentMock.mockReset();
    invokeMock.mockReset();
    detectPlatformMock.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("emits guidance toast on macOS before invoking export_pdf", async () => {
    detectPlatformMock.mockReturnValue("macos");
    captureExportDocumentMock.mockResolvedValue("<html></html>");
    saveMock.mockResolvedValue("/tmp/note.pdf");
    invokeMock.mockResolvedValue(undefined);

    const { exportPdf } = await import("./exportPdf");
    await exportPdf();

    expect(addToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "info",
        message: expect.stringContaining("macOS"),
      }),
    );
    expect(invokeMock).toHaveBeenCalledWith("export_pdf", expect.any(Object));
  });

  it("emits guidance toast on Linux before invoking export_pdf", async () => {
    detectPlatformMock.mockReturnValue("linux");
    captureExportDocumentMock.mockResolvedValue("<html></html>");
    saveMock.mockResolvedValue("/tmp/note.pdf");
    invokeMock.mockResolvedValue(undefined);

    const { exportPdf } = await import("./exportPdf");
    await exportPdf();

    expect(addToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "info",
        message: expect.stringContaining("Linux"),
      }),
    );
    expect(invokeMock).toHaveBeenCalledWith("export_pdf", expect.any(Object));
  });

  it("does NOT emit platform guidance toast on Windows", async () => {
    detectPlatformMock.mockReturnValue("windows");
    captureExportDocumentMock.mockResolvedValue("<html></html>");
    saveMock.mockResolvedValue("/tmp/note.pdf");
    invokeMock.mockResolvedValue(undefined);

    const { exportPdf } = await import("./exportPdf");
    await exportPdf();

    const infoCalls = addToastMock.mock.calls.filter(
      ([arg]) => (arg as { type?: string })?.type === "info",
    );
    expect(infoCalls).toHaveLength(0);
    expect(invokeMock).toHaveBeenCalledWith("export_pdf", expect.any(Object));
  });

  it("does not invoke export_pdf when content is empty", async () => {
    detectPlatformMock.mockReturnValue("macos");
    currentContentRef.current = "   ";

    const { exportPdf } = await import("./exportPdf");
    await exportPdf();

    // 空内容直接 return,不应触发 export_pdf invoke
    expect(invokeMock).not.toHaveBeenCalled();
  });
});
