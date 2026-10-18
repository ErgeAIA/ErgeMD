---
title: Debug Log
type: debug-log
project: ErgeMD
updated: 2026-10-18
description: >
  反复调试的 bug 追加记录，优先级与实现事实对齐。只追加，不删除或改写历史。
  AI 在本文件新增或修改任何条目后，必须同步更新 frontmatter 的 updated 字段为当日日期（YYYY-MM-DD）。
---

# Debug Log

> 反复调试的 bug 记录。只追加，不删除历史。
> 格式：`## BUG-NNN: 标题` + 日期/现象/根因/修复/验证限制/教训。NNN 三位递增。
> 字段：`- **日期**：` / `- **现象**：` / `- **根因**：` / `- **修复**：` / `- **验证限制**：` / `- **教训**：`

***

## 2026-10-17 历史同步 — 自 docs/.ai/ERROR_LOG.md（53 节）与 context-handover 事故表

> 日期口径：源文件未标注单条日期的记「未标注」，不编造；ERROR_LOG.md 文件级最后编辑为 2026-06-14，原文仍归档于该处。
> 本文件是唯一活跃 bug 记录；规则已进 AGENTS.md 的在此只留指针，不重复规则本体。

## BUG-001: Tauri 无边框窗口拖拽失效
- **日期**：未标注
- **现象**：窗口不能拖动 / 只有小区域可拖动 / 右侧按钮高度仅 16px
- **根因**：`overflow` / `position` / `transform` / `will-change` / `filter` 创建 stacking context 裁剪 fixed 元素鼠标事件；`data-no-drag` 放在外层容器；`e.preventDefault()` 阻止 Tauri 接管拖拽
- **修复**：移除 stacking context 属性；`data-no-drag` 移到最小粒度交互元素；容器补 `height: 100%`
- **验证限制**：需 Tauri 实机验证
- **教训**：`decorations: false` 窗口中会创建 stacking context 的属性一律禁用（规则已入 AGENTS.md Conventions）

## BUG-002: scrollIntoView 滚动所有祖先
- **日期**：未标注
- **现象**：点 TOC 文件树滑出屏幕
- **根因**：`element.scrollIntoView()` 会滚动所有可滚动祖先，影响其他 fixed 元素位置
- **修复**：改用 `container.scrollTo()`，手动计算 offset
- **验证限制**：源未记录
- **教训**：含 `position: fixed` 元素的布局中禁用 `scrollIntoView()`

## BUG-003: 动态 CSS 选择器空值崩溃
- **日期**：未标注
- **现象**：点击文件卡死（白屏）
- **根因**：标题 id 为空 → `CSS.escape("")` → `querySelector("#")` → SyntaxError
- **修复**：跳过空 ID + try/catch 保护
- **验证限制**：源未记录
- **教训**：动态生成的 CSS 选择器必须做空值保护

## BUG-004: 导出/导入方式不一致导致白屏
- **日期**：未标注
- **现象**：白屏崩溃；SearchReplace 后默认导入变命名导入
- **根因**：`export default` 改成 `export { }` 与调用方默认导入不匹配；SearchReplace 匹配到旧 import 块
- **修复**：改回 `export default`；手动校正所有 import
- **验证限制**：源未记录
- **教训**：改 export 前必须确认所有引用方的 import 方式（规则已入 AGENTS.md 写文件方式行）

## BUG-005: Tailwind 迁移类不生效
- **日期**：未标注
- **现象**：文件树不能滚动 / 左侧面板移位 / WelcomePage 挤在一起
- **根因**：当时 Tailwind v3 配置不完整，className 未编译；间距类迁移后未生效（疑与 v4 preflight 或类名扫描有关）
- **修复**：恢复 inline styles，只保留最外层容器布局类；后升级 Tailwind v4（`@tailwindcss/vite`）解决
- **验证限制**：源未记录
- **教训**：保守策略——只迁移纯布局类，间距/尺寸/颜色保留 inline；`@import "tailwindcss"` 必须在 globals.css 最顶部

## BUG-006: TypeScript undefined 与 null 不通透
- **日期**：未标注
- **现象**：TS2345 类型错误（多处）
- **根因**：`useState(src)` 中 src 为 `string | undefined`，推断为 undefined 不能赋给 `string | null`
- **修复**：统一 `?? ""` / `?? null` 显式转换
- **验证限制**：源未记录
- **教训**：可能为 undefined 的值必须显式转换

## BUG-007: Rust 未使用 import 与 mut
- **日期**：未标注
- **现象**：编译警告（unused import / unnecessary mut）
- **根因**：从文档模板复制代码未清理；修复漏项
- **修复**：逐行核对 import 使用情况后移除
- **验证限制**：源未记录
- **教训**：生成 Rust 代码必须逐行检查 import，不从模板照抄

## BUG-008: 凭文档猜测接口导致功能缺失
- **日期**：未标注
- **现象**：`hideDelay` 不存在 / TitleBar 缺少 transition / WelcomePage 直接生成
- **根因**：未读取本地文件，凭文档猜测参数与 props
- **修复**：先读本地文件确认接口再写
- **验证限制**：源未记录
- **教训**：文档代码不能直接用，每行代码基于本地真实接口（规则已入 AGENTS.md 修改先读最新内容行）

## BUG-009: ReactMarkdown 渲染器函数中滥用 hooks
- **日期**：未标注
- **现象**：img 渲染器中用 useState 报错
- **根因**：`components` 中的渲染器函数不是 React 组件，不能直接用 hooks
- **修复**：提取为独立 `ClickableImage` 组件
- **验证限制**：源未记录
- **教训**：渲染器函数内的交互逻辑必须提取为独立组件

