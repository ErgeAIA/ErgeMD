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
    // ZenUML 外部插件 (@mermaid-js/mermaid-zenuml@0.2.3) 引入 @zenuml/core@^3.47.0
    // 依赖较大，导致 mermaid chunk 从 ~1MB 膨胀至 ~6MB
    // 调整 chunkSizeWarningLimit 以消除构建警告，构建产物不变
    chunkSizeWarningLimit: 6500,
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
