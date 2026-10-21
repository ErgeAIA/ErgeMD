# 更新日志

本项目的所有重要变更都会记录在此文件中。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [Unreleased]

### 新增

- **思维导图「横向逻辑图」布局**：MindmapLayout 新增 `logic` 档（中心在左、分支全朝右）。mermaid 12.2.0 原生把 mindmap 方向硬编码为 TB、无配置口，故注册自定义布局包装 dagre 渲染器（渲染前将 `data4Layout.direction` 改为 LR）实现；阅读与导出两条渲染路径同步切换，深链内部 chunk 已补 `declare module` 类型声明并带失败降级
- **思维导图样式系统**：阅读选项新增「思维导图样式」偏好（brand / depth / outline / classic 四档），涵盖逐分支强调色实底、层级向画布渐变、对比度自动取墨等观感可选，与既有布局偏好正交
- **浮动目录可固定**：新增全局偏好 `readingSettings.pinToc`，提供三处入口——悬浮图钉徽章（钉在面板右上角、不随列表滚动）、阅读选项「固定目录」开关、快捷键 `Ctrl/Cmd+Shift+L`；固定后移开鼠标目录不自动收起

### 修复

- **修复 Mermaid 图表预览文字丢失**：点击图表放大预览时，节点框正常但标签文字全部消失，「另存为 SVG」存出的文件同样缺文字。根因是预览路径对 mermaid 输出做了二次消毒，DOMPurify 会剥掉 htmlLabels 文字容器（foreignObject）的内容；现预览与文档视图使用同一信任模型（mermaid strict 输出自带消毒），不再二次消毒
- **超大文档浮动目录跳转精准度**：万行级文档点击目录跳转时落点偏离、需手动二次滚动。根因是虚拟滚动按估算高度定位（未测量块的误差随块数累积可达数千像素），且原校准机制在目标区块尚未渲染时会静默放弃。现改为收敛循环：目标未渲染时重新发起滚动将其滚入渲染窗口，渲染后按实测位置即时校正，直至命中像素级容差；8000+ 行文档实测各层级标题均精准落位
- **分块解析缓存可能串文档数据**：缓存键缺少文档标识，两个不同文档在相同行范围且首末行长度相同时会命中同一条目、返回对方的解析结果；缓存同时无容量上限，随打开文档数持续增长。现缓存键加入文档指纹（行数 + 总字符数）并增加容量淘汰
- **普通文本中的管道符被误判为表格**：含 `|` 的段落（如 `a | b`、shell 管道命令）会被整段并入表格块，导致长文档解析变慢；已收紧表格行判定（行首/行尾为 `|`，或去掉行内代码后仍至少两个 `|`）
- **多标签页搜索 / 全选作用于错误文档**：所有标签页的阅读区常驻 DOM，全局查询按文档序取值，可能命中非活动的标签页；现搜索、清除高亮与全选只作用于当前可见文档
- **虚拟滚动下目录高亮偶尔偏移一个章节**：活跃章节改用视口中部区块计算，避免上一章节尾部仍在视口时高亮错位
- **阅读进度中的字数为恒 0**：持久化时字数硬编码为 0，数据库字段从未更新；现保存真实字数，且保存失败不再被静默吞掉（控制台可见错误）
- **导出标题全黑**：导出样式序列化拼接 `!important` 时漏掉叹号，整条声明非法被丢弃、标题回落默认黑色；已修正
- **PDF 图表被放大／裁切（BUG-078）**：打印布局不求值 SVG 内联 `max-width`，`width="100%"` 撑满内容区，小图被放大数倍至越页；PDF 导出改为把根 SVG 固化为明确 px 宽高
- **PDF 中多数图表色块丢失（BUG-080）**：`@media print` 里的 `* { height: auto !important }` 会覆盖 SVG `<rect>` 的 height 呈现属性并求值为 0，矩形整块不绘制；现已排除 SVG 子树。同轮修复桑基流量渐变被烘焙成单色导致彩带消失
- **图表样式跨图污染（BUG-079）**：手工注入的 CSS 用裸选择器，而 `<style>` 对整个文档生效，流程图／架构图规则压掉了思维导图配色；全部改为按 `#<svgId>` 作用域注入，并去掉实心底思维导图的残留描边
- **图表 hover 高亮失效（BUG-081）**：作用域化解析把 CSS 注释与 `@media` 前置误当选择器吞并、整条规则非法；改为扫描式解析并补防回归单测
- **浮动章节面板底色与主题画布脱节（BUG-074）**：面板底色原硬编码纯白 / 蓝灰，与主题画布无关；现改为随主题画布色 + alpha 合成（主题生成器新增 `bg-page-rgb` 三元组，14 套主题各一份）
- **思维导图字号层级递增 + 图表 hover 动画补齐**：思维导图节点字号原本全图统一，现按层级递增——中心节点最大（18px），向外逐级递减（二级 16px / 三级 15px / 四级 14px / 更深 13px），符合主流思维导图读法；因图形尺寸按原字号测量，仅放大中心一级并允许其长文字换行，避免撑破节点背景。图表 hover 高亮从 14 类扩展到 33 类选择器，补齐用户旅程图、XY 图表、数据包图、雷达图、事件建模图、树状图、石川图、Cynefin 框架图的聚焦淡出，并为时序图、Git 图补充 actor、提交标签等更易命中的入口；hover 机制仍为纯 CSS + `:has()` + 只动 opacity，不引入事件监听、不触发布局重排
- **修复饼图与沃德利地图 hover 失效、饼图黑色描边**：饼图 hover 此前完全不生效——mermaid 用 `#id .pieCircle{opacity:0.7}` 的作用域（id 特异性）覆盖了我无作用域的聚焦淡出规则；现淡出规则加 `!important` 压制该覆盖，并补 `:hover{opacity:1!important}` 让悬停扇区由 0.7 拉回 1。沃德利地图此前根本未接入 hover（误用的 `g.wardley-component` 选择器零命中，真实节点类为 `g.wardley-node`），现已补入；XY 图表的 hover 由「整组」改为「单柱 / 单线」，单序列示例也能清晰聚焦。饼图黑色描边（mermaid 默认 `pieStrokeColor:black` 且最外圈用独立的 `pieOuterStroke*` 变量，此前从未注入）现已通过将描边宽度置 0 彻底去除；沃德利描边本就由后处理着色（非黑）。渲染缓存版本键 v48→v49，强制旧图表重新渲染
- **多图去除黑色描边，全图表类型扫底**：排查所有 Mermaid 图表类型的黑/近黑描边并统一修复——甘特图网格线（渲染器给网格线写入内联 `stroke="currentColor"`，会解析为黑色，主题变量无法覆盖，改用后处理强制为主题线色）、用户旅程图角色圈、架构图服务节点边框、C4 关系线、Git 合并箭头，以及树状图（此前后处理的选择器大小写与 Mermaid 实际类名不符，导致从未生效，已修正）。上述位置此前均会回落到 Mermaid 默认的近黑描边。经真浏览器逐图核验，示例文档中全部图表已无黑描边；渲染缓存版本键 v49→v50，强制旧图表重新渲染
- **修复 Git 图多余弧线、甘特图发模糊、桑基图不发 theme 色**：Git 提交历史图连接处出现的多余弧线是一处回归（对合并箭头的后处理误将分支色覆盖为中性灰并填充了弧线路径），已回退——合并箭头本就按分支着色。甘特图任务条此前的底色与分区底色在多数主题下几乎同色，导致任务条融进分区、全主题发模糊，已改用与分区拉开对比的填充色。桑基图的节点与流量渐变使用了不随主题变化的固定色板，导致深色主题下发虚，现已将固定色映射为主题品牌色，使节点与流量都随主题自适应。另加固主题切换的缓存失效，避免切换主题后图表需手动刷新才更新
- **甘特图任务条改用品牌主色、桑基图深色主题流量不再发虚**：甘特图任务条此前的底色与分区底色过于接近、在全主题下都发模糊，现改用品牌主色（最高识别度），任务条上的文字按底色自动选取对比色以保证可读。桑基图流量在深色主题下几乎看不见，根因是流量默认使用了「正片叠底」混合模式——在深色背景上会把流量压得更暗，现深色主题改为正常混合并提高不透明度，流量清晰可见（浅色主题观感不变）
- **修复甘特图在全主题下显示为大黑条**：原因是图表样式注入时误用了不被 CSS 支持的注释写法，导致样式解析出错、图表原有配色规则失效，区块底色回落到默认的黑色（因此与主题无关、每个主题都发黑）。现已改用正确的注释写法，甘特图配色与网格线恢复正常
- **修复切换主题后部分图表不刷新、需手动刷新才变色**：图表缓存键里的主题特征值是在渲染阶段计算的，而此时页面主题属性尚未更新，导致切换主题后可能命中上一主题的缓存而跳过重渲染（典型表现为思维导图中心节点只剩边框或呈近白色）。现在渲染前会先确认页面主题已同步（未同步则延后一帧重试），并用最新主题特征值重新校验缓存，切换主题后所有图表即时更新
- **修复个别图表偶发仍不刷新的残留问题**：上一版的主题同步采用「等待重试」，重试次数用尽后仍会用旧主题渲染，导致偶发失效。现改为直接写入当前主题，确保图表渲染时读取到的始终是最新主题配色。另对桑基图的渐变标识做了防冲突加固，并修复了兜底色在极端情况下导致渐变失效的问题
- **桑基图新增连线可见性保底**：桑基的流量连线是通过渐变着色的，一旦渐变失效，连线会整体不渲染而凭空消失；现在即使渐变替换未完全生效，也会强制为连线指定明确的主题色，确保连线始终可见
- **修复看板图暗色主题下卡片文字不可读**：看板图普通卡片的底色是渲染器硬编码的近似白色，且卡片文字会跟随主题文字色（暗色主题下为浅色），导致暗色主题下白底白字完全看不清。现在强制卡片使用主题卡片底色、文字使用对应的对比色，各主题下均可读（列头此前一直正常，不受影响）
- **浮动章节高亮仅部分主题为品牌色（BUG-075）**：指示线 / 辉光 / 文字统一改为主题品牌色；并修正 `--alpha-toc-*` 系数变量仅定义在 `html:not([data-theme])` 防御块、导致激活主题下 `rgba(var(--brand-primary-rgb), var(--alpha-toc-text-active))` 整体静默失效、回退继承白的二次根因
- **固定徽章随目录滚动消失（BUG-076）**：图钉初版误放进可滚动列表容器，目录翻页即随内容滚走；改为挂在相对面板的浮层，始终留在视野内
- **思维导图配色回归 token 契约 + 弱化文字对比度收口（BUG-077）**：思维导图节点底原用「描边色」`--chart-stroke-*` 当大面积实底（霓虹赛博即纯 #00FFFF / #FF00FF / #FFFF00），高饱和主题下刺眼且文字看不清。修复回归 token 契约：节点底改 `--chart-fill-*`、文字改同索引 `--chart-text-on-fill-*`（生成器按「每底色绑定最优墨色」配对并保 ≥4.5:1），根节点归入 center 槽，连线仍用 `--chart-stroke-*` 保留主题个性；停用空转的逐节点深度混色。同时 `text-muted`（最弱化文字）纳入生成器 ≥4.5:1 自动调校，13 套主题的 2.93–4.15 全部收口至 4.52+。另修复根因：改动渲染产出未 bump 缓存版本键，旧产物被持续复用（前三轮修复"无变化"的真因）。**默认分色方式改为按层级**（原按分支）：思维导图节点现在同层级同色、层级间色相递进（主流思维导图读法），「品牌分支」档保留按分支分色作为可选；两档共用同一套 token 色板，仅映射依据不同。晨光/夜灯另定制**品牌色 + 状态色**层级色板（root/L2=品牌橙，L3/L4/L5/L6=状态色，色相暖→冷递进），替换原先无识别度的低彩度填充带；两套按各自画布明暗分化——**亮画布的晨光取状态色 `-fill` 亮版配黑字，暗画布的夜灯取深版配白字**，不再「除 root 外背景全同、只换文字色」；底色由生成器按对比度自动调校（色相不变、明度让位），个别槽位如 `#2E8A5F` 被推向 `#359065` 后过线；文字色由生成器按底色自动配对（root/L2 黑字、深层白字），并新增 mindmap 色板对比度门禁。修复主题无法覆盖 core mindmap 默认映射的两个叠加问题：core 与主题的选择器特异性相同而 core 后导入（改用 `:where([data-theme])` 把 core 默认映射特异性降为 0），以及 core 注释里的 `*/` 提前闭合导致 `--mermaid-mindmap-branch-0` 声明被解析器吞掉；同时把 mindmap 节点底/文字 token 纳入渲染缓存签名

