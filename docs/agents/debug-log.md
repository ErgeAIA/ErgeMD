---
title: Debug Log
type: debug-log
project: ErgeMD
updated: 2026-10-19
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

## BUG-068: forest / solar-flare 图表填充与文字对比度不足（实测 4.02 / 4.19，低于 4.5 门槛）
- **日期**：2026-10-18（主题契约第一阶段终审实测发现；待阶段 2/3 修复）
- **现象**：`forest` 主题 `chart-fill-4` × `chart-text` 对比度 4.02:1、`solar-flare` 主题 `chart-fill-5` × `chart-text` 4.19:1，均低于 4.5:1 门槛——这两套主题下图表填充上承载的文字处于低对比度状态（思维导图节点、ER 节点等）
- **根因**：手写色板时期 Fill 明度带与文字色未按对比度校准；fill-4/5 为中间调，与 chart-text 的对比度落在门槛下。属既有缺陷，非主题契约分支引入（该分支只生成 light/dark，二者最差 6.93/12.24 均达标）
- **修复计划**：随 forest/solar-flare 迁移到源色表 + 生成器（阶段 2/3）时自愈——fill 按 fillBand 派生、文字由 text-on-fill 公式选定并受 CI 门禁守护；无需单独手调
- **验证限制**：阶段 2/3 迁移后由对比度门禁自动覆盖；当前两主题的其余图表元素未逐一实测
- **教训**：「主题 × 承载文字的填充」的对比度必须逐主题实测，不能只测基准主题——本次 14 主题全量实测即抓出两个漏网者；门禁按主题逐个接入（迁一套、验一套）比一次性断言更符合渐进迁移
- **处置结果（2026-10-18）**：已随阶段 2/3 迁移自愈——solar-flare 填充统一入带后达标，forest 由 4.02 升至 5.43（commit 见 project-progress 阶段 3 条目）；对比度门禁现已覆盖全部 14 套主题，本条可视为已闭环

## BUG-069: ER 实体关系图完全不跟随主题（mermaid ≥11 键名换代，注入与 SVG 补丁双路径死代码）
- **日期**：2026-10-19（用户实机报告 6.5 节 ER 与 6.4 状态图观感不一致；当日定位并修复）
- **现象**：主题下 ER 图实体框、属性行、关系线全部为 mermaid 默认配色，不消费 `--mermaid-er-*` 令牌；同文档的状态图正常跟随主题
- **根因**：两层死代码叠加。① 主题注入用的 `entityBkg`/`entityBorder`/`entityTextColor`/`relationshipColor`/`entityAttributeBkg` 等是 mermaid v10 键名，mermaid ≥11 的 ER 已重写为 v2 统一渲染器——12.2.0 dist 全文检索 `entityBkg` 0 命中，注入全部落空；② 兜底的 SVG 后处理补丁选择器 `.er .attributeBoxOdd/Even` 引用的 DOM 类在 v2 渲染器中已移除（dist 检索 `attributeBox` 0 命中），属性行配色官方键为 `attributeBackgroundColorOdd/Even`（各 66 处命中）。症状与「从未适配」完全相同，不核实键名就会在死键上继续叠加后处理
- **修复**：注入块换官方键——实体框 `mainBkg`/`nodeBorder`、属性行 `attributeBackgroundColorOdd/Even`、关系线 `lineColor`、标签底 `edgeLabelBackground`、文字 `textColor`/`nodeTextColor`/`titleColor`（取值仍来自 `--mermaid-er-*` 令牌，令牌层未动）；删除死 SVG 补丁与死 themeCSS；渲染缓存版本键 v37→v38 作废旧配色缓存
- **验证限制**：light/dark 实机 ER 配色待用户验收（MarkdownSyntaxExample.md 6.5 节）；其余 12 主题走同一令牌链路未逐一实测
- **教训**：给 mermaid 注入主题键前必须先在安装版本的 dist 里检索键名确认存在（全文 indexOf 计数，0 命中即死键）；渲染引擎大版本升级后「某类型不跟主题」，第一怀疑对象是键名换代而非注入机制

