# ErgeMD 桌面 dev 启动器（Windows 版，行为与 scripts/dev.sh 一致）。
#
# 为什么要有这个脚本：
#   1. target 目录放在仓库之外、按项目命名（默认 <仓库父目录>\targets\<项目名小写>），
#      不跨项目共享、产物不在树内 —— 本机 EDR 会拦「仓库树内路径 + 桌面应用二进制」，
#      窗口创建时 panic，WebView2 报 HRESULT(0x800700AA)（AIVault BUG-099 系列实测，
#      同一份二进制树内必败、树外正常）。
#   2. 各项目独立 target，共用同一 target 会增量缓存互相污染，表现为链接错误
#      LNK2019 / LNK1120（AIVault BUG-065/084/090/112）。
#   3. CARGO_TARGET_DIR 只在本进程内设置，不写用户级 / 机器级环境变量。
#   4. 端口固定（取自 vite.config.ts 的 server.port，本仓已设 strictPort），被占用
#      直接报错退出，绝不静默漂移（漂移后 tauri devUrl 仍指旧端口，窗口白屏或加载
#      到别的项目页面）。
#
# 用法：pwsh -File scripts\dev.ps1 [-PreviewUpdate]
#   -PreviewUpdate 注入一条假的「新版本」提示，用于打磨更新卡片（仅 dev 生效）
# 覆盖 target：$env:ERGEMD_TARGET_DIR='D:\somewhere'; pwsh -File scripts\dev.ps1

param([switch]$PreviewUpdate)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$ProjectName = (Split-Path -Leaf $RepoRoot).ToLowerInvariant()

# target 推导：仓库父目录 + targets\<项目名>；不写死盘符或绝对路径。
$BaseDir = Split-Path -Parent $RepoRoot
$DefaultTargetDir = Join-Path $BaseDir (Join-Path 'targets' $ProjectName)
$TargetDir = if ($env:ERGEMD_TARGET_DIR) { $env:ERGEMD_TARGET_DIR } else { $DefaultTargetDir }

$ViteConfig = Join-Path $RepoRoot 'vite.config.ts'
if (-not (Test-Path $ViteConfig)) {
    Write-Host "错误：找不到 $ViteConfig" -ForegroundColor Red
    exit 1
}

# 端口：取 server 块里的 port（本仓库只有一个 server 块）。
$match = [regex]::Match((Get-Content $ViteConfig -Raw), 'server\s*:\s*\{[\s\S]*?port\s*:\s*(\d+)')
if (-not $match.Success) {
    Write-Host '错误：无法从 vite.config.ts 解析 server.port' -ForegroundColor Red
    exit 1
}
$Port = [int]$match.Groups[1].Value

# 端口占用检测：被占直接失败，不换端口。
$listener = $null
if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
} else {
    # 兜底：老版本 PowerShell 用 netstat 解析（本地地址列以 :<port> 结尾的行）。
    $line = netstat -ano | Select-String -Pattern "[:.]$Port\s" | Where-Object { $_ -match 'LISTEN' } |
        Select-Object -First 1
    if ($line) { $listener = @{ OwningProcess = [int](($line -split '\s+')[-1]) } }
}

if ($listener) {
    $pid_ = $listener.OwningProcess
    $proc = Get-Process -Id $pid_ -ErrorAction SilentlyContinue
    $who = if ($proc) { "$($proc.ProcessName) $($proc.Path)" } else { '未知进程' }
    Write-Host "错误：端口 $Port 已被占用（PID=$pid_ $who），不自动换端口。" -ForegroundColor Red
    Write-Host '请先结束该进程后重试（脚本不会漂移到其它端口，避免 devUrl 失配）。' -ForegroundColor Red
    exit 1
}

# rustup 的 shim（%USERPROFILE%\.cargo\bin\cargo.exe）若被安全软件改成坏的符号链接，
# cargo 根本无法启动，tauri 会报「无法遍历该路径 / os error 448」或「没有应用程序与此
# 操作的指定文件有关联」——那两个错误都是 shim 启动失败，不是仓库路径的问题。
# 这里检测一次，必要时把 toolchain 的真实 bin 前置到 PATH：只影响本进程与子进程，
# 不改用户环境。治本仍需重建 shim（见下方提示）。
$cargoUsable = $false
$savedEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    $null = & cargo --version 2>&1
    $cargoUsable = ($LASTEXITCODE -eq 0)
} catch {
    $cargoUsable = $false
} finally {
    $ErrorActionPreference = $savedEap
}

if (-not $cargoUsable) {
    $toolchainRoot = Join-Path $env:USERPROFILE '.rustup\toolchains'
    $realBin = Get-ChildItem $toolchainRoot -Directory -ErrorAction SilentlyContinue |
        ForEach-Object { Join-Path $_.FullName 'bin' } |
        Where-Object { Test-Path (Join-Path $_ 'cargo.exe') } |
        Select-Object -First 1
    if ($realBin) {
        $env:PATH = $realBin + ';' + $env:PATH
        Write-Host "注意：rustup shim 不可用，已临时回退到 $realBin" -ForegroundColor Yellow
        Write-Host '  治本：用 .cargo\bin\rustup.exe 覆盖同名坏 shim（cargo.exe / rustc.exe 等），' -ForegroundColor Yellow
        Write-Host '  并把 .cargo 与 .rustup 加入安全软件白名单，否则重建后可能再次被破坏。' -ForegroundColor Yellow
    } else {
        Write-Host '错误：找不到可用的 cargo（shim 与 toolchain 都不可用），请重装 Rust。' -ForegroundColor Red
        exit 1
    }
}

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
Write-Host "本次产物目录：$TargetDir"

# CARGO_TARGET_DIR 只对本进程及其子进程生效，不写入用户级 / 机器级环境变量。
$env:CARGO_TARGET_DIR = $TargetDir
Write-Host "CARGO_TARGET_DIR（仅本进程）：$($env:CARGO_TARGET_DIR)"
Write-Host "访问地址：http://127.0.0.1:$Port"

# 启动前清增量编译缓存：共享 target 跨会话复用会污染（anon.*.llvm.* 符号错位 →
# LNK1120），见 AIVault BUG-065/084/090/112。清一次免得每次手动撞链接错误。用 cmd
# rmdir 绕过 PowerShell 的批量删除确认拦截。
$IncrementalDir = Join-Path $TargetDir 'debug\incremental'
if (Test-Path $IncrementalDir) {
    Write-Host '清理增量编译缓存（避免 LNK1120 符号污染）...'
    cmd /c "rmdir /s /q `"$IncrementalDir`"" 2>$null
}

Push-Location $RepoRoot
if ($PreviewUpdate) {
    $env:VITE_UPDATE_PREVIEW = '1'
    Write-Host '已开启更新卡片预览（假版本 9.9.9）' -ForegroundColor Yellow
}
try {
    pnpm tauri dev
    $exit = $LASTEXITCODE
} finally {
    Pop-Location
    Remove-Item Env:\CARGO_TARGET_DIR -ErrorAction SilentlyContinue
    Remove-Item Env:\VITE_UPDATE_PREVIEW -ErrorAction SilentlyContinue
}
exit $exit
