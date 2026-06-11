import React, { useMemo } from "react";
import type { Components } from "react-markdown";
import { detectObsidianSyntax } from "./detectors";
import { ObsidianCallout, parseCalloutHeader } from "./ObsidianCallout";

function getTextContent(element: React.ReactNode): string {
  let text = "";
  React.Children.forEach(element, (child) => {
    if (typeof child === "string") {
      text += child;
    } else if (typeof child === "number") {
      text += String(child);
    } else if (React.isValidElement(child)) {
      const childProps = child.props as { children?: React.ReactNode };
      text += getTextContent(childProps.children);
    }
  });
  return text;
}

function cloneElementWithText(
  element: React.ReactElement,
  newText: string,
): React.ReactElement {
  return React.cloneElement(element, {}, newText || "\u00A0");
}

export function useObsidianModule(
  content: string,
  blockRaw?: string,
  startLine?: number,
  endLine?: number,
): Components | null {
  const syntaxes = useMemo(() => detectObsidianSyntax(content), [content]);

  return useMemo(() => {
    if (syntaxes.size === 0) return null;

    const components: Components = {};

    if (syntaxes.has("callout")) {
      components.blockquote = function ObsidianBlockquote(
        props: React.HTMLAttributes<HTMLQuoteElement> & { children?: React.ReactNode },
      ) {
        const { children, style, ...rest } = props;
        const incomingStyle = style as React.CSSProperties | undefined;

        const childrenArray = React.Children.toArray(children);
        let isCallout = false;
        let calloutType = "note";
        let calloutFold: "+" | "-" | null = null;
        let calloutCustomTitle: string | null = null;
        let calloutHeaderIndex = -1;

        for (let i = 0; i < childrenArray.length; i++) {
          const child = childrenArray[i];
          if (React.isValidElement(child)) {
            const childText = getTextContent(child);
            const calloutMatch = childText.match(
              /^\\?\[!\w+\]/,
            );
            if (calloutMatch) {
              isCallout = true;
              calloutHeaderIndex = i;
              const parsed = parseCalloutHeader(childText);
              calloutType = parsed.type;
              calloutFold = parsed.fold;
              calloutCustomTitle = parsed.customTitle;
              break;
            }
          }
        }

        if (isCallout) {
          const filteredChildren = React.Children.map(
            childrenArray,
            (child, idx) => {
              if (idx === calloutHeaderIndex && React.isValidElement(child)) {
                const text = getTextContent(child);
                const newText = text.replace(
                  /^\[!\w+\][+-]?.*/,
                  calloutCustomTitle || "",
                );
                return cloneElementWithText(child, newText);
              }
              return child;
            },
          );

          return (
            <ObsidianCallout
              type={calloutType}
              fold={calloutFold}
              customTitle={calloutCustomTitle}
              raw={blockRaw}
              startLine={startLine}
              endLine={endLine}
            >
              {filteredChildren}
            </ObsidianCallout>
          );
        }

        return (
          <blockquote
            {...rest}
            style={{
              borderLeft: "3px solid var(--accent-purple)",
              paddingLeft: "1em",
              marginLeft: 0,
              marginRight: 0,
              marginBottom: "1em",
              color: "var(--text-secondary)",
              fontStyle: "italic",
              ...incomingStyle,
            }}
          >
            {children}
          </blockquote>
        );
      };
    }

    return components;
  }, [syntaxes, blockRaw, startLine, endLine]);
}

export function preprocessObsidianSyntax(content: string): string {
  const syntaxes = detectObsidianSyntax(content);
  if (syntaxes.size === 0) return content;

  const codeBlocks: string[] = [];
  let result = content;

  const PLACEHOLDER_PREFIX = "\u200B\u200BOBS_CODE_";
  const PLACEHOLDER_SUFFIX = "\u200B\u200B";

  result = result.replace(
    /(^|(?<=\n))(```[\s\S]*?```|~~~[\s\S]*?~~~)/gm,
    (match) => {
      const index = codeBlocks.length;
      codeBlocks.push(match);
      return `${PLACEHOLDER_PREFIX}${index}${PLACEHOLDER_SUFFIX}`;
    },
  );

  result = result.replace(
    /(?<=^|[^`])(`+)(.+?)\1(?=[^`]|$)/gm,
    (match) => {
      const index = codeBlocks.length;
      codeBlocks.push(match);
      return `${PLACEHOLDER_PREFIX}${index}${PLACEHOLDER_SUFFIX}`;
    },
  );

  if (syntaxes.has("embed")) {
    result = result.replace(
      /!\[\[([^\]]+)\]\]/g,
      (_match, p1) =>
        `<span class="obsidian-embed" data-raw="!&#91;&#91;${p1}&#93;&#93;">${p1}</span>`,
    );
  }

  if (syntaxes.has("wikilink")) {
    result = result.replace(
      /(?<!!)\[\[([^\]]+)\]\]/g,
      (_match, p1) =>
        `<span class="obsidian-wikilink" data-raw="&#91;&#91;${p1}&#93;&#93;">${p1}</span>`,
    );
  }

  if (syntaxes.has("highlight")) {
    result = result.replace(
      /==([^=\n]+)==/g,
      '<mark class="obsidian-highlight">$1</mark>',
    );
  }

  if (syntaxes.has("comment")) {
    result = result.replace(
      /^%%\n([\s\S]*?)\n%%$/gm,
      "",
    );
    result = result.replace(
      /%%([^%]*?)%%/g,
      "",
    );
  }

  if (syntaxes.has("blockid")) {
    result = result.replace(
      /\s\^([\w-]+)\s*$/gm,
      '<span class="obsidian-block-id" id="^$1"></span>',
    );
  }

  const placeholderRegex = new RegExp(
    `${PLACEHOLDER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)${PLACEHOLDER_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
    "g",
  );
  result = result.replace(
    placeholderRegex,
    (_match, indexStr) => codeBlocks[parseInt(indexStr, 10)] ?? "",
  );

  return result;
}