### 优化

- **Mermaid 图表引擎升级至 12.2.0**：图表引擎由 11.16.1 升级至 12.2.0（ZenUML 插件同步至 1.0.1），获得思维导图尺寸与居中修复、泳道图 id 作用域化、序列图解析修复、错误信息可读性等改进；已钉选 dagre 布局与 classic 外观以保持既有渲染观感。**注意：新引擎要求 Safari 17.4+——macOS 12 Monterey（2021 年）及更新系统的图表渲染正常；macOS 11 Big Sur（2020 年）及更早系统上将无法渲染图表**（Windows / Linux 不受影响）
- **超大文档打开更快**：大文档的目录提取不再对全文做重复扫描——目录改由分块解析器单源产出，与渲染、跳转共用同一份数据，打开时少一轮全文遍历
- **多开文档内存占用更稳**：阅读区按需常驻——仅活动、固定与最近使用的 3 个标签页保持渲染，其余卸载、切回时自动恢复滚动位置
- **文件树默认折叠**：打开工作区仅展开根层，子目录按需展开，超大工作区不再一次性渲染全部节点
- **代码字体统一为系统等宽栈**：代码块字体由「JetBrains Mono（多数系统未安装、实际回退）」改为集中定义的系统等宽字体变量，跨平台一致、零打包增重；已安装 JetBrains Mono 的用户仍可在字体设置中主动选用
- **阅读选项主题区整理**：移除「内置 / 暗色」明暗分组（所有主题均为内置），默认品牌色双主题（晨光 / 夜灯，原亮色 / 暗色）置顶；主题名按「具象意象唤起色彩情绪」命名逻辑改名
- **初始窗口尺寸调大**：由 1200×800 调至 1480×920，最小尺寸同步由 800×600 抬至 900×640
- **标题栏拖拽放行中键**：标题栏拖拽现同时响应中键（走 Tauri 原生 `startDragging`，跨屏 DPI 正确），贴合部分用户的拖窗习惯
- **导出统一为 DOM 复制单管线（DEC-039）**：删除 `generateExportHtml.ts` 二次渲染管线，HTML / 章节 / PDF 导出全部派生自同一份阅读视图产物，PDF 与屏幕上所见一致；补全打印分页规则，图表、表格行与公式不再页内断裂