## BUG-010: data-no-drag 粒度错误
- **日期**：未标注
- **现象**：标签栏空白处 / 右侧按钮间空白不能拖拽
- **根因**：`data-no-drag` 放外层容器，覆盖子元素间空白区域
- **修复**：移到每个 tab 项；button 区域直接移除（已被 `closest("button")` 排除）
- **验证限制**：源未记录
- **教训**：`data-no-drag` 必须放在最小粒度交互元素上

## BUG-011: 新组件集成后遮挡 / 状态为空
- **日期**：未标注
- **现象**：打开文件夹停留在欢迎页；TOC 完全不可见
- **根因**：TitleBar 只在 `hasOpenFile` 时渲染；`extractTOC` 被 import 但从未调用，`tocItems` 始终为空
- **修复**：TitleBar 条件改为 `hasWorkspace || hasOpenFile`；content 变化时调用 extractTOC
- **验证限制**：源未记录
- **教训**：集成新组件必须检查遮挡、既有功能、store 数据流完整性（zIndex 层级：TitleBar=60，Toast/SearchBar=55，ImagePreview=50，LeftPanel=40）

## BUG-012: flex 子元素无法滚动
- **日期**：未标注
- **现象**：文件树不能滚动
- **根因**：flex 子元素默认 `minHeight: auto`，内容撑开容器阻止溢出
- **修复**：补 `minHeight: 0` + `overflowY: auto`
- **验证限制**：源未记录
- **教训**：`flex: 1` 填充剩余空间必须同时设 `minHeight: 0`（或 `minWidth: 0`）

## BUG-013: DOM drag 事件干扰 Tauri 原生拖拽
- **日期**：未标注
- **现象**：窗口不能拖动（7 处复发：FileDropZone / ReadingArea / AppLayout / WelcomePage / TitleBar / App.tsx）
- **根因**：`onDragOver`/`onDrop`（含 window 级别）干扰 Tauri `startDragging()` 事件链；`willChange: "opacity"` 创建 stacking context；欢迎页无拖拽区域
- **修复**：全部改用 Tauri 原生 `onDragDropEvent`；移除 willChange；TitleBar 始终渲染
- **验证限制**：需 Tauri 实机验证
- **教训**：DOM drag 事件全面禁用（最高优先级规则，已入 AGENTS.md Conventions）

## BUG-014: :root 覆盖主题变量致切换无效
- **日期**：未标注
- **现象**：主题切换无效（快捷键有日志但视觉不变）
- **根因**：`:root` 在 `@import` 之后声明，与 `[data-theme]` 同优先级（0-1-0）却覆盖主题文件变量
- **修复**：改为 `html:not([data-theme])` 兜底选择器
- **验证限制**：源未记录
- **教训**：全局兜底变量禁用 `:root`，用 `html:not([data-theme])`

## BUG-015: Mermaid 文字不可见（foreignObject 兼容）
- **日期**：未标注
- **现象**：流程图只能看到图形看不到文字（7 轮尝试）
- **根因**：`theme: "dark"` 写死；themeVariables 用 `var(--xxx)`（Mermaid 不解析）；`htmlLabels: true` 用 `<foreignObject>` 在 Tauri WebView 不兼容；SVG 预处理正则破坏 foreignObject 布局；v11 中文宽度计算 bug
- **修复**：动态主题 + 实际颜色值 + `htmlLabels: false` + 恢复最小化配置；中文截断等官方修复
- **验证限制**：Mermaid v11 中文截断为已知 bug，无法修复
- **教训**：嵌入式 WebView 中 Mermaid 文字渲染需原生 SVG `<text>`；themeVariables 不支持 CSS 变量

## BUG-016: Mermaid xychart 渲染失败
- **日期**：未标注
- **现象**：xychart 报 "Lexical error on line 3"
- **根因**：使用 `xychart-beta`（v11.14.0 已移除）；标题/轴标签含中文可能导致词法分析错误；旧版 11.4.1 不支持 xychart
- **修复**：升级 Mermaid 到 11.14.0，使用 `xychart`，先用官方纯英文示例测试
- **验证限制**：源未记录
- **教训**：Mermaid 11.10.0+ 用 `xychart`；新语法先用纯英文验证

## BUG-017: 快捷键不生效
- **日期**：未标注
- **现象**：Ctrl+Shift+T 主题切换不生效
- **根因**：本地 useTheme.ts 未正确部署，import 失败
- **修复**：确认所有新建文件已正确落位
- **验证限制**：源未记录
- **教训**：快捷键排查顺序：handler 注册 → store 更新 → 副作用触发 → 结果覆盖

## BUG-018: Tauri invoke 参数命名不匹配
- **日期**：未标注
- **现象**：最近文件列表为空；invoke 错误被静默吞掉
- **根因**：Tauri 2 `invoke()` 默认不做 camelCase → snake_case 转换，JS 传 `{ filePath }` 与 Rust `file_path` 不匹配；`.catch(() => {})` 吞错
- **修复**：改 snake_case；错误显式 `console.error`
- **验证限制**：源未记录
- **教训**：invoke 参数名与 Rust 签名完全一致；禁止静默吞错

## BUG-019: Zustand persist 反序列化缺字段
- **日期**：未标注
- **现象**：settingsStore 新增字段升级后为 undefined
- **根因**：persist 未配置 merge，旧版 localStorage 数据缺少新字段
- **修复**：添加自定义 merge，先铺 defaultSettings 再覆盖持久化值
- **验证限制**：源未记录
- **教训**：persist 必须提供自定义 merge 函数

## BUG-020: 双数据源竞态覆盖用户设置
- **日期**：未标注
- **现象**：会话中修改的设置被旧数据覆盖（潜在）
- **根因**：localStorage（同步）与 Tauri 数据库（异步）双数据源无明确 source of truth，异步加载无条件覆盖
- **修复**：仅在 localStorage 无数据时才从数据库加载
- **验证限制**：源未记录
- **教训**：双数据源必须明确唯一 source of truth

