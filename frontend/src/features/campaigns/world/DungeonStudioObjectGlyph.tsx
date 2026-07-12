const DUNGEON_STUDIO_CELL_SIZE = 24;

export function DungeonStudioObjectGlyph({
  assetKey,
  fallback,
  x,
  y,
}: {
  assetKey?: string;
  fallback: string;
  x: number;
  y: number;
}) {
  const centerX = x + DUNGEON_STUDIO_CELL_SIZE / 2;
  const centerY = y + DUNGEON_STUDIO_CELL_SIZE / 2;
  if (assetKey === "table")
    return <ellipse cx={centerX} cy={centerY} rx="7" ry="4" fill="hsl(var(--background))" />;
  if (assetKey === "chair")
    return <rect x={x + 8} y={y + 7} width="8" height="9" rx="2" fill="hsl(var(--background))" />;
  if (assetKey === "chest")
    return <rect x={x + 6} y={y + 8} width="12" height="8" rx="1" fill="rgb(251 191 36)" />;
  if (assetKey === "barrel")
    return (
      <circle
        cx={centerX}
        cy={centerY}
        r="6"
        fill="rgb(180 83 9)"
        stroke="hsl(var(--background))"
      />
    );
  if (assetKey === "crate")
    return (
      <rect
        x={x + 6}
        y={y + 6}
        width="12"
        height="12"
        fill="rgb(180 83 9)"
        stroke="hsl(var(--background))"
      />
    );
  if (assetKey === "bed")
    return (
      <>
        <rect x={x + 5} y={y + 5} width="14" height="14" rx="2" fill="hsl(var(--background))" />
        <rect x={x + 7} y={y + 7} width="10" height="4" rx="1" fill="rgb(147 197 253)" />
      </>
    );
  if (assetKey === "bookshelf")
    return (
      <>
        <rect x={x + 5} y={y + 5} width="14" height="14" fill="hsl(var(--background))" />
        {[8, 12, 16].map((line) => (
          <line
            key={line}
            x1={x + 6}
            x2={x + 18}
            y1={y + line}
            y2={y + line}
            stroke="rgb(71 85 105)"
          />
        ))}
      </>
    );
  if (assetKey === "rug")
    return <rect x={x + 4} y={y + 7} width="16" height="10" rx="4" fill="rgb(244 114 182)" />;
  if (assetKey === "torch")
    return (
      <path
        d={`M ${centerX} ${y + 5} L ${x + 16} ${y + 13} L ${x + 12} ${y + 19} L ${x + 8} ${y + 13} Z`}
        fill="rgb(254 240 138)"
      />
    );
  if (assetKey === "statue")
    return (
      <path
        d={`M ${centerX} ${y + 5} L ${x + 17} ${y + 18} H ${x + 7} Z`}
        fill="hsl(var(--background))"
      />
    );
  if (assetKey === "trap")
    return (
      <path
        d={`M ${centerX} ${y + 5} L ${x + 19} ${y + 18} H ${x + 5} Z`}
        fill="rgb(254 202 202)"
      />
    );
  if (assetKey?.startsWith("stairs"))
    return (
      <>
        {[7, 10, 13, 16].map((line) => (
          <line
            key={line}
            x1={x + 6}
            x2={x + 18}
            y1={y + line}
            y2={y + line}
            stroke="hsl(var(--background))"
            strokeWidth="2"
          />
        ))}
      </>
    );
  return (
    <text
      x={centerX}
      y={centerY + 4}
      textAnchor="middle"
      fontSize="13"
      fontWeight="800"
      fill="hsl(var(--background))"
    >
      {fallback}
    </text>
  );
}