### 安全

- **关闭未使用的资源协议**：本地图片自 base64 内联方案落地后，asset 协议 scope 已无任何使用方却仍对全部路径开放；现关闭以收缩攻击面

### 移除

- 移除从未被读写的 workspaces 数据表

## [0.4.4] - 2026-09-10

### 新增

- **应用内自动更新**：接入 Tauri 官方 updater——收到更新提示后可直接在应用内下载（带进度条）并静默安装重启，无需再跳转浏览器下载安装包手动重装；更新清单经 GitHub / Gitee 双源分发（静态镜像，不受 API 限流影响），国内用户走 Gitee 通路；所有更新包均经 minisign 签名验证

### 修复

- **GitHub 更新源规避匿名 API 限流**：本机装有 GitHub CLI（gh）并登录时，更新检查自动复用其登录凭证（认证额度 5000/h 且独立于匿名共享出口 IP 的 60/h 额度）；未安装 gh 时静默回退匿名请求

## [0.4.3] - 2026-09-10

### 新增

- **更新卡片**：收到更新提示时可直接查看新版本的变更摘要（按「安全/新增/修复」分类展示条目、发布日期），支持立即下载（平台安装包直链）、查看完整日志与「跳过此版本」（该版本不再提醒）；关于页手动检查更新后卡片自动展开