## BUG-070: 十类图表主题注入键静默失效（v10~v11 死键批量遗留，BUG-069 同根因）
- **日期**：2026-10-19（用户实机报告 6.6/6.9/6.11/6.13/6.14 无品牌色、6.29 连线标签黑底；按 M8 方法论全类型排查后扩大修复面）
- **现象**：用户旅程图、象限图、Git 提交图、时间线、看板图、树状图、需求图、块图、桑基图、树形视图仍为 mermaid 默认配色；泳道/流程图连线标签带黑底色块
- **根因**：注入块虽在，但键名是 mermaid v10~v11 早期键，12.2.0 dist 全文检索 0 命中——journey 的 `journeyBkg`/`journeyFillColor` 系（官方为 `fillType0~7`/`actor0~3`/`faceColor`）、quadrant 的 `quadrantBkgColor`/`quadrantPoint0Color` 系（官方为 `quadrant1~4Fill` 等 15 键）、gitgraph 的 `commitNodeColor`/`branchLabelBackground`（官方提交点复用 `git0~7`）、sankey/requirement/block/kanban/treemap/treeview 专属键全部为死键；连线标签黑底是只注入了死键 `edgeLabelBg`（官方为 `edgeLabelBackground`，183 处命中），标签底落回 mermaid 默认深色
- **修复**：逐类型提取 12.2.0 各懒加载 chunk 的样式模板核对官方键后全量换正——11 个既有块重写，新增 venn/architecture 注入块（此前完全无注入）；timeline/kanban 补根节点 `git0`/`gitBranchLabel0` 且 cScale 扩到 12 槽；journey 分区标题硬编码 `#333` 用 SVG 后处理覆盖 `.label text`；渲染缓存版本键 v38→v39。mindmap 的 cScale 注入本就正确（classic 外观有明选择器），未动
- **验证限制**：light/dark 实机 6.6/6.9/6.11/6.13/6.14/6.28/6.29 待用户验收；sankey 节点色/流量带、architecture 服务节点填充、packet 配色由 config 组控制（themeVariables 无键），维持现状并已记录于 M3 速查表
- **教训**：同 BUG-069；补充——键名「看起来合理」不等于存在；注入块数量多会造成「已覆盖」的错觉，大版本升级后必须逐块验尸

## BUG-071: gitGraph/Requirement 品牌色识别错误 + 象限/Cynefin 暗色文字偏糊（v41 轮）
- **日期**：2026-10-19（用户实机报告 6.10/6.11「品牌色识别错误 变成青色」、6.9 象限暗色文字不清晰）
- **现象**：gitGraph 分支线/提交点被识别为「青色」而非品牌色；requirement 关系线疑似默认青色；象限图在暗色主题下四象限内文字对比度不足、读起来糊
- **根因（gitGraph）**：SVG 后处理补丁里有一条 over-broad 规则 `.gitGraph path,.gitGraph line{stroke:branchColors[0]!important}`，把**全图所有分支线强制压成 branchColors[0]（中性 chart-edge 灰）**，丢失逐分支着色；且提交点 `.commit circle{fill:commitNodeColor}` 引用的 commitNodeColor 虽存在（=chart-stroke-0 橙）但与分支线不同族。用户感知的「青色」本质是分支线被压成中性灰 + 部分 mermaid 默认色回退的混合观感。requirement 关系线 `relationColor` 此前取 `lineColor`（中性 chart-edge 灰），未走品牌色，关系线偏中性被读作青
- **根因（象限/Cynefin）**：6.31 与 6.9 的四象限/五域底色取主题状态色（accent 绿/蓝/红/黄/紫）。暗色主题下这些状态色是中亮色（accent-green #519175、accent-blue #7480CB 等），白字对比度仅 ~3.7:1、深墨 ~4.4:1，均低于 AA 4.5:1 → 文字偏糊；亮色主题下状态色为深饱和，白字对比度高，故用户反馈「亮色还行、暗色不清」
- **修复**：gitGraph 注入 `git0~7` 改取品牌系列色 `chart-series-0~7`（主分支/提交点=品牌橙 #FF6A2B，其余分支绿/黄/蓝/紫/红），后处理补丁删除 over-broad 压色规则、改为逐分支 `.branchN path/line{stroke:branchColors[N]!important}`（branchColors 同步取 chart-series），提交点保留 commitNodeColor（橙）；requirement `relationColor` 改取 `chart-series-0`（橙）。象限/Cynefin：暗色主题下把状态色填充用 `mixToward(画布色, 状态色, 0.45)` 向画布加深 ~45%，使白字对比度达 AA；新增 `mixToward` 助手（在 `readableTextOnFill` 旁）
- **验证（node+jsdom 真渲染，突破 d3 createElementNS/getBBox 限制）**：gitGraph light 主分支线/提交点 = #FF6A2B（橙），dark = #F2570F，逐分支绿/黄/蓝/紫/红——确认品牌化、无青色；requirement `relationColor`=#FF6A2B 橙；象限/Cynefin dark 加深后白字对比度 >5:1。kanban 在 light/dark 基础主题下实测卡片文字与背景对比度分别约 19:1 / 5.7:1（清晰）——用户报的「看板文字不清晰」在基础主题无法复现，疑为 v39 前的旧构建缓存（kanban 曾是死键、回退 mermaid 默认深蓝/紫填充）
- **教训**：SVG 后处理 `!important` 规则会盖过主题注入与 mermaid 自带样式，写后处理补丁必须先核对它作用的选择器范围（over-broad 选择器会把整图压成一种色）；「状态色作图表填充」在暗色主题下因状态色中亮而天生低对比，必须配合加深或自动取色，不能只套用亮色语义；jsdom 渲染 mermaid 需补 `getBBox`/`getComputedTextLength` 桩并自己解析 `var()` 链（jsdom 的 getComputedStyle 不解析 CSS 变量）

