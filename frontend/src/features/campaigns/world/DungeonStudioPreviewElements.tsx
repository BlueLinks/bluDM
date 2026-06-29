import type { DungeonStudioSelection, DungeonStudioShapeTool } from "./dungeonStudioEditing";
import type {
  DungeonStudioEdgeDirection,
  DungeonStudioEdgeFeature,
  DungeonStudioRoomRegion,
  GridCell,
} from "./dungeonStudioDocument";

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

export function EdgeLine({ edge }: { edge: DungeonStudioEdgeFeature }) {
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
      strokeWidth={edge.kind === "door" ? 4 : edge.kind === "cliff-edge" ? 5 : 3}
      strokeDasharray={
        edge.kind === "door" ? "8 4" : edge.kind === "cliff-edge" ? "3 5" : undefined
      }
    />
  );
}

export function SelectionOverlay({
  selection,
}: {
  selection: NonNullable<DungeonStudioSelection>;
}) {
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

function edgeStroke(kind: DungeonStudioEdgeFeature["kind"]) {
  if (kind === "door") return "rgb(245 158 11)";
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