### 安全

- **修复 Markdown 渲染 XSS 攻击链**：文档中的原始 HTML 现在经过 sanitize 白名单消毒（保留维基链接、callout、任务列表、行内样式等正常功能所需属性）；Mermaid / PlantUML / SVG 预览的渲染结果统一过 DOMPurify；Mermaid `securityLevel` 从 `loose` 收紧为 `strict`；生产环境 CSP 移除 `unsafe-eval`
- **修复导出 HTML / PDF 中的 XSS 载体**：导出管线中原始 HTML 块此前不经消毒直接输出，恶意文档导出的 HTML/PDF 文件在浏览器打开即可执行脚本；现导出路径与阅读路径使用同等消毒策略，行内 img/a 放行时仅重建安全属性（alt/src/href）
- **webview 文件写入增加类型白名单**：`write_file` / `write_binary_file` 仅允许写入文档与图片类型（md / html / svg / docx / pdf / 图片等），`export_pdf` 校验 `.pdf` 后缀，防止被入侵的渲染进程覆写系统可执行文件
- **收窄插件权限面**：移除前端从未使用的 fs 插件（npm 包、Rust 注册与 9 项 `fs:*` capabilities 一并清理）
- **依赖安全更新**：vitest 升级至 3.2.7（修复 Vitest UI 任意文件读取漏洞）、mermaid 升级至 11.16.1（修复 5 项渲染相关安全漏洞）、sharp 0.35，以及 h2 / quick-xml 等 Rust 传递依赖修复

### 修复

- **修复更新检测双源皆败导致永远提示「已是最新版」**：① Gitee 源此前请求了不存在的 `/releases/latest` 端点（恒 404，0.4.1 曾记录修复但实际未落地），改用列表接口按创建时间倒序取第一条；② 双源均不可达（GitHub 匿名 API 限速 / Gitee 仓库无 release / 网络不可达）时如实返回错误，关于页手动检查会提示「检查更新失败」而非谎报最新版，自动检查保持静默不打扰
- **工作区包含符号链接循环或超深目录时不再崩溃**：文件树扫描增加 32 层深度限制与路径去重，命中时该分支按空目录返回而非栈溢出
- **打开字体设置时界面不再卡顿**：系统字体枚举移入后台线程执行
- **包含超大远程图片的文档不再可能耗尽内存**：远程图片加载增加 20MB 大小上限（响应头预检 + 实际字节数兜底）

### 移除

- 清理约 870 行无引用的死代码（含 4 个未接线的 Obsidian 组件）与 40 条无引用的界面文案（中英同步），减小安装包体积

## [0.4.2] - 2026-07-23

### 修复

- **titleBar.pin 显示标签名**：`titleBar` 对象缺失 `pin` / `unpin` i18n key，`t()` 回退返回 key 字面量导致 tooltip 显示 `titleBar.pin`。补齐 `zh-CN.json` / `en-US.json` 的 `pin` / `unpin` 字段；`TitleBar.tsx` 根据 `isPinned` 状态动态切换 i18n key。同步修复 `EasterEgg.tsx` 中 `about.easterEggClose` key 缺失问题
- **导出 HTML 文件名硬编码为 "export"**：`export.ts` 的 `exportHtml` 使用硬编码 defaultPath。改为从 `useFileStore` 读取 `currentFilePath` 提取文件名作为默认保存名
- **内容块编辑窗口未锁定视口**：`QuickEdit.tsx` 监听了 scroll 事件导致编辑窗口跟随目标元素滚动。移除 scroll 监听，仅在 mount + resize 时计算位置；目标元素脱离 DOM 时跳过更新保持当前位置
- **导出 HTML 时 Mermaid 图表 6.1-6.12 未渲染**：虚拟滚动 + 懒加载导致视口外的 Mermaid block 未触发 `IntersectionObserver`，导出时 DOM 中只有占位符。`export.ts` 新增 `renderUnrenderedMermaidBlocks`，在生成 HTML 前遍历 `.mermaid-block[data-raw]` 调用 `renderMermaidForExport` 补救渲染
- **Admonition 提示框 emoji 图标丢失**：`obsidian.css` 的 `.obsidian-callout-icon` 样式不足且部分 Unicode 映射错误。调整 `display: inline-flex` 布局，新增 `::before` 伪元素规则，修正 `clipboard-list` / `flame` / `list` 等图标的 Unicode 码位
- **安装版右键打开 MD 文件只弹窗口不加载文档**：(1) 引入 `tauri-plugin-single-instance` 处理热启动场景——已运行实例收到新进程的 argv 转发，emit `file-opened` 事件给前端；(2) 冷启动场景 `setup` 中通过 `std::env::args_os()` 提取文件路径存入 `AppState.pending_file`，前端 mount 后调用 `get_pending_file` 命令主动拉取；(3) 移除冷启动 `emit`（webview 未就绪必然丢失）
- **Vite dev server 端口 1420 被 Hyper-V 保留**：Windows 上 Hyper-V 动态保留端口范围包含 1420，导致 `EACCES` 启动失败。`vite.config.ts` 与 `tauri.conf.json` 的 dev 端口从 1420 改为 5173

