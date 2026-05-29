export interface SyntaxDetector {
  name: string;
  test: (content: string) => boolean;
}

const calloutDetector: SyntaxDetector = {
  name: "callout",
  test: (content) => /^>\s*\[!\w+\]/m.test(content),
};

const wikilinkDetector: SyntaxDetector = {
  name: "wikilink",
  test: (content) => /\[\[[^\]]+\]\]/.test(content),
};

const embedDetector: SyntaxDetector = {
  name: "embed",
  test: (content) => /!\[\[[^\]]+\]\]/.test(content),
};

const highlightDetector: SyntaxDetector = {
  name: "highlight",
  test: (content) => /==[^=\n]+==/.test(content),
};

const commentDetector: SyntaxDetector = {
  name: "comment",
  test: (content) => /%%/.test(content),
};

const blockIdDetector: SyntaxDetector = {
  name: "blockid",
  test: (content) => /\s\^[\w-]+\s*$/m.test(content),
};

const frontmatterDetector: SyntaxDetector = {
  name: "frontmatter",
  test: (content) => /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content),
};

export const OBSIDIAN_DETECTORS: SyntaxDetector[] = [
  calloutDetector,
  wikilinkDetector,
  embedDetector,
  highlightDetector,
  commentDetector,
  blockIdDetector,
  frontmatterDetector,
];

export function detectObsidianSyntax(content: string): Set<string> {
  const found = new Set<string>();
  for (const detector of OBSIDIAN_DETECTORS) {
    if (detector.test(content)) {
      found.add(detector.name);
    }
  }
  return found;
}

export function hasObsidianSyntax(content: string): boolean {
  return OBSIDIAN_DETECTORS.some((d) => d.test(content));
}
