# frontend/react-patterns — React 模式与踩坑

## F1: useEffect 依赖闭环致无限循环 🔴

- **主张**：useEffect 内通过 setState 修改依赖数组中的变量，会形成 `effect → setState → 依赖变化 → effect` 无限循环；用 useRef 读取最新值并将其移出依赖数组来打破闭环。
- **适用**：任何含动画/RAF/定时器 + setState 的 effect。
- **Why**：依赖变化触发 effect 重执行，动画内每帧 setState 都产生新值 → 每帧新建 RAF 链，内存暴涨直至卡死。
- **How**：
  ```typescript
  const offsetRef = useRef(offset);
  offsetRef.current = offset;                 // 每次渲染同步最新值
  useEffect(() => {
    const step = () => { const cur = offsetRef.current; setOffset(next); requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, [isHovering, autoTranslateY]);            // 依赖不含 offset
  ```
- **反例**：snapBack effect 依赖 `tocScrollOffset` 且动画内 set 它 → 软件内存占满卡死（BUG-026）。
- **事实源**：BUG-026

## F2: 合成事件与原生事件传播 🔴

- **主张**：React 合成事件（`onWheel`/`onClick`）的 `stopPropagation()` 不阻止原生 DOM 事件继续传播；跨容器滚动拦截必须用原生 `addEventListener` + `{ passive: false }` + `stopImmediatePropagation()` + `preventDefault()`。
- **适用**：悬浮面板阻止下层滚动、fixed 元素事件隔离等场景。
- **Why**：React 事件系统与 DOM 事件流是两套；`passive: true`（部分浏览器 wheel 默认）会使 `preventDefault()` 被忽略。
- **How**：
  ```typescript
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const onWheel = (e: WheelEvent) => { e.stopImmediatePropagation(); e.preventDefault(); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  ```
- **反例**：`<div onWheel={e => e.stopPropagation()}>` → hover TOC 时正文仍跟随滚动（BUG-027）；漏写 `passive: false` → preventDefault 无效（lessons 03 坑 2）。
- **事实源**：BUG-027；lessons 03；规则已入 AGENTS.md Conventions

## F3: 虚拟列表阅读位置与滚动回调治理 🟡

- **主张**：`@tanstack/react-virtual` 的 `getVirtualItems()[0].index` 是视口顶部可见项而非阅读位置，取视口中部索引；点击导航触发滚动动画期间，用时间戳窗口屏蔽 scroll 回调对高亮状态的覆盖；Tab 切换后依赖 scroll 的状态必须立即主动重算，不能等 scroll 事件。
- **适用**：虚拟滚动 + 目录/进度联动的阅读器类应用。
- **Why**：视口顶部常露出上一章节尾部（padding/margin）；滚动动画期间的 scroll 事件会按视口顶部重算高亮，覆盖正确值；切 Tab 本身不触发 scroll 事件。
- **How**：`const mid = visibleRange[Math.floor(len/2)]?.index ?? visibleRange[0].index`；点击记 `clickTsRef.current = Date.now()`，scroll 回调 `Date.now() - clickTs < 500` 直接 return；`useEffect([isActive])` 内立即读 `data-index` 或 scroll 百分比计算。
- **反例**：点第五章跳转后高亮飘到 3.2；切 Tab 后 TOC 高亮停顶部（BUG-028、BUG-029；lessons 03）。
- **事实源**：BUG-028、BUG-029；DEC-019；lessons 03

## F4: hooks 依赖与状态更新性能 🟡

- **主张**：① useCallback 依赖超过约 5 个且含高频变化的 store 值时，改用 `useXxxStore.getState()` 或 ref 读取，保持稳定引用；② 高频事件（mousemove/scroll）处理器先用 ref 比较状态，仅变化时 setState；③ IntersectionObserver 的「观察结果」与「被观察数据」分离存储，避免回调修改依赖导致 Observer 反复重建；④ 被依赖的 useCallback 必须先声明。
- **适用**：事件监听器重、动画密集、观察器联动的组件。
- **Why**：依赖变化 → 回调重建 → effect 内监听器频繁注销/注册；60fps 事件无条件 setState → 每帧重渲染。
- **How**：见各项主张的做法模式；性能问题先用数据定位再优化，不做微观语法级优化。
- **反例**：15 个依赖的 handleKeyDown 随 store 值变化重建；Observer 每次标题激活都销毁重建（BUG-022~024）。
- **事实源**：BUG-022、BUG-023、BUG-024、BUG-021