## BUG-021: useCallback 声明顺序颠倒
- **日期**：未标注
- **现象**：SearchBar 中 clearHighlights 在 performSearch 之后声明
- **根因**：performSearch 依赖 clearHighlights 但声明顺序相反，lint 报错
- **修复**：调整声明顺序
- **验证限制**：源未记录
- **教训**：被依赖的 useCallback 必须先声明

## BUG-022: 高频事件处理器触发重渲染
- **日期**：未标注
- **现象**：mousemove/scroll 场景性能问题（潜在）
- **根因**：高频事件中无条件 setState，60+ 次/秒触发 re-render
- **修复**：用 useRef 追踪状态，仅值变化时 setState
- **验证限制**：源未记录
- **教训**：高频事件处理器必须先比较再 setState

## BUG-023: IntersectionObserver 与被观察数据耦合
- **日期**：未标注
- **现象**：useTOCObserver 每次标题激活都重建 Observer
- **根因**：回调修改 effect 依赖中的 tocItems（新数组）
- **修复**：isActive 状态分离到独立 activeHeadingId state
- **验证限制**：源未记录
- **教训**：观察结果与被观察数据必须分离存储

## BUG-024: useCallback 依赖过多致监听器频繁重建
- **日期**：未标注
- **现象**：键盘监听器频繁注销/注册（潜在）
- **根因**：依赖数组超 5 个且含频繁变化的 store 值
- **修复**：变化值存 useRef 或 `useXxxStore.getState()` 读取，依赖清零
- **验证限制**：源未记录
- **教训**：事件回调用 getState()/ref 读最新值，保持稳定引用

## BUG-025: 依赖传递缺失
- **日期**：未标注
- **现象**：i18next / react-i18next 未列入依赖
- **根因**：代码 import 了但 package.json 未声明，pnpm 严格模式直接报错
- **修复**：`pnpm add i18next react-i18next`
- **验证限制**：源未记录
- **教训**：import 的包必须显式列入 dependencies，不依赖传递依赖

## BUG-026: useEffect 依赖致无限循环（内存暴涨）
- **日期**：未标注
- **现象**：软件内存占满卡死
- **根因**：snapBack useEffect 依赖 tocScrollOffset，动画内 setTocScrollOffset 形成 effect → setState → 依赖变化 → effect 无限循环，每帧新建 RAF 链
- **修复**：用 useRef 读取最新值，从依赖数组移除
- **验证限制**：源未记录
- **教训**：effect 内 setState 修改依赖变量 = 无限循环，用 ref 打破闭环

## BUG-027: 合成事件 stopPropagation 无法阻止原生滚动
- **日期**：未标注
- **现象**：hover TOC 时正文仍然跟随滚动
- **根因**：React onWheel 是合成事件，stopPropagation 不阻止原生 DOM 事件传播到下方滚动容器
- **修复**：原生 `addEventListener("wheel", ..., { passive: false })` + `stopImmediatePropagation` + `preventDefault`
- **验证限制**：源未记录
- **教训**：规则已入 AGENTS.md Conventions（禁合成事件 stopPropagation）

## BUG-028: 虚拟列表视口顶部 block 不等于阅读位置
- **日期**：未标注
- **现象**：点击 TOC 跳转后高亮往上飘一个章节
- **根因**：`visibleRange[0].index` 取视口顶部 block，padding/margin 导致上一章节尾部仍在视口内
- **修复**：改用 visibleRange 中部 block 索引；点击时立即设高亮并 500ms 内忽略 scroll 回调
- **验证限制**：源未记录
- **教训**：react-virtual 的 `[0].index` 是视口顶部可见项，不是阅读位置

## BUG-029: Tab 切换后状态未立即同步
- **日期**：未标注
- **现象**：切换 Tab 后 TOC 高亮停在顶部，需滚动才更新；打开文件后 TOC 几秒后才跟随
- **根因**：`setActiveBlockIndex(0)` 只重置不读取 scroll 位置，切 Tab 本身不触发 scroll 事件
- **修复**：立即通过 DOM data-index 或 scroll 百分比计算 activeBlockIndex
- **验证限制**：源未记录
- **教训**：依赖 scroll 的状态在 Tab 切换时必须主动重算，不能等事件

## BUG-030: isTableLine 误判致 block 膨胀
- **日期**：未标注
- **现象**：长文档加载慢，block 数量过多
- **根因**：`isTableLine` 匹配任何含 `|` 的行，普通段落（`a | b`、shell 管道）被吞入表格块，增加 ReactMarkdown 实例化开销
- **修复**：收紧判断（要求以 | 开头/结尾或去行内代码后 ≥2 个 |）+ 新增 isTableSeparator 检测
- **验证限制**：源未记录
- **教训**：分块解析器的特征行检测不能靠单字符包含

## BUG-031: Markdown 表格对齐不生效
- **日期**：未标注
- **现象**：表格 align 语法无效果
- **根因**：自定义 th/td 组件未读取 remark-gfm 设置的 `align` 属性，或被硬编码 textAlign 覆盖
- **修复**：从 `props.align` 或 `node.properties.align` 读取并应用；两个渲染器（MarkdownView / MarkdownBlockView）同步修复
- **验证限制**：源未记录
- **教训**：自定义表格组件必须透传 align，样式展开顺序：默认 → incomingStyle → textAlign

## BUG-032: Mermaid themeVariables 配置不生效
- **日期**：2026-05-03（源文件该节编辑标记）
- **现象**：亮色主题配置不生效 / 主题切换后颜色异常 / 文字对比度不足 / cScale0 类型错误
- **根因**：未用 `base` 主题（只有 base 支持 themeVariables）；亮色未设 `darkMode: false`；缓存未清；类型定义不含自定义变量
- **修复**：`mermaidTheme = "base"`；亮色 `vars.darkMode = false`；主题变化清缓存 + 更新缓存版本号；`as any` 断言
- **验证限制**：源未记录
- **教训**：Mermaid 自定义主题变量的完整经验已沉淀于本条目；图表适配三层架构见 DEC-013

