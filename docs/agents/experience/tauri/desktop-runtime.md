# tauri/desktop-runtime — Tauri 运行时经验

## TA1: 无边框窗口的 stacking context 与拖拽事件链 🔴

- **主张**：Tauri `decorations: false` 窗口中，`overflow`（非 visible）、`position: relative/absolute`、`transform`（含 `translateX(0)`）、`will-change`、`filter`、`backdrop-filter`、`contain`、`isolation` 都会创建 stacking context，裁剪/拦截 `position: fixed` 元素的鼠标事件，使 `startDragging()` 失效；同时全面禁用 DOM drag 事件（`onDragEnter/onDragOver/onDragLeave/onDrop`，含 window 级），必须用 `getCurrentWebview().onDragDropEvent`；`data-no-drag` 只放在最小粒度交互元素上；双击功能在 `onMouseDown` 中以时间戳实现。
- **适用**：任何 Tauri 无边框（自定义标题栏）桌面应用。
- **Why**：原生拖拽依赖 fixed 拖拽区收到完整鼠标事件链；DOM drag 事件会干扰 Tauri 的事件链；外层容器上的 `data-no-drag` 会把子元素间空白也划为不可拖。
- **How**：
  - 拖拽区元素避免上述 CSS 属性；标题栏常驻渲染（欢迎页也要有拖拽区）
  - 文件拖放：`getCurrentWebview().onDragDropEvent((e) => { const { type, paths } = e.payload; })`
  - `data-no-drag` 放每个 tab/按钮项；双击：`onMouseDown` 内 `Date.now() - lastClick < 300` → `toggleMaximize()`，否则 `startDragging()`
- **反例**：`<div onDragOver={e => e.preventDefault()} onDrop={...}>` 拖文件 → 窗口无法移动（BUG-013，7 处复发）；`data-no-drag` 放 TabBar 外层 → 标签空白处不能拖（BUG-010）。
- **事实源**：BUG-001、BUG-010、BUG-013、BUG-037；规则已入 AGENTS.md Conventions

## TA2: invoke 参数命名与错误处理 🔴

- **主张**：Tauri 2 的 `invoke()` 默认不做 camelCase → snake_case 转换，JS 侧参数名必须与 Rust 函数签名逐字一致；异步调用禁止 `.catch(() => {})` 静默吞错，至少 `console.error`。
- **适用**：所有 Tauri 前后端 IPC 调用。
- **Why**：参数名不匹配时命令静默失败（返回空/报错被吞），问题极难定位；竞态条件下吞错会直接表现为「功能没了但没报错」。
- **How**：JS 传参用 snake_case（`{ file_path, file_name }`）；统一错误处理 `.catch((err) => console.error("context:", err))`；命令保持薄层（参数校验 + 调用 service + 返回）。
- **反例**：最近文件列表为空——JS 传 `filePath` 而 Rust 期望 `file_path`，错误被 `.catch(() => {})` 吞掉（BUG-018）。
- **事实源**：BUG-018、BUG-049；规则已入 AGENTS.md Conventions

## TA3: CSP 显式声明与 dev/build 差异 🔴

- **主张**：Tauri 2 的 CSP 在 production build 中严格执行（dev 宽松）；`default-src` 不会覆盖 `img-src`/`connect-src` 等具体指令，每个 `*-src` 必须显式声明允许的协议源；永远不要只以 dev 模式测试结果下结论。
- **适用**：Tauri 2 应用的网络/资源加载配置。
- **Why**：dev 从前端 localhost 加载、CSP 对同源更宽松；build 从 `tauri://localhost` 加载、严格执行。远程图片 404、接口失败只在 build 复现。
- **How**：`img-src` 加 `https: http:`（远程图片）、`connect-src` 加 `https: http:`；build 产物按 F12 检查 Console/Network 的 CSP 违规报错。
- **反例**：dev 正常上线后用户反馈「图片全裂」——`img-src` 缺 `https:`（BUG-048）。
- **事实源**：BUG-048

## TA4: 本地文件、文件关联与初始化竞态 🟡

- **主张**：① Windows 上本地文件读取用 Rust 命令返回 base64 data URL，不用 `convertFileSrc` + asset 协议（glob scope 无法匹配驱动器号绝对路径）；② 文件关联必须双路径：冷启动解析 `std::env::args()` 存入 `PendingFile` State + emit，热启动监听 `tauri://file-open`，前端 `get_pending_file` + listen 双接收；③ 异步初始化（数据库）与数据查询之间用 ready flag 显式同步。
- **适用**：Tauri 2 桌面应用的文件 IO、文件关联、启动初始化。
- **Why**：① asset 协议 scope 的 glob 模式不匹配 `D:\` 开头路径，且需额外 CSP 配置；② Windows 冷启动不触发 `tauri://file-open`；③ 组件挂载时数据库可能未就绪，查询失败被吞 → 空列表。
- **How**：Rust：`read_image_as_data_url(base_path, relative_path)` 读文件 + MIME 判定 + base64；setup 钩子双路径；前端 `const [dbReady, setDbReady] = useState(false)`，未就绪不查询。
- **反例**：右键「用 ErgeMD 打开」文件不加载；欢迎页最近文件空——两条路径各踩一遍（BUG-049）。
- **事实源**：BUG-048、BUG-049；DEC-028

## TA5: 打包签名私钥 🟢

- **主张**：本项目 `createUpdaterArtifacts: true`，本地 `pnpm tauri:build` 前必须设置 `TAURI_SIGNING_PRIVATE_KEY`；私钥文件 `~/.tauri/ergemd.key`（无密码）是更新签名根凭证，丢失后已装客户端无法接收任何后续更新，必须异地备份；CI 侧由 GitHub secret 注入。
- **适用**：仅本项目（v0.4.4 起的自动更新链路）；换项目替换密钥路径与变量名。
- **Why**：Tauri updater 用私钥签名更新包，客户端内置公钥验签；私钥丢失 = 更新链路永久断裂，只能让用户手动重装。
- **How**：构建前 `export TAURI_SIGNING_PRIVATE_KEY=$(cat ~/.tauri/ergemd.key)`；备份到异地；轮换私钥需全量客户端升级，慎重。
- **反例**：私钥随机器丢失/未备份 → 线上用户永远收不到新版本。
- **事实源**：AGENTS.md Conventions「本地打包需签名私钥」
