import React, { memo } from "react";

interface HighlightProps {
  children: React.ReactNode;
}

const ObsidianHighlightInner: React.FC<HighlightProps> = ({ children }) => {
  return (
    <mark className="obsidian-highlight">
      {children}
    </mark>
  );
};

export const ObsidianHighlight = memo(ObsidianHighlightInner);
ObsidianHighlight.displayName = "ObsidianHighlight";
