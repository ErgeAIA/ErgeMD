import type { FileNode } from "../types";

const MD_EXTENSION = /\.(md|markdown|mdx)$/i;

export function isMarkdownFile(name: string): boolean {
  return MD_EXTENSION.test(name);
}

/** 从任意文件/目录路径取出父目录，保留原有分隔符风格。 */
export function parentDir(path: string): string {
  const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return idx > 0 ? path.slice(0, idx) : path;
}

function pathSeparator(path: string): string {
  return path.includes("\\") ? "\\" : "/";
}

function trimTrailingSep(path: string): string {
  return path.replace(/[\\/]+$/, "");
}

/**
 * 返回从工作区根到目标文件所在目录的目录链（含根，不含文件本身）。
 * 文件不在工作区内时返回空数组。
 */
export function ancestorDirs(filePath: string, workspacePath: string): string[] {
  const root = trimTrailingSep(workspacePath);
  const sep = pathSeparator(root);
  const rootCmp = root.toLowerCase();
  const fileCmp = filePath.toLowerCase();
  if (fileCmp !== rootCmp && !fileCmp.startsWith(rootCmp + sep)) {
    return [];
  }

  const rel = filePath.slice(root.length).replace(/^[\\/]+/, "");
  if (!rel) return [root];

  const parts = rel.split(/[\\/]/);
  parts.pop();
  const dirs: string[] = [root];
  let current = root;
  for (const part of parts) {
    current = `${current}${sep}${part}`;
    dirs.push(current);
  }
  return dirs;
}

/** 结果行的父目录短标签：相对工作区的目录路径。 */
export function relativeDirLabel(dir: string, workspacePath: string): string {
  const root = trimTrailingSep(workspacePath);
  if (!dir || dir.toLowerCase() === root.toLowerCase()) return ".";
  const rel = dir.slice(root.length).replace(/^[\\/]+/, "");
  return rel || ".";
}

export function buildRows(
  entries: FileNode[],
  parent: string | null,
  depth: number,
): Array<{ node: FileNode; depth: number; parentPath: string | null; setSize: number; posInSet: number }> {
  return entries.map((node, index) => ({
    node,
    depth,
    parentPath: parent,
    setSize: entries.length,
    posInSet: index + 1,
  }));
}