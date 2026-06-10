import { vi } from "vitest";

// 全局 Tauri API mock，避免测试中触发真实 invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    close: vi.fn(),
    isMaximized: vi.fn(() => Promise.resolve(false)),
    onResized: vi.fn(() => Promise.resolve(() => {})),
    setPosition: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    outerPosition: vi.fn(() => Promise.resolve({ x: 0, y: 0 })),
    startDragging: vi.fn(),
    toggleMaximize: vi.fn(),
  })),
  LogicalPosition: class {
    constructor(public x: number, public y: number) {}
  },
}));

vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: vi.fn(() => ({
    onDragDropEvent: vi.fn(() => Promise.resolve(() => {})),
  })),
}));

// 静默 React 18+ act() 警告（Vitest 环境的常见噪音）
const originalError = console.error;
beforeEach(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("not wrapped in act")) {
      return;
    }
    originalError(...args);
  };
});
afterEach(() => {
  console.error = originalError;
});
