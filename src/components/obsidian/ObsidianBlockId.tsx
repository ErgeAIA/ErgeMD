import React, { memo } from "react";

interface BlockIdProps {
  id: string;
}

const ObsidianBlockIdInner: React.FC<BlockIdProps> = ({ id }) => {
  return <span className="obsidian-block-id" data-block-id={id} id={`^${id}`} />;
};

export const ObsidianBlockId = memo(ObsidianBlockIdInner);
ObsidianBlockId.displayName = "ObsidianBlockId";
