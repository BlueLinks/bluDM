import type { DungeonStudioSelection, DungeonStudioShapeTool } from "./dungeonStudioEditing";
import type {
  DungeonStudioEdgeDirection,
  DungeonStudioEdgeFeature,
  DungeonStudioCustomAsset,
  DungeonStudioEntity,
  DungeonStudioRoomRegion,
  GridCell,
} from "./dungeonStudioDocument";
import { dungeonStudioAssetByKey } from "./dungeonStudioObjectCatalog";
import { DungeonStudioObjectGlyph } from "./DungeonStudioObjectGlyph";

export const DUNGEON_STUDIO_CELL_SIZE = 24;

export type DungeonStudioShapeDraft = {
  tool: DungeonStudioShapeTool;
  start: GridCell;
  current: GridCell;
  cells: GridCell[];
};

export function CellRect({
  cell,
  fill,
  opacity,
}: {
  cell: GridCell;
  fill: string;
  opacity: number;
}) {
  return (
    <rect
      x={cell.x * DUNGEON_STUDIO_CELL_SIZE}
      y={cell.y * DUNGEON_STUDIO_CELL_SIZE}
      width={DUNGEON_STUDIO_CELL_SIZE}
      height={DUNGEON_STUDIO_CELL_SIZE}
      fill={fill}
      opacity={opacity}
    />
  );
}

export function FillPreview({ cells }: { cells: GridCell[] }) {
  return (
    <g aria-label="Room fill preview">
      {cells.map((cell) => (
        <rect
          key={`${cell.x}-${cell.y}`}
          x={cell.x * DUNGEON_STUDIO_CELL_SIZE + 3}
          y={cell.y * DUNGEON_STUDIO_CELL_SIZE + 3}
          width={DUNGEON_STUDIO_CELL_SIZE - 6}
          height={DUNGEON_STUDIO_CELL_SIZE - 6}
          rx="5"
          fill="hsl(var(--accent))"
          opacity="0.20"
          stroke="hsl(var(--accent))"
          strokeDasharray="3 3"
          strokeWidth="1.5"
        />
      ))}
    </g>
  );
}

export function ShapePreview({ draft }: { draft: DungeonStudioShapeDraft }) {
  return (
    <g aria-label={`${shapeToolLabel(draft.tool)} preview`}>
      {draft.cells.map((cell) => (
        <rect
          key={`${cell.x}-${cell.y}`}
          x={cell.x * DUNGEON_STUDIO_CELL_SIZE + 1}
          y={cell.y * DUNGEON_STUDIO_CELL_SIZE + 1}
          width={DUNGEON_STUDIO_CELL_SIZE - 2}
          height={DUNGEON_STUDIO_CELL_SIZE - 2}
          fill="hsl(var(--primary))"
          opacity="0.22"
          stroke="hsl(var(--primary))"
          strokeDasharray="4 3"
          strokeWidth="1.5"
        />
      ))}
    </g>
  );
}

export function GridLines({ width, height }: { width: number; height: number }) {
  const vertical = Array.from({ length: width + 1 }, (_, index) => index);
  const horizontal = Array.from({ length: height + 1 }, (_, index) => index);
  return (
    <g stroke="hsl(var(--border))" strokeWidth="1" opacity="0.65">
      {vertical.map((x) => (
        <line
          key={`v-${x}`}
          x1={x * DUNGEON_STUDIO_CELL_SIZE}
          x2={x * DUNGEON_STUDIO_CELL_SIZE}
          y1="0"
          y2={height * DUNGEON_STUDIO_CELL_SIZE}
        />
      ))}
      {horizontal.map((y) => (
        <line
          key={`h-${y}`}
          x1="0"
          x2={width * DUNGEON_STUDIO_CELL_SIZE}
          y1={y * DUNGEON_STUDIO_CELL_SIZE}
          y2={y * DUNGEON_STUDIO_CELL_SIZE}
        />
      ))}
    </g>
  );
}

export function RoomOverlay({ room }: { room: DungeonStudioRoomRegion }) {
  if (!room.cells.length) return null;
  const center = room.cells.reduce(
    (total, cell) => ({ x: total.x + cell.x, y: total.y + cell.y }),
    { x: 0, y: 0 },
  );
  const labelX = (center.x / room.cells.length + 0.5) * DUNGEON_STUDIO_CELL_SIZE;
  const labelY = (center.y / room.cells.length + 0.55) * DUNGEON_STUDIO_CELL_SIZE;
  return (
    <g>
      {room.cells.map((cell) => (
        <rect
          key={`${room.id}-${cell.x}-${cell.y}`}
          x={cell.x * DUNGEON_STUDIO_CELL_SIZE + 2}
          y={cell.y * DUNGEON_STUDIO_CELL_SIZE + 2}
          width={DUNGEON_STUDIO_CELL_SIZE - 4}
          height={DUNGEON_STUDIO_CELL_SIZE - 4}
          rx="4"
          fill={room.color}
          opacity="0.24"
        />
      ))}
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill="hsl(var(--foreground))"
      >
        {room.label}
      </text>
    </g>
  );
}