## [0.4.1] - 2026-06-12

### 修复

- **QuickEdit 保存失败"未找到匹配文本"**：ZenUML / Mermaid / PlantUML / Callout 等块级元素双击编辑后保存时，行尾 CRLF/LF 混用或空白规范化导致字符串 `replace` 找不到原文。新增 `quickEditLines.ts` 工具函数实现按行号精确定位替换；`LazyMermaidBlock`、`LazyPlantUMLBlock`、`ObsidianCallout` 均已集成；`useQuickEdit` 在行号可用时优先走行号定位，否则降级到字符串替换
- **更新检查在网络受限环境下报错"检查更新失败"**：GitHub + Gitee 双 API 同时不可达时不再向上抛出异常，而是静默返回"已是最新版"；同时新增 `release_url` 字段，点击版本徽章跳转到 Release 页面而非直接下载安装包
- **lint 错误**：`generateExportHtml.ts` 正则 `[^\^]` 非法转义；`useKeyboardShortcuts.ts` 空 catch 块
- **macOS 通用 dmg / app.tar.gz 404（2026-06-14 修订）**：`rename-bundle.js` 新增 (1) 把 `.app` 目录打包为 `ErgeMD-v{ver}-macos.app.tar.gz`（命令行解压安装）；(2) 把 `macos-arm64.dmg` 复制为 `macos.dmg` 兜底，让 README 中"通用安装包"链接不再 404（实际仍为 arm64 专用，Intel Mac 暂未提供原生包）。README 中文/英文版同步加注"macOS CI 仅编译 Apple Silicon"

## [0.4.0] - 2026-06-10

### 新增

- **macOS 支持**：ErgeMD 现可在 macOS 11+ 上运行，提供 Apple Silicon 与 Intel 通用 .dmg
- **Linux 支持**：ErgeMD 现可在 Ubuntu 22.04+ / Debian 12+ 上运行，提供 .AppImage 与 .deb
- **平台检测工具**：`src/utils/platform.ts` 提供统一平台判断；`detectPlatform()` 与 `getPlatformLabel()`
- **更新检查跨平台化**：`update.rs` 按 `target_os` 关键字匹配对应平台资产（Windows NSIS、macOS DMG、Linux AppImage）
- **reveal_in_explorer 跨平台化**：macOS 走 `open -R`，Linux 走 `xdg-open`，Windows 保持 `explorer /select,`
- **单元测试基础设施**：Vitest（前端） + cargo test（Rust）双层测试套件，CI 强制跑测试

### 变更

- **PDF 导出**：macOS / Linux 走系统打印对话框（用户需手动选择「存储为 PDF」）；Windows 仍走 WebView2 PrintToPdf
- **TitleBar**：macOS 上隐藏自绘最小化 / 最大化 / 关闭按钮，避免与系统红绿灯冲突
- **tauri.conf.json**：`bundle.targets` 扩展为 `["nsis", "app", "dmg", "appimage", "deb"]`，启用三大平台打包
- **release.yml**：从单平台 Windows 扩展为 4 平台矩阵（Windows x64 / macOS arm64 / macOS x64 / Linux x64）
- **rename-bundle.js**：按 `process.platform` / `BUILD_PLATFORM` 环境变量分流，支持 .app / .dmg / .AppImage / .deb

### 备注

- 跨平台首版 **不启用** macOS 代码签名（免费软件策略），用户需右键 → 打开绕过 Gatekeeper

### 修复