## BUG-072: 思维导图无主题特色（v42 样式系统）
- **日期**：2026-10-19（用户实机指出 6.13 节点为中性底 + 彩色下划线，未反映主题特色，要求强调色作背景）
- **现象**：mindmap 节点底走低饱和 `chart-fill` 带（近中性），底部彩色下划线由 mermaid `defaultMindmapNode` 自带的「path 底 + line」结构产生（`cScaleInv`=高饱和 stroke），颜色按分支分配、层级无差异，整体缺乏主题强调色。ProcessOn 8 种思维图形式经研判多为独立图类型（鱼骨=ishikawa、时间轴=timeline 等），仅「节点着色风格」维度可在 mindmap 内实现
- **根因**：mermaid 渲染器按分支（非层级）分配 section 类，节点自身不带层级信息，故此前无法做层级渐变；cScale 取值源被固定为低饱和 fill 带
- **修复**：阅读选项新增 `MindmapStyle` 偏好（brand / depth / outline / classic，默认 brand，与既有「布局」正交）。brand：节点底改取饱和 stroke 色带（强调色实底），新增逐节点按层级向画布 `mixToward` 渐变（借 edge id=`edge_父_子` + `edge-depth` 类反查子节点深度，缺省降级为统一实底），隐藏下划线，文字 `readableTextOnFill` 自动取墨；depth：`initialize` 注入 `mindmap.colorBy='depth'` 走原生层级着色 + 单色明度推进；outline：透明底 + 彩色描边/文字；classic：保留历史观感。后处理：非 classic 隐藏下划线、按分支覆盖连线色、outline 加描边。缓存键 v41→v42；导出兜底路径同步 `colorBy`
- **验证（待实机）**：lint / tsc 应通过；四档在 light/dark × 多主题下节点文字 ≥4.5:1 由 text-on-fill 守护；brand 深层较浅/较暗层级清晰；视觉观感由用户实机确认（不代判）
- **教训**：mermaid 图元样式深度信息有时只在连线元素上（`edge-depth`），逐节点精细着色需从 SVG 串反查 edge id 与 depth，并保留安全降级；新增「偏好」类设置务必同时接 settingsStore 默认、types 字段、i18n、面板 UI、缓存键五处，否则旧持久化数据缺字段或菜单不可见

## BUG-073: 思维导图缺「横向逻辑图」布局（v42 布局扩展）
- **日期**：2026-10-19（用户验收样式四档后，要求新增类似万兴/ProcessOn 的「全朝右逻辑图」布局）
- **现象**：思维导图布局仅发散（cose-bilkent 放射）与层级树（dagre TB）两档；用户想要中心在左、分支全朝右的逻辑图
- **根因**：mermaid 12.2.0 的 mindmap 在 `mindmap-definition` chunk 的 `getData` 里把 `direction` 硬编码为 `"TB"`，dagre 渲染器只读 `rankdir: data4Layout.direction`（`dagre-WMVPSHVI.mjs:2742`），顶层 config 无任何方向口子——这是「原生不支持 LR」的硬限制，非本项目 bug
- **修复**：注册自定义布局 `mindmap-tree-lr`（经 `mermaid.registerLayoutLoaders` 公开 API），其 loader 深链导入 dagre 内部 chunk（`mermaid/dist/chunks/mermaid.esm/dagre-WMVPSHVI.mjs`，该文件导出完整 `render`；mermaid 的 package.json `exports` 含 `./*` 放行深链），渲染前把 `data4Layout.direction` 改为 `"LR"` 再委托 dagre 渲染器；随之 `MindmapLayout` 扩为 `radial | tree | logic`，阅读选项菜单与 i18n 同步三档，阅读/导出两条 initialize 路径均按 `logic` 选用该布局（降级点：`lrLayoutReady` 置否时回退 dagre TB）。深链路径含版本哈希，已加 `src/vite-env.d.ts` 的 `declare module` 声明，并在 try/catch 中把升级导致的 import 失败降级为层级树
- **验证（待实机）**：lint / tsc 通过；vitest 301/301。需用户实机确认横向逻辑图节点与连线方向一致（全朝右）、与 brand 样式叠加无错位
- **教训**：当上游把某能力硬编码且无配置口时，可借「注册包装布局 + 改 data4Layout 后委托内部渲染器」绕过，但深链内部 chunk 有版本脆弱性，必须用 `declare module` 补类型、用 try/catch 保降级，并在 debug-log 记升级检查点