## BUG-033: Emoji 别名不被识别
- **日期**：未标注
- **现象**：部分 Emoji 显示为纯文本
- **根因**：`remark-emoji` 用 gemoji 别名映射，`:thumbsup:` 等口语化别名不支持
- **修复**：改用标准别名 `:+1:` 等
- **验证限制**：源未记录
- **教训**：示例文档只用标准 gemoji 别名

## BUG-034: 全局兜底变量干扰主题切换
- **日期**：未标注
- **现象**：H1 标题颜色不随主题切换（保持固定值）
- **根因**：`html:not([data-theme])` 中定义了 `--h1-color`，变量解析机制下干扰主题文件定义
- **修复**：移除全局样式中的主题变量定义，一律由主题文件提供
- **验证限制**：源未记录
- **教训**：主题变量只允许在主题文件中定义（与 BUG-014 同源，规则已入 AGENTS.md 指针）

## BUG-035: Markdown 缩写渲染缺陷
- **日期**：未标注
- **现象**：缩写定义显示在页面上 / 缩写词未替换为 `<abbr>` / 跨 block 无法识别
- **根因**：缩写定义未收集到 referenceDefinitions；自定义 remarkAbbr 有缺陷；block 级渲染导致插件访问不到其他 block 的定义
- **修复**：用标准 `@syenchuk/remark-abbr` 插件；`isAbbreviationDefinition` 识别并将定义追加到每个 block 内容后
- **验证限制**：源未记录
- **教训**：优先成熟第三方插件；block 级渲染需处理跨 block 定义传递

## BUG-036: 块级元素渲染在 inline 元素内
- **日期**：未标注
- **现象**：带链接图片右键控制台报错 `<div> cannot be a descendant of <p>`
- **根因**：ContextMenu 和 ImageEditModal 直接渲染在 `<span>` 内部
- **修复**：React Portal 渲染到 document.body
- **验证限制**：源未记录
- **教训**：inline 元素内禁直接渲染块级元素，弹窗/菜单一律 Portal

## BUG-037: 标题栏双击不生效
- **日期**：未标注
- **现象**：双击标题栏切换窗口不生效
- **根因**：`onMouseDown` 直接调 `startDragging()`，不区分单击/双击，双击事件被覆盖
- **修复**：onMouseDown 中加双击检测（300ms 阈值），双击走 toggleMaximize
- **验证限制**：源未记录
- **教训**：无边框窗口双击功能必须在 onMouseDown 中实现

## BUG-038: TabBar 缺固定入口
- **日期**：未标注
- **现象**：标签页只能通过右键菜单固定，操作不便
- **根因**：无 hover 快捷操作
- **修复**：hover 时显示固定图标 + 关闭按钮
- **验证限制**：源未记录
- **教训**：高频操作提供 hover 快捷入口

## BUG-039: 浮动 TOC 高亮短线位置不符直觉
- **日期**：未标注
- **现象**：进度指示器大部分时间停在中间区域
- **根因**：短线位置采用活动项居中策略
- **修复**：改为文档滚动百分比线性映射
- **验证限制**：源未记录
- **教训**：进度指示器应按滚动百分比映射，不用活动项居中

## BUG-040: Mermaid 时间线变量名错误
- **日期**：未标注
- **现象**：暗色主题下时间线背景显示为黑色
- **根因**：使用错误变量名 `timelineGroupBg`；正确为 `cScale0`~`cScale11` + `cScaleLabel0`~`cScaleLabel11`
- **修复**：改用正确变量名 + 类型断言
- **验证限制**：源未记录
- **教训**：时间线是实验性图表，语法与变量可能随版本变化

## BUG-041: 各 Mermaid 图表类型适配不全
- **日期**：未标注
- **现象**：多类图表主题适配缺失或异常
- **根因**：各图表 themeVariables 支持度不同：flowchart/sequence/gantt/pie/class/state/ER/journey 用通用变量；mindmap/xychart/gitGraph/timeline/requirement 需专用配置；C4 不支持 themeVariables（用 UpdateElementStyle）；sankey 可单独配置
- **修复**：按图表类型分别适配，修复状态见源文件 41 节汇总表（15 类全部处理）
- **验证限制**：源未记录
- **教训**：新增图表类型先查官方 themeVariables 支持度再动手

## BUG-042: C4 图表无法主题化
- **日期**：未标注
- **现象**：C4 架构图不响应主题
- **根因**：C4 不支持 themeVariables
- **修复**：图表内部使用 `UpdateElementStyle` 指令定义 `$fontColor`/`$bgColor`/`$borderColor`
- **验证限制**：源未记录
- **教训**：C4 样式只能在图表源码内声明

## BUG-043: Mermaid ER 图暗色主题文字不可见
- **日期**：2026-05-07
- **现象**：大部分暗黑主题下 ER 图文字看不清，仅 neon-cyberpunk 正常
- **根因**：ER 内部样式优先级高，themeVariables/themeCSS 无法完全覆盖；缺少 `darkMode` 设置；SVG 注入选择器不够全面
- **修复**：设置 `vars.darkMode`；渲染后直接改 SVG，用全面选择器组合 + `!important` 强制覆盖（entityBox/attributeBoxOdd/attributeBoxEven/relationshipLine）
- **验证限制**：源未记录
- **教训**：themeVariables 不生效时直接改 SVG 是最可靠方案；先对比正常案例（neon-cyberpunk）找差异