- 浮动目录在 ZenUML 章节下错位：@mermaid-js/mermaid-zenuml 插件通过 `vite-plugin-css-injected-by-js` 注入的 @zenuml/core 内部 CSS 含一条未分层的 `*, ::before, ::after { --tw-translate-y: 0; }` 通用选择器，优先级高于主机 Tailwind v4 的 `@layer utilities` 工具类，会把 `--tw-translate-y` 重置为 0，导致 `.-translate-y-1/2` 失效，nav 从 50% 顶部开始渲染后延伸到右下角。FloatingTOC 的 `-translate-y-1/2` 改用内联 `transform: translateY(-50%)` 解决；同类隐患的 `SearchBar` / `UpdateChecker` 的 `-translate-x-1/2` 一并替换为内联 `transform: translateX(-50%)`
- 关于页「检查更新失败，请检查网络后重试」误报：定位到三层叠加的 bug——(1) Gitee Open API 没有 `/releases/latest` 子路径（GitHub 才有），端点 404；(2) 仓库仅有 tag 无 release，`/releases` 列表为空时旧代码按对象解析返回空字段；(3) GitHub 匿名 API 60/h 限速在 dev 反复触发下耗尽，统一返 403。三处分别修复：Gitee 改用 `/releases?per_page=1&page=1&direction=desc` 列表接口取第一条，空数组视为"无 release"返 Err 让 `pick_latest` 降级；GitHub 403 解析 `x-ratelimit-remaining` / `x-ratelimit-reset` 头，限速时（remaining=0）返"约 X 分钟后重置"的明确提示，区分于其他 403；同步修复 `pick_latest` (Ok, Ok) 分支用 `is_newer_version(gh, gi)` 选较小版本号的语义误用，调换参数为 `is_newer_version(gi, gh)` 改为选 max

## [0.3.7] - 2026-06-10

### 变更

- Windows 安装包构建移除 MSI 产物：`tauri.conf.json` 的 `bundle.targets` 由 `["nsis", "msi"]` 改为 `["nsis"]`，CI 仅产出 NSIS 安装包与便携 zip；降低构建时间与发布体积（MSI 用户群体极少，且企业批量部署场景未启用）
- 更新检查默认下载链接改为 NSIS 安装包：Rust 端 `pick_msi_download_url` 重命名为 `pick_nsis_download_url`，优先匹配 `*setup.exe` 资产（NSIS 安装包），其次回退到 `*-portable.zip`（便携版），最后回退到 release html_url；不再解析 `.msi` 资产

## [0.3.6] - 2026-06-10

### 新增

- Mermaid 集成 ZenUML 外部插件：新增 `@mermaid-js/mermaid-zenuml@0.2.3` 依赖，实现 6.15 节 ZenUML 序列图的原生渲染；`MermaidDiagram` 通过 `ensureZenumlRegistered()` 在 `mermaid.initialize()` 之前幂等注册插件，仅检测到 `zenuml` 关键字时按需懒加载 `@zenuml/core`
- Mermaid 升级至 11.15.0：内置 Event Modeling 事件建模图支持，6.23 节 `eventmodeling` 关键字可直接渲染（无需外部插件）
- MermaidDiagram 主题类型扩展：补全 `ChartColors.zenuml`（text / border / bg）与 `getMermaidColors()` 的 CSS 变量透传；同步透传基础 fontColor / fontFamily，确保 ZenUML 与全局主题风格一致
- MermaidDiagram 主题适配：新增 ZenUML 与 Event Modeling 主题变量映射（`mermaid-zenuml.css` / `mermaid-eventmodeling.css`），通过 SVG 后处理注入 `!important` 规则覆盖 ZenUML 插件硬编码的内联颜色
- 主题 CSS 变量补全：为 ZenUML 新增 `--mermaid-zenuml-lifeline` / `--mermaid-zenuml-message` 变量，为 Event Modeling 新增 15 个 `em*` 系列变量（ui / processor / readmodel / command / event 五类 box、关系线、泳道、箭头）

### 变更

- `vite.config.ts` 的 `chunkSizeWarningLimit` 由 600 提升至 6500：ZenUML 外部插件引入的 `@zenuml/core@^3.47.0` 依赖较大，mermaid chunk 从 ~1MB 膨胀至 ~6MB；仅消除构建警告，产物体积实际未变
- `UNSUPPORTED_DIAGRAM_TYPES` 清空：移除 `zenuml` 与 `eventmodeling` 标记，对应图表均已支持
- `MarkdownSyntaxExample.md`：6.15 节 ZenUML 与 6.23 节事件建模图说明由「暂不支持」更新为「支持说明」

### 修复

- 主题适配后 ZenUML 消息线不可见：`.fragment-border` 原始 CSS 为 `fill: none`（透明），主题适配误将其 `fill` 改为不透明背景色导致遮挡消息线；恢复 `fill: none` 并保留 `stroke` 主题适配

## [0.3.5] - 2026-06-06

### 新增

- 关于页版本号右侧新增最新版本徽章：AboutPage 打开时自动调用 `forceCheckUpdate` 检测，发现新版本时在「↻」右侧显示绿色 `↑ v{latestVersion}` 徽章，点击直接打开最新版的 MSI 安装包下载链接
- ToastMessage 新增 `action` 字段：Toast 可携带可点击的按钮（如「下载」），点击调用 `openUrl` 打开外部链接
- 更新检查结果增加 `download_url` 字段：Rust 端 `fetch_github_latest` / `fetch_gitee_latest` 从 release 的 `assets` 中优先匹配 `.msi` 文件的 `browser_download_url`，未命中时 fallback 到 release 页面 `html_url`

### 修复