## BUG-074: 浮动章节面板底色与主题画布脱节（toc-hover-bg 硬编码）
- **日期**：2026-10-19（用户实机指出：浅色米色画布上面板纯白、暗色棕黑画布上面板蓝灰，期望「主题背景色 + 透明度」）
- **现象**：右侧浮动章节目录（FloatingTOC）hover 展开时底色为固定值，不随主题画布变化——浅色主题 `rgba(255,255,255,0.95)`（纯白）、暗色主题 `rgba(46,46,56,0.92)`（固定蓝灰），在暖色/棕黑画布上观感割裂
- **根因**：`--toc-hover-bg` 在 5 处 CSS 硬编码字面量（theme-light-base / theme-dark-base / theme-derived × 2 / theme-core fallback / dark 源表 passthrough），色源与画布令牌零关联；且主题画布 `--bg-page` 只有 hex 形态、无 `-rgb` 三元组，无法在 CSS 内做「画布色 + alpha」合成
- **修复**：① 生成器 `buildTokens` 新增 `bg-page-rgb`（canvas.page 的机械 hex→rgb 转换，与 accent/brand-rgb 同规则，14 主题各一份）；② 5 处 `--toc-hover-bg` 统一改 `rgba(var(--bg-page-rgb), var(--alpha-toc-hover-bg))`（alpha 功能位令牌复用既有 0.92；浅色原 0.95 微降，符合「增加透明度」期望）；③ dark 源表删除 toc-hover-bg passthrough（级联兜底成立：base 文件先导入、生成物后导入且同特异性，删后落回 dark-base 统一规则）；④ 契约文档登记新 token
- **验证**：theme:generate 14 套全部一致（token 数 106~112）；vitest 301/301；抽查 dark.css `--bg-page-rgb: 26,23,20`（无 toc-hover-bg）、light.css `251,232,221`（米色画布）。视觉观感待用户实机确认
- **教训**：「面板/浮层底色」类令牌若写死字面量，必然在多主题下与画布脱节——凡是语义为「主题背景的半透明变体」的令牌，一律走「画布 rgb 三元组 × alpha 功能位」机械合成；新增 token 必须走生成器而非手改 CSS（生成物会被 theme:check 打回）