## BUG-044: Mermaid 思维导图配色不统一
- **日期**：2026-05-07
- **现象**：各节点颜色不一致 / 主题切换不响应 / 对比度不足
- **根因**：多级配色方案（level1Bg/level2Bg 等）；缺 darkMode；SVG 后处理选择器覆盖不全
- **修复**：统一单一配色（所有级别同色）；`darkMode = isLight ? false : true`；`[class*="mindmap"]` 全面选择器 + `!important`；更新缓存版本号
- **验证限制**：源未记录
- **教训**：统一配色优于多级配色；SVG 后处理必须覆盖所有形状/文字/连接线

## BUG-045: Mermaid 时间线全黑背景
- **日期**：2026-05-07
- **现象**：时间线图表呈现全黑色背景
- **根因**：SVG 后处理只覆盖文字颜色，未覆盖 section/event 背景色；themeVariables 只设 cScale
- **修复**：section 背景用 tertiaryColor、event 节点用 primaryColor，全面覆盖背景/边框/文字/连接线
- **验证限制**：源未记录
- **教训**：SVG 后处理要覆盖所有视觉元素，不只文字

## BUG-046: Mermaid gitGraph 主题颜色修复
- **日期**：2026-05-07
- **现象**：Git 图显示全黑色 / 主题切换后无变化
- **根因**：Git 图对 themeVariables 支持不完整；无专门 SVG 后处理；缓存版本号未更新
- **修复**：参考甘特图补全 SVG 后处理（分支线/提交节点/标签背景文字分类覆盖）；缓存版本号 v28 → v29
- **验证限制**：源未记录
- **教训**：改配色逻辑必须更新缓存版本号；参考已正常的图表类型的处理方式

## BUG-047: 标题主题色与内联元素渲染二选一
- **日期**：2026-05-08
- **现象**：标题颜色不跟随主题 / 标题内链接以源码显示 / 大小文档表现不一致
- **根因**：自定义 h1-h6 组件 + 内联样式（React 不响应 CSS 变量变化）；移除 ReactMarkdown 返回纯文本（链接不渲染）；外层 h1 内再渲染生成双层嵌套；`color: inherit` 选择器先于主题色；VirtualMarkdownView 容器缺 markdown-body 类
- **修复**：外层 div + ReactMarkdown 完整渲染（把 # 号加回去）；移除 color: inherit 选择器；VirtualMarkdownView 容器补 markdown-body 类
- **验证限制**：源未记录
- **教训**：React 内联样式不响应 CSS 变量变化，CSS 类选择器才会；两种渲染模式必须统一挂 markdown-body

## BUG-048: Tauri 2 生产构建图片无法加载
- **日期**：2026-05-19
- **现象**：dev 正常，`pnpm tauri build` 产物远程 + 本地图片全部加载失败
- **根因**：① CSP `img-src`/`connect-src` 缺 `https:`/`http:` 协议（build 模式严格执行，dev 宽松）；② asset 协议 scope glob `**` 无法匹配 Windows 驱动器号绝对路径
- **修复**：CSP 显式加 `https: http:`；本地图片改用 Rust 命令 `read_image_as_data_url` 返回 base64 data URL，完全弃用 asset 协议
- **验证限制**：需 build 产物 F12 验证无 CSP 违规
- **教训**：Tauri CSP 每个 *-src 必须显式声明；dev 通过不代表 build 通过；Windows 上 asset 协议不可靠

## BUG-049: Windows 文件关联打开失败 + 最近文件不显示
- **日期**：2026-05-22
- **现象**：右键「使用 ErgeMD 打开」后文件未加载；欢迎页最近列表为空需手动刷新
- **根因**：① Tauri 2 `tauri://file-open` 在 Windows 冷启动时不触发，只监听了事件忽略命令行参数；② `init_database`（异步）与 `get_recent_files` 竞态，`.catch(() => {})` 静默吞错
- **修复**：Rust setup 中同时解析 `std::env::args()`（冷启动，存 PendingFile State + emit）和监听 `tauri://file-open`（热启动）；前端 `get_pending_file` + listen 双路径；引入 `dbReady` 就绪标志同步
- **验证限制**：需冷/热启动双场景实机验证
- **教训**：文件关联必须双路径处理；异步初始化与查询用 ready flag 显式同步；禁止 `.catch(() => {})` 吞错

## BUG-050: ZenUML fragment-border 遮挡消息线
- **日期**：2026-06-10
- **现象**：ZenUML 序列图主题适配后消息线完全不可见
- **根因**：SVG 后处理把 `.fragment-border` 的 `fill` 从原始 `none` 改成不透明背景色，遮挡消息线（错误假设「fragment 区域应有背景色」）
- **修复**：恢复 `fill: none`，只适配 stroke 颜色
- **验证限制**：源未记录
- **教训**：覆盖第三方插件样式前必须读其源码确认原始值；`fill: none` 与不透明填充互斥；不能凭合理推断覆盖

## BUG-051: CI 构建失败（tauri-action@v0 不跑 build）
- **日期**：2026-06-13（犯错区间 2026-06-10 ~ 06-13，5+ 次失败）
- **现象**：CI 报 `Cannot find path '...target\...\release\ErgeMD-v0.4.1.exe'`，4 个平台全部 0s 完成 Build 步骤
- **根因**：`tauri-apps/tauri-action@v0` 在当前 with 组合（includeRelease: false + includeUpdaterJson: false + args: --target 字符串拼接）下根本不派发 build，步骤 0.13s 完成；下游 rename/portable 的「找不到文件」只是副作用
- **修复**：放弃 tauri-action，改用显式 `pnpm tauri build --target ${{ matrix.target }}`；删除 macos-x64 matrix 行（跨编译工具链暂缺，只留 macos-arm64）
- **验证限制**：需重新打 tag 触发 CI 验证
- **教训**：CI 失败先 `gh run view <run-id> --log` 看每步耗时，0s 完成的步骤必有问题；不在同一症状反复打补丁超过 2 次；第三方 action 行为不确定就改显式命令