- 关于页点击「↻」后无可见反馈：检测到新版本时显式设置 `latestAvailable` state，让右侧徽章立即出现；同时 Toast 提示文本可携带「下载」action 按钮

## [0.3.4] - 2026-06-06

### 修复

- 远程图片无法渲染：新增 `fetch_remote_image_as_data_url` 后端命令，通过 Rust reqwest 客户端代理下载远程图片并转为 base64 data URL，绕过 Tauri WebView 的 CORS、防盗链和网络限制；前端 `ContextMenuImage` 组件对 `http` 开头的图片 src 改走后端代理，后端失败时 fallback 为 WebView 直接加载

## [0.3.3] - 2026-06-04

### 新增

- 关于页版本号旁新增「↻」手动检查更新按钮：点击立即触发 `check_update` 后端命令，绕过 24h 缓存限制，解决客户端因缓存窗口内不重新检查而错过新版本提示的问题
- 新增 `forceCheckUpdate` 工具函数：从 `UpdateChecker` 模块导出，可被任意组件复用触发一次强制更新检查

### 修复

- Toast 通知不可见：移除 `ToastItem` 内联样式中覆盖动画终态的 `opacity: 0` / `transform: translateX(20px)`，让 `toast-enter` 关键帧的 `forwards` 模式正常生效
- Toast 被关于页遮罩遮挡：Toast 容器 z-index 由 `z-50` 提升到 `z-[400]`，确保能盖过 `AboutPage` 的背景遮罩（z-100）和二维码弹窗（z-300）

## [0.3.2] - 2026-06-04

### 修复

- 欢迎页最近打开单条关闭失效：新增 `delete_recent_file` 后端命令，关闭单条记录时同步删除数据库记录，刷新后不再恢复

## [0.3.1] - 2026-06-01

### 新增

- PDF 导出独立管线：从复用阅读组件改为从 Markdown 原文直接生成完整 HTML，不再依赖虚拟滚动/IntersectionObserver/懒加载等阅读场景逻辑
- PlantUML 导出渲染：新增 `renderPlantUmlForExport` 函数，复用组件内串行队列渲染 SVG
- F12 彩蛋恢复：恢复按 F12 打开彩蛋页面的快捷键功能

### 修复

- PDF 导出图表不渲染：彻底解决 Mermaid 和 PlantUML 图表在 PDF 导出中不显示的问题（包括序列图、类图、活动图、状态图、用例图等全部 16+ 类型）
- PDF 多文档导出错误：从 `useFileStore.getState().currentContent` 获取当前文档内容，而非 `document.querySelector`（之前永远选到第一个 Tab 的内容）
- PDF 导出性能优化：渲染 HTML 与弹出保存位置对话框并行进行（`Promise.all`），用户选位置的时间"隐藏"在渲染时间中
- 内联 Markdown 解析：图片正则先于链接正则执行，解决带链接的图片语法 `[![alt](src)](url)` 被错误解析为纯链接的问题
- 内联 Markdown 转义：`renderInlineMarkdown` 先匹配正则再 HTML 转义，解决 `\[!NOTE]` 等转义语法被误解析为链接的问题
- Obsidian Callout 图标不显示：修复示例文档中 Admonition 提示框因转义语法 `\[!NOTE]` 导致 callout 检测失败、图标无法渲染的问题
- Obsidian Callout 转义兼容：检测正则增加对 `\[!TYPE]` 转义写法的兼容支持
- 阅读器代码块字体不跟随缩放：移除 `<pre>` 元素的 `text-[13px]` 硬编码，改为 `0.9em` 相对单位使代码块字号跟随阅读设置缩放

### 变更

- PDF 导出重构：`exportPdf.ts` 重写，调用 `generateExportHtml` 从 Markdown 原文生成完整静态 HTML（含所有 Mermaid/PlantUML SVG、KaTeX 公式），通过 WebView2 PrintToPdf 生成 PDF
- 导出模块清理：删除 `exportMode.ts`，移除 `setExportMode`、`forceNonVirtual`、`export-mode-change` 等脏补丁，`ReadingArea.tsx` 恢复干净的虚拟滚动逻辑
- `generateExportHtml.ts` 重构：删除无用的 `escapeInlineMarkdown` 函数，`escapeHtml` 更名为 `escapeForHtml`，内联 Markdown 解析顺序调整为图片 → 链接 → 粗体/斜体/删除线/代码 → 最终转义
- PDF 导出菜单优化：黑白模式标记为"推荐"并放在带样式模式之后

### 移除

- `exportMode.ts` 文件：导出不再依赖虚拟滚动控制

## [0.3.0] - 2026-05-31

### 新增

- PlantUML 图表支持：新增 `@plantuml/core` 渲染库，支持 16+ 图表类型（序列图、类图、活动图、组件图、状态图、对象图、用例图、部署图、时序图、网络图、ER 图、思维导图、WBS 工作分解结构、JSON/YAML 可视化）
- PlantUML 右键菜单：支持 SVG 预览、编辑图表功能
- PlantUML 串行渲染队列：解决 `@plantuml/core` 全局变量导致的并发冲突
- Word 导出功能：支持将 Markdown 文档导出为 `.docx` 格式
- PDF 导出优化：重构导出逻辑，使用 HTML 中转 + WebView2 PrintToPdf API 替代 `window.print()`，支持带样式/黑白双模式，支持分页和颜色保护
- 自动更新检查器：新增 `UpdateChecker` 组件，支持检查应用更新
  - 双平台检测：同时查询 GitHub 和 Gitee 最新 Release，取版本号更高者
  - 每天一次：启动时检查距上次检测是否超过 24 小时
  - 一键下载：点击「下载」按钮直接打开 Release 页面

