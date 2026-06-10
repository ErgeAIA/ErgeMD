import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      exclude: [
        "node_modules/",
        "src/**/*.test.{ts,tsx}",
        "src/**/index.ts",
        "src/main.tsx",
        "src/App.tsx",
      ],
      thresholds: {
        // 起步阶段保守；后续按模块单独设
        lines: 30,
        functions: 30,
        branches: 30,
        statements: 30,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