## BUG-052: macOS 下载链接 404（README 与实际 asset 不对齐）
- **日期**：未标注（v0.4.1 发布周期）
- **现象**：README 的 `ErgeMD-v0.4.1-macos.dmg` 与 `-macos.app.tar.gz` 链接 404
- **根因**：CI 矩阵只跑 macos-arm64，从未生成通用 dmg；rename-bundle.js 从不打包 tar.gz，README 链接是「设计稿」超过「实现」
- **修复**：rename-bundle.js 新增 `tar -czf` 打包 .app；arm64 dmg copyFileSync 兜底为 macos.dmg；README 明确标注 arm64-only
- **验证限制**：需 `gh release view --json assets` 核对
- **教训**：写下载链接前必须 `gh release view <tag> --json assets` 列真实产物；CI 矩阵决定 asset 列表，README 不能超集承诺；portable zip 命名不一致项未修复（遗留）

## BUG-053: PDF 导出图表不渲染
- **日期**：2026-06-01
- **现象**：导出 PDF 中所有图表空白
- **根因**：虚拟滚动卸载不可见 block；`mermaid.render()` 与主应用冲突；WebView `file://` URL 安全策略阻止
- **修复**：PDF 导出改独立管线，从 Markdown 原文直接生成完整 HTML，不复用阅读组件
- **验证限制**：需用户本地实机测试（会话结束时仍未验证）
- **教训**：导出链路不能依赖虚拟滚动中的组件状态

## BUG-054: PDF 多文档导出错误
- **日期**：2026-06-01
- **现象**：无论打开哪个文档，都导出第一个打开的文档
- **根因**：`document.querySelector(".markdown-body")` 永远选到第一个 Tab
- **修复**：从 fileStore 获取 currentContent
- **验证限制**：需用户本地实机测试
- **教训**：多 Tab 场景禁用全局 DOM 查询取内容

## BUG-055: 内联 Markdown 解析顺序错误
- **日期**：2026-06-01
- **现象**：图片链接语法被错误解析
- **根因**：图片正则后于链接正则执行
- **修复**：调整解析顺序：图片 → 链接
- **验证限制**：需用户本地实机测试
- **教训**：内联语法解析顺序：图片先于链接

## BUG-056: Obsidian Callout 图标不显示
- **日期**：2026-06-01
- **现象**：示例文档中 NOTE 提示框图标空白
- **根因**：转义语法 `\[!NOTE]` 导致 callout 检测失败
- **修复**：检测正则增加对转义写法的兼容
- **验证限制**：需用户本地实机测试
- **教训**：语法检测正则需兼容转义写法

## BUG-057: PDF 导出点击无反应
- **日期**：2026-06-01
- **现象**：点导出后无任何输出
- **根因**：`forceRenderAllContent` 函数死锁
- **修复**：简化状态管理，移除死锁的回调机制
- **验证限制**：需用户本地实机测试
- **教训**：渲染强制完成机制避免复杂回调链

## BUG-058: 导出模块脏代码累积
- **日期**：2026-06-01
- **现象**：PDF 导出功能长期不稳定，反复修改导致代码混乱
- **根因**：exportMode 脏补丁机制残留（用户已知痛点）
- **修复**：删除 `exportMode.ts`，恢复干净的虚拟滚动，导出走独立管线
- **验证限制**：tsc Exit Code 0
- **教训**：临时补丁机制不留过夜；脏代码发现即清

## 2026-10-17 审计修复轮（vibe-audit 2026-10-17 报告驱动，分支 fix/audit-round-1）

> 来源：`docs/agents/audit/audit-2026-10-17.md`；以下为审计发现并于当轮修复的问题。

## BUG-059: chunk 解析缓存键跨文档碰撞
- **日期**：2026-10-17（发现与修复同日）
- **现象**：两个不同文档在相同行范围且首末行长度相同时，chunk 解析缓存返回对方的 blocks（潜在渲染错乱）；缓存 Map 无容量上限，随打开文档数单调增长
- **根因**：缓存键仅由 `startLine-endLine` + 首末行长度组成，无文档标识
- **修复**：键加入文档指纹（行数 + 总字符数，在 `parseMarkdownBlocksChunked` 入口计算一次并透传至 `parseChunk`）；新增 50 条 FIFO 淘汰
- **验证限制**：静态审计发现，未实机复现碰撞；需多大文档切换实测
- **教训**：模块级缓存的键必须包含数据源标识，否则跨实例命中

## BUG-060: isTableLine 宽松判断回归（BUG-030 修复丢失）
- **日期**：2026-10-17（发现与修复同日）
- **现象**：普通文本中的管道符（`a | b`、shell 管道）把段落误并入表格块，block 膨胀、长文档加载变慢
- **根因**：BUG-030 的收紧判断丢失，`isTableLine` 回到「任何含 `|` 即判表格」；解析逻辑有两份重复实现，修复需同步两处，历史上因此丢失
- **修复**：收紧为「以 `|` 开头/结尾，或去掉行内代码后 ≥2 个 `|`」；`isTableLine` 为两份解析器共用的单一函数，一处修复两处生效
- **验证限制**：未跑构建与测试；建议 `pnpm lint` + 含管道符文本的大文档实测
- **教训**：重复实现是修复漂移的温床；修复必须确认覆盖所有实现路径

## BUG-061: 多 Tab 下搜索/全选命中错误文档
- **日期**：2026-10-17（发现与修复同日）
- **现象**：多 Tab 时文内搜索、清除高亮、全选可能作用于非活动 Tab 的内容
- **根因**：所有 Tab 的阅读区常驻 DOM（display:none 切换），`document.querySelector(".markdown-body")` 按文档序取第一个，可能命中非活动 Tab
- **修复**：新增 `queryActiveMarkdownBody()`（遍历取第一个可见实例），替换 SearchBar 3 处与 App 全选 1 处
- **验证限制**：静态推断，未实机复现；需多 Tab 实测
- **教训**：多实例共存的 DOM 查询必须带可见性/归属判定，禁裸 querySelector

