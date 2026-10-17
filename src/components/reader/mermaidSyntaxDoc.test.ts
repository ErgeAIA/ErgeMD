// @vitest-environment jsdom
/**
 * 测试文档图表语法回归测试
 *
 * 用途：docs/TestCase/MarkdownSyntaxExample.md 中的每个 mermaid 代码块都必须
 * 能通过项目锁定的 mermaid 版本解析，防止升级 mermaid 后示例语法静默失效
 * （解析失败在阅读器中表现为图表渲染错误占位）。
 *
 * 维护方式：在测试文档新增图表示例后无需改动本测试，自动覆盖；
 * 升级 mermaid 大版本后应优先跑本测试确认示例语法仍然有效。
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import mermaid from 'mermaid';

const currentDir = dirname(fileURLToPath(import.meta.url));
const docPath = resolve(currentDir, '../../../docs/TestCase/MarkdownSyntaxExample.md');
const doc = readFileSync(docPath, 'utf8');

interface MermaidBlock {
  /** 所在章节标题，用于失败时定位 */
  heading: string;
  code: string;
}

/** 从文档提取全部 ```mermaid 代码块（含所属章节标题） */
function extractMermaidBlocks(markdown: string): MermaidBlock[] {
  const blocks: MermaidBlock[] = [];
  let heading = '';
  let inBlock = false;
  let buffer: string[] = [];

  for (const line of markdown.split(/\r?\n/)) {
    if (/^#{1,6}\s/.test(line)) {
      heading = line.trim();
    }
    if (!inBlock && /^```mermaid\s*$/.test(line)) {
      inBlock = true;
      buffer = [];
      continue;
    }
    if (inBlock && /^```\s*$/.test(line)) {
      inBlock = false;
      blocks.push({ heading, code: buffer.join('\n') });
      continue;
    }
    if (inBlock) {
      buffer.push(line);
    }
  }
  return blocks;
}

const blocks = extractMermaidBlocks(doc);

beforeAll(async () => {
  // 与 MermaidDiagram.tsx 保持一致：ZenUML 为外部插件，需注册后才能解析
  const zenuml = (await import('@mermaid-js/mermaid-zenuml')).default;
  await mermaid.registerExternalDiagrams([zenuml]);
});

describe('MarkdownSyntaxExample 文档完整性', () => {
  it('应提取到 mermaid 图表块（第六章）', () => {
    expect(blocks.length).toBeGreaterThanOrEqual(31);
  });

  it('Mermaid 链接应全部指向官方文档站', () => {
    expect(doc).not.toMatch(/https:\/\/mermaid\.nodejs\.cn\//);
  });
});

describe('MarkdownSyntaxExample mermaid 语法', () => {
  it.each(
    blocks.map((block, index) => ({ ...block, name: `#${index + 1} ${block.heading}` }))
  )('应可通过 mermaid.parse 解析: $name', async ({ code }) => {
    const result = await mermaid.parse(code);
    expect(result, `图表解析失败：${code.split('\n')[0]}`).toBeTruthy();
  }, 30_000);
});