## F5: 内联样式不响应 CSS 变量 🔴

- **主张**：React 内联样式不会因 CSS 变量变化而重新渲染——即使值是 `var(--xxx)`；所有跟随主题变化的样式必须用 CSS 类选择器，把变量写进样式表。
- **适用**：主题系统 + React 的任何项目。
- **Why**：React 只在自己重渲染时才重算内联样式；CSS 变量在 `[data-theme]` 上切换时浏览器自动重算类选择器样式，但不通知 React。
- **How**：主题相关样式全部进 CSS（`.markdown-body h1 { color: var(--h1-color) }`）；组件层只保留布局/一次性样式；注意选择器顺序，`color: inherit` 先于主题色声明会覆盖它。
- **反例**：自定义 h1-h6 组件用内联 `color: var(--h1-color)` → 主题切换标题颜色不变；而同样用 CSS 类的代码高亮正常（BUG-047）。
- **事实源**：BUG-047

## F6: Portal / 渲染器 hooks / persist merge 🟡

- **主张**：① inline 元素（span/a/p）内禁止直接渲染块级元素，弹窗/菜单用 `createPortal` 到 document.body；② react-markdown `components` 中的渲染器函数不是 React 组件，不能用 hooks，需提取为独立组件；③ zustand `persist` 必须提供自定义 `merge`，先铺默认值再覆盖持久化值，否则旧版 localStorage 缺字段为 undefined；④ 修改 export 方式前必须核对所有 import 方。
- **适用**：React 19 + react-markdown + zustand 项目。
- **Why**：HTML 结构非法（`<div> cannot be a descendant of <p>`）；hooks 依赖组件上下文；数据结构升级时旧数据缺字段；export/import 不对称直接白屏。
- **How**：Portal 组件（mounted 后 createPortal）；渲染器提取 `ClickableImage` 等独立组件；`merge: (persisted, current) => ({ ...current, settings: { ...defaults, ...(persisted?.settings || {}) } })`。
- **反例**：右键菜单渲染在 span 内控制台报错；渲染器函数内 useState；升级后设置项全 undefined；`export default` 改命名导出致白屏（BUG-036、BUG-009、BUG-019、BUG-004）。
- **事实源**：BUG-036、BUG-009、BUG-019、BUG-004；lessons 04

## F7: flex 滚动、zIndex 层级、Tailwind 迁移 🟢

- **主张**：① flex 子元素 `flex: 1` 填充剩余空间必须同时 `minHeight: 0`（或 `minWidth: 0`）；② 新增 fixed/absolute 组件必须检查遮挡与 zIndex 层级（本项目：TitleBar=60，Toast/SearchBar=55，ImagePreview=50，LeftPanel=40，遮罩=30）；③ Tailwind v4 迁移保守策略——只迁纯布局类（display/position/overflow/z-index/cursor/flex），间距/尺寸/颜色/字体/border/background/transform 保留 inline；`@import "tailwindcss"` 必须在 globals.css 最顶部。
- **适用**：本项目布局与样式约定；换项目时 zIndex 数值与迁移策略需重新判定。
- **Why**：flex 子元素默认 `minHeight: auto` 会撑开容器阻止滚动；层级无约定必遮挡；v4 的 preflight/类名扫描与 v3 不同，间距类大面积迁移曾全量失效。
- **How**：见主张；迁移后必须逐组件验证滚动与布局。
- **反例**：文件树不滚动（缺 minHeight: 0）；WelcomePage 迁移后挤成一团（间距类失效）（BUG-012、BUG-005、BUG-011）。
- **事实源**：BUG-012、BUG-005、BUG-011
