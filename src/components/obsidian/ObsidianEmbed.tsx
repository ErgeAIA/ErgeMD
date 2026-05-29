import React, { memo } from "react";

export function parseEmbed(raw: string): {
  target: string;
  type: "note" | "image" | "pdf" | "audio" | "video" | "unknown";
  heading: string | null;
  width: string | null;
  page?: number;
} | null {
  const match = raw.match(/^!\[\[([^\]]+)\]\]$/);
  if (!match) return null;

  let inner = match[1];
  let width: string | null = null;

  const pipeIndex = inner.lastIndexOf("|");
  if (pipeIndex !== -1) {
    const afterPipe = inner.slice(pipeIndex + 1).trim();
    if (/^\d+/.test(afterPipe)) {
      width = afterPipe;
      inner = inner.slice(0, pipeIndex);
    }
  }

  let page: number | undefined;
  const pdfPageMatch = inner.match(/#page=(\d+)$/);
  if (pdfPageMatch) {
    page = parseInt(pdfPageMatch[1], 10);
    inner = inner.slice(0, inner.length - pdfPageMatch[0].length);
  }

  let heading: string | null = null;
  const headingIndex = inner.indexOf("#");
  if (headingIndex !== -1) {
    heading = inner.slice(headingIndex + 1);
    inner = inner.slice(0, headingIndex);
  }

  const ext = inner.split(".").pop()?.toLowerCase() || "";
  let type: "note" | "image" | "pdf" | "audio" | "video" | "unknown" = "note";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"].includes(ext)) {
    type = "image";
  } else if (ext === "pdf") {
    type = "pdf";
  } else if (["mp3", "wav", "ogg", "m4a"].includes(ext)) {
    type = "audio";
  } else if (["mp4", "webm", "mov", "avi"].includes(ext)) {
    type = "video";
  }

  return { target: inner, type, heading, width, page };
}

interface EmbedProps {
  raw: string;
}

const ObsidianEmbedInner: React.FC<EmbedProps> = ({ raw }) => {
  const parsed = parseEmbed(raw);

  if (!parsed) {
    return <span className="obsidian-embed obsidian-embed-invalid">{raw}</span>;
  }

  if (parsed.type === "image") {
    return (
      <span className="obsidian-embed obsidian-embed-image">
        <img
          src={parsed.target}
          alt={parsed.target}
          style={parsed.width ? { width: parsed.width.includes("x") ? undefined : `${parsed.width}px` } : undefined}
          onError={(e) => {
            const el = e.currentTarget;
            el.style.display = "none";
            const fallback = el.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = "inline";
          }}
        />
        <span className="obsidian-embed-fallback" style={{ display: "none" }}>
          {raw}
        </span>
      </span>
    );
  }

  return (
    <span className="obsidian-embed obsidian-embed-ref" data-target={parsed.target}>
      {parsed.heading ? `${parsed.target} > ${parsed.heading}` : parsed.target}
    </span>
  );
};

export const ObsidianEmbed = memo(ObsidianEmbedInner);
ObsidianEmbed.displayName = "ObsidianEmbed";
