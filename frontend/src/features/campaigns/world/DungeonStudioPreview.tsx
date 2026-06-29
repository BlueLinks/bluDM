import { Grid2X2, Minus, Plus, Redo2, RotateCcw, Undo2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { ActionRow } from "../../../components/layout";
import { Button, EmptyMini } from "../../../components/ui";
import {
  canToggleEdgeFeature,
  deleteMapCells,
  eraseFloorCell,
  eraseTerrainCell,
  isShapeTool,
  isTerrainTool,
  paintFloorCell,
  paintFloorCells,
  paintTerrainCell,
  shapeRoomCells,
  toggleEdgeFeature,
  type DungeonStudioChangeOptions,
  type DungeonStudioSelection,
  type DungeonStudioShapeTool,
  type DungeonStudioTool,
} from "./dungeonStudioEditing";
import type {
  DungeonStudioCellKind,
  DungeonStudioDocument,
  GridCell,
} from "./dungeonStudioDocument";
import {
  CellRect,
  DUNGEON_STUDIO_CELL_SIZE,
  EdgeLine,
  GridLines,
  RoomOverlay,
  SelectionOverlay,
  ShapePreview,
  closestDiagonalDirection,
  closestOrthogonalDirection,
  type DungeonStudioShapeDraft,
} from "./DungeonStudioPreviewElements";

const CELL_SIZE = DUNGEON_STUDIO_CELL_SIZE;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.35;

type ShapeDraft = DungeonStudioShapeDraft;

const cellLayerFills: Record<DungeonStudioCellKind, string> = {
  floor: "hsl(var(--muted))",
  water: "rgb(56 189 248 / 0.38)",
  cliff: "rgb(120 113 108 / 0.34)",
  chasm: "rgb(15 23 42 / 0.70)",
  rubble: "rgb(161 98 7 / 0.28)",
  hazard: "rgb(239 68 68 / 0.26)",
  road: "rgb(180 83 9 / 0.24)",
  grass: "rgb(34 197 94 / 0.24)",
};

export function DungeonStudioPreview({
  activeTool,
  canRedo,
  canUndo,
  dirty,
  document,
  selected,
  onDocumentChange,
  onRedo,
  onUndo,
}: {
  activeTool: DungeonStudioTool;
  canRedo: boolean;
  canUndo: boolean;
  dirty: boolean;
  document: DungeonStudioDocument;
  selected: DungeonStudioSelection;
  onDocumentChange: (
    update: (current: DungeonStudioDocument) => DungeonStudioDocument,
    selection: DungeonStudioSelection,
    options?: DungeonStudioChangeOptions,
  ) => void;
  onRedo: () => void;
  onUndo: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const drawing = useRef(false);
  const brushStrokeStarted = useRef(false);
  const shapeDraftRef = useRef<ShapeDraft | null>(null);
  const lastPaintedCell = useRef("");
  const [shapeDraft, setShapeDraft] = useState<ShapeDraft | null>(null);
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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !shapeDraftRef.current) return;
      event.preventDefault();
      shapeDraftRef.current = null;
      setShapeDraft(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function changeZoom(delta: number) {
    setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta)));
  }

  function resetView() {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  }

  function startPan(event: PointerEvent<HTMLDivElement>) {
    panStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    safeSetPointerCapture(event);
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

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.altKey) {
      startPan(event);
      return;
    }
    safeSetPointerCapture(event);
    if (activeTool === "select") {
      selectCell(event);
      return;
    }
    if (isShapeTool(activeTool)) {
      startShapeDraft(event, activeTool);
      return;
    }
    if (isBrushTool(activeTool)) {
      drawing.current = true;
      brushStrokeStarted.current = false;
      applyCellTool(event);
      return;
    }
    applyEdgeTool(event);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (panStart.current) {
      movePan(event);
      return;
    }
    if (shapeDraftRef.current) {
      updateShapeDraft(event);
      return;
    }
    if (!drawing.current) return;
    applyCellTool(event);
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    panStart.current = null;
    if (shapeDraftRef.current) applyShapeDraft(event);
    drawing.current = false;
    brushStrokeStarted.current = false;
    lastPaintedCell.current = "";
  }

  function handlePointerCancel() {
    panStart.current = null;
    drawing.current = false;
    brushStrokeStarted.current = false;
    lastPaintedCell.current = "";
    cancelShapeDraft();
  }

  function startShapeDraft(event: PointerEvent<HTMLDivElement>, tool: DungeonStudioShapeTool) {
    const point = gridPointForEvent(event);
    if (!point) return;
    const draft = {
      tool,
      start: point.cell,
      current: point.cell,
      cells: shapeRoomCells(document, tool, point.cell, point.cell),
    } satisfies ShapeDraft;
    shapeDraftRef.current = draft;
    setShapeDraft(draft);
  }

  function updateShapeDraft(event: PointerEvent<HTMLDivElement>) {
    const currentDraft = shapeDraftRef.current;
    const point = gridPointForEvent(event);
    if (!currentDraft || !point) return;
    const draft = {
      ...currentDraft,
      current: point.cell,
      cells: shapeRoomCells(document, currentDraft.tool, currentDraft.start, point.cell),
    } satisfies ShapeDraft;
    shapeDraftRef.current = draft;
    setShapeDraft(draft);
  }

  function applyShapeDraft(event: PointerEvent<HTMLDivElement>) {
    updateShapeDraft(event);
    const draft = shapeDraftRef.current;
    if (!draft) return;
    const selection = {
      type: "region",
      cells: draft.cells,
      label: toolLabel(draft.tool),
    } satisfies DungeonStudioSelection;
    onDocumentChange((current) => paintFloorCells(current, draft.cells), selection);
    shapeDraftRef.current = null;
    setShapeDraft(null);
  }

  function cancelShapeDraft() {
    shapeDraftRef.current = null;
    setShapeDraft(null);
  }

  function selectCell(event: PointerEvent<HTMLDivElement>) {
    const point = gridPointForEvent(event);
    if (!point) return;
    onDocumentChange((current) => current, { type: "cell", cell: point.cell });
  }

  function applyCellTool(event: PointerEvent<HTMLDivElement>) {
    const point = gridPointForEvent(event);
    if (!point) return;
    const nextKey = `${point.cell.x},${point.cell.y},${activeTool}`;
    if (nextKey === lastPaintedCell.current) return;
    lastPaintedCell.current = nextKey;
    const selection = { type: "cell", cell: point.cell } satisfies DungeonStudioSelection;
    const mergeWithPrevious = brushStrokeStarted.current;
    brushStrokeStarted.current = true;
    onDocumentChange((current) => applyCellUpdate(current, point.cell), selection, {
      mergeWithPrevious,
    });
  }

  function applyCellUpdate(current: DungeonStudioDocument, cell: GridCell) {
    if (activeTool === "delete") return deleteMapCells(current, [cell]);
    if (activeTool === "erase") return eraseFloorCell(current, cell);
    if (activeTool === "erase-terrain") return eraseTerrainCell(current, cell);
    if (isTerrainTool(activeTool)) return paintTerrainCell(current, cell, activeTool);
    return paintFloorCell(current, cell);
  }

  function applyEdgeTool(event: PointerEvent<HTMLDivElement>) {
    const point = gridPointForEvent(event);
    if (!point) return;
    const direction =
      activeTool === "diagonal-wall"
        ? closestDiagonalDirection(point.localX, point.localY)
        : closestOrthogonalDirection(point.localX, point.localY);
    const kind =
      activeTool === "door" ? "door" : activeTool === "cliff-edge" ? "cliff-edge" : "wall";
    if (!canToggleEdgeFeature(document, point.cell, direction)) {
      onDocumentChange((current) => current, {
        type: "edge",
        cell: point.cell,
        direction,
        kind: `Invalid ${kind}`,
      });
      return;
    }
    const selection = {
      type: "edge",
      cell: point.cell,
      direction,
      kind,
    } satisfies DungeonStudioSelection;
    onDocumentChange(
      (current) => toggleEdgeFeature(current, point.cell, direction, kind),
      selection,
    );
  }

  function gridPointForEvent(event: PointerEvent<HTMLDivElement>) {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const svgX = pan.x + ((event.clientX - rect.left) / rect.width) * viewWidth;
    const svgY = pan.y + ((event.clientY - rect.top) / rect.height) * viewHeight;
    const cell = {
      x: clamp(Math.floor(svgX / CELL_SIZE), 0, document.grid.width - 1),
      y: clamp(Math.floor(svgY / CELL_SIZE), 0, document.grid.height - 1),
    };
    return {
      cell,
      localX: svgX - cell.x * CELL_SIZE,
      localY: svgY - cell.y * CELL_SIZE,
    };
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
        <ActionRow>
          <Button
            type="button"
            icon={Undo2}
            size="sm"
            variant="secondary"
            disabled={!canUndo}
            onClick={onUndo}
          >
            Undo
          </Button>
          <Button
            type="button"
            icon={Redo2}
            size="sm"
            variant="secondary"
            disabled={!canRedo}
            onClick={onRedo}
          >
            Redo
          </Button>
        </ActionRow>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <Grid2X2 className="h-3.5 w-3.5" /> {dirty ? "Unsaved changes" : "Saved"} • Alt-drag to
          pan
        </span>
      </div>
      {!floorCellCount ? (
        <EmptyMini copy="Blank starter grid. Use Floor Brush to paint rooms and corridors." />
      ) : null}
      <div
        ref={viewportRef}
        role="application"
        aria-label={`Dungeon Studio grid editor, ${document.grid.width} by ${document.grid.height} cells`}
        className="relative w-full min-w-0 touch-none overflow-hidden rounded-lg border border-border bg-background shadow-inner cursor-crosshair"
        style={{ aspectRatio: `${document.grid.width} / ${document.grid.height}` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerCancel={handlePointerCancel}
        onPointerUp={handlePointerEnd}
        onClick={() => undefined}
      >
        <svg className="h-full w-full" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
          <rect width={dimensions.width} height={dimensions.height} fill="hsl(var(--background))" />
          {document.layers
            .filter((layer) => layer.visible)
            .flatMap((layer) =>
              layer.cells.map((cell) => (
                <CellRect
                  cell={cell}
                  fill={cellLayerFill(layer.cellKind, document)}
                  key={`${layer.id}-${cell.x}-${cell.y}`}
                  opacity={layer.opacity}
                />
              )),
            )}
          <GridLines width={document.grid.width} height={document.grid.height} />
          {shapeDraft ? <ShapePreview draft={shapeDraft} /> : null}
          {document.rooms.map((room) => (
            <RoomOverlay key={room.id} room={room} />
          ))}
          {document.edges.map((edge) => (
            <EdgeLine key={edge.id} edge={edge} />
          ))}
          {selected ? <SelectionOverlay selection={selected} /> : null}
        </svg>
      </div>
    </div>
  );
}

function isBrushTool(tool: DungeonStudioTool) {
  return (
    tool === "floor" ||
    tool === "erase" ||
    tool === "delete" ||
    tool === "erase-terrain" ||
    isTerrainTool(tool)
  );
}

function cellLayerFill(kind: DungeonStudioCellKind, document: DungeonStudioDocument) {
  if (kind === "floor" && document.tileset === "cave") return "rgb(87 83 78 / 0.42)";
  return cellLayerFills[kind];
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

function toolLabel(tool: DungeonStudioShapeTool) {
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

function safeSetPointerCapture(event: PointerEvent<HTMLDivElement>) {
  try {
    event.currentTarget.setPointerCapture(event.pointerId);
  } catch {
    // Programmatic QA events do not always create an active pointer; real pointer input still captures.
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
