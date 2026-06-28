import { Grid2X2, Minus, Plus, RotateCcw } from "lucide-react";
import { useMemo, useRef, useState, type PointerEvent } from "react";
import { ActionRow } from "../../../components/layout";
import { Button, EmptyMini } from "../../../components/ui";
import type {
  DungeonStudioDocument,
  DungeonStudioEdgeFeature,
  DungeonStudioRoomRegion,
  GridCell,
} from "./dungeonStudioDocument";

const CELL_SIZE = 24;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.35;

const cellLayerFills: Record<string, string> = {
  floor: "hsl(var(--muted))",
  water: "rgb(56 189 248 / 0.38)",
  cliff: "rgb(120 113 108 / 0.34)",
  chasm: "rgb(15 23 42 / 0.70)",
  rubble: "rgb(161 98 7 / 0.28)",
  hazard: "rgb(239 68 68 / 0.26)",
  road: "rgb(180 83 9 / 0.24)",
  grass: "rgb(34 197 94 / 0.24)",
};

export function DungeonStudioPreview({ document }: { document: DungeonStudioDocument }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dimensions = useMemo(
    () => ({ width: document.grid.width * CELL_SIZE, height: document.grid.height * CELL_SIZE }),
    [document.grid.height, document.grid.width],
  );
  const viewWidth = dimensions.width / zoom;
  const viewHeight = dimensions.height / zoom;
  const viewBox = `${pan.x} ${pan.y} ${viewWidth} ${viewHeight}`;
  const floorCellCount = document.layers
    .filter((layer) => layer.cellKind === "floor")
    .reduce((total, layer) => total + layer.cells.length, 0);

  function changeZoom(delta: number) {
    setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta)));
  }

  function resetView() {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  }

  function startPan(event: PointerEvent<HTMLDivElement>) {
    panStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePan(event: PointerEvent<HTMLDivElement>) {
    if (!panStart.current || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const nextPan = {
      x: panStart.current.panX - ((event.clientX - panStart.current.x) / rect.width) * viewWidth,
      y: panStart.current.panY - ((event.clientY - panStart.current.y) / rect.height) * viewHeight,
    };
    setPan(clampPan(nextPan, dimensions, zoom));
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
        <ActionRow>
          <Button
            type="button"
            icon={Minus}
            size="sm"
            variant="secondary"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => changeZoom(-ZOOM_STEP)}
          >
            Zoom out
          </Button>
          <span className="rounded-md border border-border bg-background px-2 py-1 text-xs font-bold uppercase text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            icon={Plus}
            size="sm"
            variant="secondary"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => changeZoom(ZOOM_STEP)}
          >
            Zoom in
          </Button>
          <Button type="button" icon={RotateCcw} size="sm" variant="ghost" onClick={resetView}>
            Reset
          </Button>
        </ActionRow>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <Grid2X2 className="h-3.5 w-3.5" /> Drag to pan this read-only preview
        </span>
      </div>
      {!floorCellCount ? (
        <EmptyMini copy="Blank starter grid. Phase 2 will add floor, wall, and door drawing tools here." />
      ) : null}
      <div
        ref={viewportRef}
        role="img"
        aria-label={`Read-only Dungeon Studio grid preview, ${document.grid.width} by ${document.grid.height} cells`}
        className="relative w-full min-w-0 touch-none overflow-hidden rounded-lg border border-border bg-background shadow-inner cursor-grab active:cursor-grabbing"
        style={{ aspectRatio: `${document.grid.width} / ${document.grid.height}` }}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerCancel={() => (panStart.current = null)}
        onPointerUp={() => (panStart.current = null)}
      >
        <svg className="h-full w-full" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
          <rect width={dimensions.width} height={dimensions.height} fill="hsl(var(--background))" />
          {document.layers
            .filter((layer) => layer.visible)
            .flatMap((layer) =>
              layer.cells.map((cell) => (
                <CellRect
                  cell={cell}
                  fill={cellLayerFills[layer.cellKind] ?? cellLayerFills.floor}
                  key={`${layer.id}-${cell.x}-${cell.y}`}
                  opacity={layer.opacity}
                />
              )),
            )}
          <GridLines width={document.grid.width} height={document.grid.height} />
          {document.rooms.map((room) => (
            <RoomOverlay key={room.id} room={room} />
          ))}
          {document.edges.map((edge) => (
            <EdgeLine key={edge.id} edge={edge} />
          ))}
        </svg>
      </div>
    </div>
  );
}

