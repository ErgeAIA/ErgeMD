/**
 * 多 Tab 场景下获取当前可见（活动 Tab）的 .markdown-body 容器。
 *
 * 所有 Tab 的阅读区常驻 DOM（非活动 Tab 经 display:none 隐藏），
 * document.querySelector 按文档序取值，可能命中非活动 Tab，
 * 导致搜索 / 全选 / 导出作用于错误文档。改为遍历并取第一个可见实例。
 */
export function queryActiveMarkdownBody(): HTMLElement | null {
  const bodies = document.querySelectorAll<HTMLElement>(".markdown-body");
  for (const body of bodies) {
    if (body.offsetParent !== null) return body;
  }
  return bodies.length > 0 ? bodies[0] : null;
}