export function EntityMarker({
  customAssets = [],
  entity,
}: {
  customAssets?: DungeonStudioCustomAsset[];
  entity: DungeonStudioEntity;
}) {
  const asset = dungeonStudioAssetByKey(entity.assetKey, customAssets);
  const x = entity.cell.x * DUNGEON_STUDIO_CELL_SIZE;
  const y = entity.cell.y * DUNGEON_STUDIO_CELL_SIZE;
  const cx = x + DUNGEON_STUDIO_CELL_SIZE / 2 + (entity.xOffset ?? 0);
  const cy = y + DUNGEON_STUDIO_CELL_SIZE / 2 + (entity.yOffset ?? 0);
  const custom = customAssets.find((item) => item.key === entity.assetKey);
  return (
    <g
      aria-label={entity.label ?? asset?.label ?? entity.kind}
      transform={`rotate(${entity.rotation ?? 0} ${cx} ${cy})`}
    >
      <rect
        x={x + 3}
        y={y + 3}
        width={DUNGEON_STUDIO_CELL_SIZE - 6}
        height={DUNGEON_STUDIO_CELL_SIZE - 6}
        rx="5"
        fill={entityFill(entity.kind)}
        stroke="hsl(var(--foreground))"
        strokeWidth="1"
        opacity="0.92"
      />
      {custom ? (
        <image
          href={custom.dataUrl}
          x={x + 5}
          y={y + 5}
          width={DUNGEON_STUDIO_CELL_SIZE - 10}
          height={DUNGEON_STUDIO_CELL_SIZE - 10}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <DungeonStudioObjectGlyph
          assetKey={entity.assetKey}
          fallback={asset?.glyph ?? entity.label?.slice(0, 1) ?? "•"}
          x={x}
          y={y}
        />
      )}
    </g>
  );
}

export function EdgePathPreview({
  edges,
  kind = "wall",
}: {
  edges: Array<{ cell: GridCell; direction: DungeonStudioEdgeDirection }>;
  kind?: DungeonStudioEdgeFeature["kind"];
}) {
  if (!edges.length) return null;
  return (
    <g aria-label="Wall placement preview" opacity="0.72">
      {edges.map((edge, index) => (
        <EdgeLine
          key={`${edge.cell.x}-${edge.cell.y}-${edge.direction}-${index}`}
          edge={{ id: `preview-${index}`, cell: edge.cell, direction: edge.direction, kind }}
          preview
        />
      ))}
    </g>
  );
}

export function EdgeLine({
  edge,
  implicit = false,
  preview = false,
}: {
  edge: DungeonStudioEdgeFeature;
  implicit?: boolean;
  preview?: boolean;
}) {
  const { x, y } = edge.cell;
  const startX = x * DUNGEON_STUDIO_CELL_SIZE;
  const startY = y * DUNGEON_STUDIO_CELL_SIZE;
  const coordinates = edgeCoordinates(startX, startY, edge.direction);
  const stroke = edgeStroke(edge.kind);
  return (
    <line
      {...coordinates}
      stroke={stroke}
      strokeLinecap="round"
      strokeWidth={
        preview
          ? 6
          : implicit
            ? 2.75
            : edge.kind === "door"
              ? 4
              : edge.kind === "cliff-edge"
                ? 5
                : 3
      }
      opacity={implicit ? "0.78" : undefined}
      strokeDasharray={
        preview
          ? "5 3"
          : implicit
            ? undefined
            : edge.kind === "door"
              ? "8 4"
              : edge.kind === "cliff-edge"
                ? "3 5"
                : undefined
      }
    />
  );
}