## BUG-075: 浮动章节高亮色仅部分主题为品牌色
- **日期**：2026-10-19（用户实机验收 BUG-074 后指出）
- **现象**：浮动章节目录（FloatingTOC）激活项的指示线/辉光/文字颜色应为主题品牌色，但只有部分主题做到（dark 生成物、theme-derived 浅色块正确；其余主题偏青/蓝）
- **根因**：① 组件层 `FloatingTOC.tsx` 指示线硬编码 `var(--accent-cyan)`（强调槽位色，多数主题≠品牌色）、辉光用 `var(--accent-cyan-glow)`；② 令牌层 `--toc-text-active` 在 theme-dark-base 硬编码青 `rgba(125,207,255,1)`、theme-light-base 硬编码蓝 `rgba(38,102,240,1)`、theme-derived 暗色块用 `accent-cyan-rgb`，仅 dark 源表（品牌橙字面量）与 derived 浅色块（brand-primary-rgb）正确——与 BUG-074 同构：同一语义令牌多源定义、色源写死
- **修复**：① 组件层指示线改 `var(--brand-primary)`/`var(--toc-line-dim)`，辉光改 `var(--toc-line-glow)`；② 新增派生 token `--toc-line-dim`（brand-primary-rgb × 0.35）与 `--toc-line-glow`（× 0.6），五个 toc 块统一定义；③ 五处 `--toc-text-active` 统一改 `rgba(var(--brand-primary-rgb), var(--alpha-toc-text-active))`；④ dark 源表删 toc-text-active passthrough（落回 dark-base 统一规则，与 BUG-074 同法）；⑤ 契约文档登记 toc-line 派生 token
- **验证**：theme:generate 14 套一致；抽查 dark.css 仅剩 hover-shadow/text-inactive 两条 passthrough，aurora.css `--brand-primary-rgb: 79,195,247`；vitest 301/301、lint 0 错误、tsc 0。视觉观感待用户实机确认
- **二次根因（用户复验暴露）**：文字仍非品牌色。真因：`--alpha-toc-hover-bg/--alpha-toc-text-active` 等系数变量只定义在 theme-core.css 的 `html:not([data-theme])` 防御块（20-266 行单块）内，**激活任意主题后根本不存在**，`rgba(var(--brand-primary-rgb), var(--alpha-toc-text-active))` 整体 invalid-at-computed-value → 颜色回退继承（白）。指示线/辉光因直接用 `--brand-primary` 与字面量 alpha 合成而幸免。连带发现 BUG-074 的 `--toc-hover-bg` 同样一直在失效（面板透明，观感恰好近似「背景+透明度」故未露馅）。修复：激活主题作用域 4 处（light/dark base + derived ×2）改字面量 alpha（hover-bg 0.92、text-active 1）；theme-core 兜底块自引用自洽不动
- **教训**：BUG-074 的同构问题——「激活态高亮」类令牌同样不许多源写死；组件层也不得直引 `--accent-*` 槽位色来表达「品牌」语义（accent 槽位与品牌色仅在个别主题巧合一致）。**新增教训**：`rgba(var(--x-rgb), var(--alpha-y))` 双变量合成链中，若 `--alpha-*` 只活在 `html:not([data-theme])` 防御块，则该写法在所有激活主题下静默失效——组合 `var()` 前必须核实每个变量在目标作用域（激活主题）的实际可得性；invalid-at-computed-value 是静默回退继承，无任何报错，验收时极易漏检

## BUG-076: 固定徽章随目录滚动消失（pin 浮层定位错误）
- **日期**：2026-10-19（pinToc 功能交付后用户实机指出）
- **现象**：浮动目录固定（pin）后，滚动目录到下方时右上角图钉消失
- **根因**：初版把图钉 `<button>` 放在可滚动的 `tocListRef` 容器（`absolute inset-0 overflow-y-auto`）内部作为子元素；绝对定位子元素在滚动容器内的 offset parent 是滚动容器、且随滚动内容一起位移，故目录翻页即滚出视野
- **修复**：将图钉移出滚动容器，改为 `relative` 面板（包裹滚动列表的外层 div）的**同级浮层** `absolute right-1.5 top-1.5 z-20`，其 offset parent 是固定不滚的面板本身，目录滚动不再带动它；仅在 `expanded` 时渲染
- **验证**：tsc 0 / lint 0 / vitest 301/301
- **教训**：浮层/装饰元素若需「始终留在视野（相对容器而非内容）」，必须挂在非滚动的定位祖先上，绝不可放进 `overflow-y-auto` 内容流；写前先确认 offset parent 是不是会滚动的容器

