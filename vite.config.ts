import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import path from "path";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [
    react(),
    tailwindcss(),
    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 80 },
      jpg: { quality: 80 },
      webp: {
        lossless: true,
      },
      svg: {
        multipass: true,
        plugins: [
          { name: "removeViewBox", active: false },
          { name: "removeEmptyAttrs", active: true },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/")
          ) {
            return "react-vendor";
          }

          if (
            id.includes("/node_modules/mermaid/") ||
            id.includes("/node_modules/@mermaid-js/") ||
            id.includes("/node_modules/cytoscape") ||
            id.includes("/node_modules/dagre-d3-es/") ||
            id.includes("/node_modules/d3")
          ) {
            return "mermaid";
          }

          if (id.includes("/node_modules/katex/")) {
            return "katex";
          }

          if (
            id.includes("/node_modules/react-markdown/") ||
            id.includes("/node_modules/remark-") ||
            id.includes("/node_modules/rehype-") ||
            id.includes("/node_modules/unified/") ||
            id.includes("/node_modules/micromark") ||
            id.includes("/node_modules/mdast-") ||
            id.includes("/node_modules/hast-")
          ) {
            return "markdown";
          }

          if (id.includes("/node_modules/highlight.js/")) {
            return "highlight";
          }

          if (id.includes("/node_modules/@tauri-apps/")) {
            return "tauri";
          }
        },
      },
    },
    // mermaid chunk 体积演进：基础 ~1MB → ZenUML 1.0.1（@zenuml/core）~6MB
    // → mermaid 12.2.0 内置 ELK 布局引擎后 ~8.2MB（gzip ~2.2MB）。
    // 该 chunk 为动态导入（首个 mermaid 块渲染时才加载），且 layout 已钉 dagre、
    // ELK 当前不参与渲染，但无法从标准包导入中剔除。调高警告线消除噪音。
    chunkSizeWarningLimit: 8500,
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: [
        "**/src-tauri/**",
        "**/*.md",
        "**/*.markdown",
        "**/*.mdx",
      ],
    },
  },
}));
