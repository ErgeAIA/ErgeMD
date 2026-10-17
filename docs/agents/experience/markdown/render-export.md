# markdown/render-export — 渲染与导出经验

## MD1: 导出链路独立管线 🔴

- **主张**：文档导出（PDF/HTML）必须走独立管线——从 Markdown 原文直接生成完整 HTML，不复用阅读组件；当前文档内容从状态 store 取，禁止 `document.querySelector` 全局 DOM 查询；所有图表必须在导出前渲染完成。
- **适用**：阅读器/编辑器类应用的导出功能，尤其是渲染层带虚拟滚动时。
- **Why**：虚拟滚动会卸载不可见 block，导出时拿到的是残缺 DOM；多 Tab 下 `querySelector(".markdown-body")` 永远命中第一个 Tab；阅读组件的渲染状态与导出需求耦合会互相破坏。
- **How**：`generateExportHtml.ts` 从原文生成完整 HTML（注入主题 CSS、图表渲染占位符）→ 预渲染所有图表 → WebView PrintToPdf；内容取 `useFileStore.getState().currentContent`；PlantUML 串行队列渲染。
- **反例**：导出 PDF 图表全空白；无论打开哪个文档都导出第一个（BUG-053、BUG-054；DEC-023~026）。
- **事实源**：BUG-053~057；DEC-023~026

## MD2: 块解析与行内语法细节 🟡

- **主张**：① HTML 块解析必须跟踪标签栈（开始压栈/结束弹栈），空行不是可靠分隔符，自闭合标签特殊处理；② 表格行检测不能凭单字符 `|`——要求以 `|` 开头/结尾，或去掉行内代码后仍 ≥2 个 `|`，并辅以分隔行检测；③ 表格对齐从 remark-gfm 的 `align` 属性读取，不用 `style.textAlign`，两个渲染器（小文档/大文档）必须同步修；④ 缩写用标准 `remark-abbr` 插件，且需把缩写定义传递到每个 block（block 级渲染下插件访问不到其他 block 的定义）；⑤ Emoji 只用标准 gemoji 别名（`:thumbsup:` 不被识别，用 `:+1:`）。
- **适用**：自建 Markdown 分块解析器 + react-markdown 渲染链。
- **Why**：含管道符的普通文本被误判为表格 → block 膨胀、渲染变慢；嵌套 HTML 被空行错误分割；自定义插件缺陷多；别名表不通用。
- **How**：见主张各项；解析顺序：图片 → 链接（图片正则先于链接正则执行）。
- **反例**：长文档 block 数量过多加载慢（BUG-030）；表格对齐全线失效（BUG-031）；缩写定义显示在页面上（BUG-035）。
- **事实源**：BUG-030、BUG-031、BUG-035、BUG-033、BUG-055；DEC-012、DEC-013；lessons 01

## MD3: 标题渲染双需求方案 🟡

- **主张**：标题必须同时满足「颜色跟随主题」与「标题内 Markdown 内联元素正常渲染」：外层用 `div`（带 `markdown-body` 类与 `tocId`），把 `#` 号加回原文交给 ReactMarkdown 完整渲染；CSS 中不要先写 `color: inherit` 再写主题色；虚拟滚动容器同样要挂 `markdown-body` 类。
- **适用**：块级渲染 + 主题化的 Markdown 阅读器。
- **Why**：自定义 h1-h6 组件 + 内联样式不响应 CSS 变量（见 F5）；直接返回纯文本则链接不渲染；外层再包一层 h1 会双层嵌套；CSS 选择器顺序会互相覆盖。
- **How**：见主张；CSS 只保留 `.markdown-body h1 { color: var(--h1-color) }` 一类规则。
- **反例**：四种失败方案各踩一遍（BUG-047）。
- **事实源**：BUG-047

## MD4: SVG 转 Canvas 与 PNG 导出 🟡

- **主张**：SVG 转 PNG 用浏览器端 Canvas 实现（不用 Rust usvg/resvg——字体加载困难）；转 Canvas 前必须清理 SVG 外部引用（外部字体、`<a>` 链接）以防 Tainted Canvas；确保 `xmlns` 命名空间存在；提供 2x 缩放保高清；二进制文件写入用项目已有 Tauri 命令（不用 plugin-fs，权限配置复杂）。
- **适用**：图表/向量内容导出为位图。
- **Why**：Tainted Canvas 的 toBlob 直接被浏览器拒绝；后端 SVG 渲染库字体数据库加载不全导致文字缺失。
- **How**：`sanitizeSvgForCanvas()`（替换 font-family、补 xmlns、移除 `<a>`）→ DOMParser → Image + drawImage + toBlob；写入用 `write_binary_file` 命令。
- **反例**：PNG 只有图形没有文字；`toBlob` 报 tainted（lessons 02 坑 2/3）。
- **事实源**：lessons 02

## MD5: 语法检测兼容转义 🟢

- **主张**：语法检测正则必须兼容转义写法（如 `\[!NOTE]` 与 `[!NOTE]` 都要识别）；示例文档中的写法以真实用户输入为准，不能只测理想输入。
- **适用**：本项目 Obsidian Callout 一类语法检测器；换项目时按目标语法的转义规则调整。
- **Why**：用户在编辑器里看到的可能就是转义态；检测失败表现为「功能突然不生效且无报错」。
- **How**：检测正则对 `[!TYPE]` 与 `\[!TYPE]` 同时匹配。
- **反例**：示例文档 NOTE 提示框图标空白（BUG-056）。
- **事实源**：BUG-056
