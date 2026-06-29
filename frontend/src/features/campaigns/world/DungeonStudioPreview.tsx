import { Grid2X2, Minus, Plus, Redo2, RotateCcw, Undo2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { ActionRow } from "../../../components/layout";
import { Button, EmptyMini } from "../../../components/ui";
import {
  canToggleEdgeFeature,
  deleteMapCells,
  eraseFloorCell,
  eraseRoomCells,
  eraseTerrainCell,
  implicitBoundaryWalls,
  isShapeTool,
  isTerrainTool,
  nextRoomRegionId,
  paintFloorCell,
  paintFloorCells,
  paintRoomCells,
  paintTerrainCell,
  roomFillCells,
  roomRegionForCell,
  shapeRoomCells,
  toggleEdgeFeature,
  type DungeonStudioChangeOptions,
  type DungeonStudioSelection,
  type DungeonStudioShapeTool,
  type DungeonStudioTool,
} from "./dungeonStudioEditing";
import { cellKey, type DungeonStudioDocument, type GridCell } from "./dungeonStudioDocument";
import {
  isBrushTool,
  roomCellSelection,
  safeSetPointerCapture,
  selectedRoomId,
  shapeToolLabel,
} from "./dungeonStudioPreviewTools";
import { cellLayerFill, clamp, clampPan } from "./dungeonStudioPreviewViewport";
import {
  CellRect,
  DUNGEON_STUDIO_CELL_SIZE,
  EdgeLine,
  GridLines,
  FillPreview,
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
  const roomSelectionCells = useRef<GridCell[]>([]);
  const roomBrushTargetId = useRef<string | null>(null);
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
  const floorCellKeys = useMemo(
    () =>
      new Set(
        document.layers
          .filter((layer) => layer.cellKind === "floor")
          .flatMap((layer) => layer.cells.map(cellKey)),
      ),
    [document.layers],
  );
  const floorCellCount = floorCellKeys.size;
  const implicitWalls = useMemo(() => implicitBoundaryWalls(document), [document]);
  const [fillPreviewCells, setFillPreviewCells] = useState<GridCell[]>([]);

  useEffect(() => {
    if (activeTool !== "room-fill") setFillPreviewCells([]);
  }, [activeTool]);

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
    if (activeTool === "room-fill") {
      applyRoomFill(event);
      return;
    }
    if (activeTool === "room-select") {
      drawing.current = true;
      roomSelectionCells.current = [];
      addRoomSelectionCell(event);
      return;
    }
    if (isShapeTool(activeTool)) {
      startShapeDraft(event, activeTool);
      return;
    }
    if (isBrushTool(activeTool)) {
      roomBrushTargetId.current =
        activeTool === "room-brush"
          ? (selectedRoomId(selected) ?? nextRoomRegionId(document))
          : null;
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
    if (activeTool === "room-fill") updateRoomFillPreview(event);
    if (!drawing.current) return;
    if (activeTool === "room-select") addRoomSelectionCell(event);
    else applyCellTool(event);
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    panStart.current = null;
    if (shapeDraftRef.current) applyShapeDraft(event);
    drawing.current = false;
    brushStrokeStarted.current = false;
    roomSelectionCells.current = [];
    roomBrushTargetId.current = null;
    lastPaintedCell.current = "";
  }

  function handlePointerCancel() {
    panStart.current = null;
    drawing.current = false;
    brushStrokeStarted.current = false;
    roomSelectionCells.current = [];
    roomBrushTargetId.current = null;
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
      label: shapeToolLabel(draft.tool),
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
    const room = roomRegionForCell(document, point.cell);
    onDocumentChange(
      (current) => current,
      room
        ? { type: "region", cells: room.cells, label: room.label, roomId: room.id }
        : { type: "cell", cell: point.cell },
    );
  }

  function addRoomSelectionCell(event: PointerEvent<HTMLDivElement>) {
    const point = gridPointForEvent(event);
    if (!point || !floorCellKeys.has(cellKey(point.cell))) return;
    if (roomSelectionCells.current.some((cell) => cellKey(cell) === cellKey(point.cell))) return;
    roomSelectionCells.current = [...roomSelectionCells.current, point.cell];
    onDocumentChange((current) => current, {
      type: "region",
      cells: roomSelectionCells.current,
      label: "Room selection",
    });
  }

  function applyRoomFill(event: PointerEvent<HTMLDivElement>) {
    const point = gridPointForEvent(event);
    if (!point) return;
    const cells = roomFillCells(document, point.cell);
    if (!cells.length) return;
    const existingRoomId = selectedRoomId(selected);
    const roomId = existingRoomId ?? nextRoomRegionId(document);
    onDocumentChange((current) => paintRoomCells(current, cells, roomId), {
      type: "region",
      cells,
      label:
        existingRoomId && selected?.type === "region"
          ? selected.label
          : `Room ${document.rooms.length + 1}`,
      roomId,
    });
  }

  function updateRoomFillPreview(event: PointerEvent<HTMLDivElement>) {
    const point = gridPointForEvent(event);
    setFillPreviewCells(point ? roomFillCells(document, point.cell) : []);
  }

  function applyCellTool(event: PointerEvent<HTMLDivElement>) {
    const point = gridPointForEvent(event);
    if (!point) return;
    const nextKey = `${point.cell.x},${point.cell.y},${activeTool}`;
    if (nextKey === lastPaintedCell.current) return;
    lastPaintedCell.current = nextKey;
    const selection = roomCellSelection(activeTool, point.cell, roomBrushTargetId.current);
    const mergeWithPrevious = brushStrokeStarted.current;
    brushStrokeStarted.current = true;
    onDocumentChange((current) => applyCellUpdate(current, point.cell), selection, {
      mergeWithPrevious,
    });
  }

  function applyCellUpdate(current: DungeonStudioDocument, cell: GridCell) {
    if (activeTool === "delete") return deleteMapCells(current, [cell]);
    if (activeTool === "erase") return eraseFloorCell(current, cell);
    if (activeTool === "erase-room") return eraseRoomCells(current, [cell]);
    if (activeTool === "room-brush") {
      return paintRoomCells(
        current,
        [cell],
        roomBrushTargetId.current ?? nextRoomRegionId(current),
      );
    }
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
        onPointerLeave={() => setFillPreviewCells([])}
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
          {fillPreviewCells.length ? <FillPreview cells={fillPreviewCells} /> : null}
          {document.rooms.map((room) => (
            <RoomOverlay key={room.id} room={room} />
          ))}
          {implicitWalls.map((edge) => (
            <EdgeLine key={edge.id} edge={edge} implicit />
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