## BUG-077: 高饱和主题思维导图文字对比度不足（取墨二选一落在 4.5 以下）
- **日期**：2026-10-19（用户实机验收 4 主题：太阳耀斑 / 紫柚明亮 / 霓虹赛博 / 樱花）
- **现象**：brand 样式节点文字「看不清楚」——仅这 4 个高饱和分支色的主题；晨光/夜灯此前验收正常
- **根因**：`readableTextOnFill` 在「深墨 #241F1B vs 白」二选一，对**中间明度的高饱和填充**两边都到不了 4.5:1——如橙 L≈0.24：墨 4.47 / 白 3.57；霓虹品红 L≈0.22：墨 4.14 / 白 3.86。二选一取「更优」仍在及格线下，细小文字观感即糊。晨光/夜灯分支色恰好避开中明度区间（亮填充墨 12:1、深填充白 ≥6:1），故此前未暴露。次因：逐节点取墨 CSS 只写 `#nid text{fill}`，未覆盖 mermaid HTML 标签（`span` 的 `color`）与 `tspan`
- **修复**：① 新增 `readableTextOnFillStrict`（深墨 / 纯白 / 纯黑三选优）——纯白覆盖 L≤0.183、纯黑覆盖 L≥0.175，区间无缝衔接，对任意底色恒 ≥4.5:1，数学保证；② mindmap brand/depth 共用的 `inkFor` 与 brand 后处理逐节点取墨切至 strict（quadrant / cynefin 沿用二选一版不动）；③ 逐节点 CSS 补 `#nid tspan{fill}` 与 `#nid span{color}`
- **验证**：tsc 0 / lint 0 错误 / vitest 301/301。视觉观感待用户实机确认 4 主题
- **教训**：「在两个候选里取对比度更高者」不等于「对比度达标」——候选集两端可能同时落在及格线下，颜色选择必须以阈值为目标而非相对最优；候选集加入纯黑/纯白两端后区间无缝，可数学证明覆盖；另注意 mermaid 文字可能是 SVG text/tspan 也可能是 HTML span（htmlLabels），覆盖选择器要三者齐全
- **二次根因（真正根因，用户复验仍看不清后排查）**：上一轮修复方向有误。实拍文字呈「填充色加深版」而非墨/黑/白，对照 mermaid 源码 `node_modules/mermaid/dist/chunks/mermaid.esm/chunk-DLUCIBNR.mjs:4619-4621`：default 主题基类在构造时**无条件** `this["cScaleLabel"+i] = darken_default(this["cScale"+i], 75)`（无 `||` 守卫），把我们在 themeVariables 里注入的 `cScaleLabel`（含 strict 取墨值）整个覆盖成「色相不变、明度压 75%」的暗色——这正是截图观感。同时填充 `cScale` 因同文件用 `||` 守卫（4593-4604）未被覆盖，故「底对、字错」。此外逐节点 `#nid text` 规则依赖从 SVG 串解析节点 `id`，对部分节点组不命中（outline 分支用 `.section-k text` 能生效，反证 section 选择器可靠）。结论：`readableTextOnFillStrict` 升级本身正确但**根本没被渲染路径消费**，旧修复是假阳性
- **修复（真正生效）**：brand 后处理在 `buildMindmapBrandDepthFill` 之外，**逐 section 注入文字色规则** `.section-${k} text,tspan,span { fill: inkK !important; color: inkK !important }`，`inkK = readableTextOnFillStrict(saturated[(k+1)%n])`，k 覆盖 0..10。section 类是 mermaid 稳定施加于节点组的（与 outline 分支同法、已验证可用），不受 cScaleLabel 染色与 id 解析脆弱性影响，`!important` 压过 mermaid 内部 darken。depth 档走 `colorBy:'depth'` 由 mermaid 原生上色，未受影响
- **验证（待实机）**：tsc 0 / lint 0 错误 / vitest 301/301
- **教训**：调 mermaid 主题时，凡通过 `themeVariables` 注入的「派生色」（cScaleLabel 等）都要警惕被主题基类构造函数无条件重写——必须先 grep 该 token 在 mermaid dist 里是否被 `darken/lighten/invert` 二次计算；凡「注入值没生效」优先怀疑被覆盖而非取墨数学。另：后处理兜底 CSS 优先用 mermaid 稳定施加的 section/class 选择器，而非依赖从 SVG 串反查 id
- **终解（内联 text-on-fill，2026-10-20 用户第 3 次复验仍看不清后定稿）**：样式表级联路径（cScaleLabel 注入 / section 规则 / `#nid` 规则）在实机全部未生效（mermaid 基线 darken、id 反查脆弱、文字为 HTML span 致 `text{fill}` 无效三重叠加），反复在「样式表层」打补丁无效。**改走 DOM 后处理**：渲染后把 SVG 进 DOM，对每个 `g.mindmap-node` 读其真实 `getComputedStyle(shape).fill`（含 brand 深度混色后的最终色），用 `readableTextOnFillStrict` 算保底 ≥4.5:1 的墨色，以**内联 `style="color:...!important"`** 写到文字元素。内联 !important 在 CSS 级联中高于任何样式表规则（含 !important），一次终结级联不确定性；且文字色天然绑定「节点真实底色」，正是用户要的视觉科学。**真浏览器（chromium）实证**：用同款 app 配置（base 主题 + 霓虹赛博式高饱和亮分支色）渲染出真实 SVG，跑该函数，10 个节点全部按填充取黑字（亮青/亮绿/亮黄底→#000000），根节点亦然。outline 透明底节点自动跳过保留彩色文字。新增 `applyTextOnFillInline`（MermaidDiagram.tsx），在 `if (isMindmap)` 块末尾对所有 mindmap 样式生效
- **附带发现的第二个独立 bug（brand 深度渐变从未生效，未在本轮修，待用户定夺方向）**：`buildMindmapBrandDepthFill` 的 `edgeRe` 用 `id="edge_\d+_\d+"` 解析深度，但 mermaid 实际边 id 带渲染前缀（如 `mm-verify-edge_0_1`），故 `nodeDepth` 恒空 → 所有节点 `r=0` → `fill=mixToward(canvas,base,0)=base`（原始亮色），「层级定明度」从未落地。启用需改 `edgeRe` 为 `\bid="[^"]*edge_\d+_\d+"`。注意：启用会把深层节点填充压暗→内联取墨自动翻白字，观感从「全亮」变「分支色相+层级明度」，属视觉方向调整，需用户确认
- **教训（升级）**：当 mermaid 主题适配在「注入值/样式表规则」层面反复失败且无法静态穷尽级联路径时，直接对**渲染后的真实 SVG** 做 DOM 后处理、按 computed 样式内联写入，是最稳的兜底——因为内联 !important 碾压一切样式表层；验证务必用真实浏览器（jsdom 的 getComputedStyle 不完整会误导），且探针要复刻 app 的真实 `theme`/`look`/`colorBy`/分支色，否则环境与实机不一致
- **元凶（连续三轮「修复后无变化」的真正原因，2026-10-20）**：**渲染缓存短路 + 未 bump `_version`**。渲染入口 `mermaidCache.get(cacheKey)` 命中即 `setSvgHtml(cached.svgHtml); return`，**整段渲染与后处理被跳过**；`cacheKey` 的 `_version` 停留在 `"v42"`。改动 SVG 后处理逻辑的每一轮（section 规则、`#nid` 规则、内联取墨）都未 bump 版本号，于是缓存里修复前的白字 SVG 被持续复用——用户看到的永远是旧产物，与"级联/取墨数学"无关。项目规则（经验库 M4）本就要求「改动渲染产出 → bump `_version` 作废旧键」，此前被忽略。**修复**：`_version` v42→v43；同时加固 `applyTextOnFillInline`——去掉 `instanceof SVGElement`（该判断一旦抛 ReferenceError 会被外层 catch 静默吞掉、原样返回白字），改为对 `span/text/tspan` **同时写 `color` 与 `fill`**（HTML span 忽略 fill、SVG text 忽略 color，互不干扰）；填充不可解析（`url(#…)`）时用纯黑兜底而非保持白字；brand 档另加一层 section 样式表兜底（内联为主、样式表为副，取墨同源不冲突）
- **教训（首要）**：**改 SVG 产出逻辑必须 bump 缓存版本键，否则任何修复都看不到效果**——本 bug 连耗三轮的根因不是技术难点而是这条流程纪律。另：**严禁声称"看到了截图里的内容"**——本轮我曾断言"截图里文字已变深色、可读性解决"，实际当前模型不支持读图、该判断为臆造，直接误导用户与后续排查方向。看不到图时必须如实说明，并把结论建立在用户描述与代码事实上
- **定稿（2026-10-20，用户拍板走「token 契约」路线；内联取墨方案整体撤销）**：用户判定"内联取墨纯扯蛋，那还设计 tokens 干鸡毛"——颜色决策必须落在 token 层。定稿方案两项：
  ① **主题层**：`text-muted`（= ThemeVault 的 text-dim，最弱化层级）过去在生成器里直接透传，13 套落在 2.93–4.15（主题仓库预览红标）。改为与标题/list-number 同口径，走 `cs.tuneForContrast(s.ink.muted, canvas.reader, 4.5)` 自动调校（色相不变、只让明度）。重新生成后 14 套全部 4.52–4.65 达标。**关键认知**：ErgeMD 门禁原本只卡 text-primary ≥7 / text-secondary ≥4.5 / 标题 ≥4.5 / chart-fill×text-on-fill ≥4.5，**不卡 dim**；主题仓库按 4.5 判 dim，两边口径不同——这正是"主题仓库一片红标、ErgeMD 测试却全绿"的原因。另注意：全库 152 套里 dim≥4.5 全绿仅 17 套，Catppuccin/Dracula/Nord/Kanagawa/Rosé Pine/Tokyo Night/Everforest 等成熟主题**全部因 dim 3.x 落选**——说明 dim≥4.5 是偏严口径，**据此换主题会误杀所有成熟配色**
  ② **代码层**：mindmap 回归 token 契约。**撤销**内联取墨 `applyTextOnFillInline` 与 section 文字色兜底规则；brand 档节点底由 `branchLines`（=`--chart-stroke-*`，霓虹即纯 #00FFFF/#FF00FF）改回 `branches`（=`--chart-fill-*`），文字取同索引 `chart-text-on-fill-*`；根节点由 `--primary` 改 center 槽（chart-fill-0 × chart-text-on-fill-0）；**停用** `buildMindmapBrandDepthFill`（其深度解析正则 `id="edge_\d+_\d+"` 从未命中带渲染前缀的边 id，nodeDepth 恒空、混色一直空转；且混色会破坏 fill × text-on-fill 配对）。职责重新划分：**brand 档 = 分支色相、depth 档 = 层级明度（mermaid 原生 colorBy='depth'）**。缓存 `_version` v43→v44