### 修复

- PlantUML 暗黑主题适配：通过 `injectThemeStyles()` 函数向 SVG 内部注入主题样式，解决外部 CSS 无法覆盖内联样式的问题
- PlantUML 时序图/网络图/甘特图/Wireframe 渲染失败：确认 `@plantuml/core` 支持的图表类型，替换不支持的图表为替代方案（WBS 图、用例图）
- PlantUML 并发渲染问题：实现串行渲染队列，确保同一时间只处理一个渲染任务
- PlantUML `viz-global.js` 加载失败：通过动态创建 `<script>` 标签加载 UMD 模块
- Word 导出失败：修复 `exportDocx.ts` 中的兼容性问题
- i18n 翻译 key 缺失：补充 `common.preview`、`common.edit`、`common.cancel`、`common.save`、`quickEdit.unsavedWarning`、`quickEdit.unsaved`、`quickEdit.synced`、`reader.preview` 等翻译

### 变更

- Markdown 解析逻辑：`parseMarkdownBlocks()` 新增 PlantUML 代码块识别（`plantuml`/`puml`）
- 导出模块重构：`export.ts` 重构导出逻辑，统一处理流程
- i18n 国际化：更新中英文语言文件

### 细节优化

- 状态栏优化：显示当前编辑状态
- 阅读体验优化：MarkdownBlockView 组件增强

## [0.2.2] - 2026-05-29

### 细节优化

## [0.2.1] - 2026-05-29

### 修复

- YAML Frontmatter 解析：移除对 `gray-matter` 库的依赖，该库在浏览器环境中不可用（依赖 Node.js Buffer），改用手动解析方案
- YAML Frontmatter 渲染：修复解析失败时显示原始内容的问题
- 目录生成：添加 frontmatter 区域跳过逻辑，防止 frontmatter 字段被错误识别为标题

## [0.2.0] - 2026-05-29

### 新增

- Obsidian Callout：支持 13 种内置类型（note/abstract/info/todo/tip/success/question/warning/failure/danger/bug/example/quote）及别名映射，支持自定义标题、可折叠（+/-）、嵌套渲染
- Obsidian Wikilink：支持 `[[note]]`、`[[note|text]]`、`[[note#heading]]`、`[[note#^blockId]]`、`[[#heading]]` 格式解析与渲染
- Obsidian Embed：支持 `![[file]]` 内嵌引用，按扩展名自动识别图片/PDF/音频/视频/笔记类型，图片加载失败时显示 fallback
- Obsidian 高亮语法：`==text==` 渲染为 `<mark>` 标签
- Obsidian 注释语法：`%%text%%` 渲染时自动隐藏
- Obsidian 块 ID：`^block-id` 渲染为不可见锚点
- Obsidian Frontmatter：YAML frontmatter（`---` 包裹）识别为独立 block 并格式化渲染
- Obsidian 按需加载：`useObsidianModule` hook 仅在检测到 Obsidian 语法时激活组件覆盖，普通 Markdown 文件零开销
- 代码块保护：预处理函数自动保护 fenced code 和 inline code 内容不被误替换
- 14 个主题适配：每个主题添加 13 个 `--obsidian-callout-*` CSS 变量，Callout 颜色跟随主题切换

### 变更

- 移除旧版 Admonition 系统（9 种类型、内联检测逻辑），由 Obsidian Callout 模块完全替代
- `MarkdownBlockType` 新增 `frontmatter` 类型
- `parseMarkdownBlocks()` 两套解析逻辑均支持 frontmatter block 识别

## [0.1.1] - 2026-05-22

### 修复

- 文件关联打开失败：Windows 冷启动时 `tauri://file-open` 事件不触发，添加命令行参数解析作为兜底
- 欢迎页最近文件不显示：`init_database` 与 `get_recent_files` 存在竞态条件，添加 `dbReady` 状态同步

### 变更

- README.md 新增"从源码构建"和"下载"章节，完善开源文档

## [0.1.0] - 2026-05-16

### 新增

- Markdown 渲染：GFM、数学公式（KaTeX）、代码高亮、Mermaid 图表、任务列表
- 阅读体验：虚拟滚动、进度追踪、14 种主题
- 工作区管理：多标签页、文件树
- 导出功能：HTML、DOCX、PDF
- 浮动目录（TOC）：自动生成章节导航
- 专注模式：沉浸式阅读
- 右键菜单：复制、编辑、导出、图片/链接/代码块专属操作
- 快速编辑：双击段落编辑
- 文件关联：支持 `.md` 和 `.markdown` 文件
- 全局快捷键：窗口管理、标签导航、阅读控制