function CellRect({ cell, fill, opacity }: { cell: GridCell; fill: string; opacity: number }) {
  return (
    <rect
      x={cell.x * CELL_SIZE}
      y={cell.y * CELL_SIZE}
      width={CELL_SIZE}
      height={CELL_SIZE}
      fill={fill}
      opacity={opacity}
    />
  );
}

function GridLines({ width, height }: { width: number; height: number }) {
  const vertical = Array.from({ length: width + 1 }, (_, index) => index);
  const horizontal = Array.from({ length: height + 1 }, (_, index) => index);
  return (
    <g stroke="hsl(var(--border))" strokeWidth="1" opacity="0.65">
      {vertical.map((x) => (
        <line key={`v-${x}`} x1={x * CELL_SIZE} x2={x * CELL_SIZE} y1="0" y2={height * CELL_SIZE} />
      ))}
      {horizontal.map((y) => (
        <line key={`h-${y}`} x1="0" x2={width * CELL_SIZE} y1={y * CELL_SIZE} y2={y * CELL_SIZE} />
      ))}
    </g>
  );
}

function RoomOverlay({ room }: { room: DungeonStudioRoomRegion }) {
  if (!room.cells.length) return null;
  const center = room.cells.reduce(
    (total, cell) => ({ x: total.x + cell.x, y: total.y + cell.y }),
    { x: 0, y: 0 },
  );
  const labelX = (center.x / room.cells.length + 0.5) * CELL_SIZE;
  const labelY = (center.y / room.cells.length + 0.55) * CELL_SIZE;
  return (
    <g>
      {room.cells.map((cell) => (
        <rect
          key={`${room.id}-${cell.x}-${cell.y}`}
          x={cell.x * CELL_SIZE + 2}
          y={cell.y * CELL_SIZE + 2}
          width={CELL_SIZE - 4}
          height={CELL_SIZE - 4}
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

function EdgeLine({ edge }: { edge: DungeonStudioEdgeFeature }) {
  const { x, y } = edge.cell;
  const startX = x * CELL_SIZE;
  const startY = y * CELL_SIZE;
  const coordinates = edgeCoordinates(startX, startY, edge.direction);
  const stroke = edge.kind === "door" ? "rgb(245 158 11)" : "hsl(var(--foreground))";
  return (
    <line
      {...coordinates}
      stroke={stroke}
      strokeLinecap="round"
      strokeWidth={edge.kind === "door" ? 4 : 3}
      strokeDasharray={edge.kind === "door" ? "8 4" : undefined}
    />
  );
}

function edgeCoordinates(x: number, y: number, direction: DungeonStudioEdgeFeature["direction"]) {
  if (direction === "n") return { x1: x, y1: y, x2: x + CELL_SIZE, y2: y };
  if (direction === "e") return { x1: x + CELL_SIZE, y1: y, x2: x + CELL_SIZE, y2: y + CELL_SIZE };
  if (direction === "s") return { x1: x, y1: y + CELL_SIZE, x2: x + CELL_SIZE, y2: y + CELL_SIZE };
  if (direction === "w") return { x1: x, y1: y, x2: x, y2: y + CELL_SIZE };
  if (direction === "ne") return { x1: x, y1: y, x2: x + CELL_SIZE, y2: y + CELL_SIZE };
  if (direction === "nw") return { x1: x + CELL_SIZE, y1: y, x2: x, y2: y + CELL_SIZE };
  if (direction === "se") return { x1: x, y1: y + CELL_SIZE, x2: x + CELL_SIZE, y2: y };
  return { x1: x, y1: y, x2: x + CELL_SIZE, y2: y + CELL_SIZE };
}

function clampPan(
  nextPan: { x: number; y: number },
  dimensions: { width: number; height: number },
  zoom: number,
) {
  const maxX = dimensions.width - dimensions.width / zoom;
  const maxY = dimensions.height - dimensions.height / zoom;
  return {
    x: Math.min(maxX, Math.max(0, nextPan.x)),
    y: Math.min(maxY, Math.max(0, nextPan.y)),
  };
}
