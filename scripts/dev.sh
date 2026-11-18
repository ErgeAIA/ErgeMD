#!/usr/bin/env bash
# ErgeMD 桌面 dev 启动器（Windows 请用行为一致的 scripts/dev.ps1）。
#
# 为什么要有这个脚本：
#   1. target 必须放在仓库之外、且每个项目独立（默认 <仓库父目录>/targets/<项目名小写>）。
#      本机 EDR 会拦「仓库树内路径 + 桌面应用二进制」：窗口创建时 panic，WebView2 报
#      HRESULT(0x800700AA)「请求的资源在使用中」（AIVault 实测同份二进制树内必败、
#      树外正常，故 target 不可进仓库树）。
#   2. 各项目独立 target，互不共享。共用同一 target 会增量缓存互相污染，
#      表现为链接错误 LNK2019 / LNK1120（AIVault 已踩过）。
#   3. CARGO_TARGET_DIR 只在本进程内导出，不写用户级 / 机器级环境变量。
#   4. 端口固定（取自 vite.config.ts 的 server.port，本仓已设 strictPort），被占用
#      直接报错退出，绝不静默漂移（漂移后 tauri devUrl 仍指旧端口，窗口白屏）。
#
# 用法：bash scripts/dev.sh [--preview-update]
#   --preview-update 注入一条假的「新版本」提示，用于打磨更新卡片（仅 dev 生效）
# 覆盖 target：ERGEMD_TARGET_DIR=/path/to/dir bash scripts/dev.sh

set -euo pipefail

PREVIEW_UPDATE=0
case "${1:-}" in
  --preview-update) PREVIEW_UPDATE=1 ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_NAME="$(basename "${REPO_ROOT}" | tr '[:upper:]' '[:lower:]')"

# target 推导：仓库父目录 + targets/<项目名>；不写死盘符或绝对路径。
DEFAULT_TARGET_DIR="$(dirname "${REPO_ROOT}")/targets/${PROJECT_NAME}"
TARGET_DIR="${ERGEMD_TARGET_DIR:-${DEFAULT_TARGET_DIR}}"

VITE_CONFIG="${REPO_ROOT}/vite.config.ts"
if [ ! -f "${VITE_CONFIG}" ]; then
  echo "错误：找不到 ${VITE_CONFIG}" >&2
  exit 1
fi

# 端口：取 server 块里的 port（本仓库只有一个 server 块）。
PORT="$(grep -oE 'port:[[:space:]]*[0-9]+' "${VITE_CONFIG}" | head -n1 | grep -oE '[0-9]+' || true)"
if [ -z "${PORT}" ]; then
  echo "错误：无法从 vite.config.ts 解析 server.port" >&2
  exit 1
fi

OS_NAME="$(uname -s 2>/dev/null || echo unknown)"

# 取监听该端口的进程 PID（lsof / netstat 兜底）。
port_listener_pid() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN -t 2>/dev/null | head -n1
  elif command -v netstat >/dev/null 2>&1; then
    netstat -ano 2>/dev/null | grep -E "[:.]${port}[[:space:]]" | grep -i 'LISTEN' | awk '{print $NF}' | head -n1
  fi
}

# 取进程名，便于用户定位占用者。
process_name_of() {
  local pid="$1"
  case "${OS_NAME}" in
    *MINGW*|*MSYS*|*CYGWIN*)
      tasklist //FI "PID eq ${pid}" //FO CSV //NH 2>/dev/null | head -n1 | cut -d'"' -f2
      ;;
    *)
      ps -p "${pid}" -o comm= 2>/dev/null
      ;;
  esac
}

LISTENER_PID="$(port_listener_pid "${PORT}" || true)"
if [ -n "${LISTENER_PID}" ]; then
  LISTENER_NAME="$(process_name_of "${LISTENER_PID}" || true)"
  echo "错误：端口 ${PORT} 已被占用（PID=${LISTENER_PID} ${LISTENER_NAME}），不自动换端口。" >&2
  echo "请先结束该进程后重试（脚本不会漂移到其它端口，避免 devUrl 失配）。" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"
echo "本次产物目录：${TARGET_DIR}"

# 启动前清增量编译缓存：共享 target 跨会话复用会污染（anon.*.llvm.* 符号错位 →
# LNK1120），见 AIVault BUG-065/084/090/112。
INCREMENTAL_DIR="${TARGET_DIR}/debug/incremental"
if [ -d "${INCREMENTAL_DIR}" ]; then
  echo "清理增量编译缓存（避免 LNK1120 符号污染）..."
  rm -rf "${INCREMENTAL_DIR}" || true
fi

# CARGO_TARGET_DIR 只对本进程及其子进程生效，不写入用户级 / 机器级环境变量。
# Git Bash 下的 POSIX 路径要转成 Windows 路径，否则 cargo.exe 不认。
case "${OS_NAME}" in
  *MINGW*|*MSYS*|*CYGWIN*)
    if command -v cygpath >/dev/null 2>&1; then
      export CARGO_TARGET_DIR="$(cygpath -w "${TARGET_DIR}")"
    else
      export CARGO_TARGET_DIR="${TARGET_DIR}"
    fi
    ;;
  *)
    export CARGO_TARGET_DIR="${TARGET_DIR}"
    ;;
esac
echo "CARGO_TARGET_DIR（仅本进程）：${CARGO_TARGET_DIR}"
echo "访问地址：http://127.0.0.1:${PORT}"

if [ "${PREVIEW_UPDATE}" = "1" ]; then
  export VITE_UPDATE_PREVIEW=1
  echo "已开启更新卡片预览（假版本 9.9.9）"
fi

cd "${REPO_ROOT}"
pnpm tauri dev