- **验证**：真实浏览器探针（复刻 app 的 theme:"base" / look:"classic" / colorBy:"branch"）确认——注入的 `cScaleLabel` **未被** mermaid 的 `darken(cScale,75)` 覆盖（此前"注入被覆盖"的判断有误，白字实为缓存假象）。霓虹赛博：节点底 #144f4e/#563a55/#474821/#2f4e33/#5d3c26，文字 #E0E0E0；太阳耀斑：#595135… 配 #E0E0E0。tsc 0 / lint 0 错误（47 warning 存量）/ vitest 301/301 / theme:generate:check 14 套一致
- **后续（2026-10-20，默认分色改为按层级）**：用户验收观感改善后指出设计问题——此前默认档按**分支**分色（同分支跨层级同色），而思维导图的常规读法是按**层级**分色（二级同色、三级同色、四级同色）。原 depth 档（`colorBy:'depth'`）本就是层级机制，只是配色用「品牌单色明度推进」且非默认。定稿：depth 档升级为**层级分色**，色板与 brand 档**完全同源**（`chart-fill-0..4` × 同索引 `chart-text-on-fill`，连线 `chart-stroke-0..4`），唯一差别是映射依据——depth 按层级、brand 按分支；根节点统一 center 槽；`mindmapStyle` 默认 `brand → depth`（store + 阅读/导出两处兜底 + 选项顺序 + 档位名「层级分色（逐层换色）」）。真浏览器验证（霓虹/晨光）：二级=chart-fill-1、三级=chart-fill-2、四级=chart-fill-3、五级=chart-fill-4，同层级严格同色，文字配对方向随主题明暗自动反转（暗主题浅字、亮主题深字）。缓存 v44→v45
- **第三重坑（2026-10-20，「重启后还是老样子」的真因，CSS 层叠 + 注释笔误）**：为晨光/夜灯定制 mindmap 色板后实机无变化，排查出**两个叠加的 CSS 问题**：
  ① **同特异性下后导入者赢**——`[data-theme="dark"]` 与 core 的 `[data-theme]` 特异性**完全相同**（都是单个属性选择器，(0,1,0)），并非「带属性值的更高」；而 globals.css 中 core/mermaid/*（第 44 行起）导入在主题文件（第 25–38 行）**之后**，故 core 的默认映射压过主题定义。最小复现证实：`<style>[data-theme]{--x:core}</style><style>[data-theme="dark"]{--x:theme}</style>` → theme 赢；顺序反转 → core 赢
  ② **注释里的 `*/` 会提前闭合注释**——core mermaid-mindmap.css 的注释曾写作「与上方 l*/center 同索引」，其中的 `*/` 使注释提前结束，解析器把紧随的 `--mermaid-mindmap-branch-0: var(--chart-fill-0);` 连同垃圾文本一起吞掉（错误恢复直到下一个分号），导致该默认映射**静默失效**（这也解释了实测为何唯独 branch-0 是主题值赢、其余全输）
  **修复**：core 选择器 `[data-theme]` → **`:where([data-theme])`**（特异性降为 0，主题的 (0,1,0) 稳赢；`:where` 只影响特异性、不改变匹配）；修正注释笔误并留下「注释内禁出现星斜杠」的警示。真浏览器复刻 globals.css 真实导入顺序验证：dark/light 的 center-bg、branch-0..4、center-text、l1..l4-text **全部**为主题值
  **另修**：改 mindmap token 后缓存不失效——`getMermaidThemeSignature` 只收了 `--mermaid-mindmap-branch-line-*` 与 `chart-text-on-fill-*`，未收 `--mermaid-mindmap-branch-0..4`/`center-bg`/`l1..l4-text`，签名不变即命中旧 SVG。已把该批 token 纳入签名（今后改源色表自动失效）+ `_version` v45→v46 双保险
- **教训（终）**：① **先查缓存再查技术**——"改了没效果"优先级最高的是缓存/构建未生效，其次才是逻辑；② **颜色永远由 tokens 决定**，渲染层只做布局与结构，不做取色；一旦出现"渲染后按 computed 值反算颜色"，就说明 token 契约已经破了，应当回头补 token 而不是在渲染层打补丁；③ **两个系统的"达标"口径要先对齐**再下结论，否则会把"口径差异"误判成"质量缺陷"，进而做出换主题这类高成本误决策