## BUG-062: 虚拟列表 TOC 高亮取视口顶部 block（BUG-028 修复回退）
- **日期**：2026-10-17（发现与修复同日）
- **现象**：非交互滚动时，上一章节尾部仍在视口会导致 TOC 高亮偏移一个章节
- **根因**：BUG-028 记录的「改用 visibleRange 中部索引」修复被回退，代码仍取 `visibleRange[0].index`
- **修复**：恢复中部索引（`visibleRange[Math.floor(len/2)] ?? visibleRange[0]`）
- **验证限制**：需大文档滚动实测
- **教训**：修复要用注释锚定出处，防回退

## BUG-063: 虚拟模式 TOC 跳转不精准（估算偏移 + 定点补救失效）
- **日期**：2026-10-17（用户实测 8112 行文档报告；当日修复）
- **现象**：大文档（虚拟模式）点浮动目录跳转后，落点距目标标题有明显偏差，需手动再滚
- **根因**：① `virtualizer.scrollToIndex` 用估算高度计算偏移，未测量块的误差随块数累积（测试文档 455 个标题，累计误差可达数千 px），落点可能远离目标；② 原校正 `scheduleScrollCorrection` 是定点补救：固定 2~3 次延迟、不重新武装，且目标块未渲染时 `querySelector` 找不到元素直接静默放弃——文档打开超 1.5s 后只校准 200/500ms 两次，smooth 动画未结束或动态测量引发位移时无法再纠偏
- **修复**：`scrollToHeading.ts` 新增 `jumpToHeadingWithRetry` 收敛循环替换虚拟模式跳转路径——目标未渲染时重发 `scrollToBlockIndex`（测量数据随渲染 refine）将其滚入渲染窗口；已渲染则按 `getBoundingClientRect` 实测位置以 `behavior: "auto"` 精确校正（避免 smooth 与动态测量竞态）；校正后持续验证至命中 6px 容差或用尽 12 次（约 1.5s）；用户滚轮/触摸立即取消。小文档路径（元素全渲染）保持原方案
- **验证限制**：需用 8112 行测试文档实机复测各层级标题跳转
- **教训**：虚拟滚动里「先近似滚动、后定点补救」不是补救——补救方必须能在目标缺席时重试、在位置漂移后重新武装，形成收敛循环而非有限次抽奖

## BUG-064: Mermaid 预览（点击放大）文字丢失
- **日期**：2026-10-17（用户实测报告；当日修复）
- **现象**：文档内图表正常，点击放大进 SVG 预览后节点框在但标签文字全部消失；「另存为 SVG」存出的文件同样缺文字
- **根因**：阅读路径 `htmlLabels: true`，文字位于 `foreignObject` 内。文档视图按既有先例直接渲染 mermaid strict 输出、不过 DOMPurify，但 `SVGPreview` 仍走 `sanitizeSvg`——DOMPurify 保住 `foreignObject` 标签（ADD_TAGS）却剥掉其中全部 HTML 子节点。jsdom 实测复现：5 种配置变体（`USE_PROFILES` html+svg、ADD_TAGS 补 div/span 等子标签、合并、URI 属性）均无法保住内容，配置层无解
- **修复**：`SVGPreview` 新增 `skipSanitize` 参数并接入 `safeSvgHtml` 计算；MermaidDiagram 预览传入（mermaid `securityLevel: strict` 输出自带消毒，与文档视图同一信任模型，`MermaidDiagram.tsx:2365/:2401` 早有同因注释）；PlantUML 预览保持消毒（viz.js 输出为原生 `<text>`，不受影响）。**更正记录**：首次改动只加了参数未接线（`safeSvgHtml` 仍无条件消毒），经用户实测发现后补正——加开关必须同时改消费点
- **验证限制**：需实机确认预览与另存 SVG 的文字恢复
- **教训**：DOMPurify 对 foreignObject（SVG 的 HTML 集成点）内容按命名空间剔除，ADD_TAGS 只保标签不保内容；「上游已消毒」的信任边界要么贯彻到底要么都不信——半套消毒比不消毒更坏

## BUG-065: Mermaid 12 neo 外观 drop-shadow 残留（图表灰色污影）
- **日期**：2026-10-17（用户实测报告；当日定位并修复）
- **现象**：mermaid 12 升级后，流程图/类图/状态图/ER/旅程/需求/思维导图/块图/看板/事件建模/维恩等带曲线连接的图表，节点与曲线边缘带灰色半透明污影；切 Tab 仍有残留，重启/刷新后消失
- **根因**：两层叠加。① mermaid 12 的 neo 外观给节点、标签容器与边外框路径（`g.outer-path`）加 `drop-shadow(rgb(185,185,185) 1px 2px 2px)`——无头浏览器实证：neo 下 8 个元素带计算后 filter，classic 下 7 类图全部 0 filter；受影响类型即新版渲染器带 neo 阴影 CSS 的那些。② 阴影只在未钉 look 的渲染中产生（升级热更新后模块图滞后那一批），产出写入模块级 `mermaidCache`，而缓存键 `_version` 未随升级 bump，切 Tab 重挂载反复复用带影字符串；重启清缓存后新渲染走钉位即干净
- **修复**：缓存键 `_version` v36 → v37 一次性作废旧键；`look: "classic"` 钉位（阅读 + 导出两处 initialize）对全部图表类型彻底消除阴影（浏览器实测验证）
- **验证限制**：需实机确认切 Tab 无残留、14 主题下各类图无污影
- **教训**：渲染引擎大版本升级必须同步 bump 自建渲染缓存的版本键，否则旧配置产出的缓存会跨版本复用；外观类默认值变更（neo / redux-color）要以钉位冻结，并在真实浏览器用 `getComputedStyle` 验证，不能只读文档