export function SelectionOverlay({
  selection,
}: {
  selection: NonNullable<DungeonStudioSelection>;
}) {
  if (selection.type === "entity") return null;
  if (selection.type === "cell") {
    return (
      <rect
        x={selection.cell.x * DUNGEON_STUDIO_CELL_SIZE + 1}
        y={selection.cell.y * DUNGEON_STUDIO_CELL_SIZE + 1}
        width={DUNGEON_STUDIO_CELL_SIZE - 2}
        height={DUNGEON_STUDIO_CELL_SIZE - 2}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
      />
    );
  }
  if (selection.type === "region") {
    return (
      <g>
        {selection.cells.map((cell) => (
          <rect
            key={`${cell.x}-${cell.y}`}
            x={cell.x * DUNGEON_STUDIO_CELL_SIZE + 1}
            y={cell.y * DUNGEON_STUDIO_CELL_SIZE + 1}
            width={DUNGEON_STUDIO_CELL_SIZE - 2}
            height={DUNGEON_STUDIO_CELL_SIZE - 2}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeDasharray="4 3"
            strokeWidth="2"
          />
        ))}
      </g>
    );
  }
  const coordinates = edgeCoordinates(
    selection.cell.x * DUNGEON_STUDIO_CELL_SIZE,
    selection.cell.y * DUNGEON_STUDIO_CELL_SIZE,
    selection.direction,
  );
  const invalid = selection.kind.toLowerCase().startsWith("invalid");
  return (
    <line
      {...coordinates}
      stroke={invalid ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
      strokeLinecap="round"
      strokeWidth="6"
      opacity={invalid ? "0.75" : "0.55"}
      strokeDasharray={invalid ? "4 4" : undefined}
    />
  );
}

export function closestOrthogonalDirection(
  localX: number,
  localY: number,
): DungeonStudioEdgeDirection {
  const distances = [
    { direction: "n" as const, distance: localY },
    { direction: "e" as const, distance: DUNGEON_STUDIO_CELL_SIZE - localX },
    { direction: "s" as const, distance: DUNGEON_STUDIO_CELL_SIZE - localY },
    { direction: "w" as const, distance: localX },
  ];
  return distances.sort((left, right) => left.distance - right.distance)[0].direction;
}

export function closestDiagonalDirection(
  localX: number,
  localY: number,
): DungeonStudioEdgeDirection {
  const fallingDistance = Math.abs(localX - localY);
  const risingDistance = Math.abs(localX + localY - DUNGEON_STUDIO_CELL_SIZE);
  return fallingDistance <= risingDistance ? "ne" : "nw";
}

function entityFill(kind: DungeonStudioEntity["kind"]) {
  if (kind === "stairs") return "rgb(59 130 246)";
  if (kind === "trap") return "rgb(220 38 38)";
  if (kind === "light") return "rgb(245 158 11)";
  return "rgb(71 85 105)";
}

function edgeStroke(kind: DungeonStudioEdgeFeature["kind"]) {
  if (kind === "door") return "rgb(245 158 11)";
  if (kind === "gate") return "rgb(100 116 139)";
  if (kind === "cliff-edge") return "rgb(217 119 6)";
  return "hsl(var(--foreground))";
}

function edgeCoordinates(x: number, y: number, direction: DungeonStudioEdgeFeature["direction"]) {
  if (direction === "n") return { x1: x, y1: y, x2: x + DUNGEON_STUDIO_CELL_SIZE, y2: y };
  if (direction === "e") {
    return {
      x1: x + DUNGEON_STUDIO_CELL_SIZE,
      y1: y,
      x2: x + DUNGEON_STUDIO_CELL_SIZE,
      y2: y + DUNGEON_STUDIO_CELL_SIZE,
    };
  }
  if (direction === "s") {
    return {
      x1: x,
      y1: y + DUNGEON_STUDIO_CELL_SIZE,
      x2: x + DUNGEON_STUDIO_CELL_SIZE,
      y2: y + DUNGEON_STUDIO_CELL_SIZE,
    };
  }
  if (direction === "w") return { x1: x, y1: y, x2: x, y2: y + DUNGEON_STUDIO_CELL_SIZE };
  if (direction === "ne") {
    return { x1: x, y1: y, x2: x + DUNGEON_STUDIO_CELL_SIZE, y2: y + DUNGEON_STUDIO_CELL_SIZE };
  }
  if (direction === "nw") {
    return { x1: x + DUNGEON_STUDIO_CELL_SIZE, y1: y, x2: x, y2: y + DUNGEON_STUDIO_CELL_SIZE };
  }
  if (direction === "se") {
    return { x1: x, y1: y + DUNGEON_STUDIO_CELL_SIZE, x2: x + DUNGEON_STUDIO_CELL_SIZE, y2: y };
  }
  return { x1: x, y1: y, x2: x + DUNGEON_STUDIO_CELL_SIZE, y2: y + DUNGEON_STUDIO_CELL_SIZE };
}

function shapeToolLabel(tool: DungeonStudioShapeTool) {
  switch (tool) {
    case "rectangle-room":
      return "Rectangle room";
    case "square-room":
      return "Square room";
    case "circle-room":
      return "Round room";
    case "ellipse-room":
      return "Oval room";
  }
}
