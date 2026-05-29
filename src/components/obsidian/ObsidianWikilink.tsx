import React, { memo } from "react";

export function parseWikilink(raw: string): {
  target: string;
  display: string;
  heading: string | null;
  blockId: string | null;
} | null {
  const match = raw.match(/^\[\[([^\]]+)\]\]$/);
  if (!match) return null;

  let inner = match[1];
  let display = "";
  let heading: string | null = null;
  let blockId: string | null = null;

  const pipeIndex = inner.indexOf("|");
  if (pipeIndex !== -1) {
    display = inner.slice(pipeIndex + 1);
    inner = inner.slice(0, pipeIndex);
  }

  const blockIdIndex = inner.indexOf("#^");
  if (blockIdIndex !== -1) {
    blockId = inner.slice(blockIdIndex + 2);
    inner = inner.slice(0, blockIdIndex);
  } else {
    const headingIndex = inner.indexOf("#");
    if (headingIndex !== -1) {
      heading = inner.slice(headingIndex + 1);
      inner = inner.slice(0, headingIndex);
    }
  }

  if (!display) {
    display = heading || blockId || inner || "";
  }

  return { target: inner, display, heading, blockId };
}

interface WikilinkProps {
  raw: string;
}

const ObsidianWikilinkInner: React.FC<WikilinkProps> = ({ raw }) => {
  const parsed = parseWikilink(raw);

  if (!parsed) {
    return <span className="obsidian-wikilink obsidian-wikilink-invalid">{raw}</span>;
  }

  return (
    <span
      className="obsidian-wikilink"
      data-target={parsed.target}
      data-heading={parsed.heading ?? undefined}
      data-block-id={parsed.blockId ?? undefined}
      title={parsed.target ? `${parsed.target}${parsed.heading ? ` > ${parsed.heading}` : ""}` : (parsed.heading ?? undefined)}
    >
      {parsed.display}
    </span>
  );
};

export const ObsidianWikilink = memo(ObsidianWikilinkInner);
ObsidianWikilink.displayName = "ObsidianWikilink";