## BUG-066: HTML 导出丢内容与丢样式（mermaid 整段缺失 / 代码无高亮 / Properties 布局塌陷）
- **日期**：2026-10-18（用户实测报告；当日定位并修复）
- **现象**：`MarkdownSyntaxExample.md` 导出 HTML 后：① mermaid 章节整段缺失（全文 0 个 `<svg>`）；② 代码块（YAML 等）退化为单色纯文本；③ 标题/列表/表格/引用等主题排版大量丢失；④ Obsidian frontmatter「Properties」键与值换行堆叠；⑤ 中途一次导出全部 mermaid 变成 `Syntax error in text — mermaid version 11.16.0` 错误炸弹图
- **根因**：四层叠加。① `VirtualMarkdownView` 用 `@tanstack/react-virtual`，离屏块不进 DOM，而 `export.ts` 直接复制 `.markdown-body` 的 `innerHTML`；旧 `renderUnrenderedMermaidBlocks` 只能救「已在 DOM 但无 svg」的块，对已被卸载的块无效。② `CodeBlock` / `MermaidDiagram` / `PlantUMLDiagram` 均以 IntersectionObserver 门控渲染，即便把块挂上 DOM，离屏也不会渲染。③ 导出 `<style>` 是手写的 22 个 CSS 变量 + 少量基础规则：`--code-keyword/string/number/comment/function` 不在白名单（`.hljs-*` 配色全靠它们），`markdown.css` 与组件级 CSS（`obsidian.css`）均未注入。④ 批量导出一次挂载 31 张图并行首渲染，存在懒加载图表模块竞态导致 parse 失败并产出错误炸弹 svg，而就绪轮询只判断「有无 svg」，把炸弹当成功捕获
- **修复**：① `readerStore` 新增 `exportMode`；`VirtualMarkdownView` 导出模式改为对 `content` 全量解析并渲染全部 block（绕开 chunk 增量），进出时保存/恢复滚动位置；② 三个懒渲染组件在导出模式跳过 IO 立即渲染；③ `exportHtml`：置 `exportMode` → 双 rAF → `waitForExportRender` 轮询 svg 就绪 → 补救未渲染块 → 复制 → `finally` 复原（异常也不卡死）；④ 新增 `utils/exportStyles.ts`：`collectAllCssVariables` 全量收集 `documentElement` 与 `.markdown-body` 的 `--*`，`serializeAppStylesheets` 序列化整个 CSSOM 注入，shell 中和应用全局样式副作用（`overflow`/`height`/`user-select`），导出 `<html>` 复制根节点 `class`/`data-theme`；⑤ `MermaidDiagram` 渲染失败做最多 2 次退避重试（走完整主题管线，配色不漂移）；⑥ 导出侧把含 `Syntax error in text` 的错误炸弹 svg 也视为未渲染并触发重渲染；⑦ PDF 路径 `generateExportHtml.ts` 复用同一套全量变量与 markdown.css
- **验证限制**：实机已核一轮（`MarkdownSyntaxExample2.html`：31 张图齐全、0 炸弹、15 个 hljs 代码块分色、Properties 同行）；仍待实机确认多主题、超大文档导出耗时（轮询上限 15s）与产物体积接受度（当前约 3MB，来自全量 CSSOM）
- **教训**：DOM 复制导出的三条硬约束——(a) 内容必须先在 DOM 全部挂载并解除懒渲染门控，复制才有意义；(b) CSS 必须来自 CSSOM 全量而非手写白名单，任何组件级 CSS（本次是 `obsidian.css`）都会漏；(c) 就绪判定不能只看「有没有 svg」，错误炸弹也是 svg。另：大批量渲染存在瞬时竞态，退避重试优于放任失败；改前不要用「第三方产物观感」当基准（同期对比的 Tabbit 浏览器导出为独立渲染器产物，无 ErgeMD 主题/高亮/Properties，属残缺而非更优）

## BUG-067: `--bg-primary` 消费但从未定义（7 处弹层背景静默失效）
- **日期**：2026-10-18（主题契约 Task 3 消费完整性测试首次暴露；当日修复）
- **现象**：`--bg-primary` 被 7 处无兜底消费（`LinkEditModal`/`ImageEditModal` 的渐变终点与背景、`ReadingOptions` 两处），但从未被任何主题文件或 base 层定义——这些弹层的背景属性实际处于失效状态（透明/继承），长期未被发现
- **根因**：token 命名漂移——历史消费方使用了 `--bg-primary`，而 ErgeMD 画布族命名是 `bg-page/reader/sidebar/code/secondary/tertiary`，无 `bg-primary`。CSS 自定义属性无兜底时属性直接失效且不报错，此类「消费了但没人定义」的缺陷在没有门禁的体系里是静默的
- **修复**：主题契约生成器（`scripts/theme/generate-themes.js`）将 `bg-primary` 别名到 `canvas.secondary`（次级/elevated 表面语义），light/dark 生成物显式定义；不引入新源色，7 处失效背景恢复
- **验证限制**：弹层在 light/dark 下与 reader 的区分度需实机确认；若希望弹层更突出，后续可改别名 `bg-tertiary` 或增设专用弹层 token（属设计决策，不在本修复范围）
- **教训**：主题体系必须配「消费完整性门禁」——无兜底消费 ⊆（主题定义 ∪ 非主题 CSS 定义）；本次该门禁（`src/styles/__tests__/theme-generate.test.ts`）第一轮运行即抓出此缺陷，验证了门禁本身的价值
