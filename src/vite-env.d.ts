/// <reference types="vite/client" />

// mermaid 12.2.0 内部 dagre 渲染器 chunk（思维导图「横向逻辑图」布局经注册包装布局
// 委托它渲染，把 data4Layout.direction 改 LR，见 MermaidDiagram.tsx）。
// 该路径含 mermaid 版本哈希，升级 mermaid 后若报错需同步更新此处文件名。
declare module "mermaid/dist/chunks/mermaid.esm/dagre-WMVPSHVI.mjs";
