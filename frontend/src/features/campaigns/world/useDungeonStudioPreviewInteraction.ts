import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import {
  applyEdgeFeatureStroke,
  canToggleEdgeFeature,
  edgeFeatureAt,
  nextRoomRegionId,
  paintRoomCells,
  roomFillCells,
  roomRegionForCell,
  toggleEdgeFeature,
  type DungeonStudioChangeOptions,
  type DungeonStudioEdgeStrokeAction,
  type DungeonStudioSelection,
  type DungeonStudioTool,
} from "./dungeonStudioEditing";
import { cellKey, type DungeonStudioDocument, type GridCell } from "./dungeonStudioDocument";
import {
  brushShapeCells,
  brushShapePreviewTool,
  type DungeonStudioBrushShape,
  type DungeonStudioDeleteTarget,
} from "./dungeonStudioBrushes";
import { applyPreviewCellUpdates, applyPreviewEraseUpdates } from "./dungeonStudioPreviewApply";
import {
  isBrushTool,
  isDraggableEdgeTool,
  isEdgeEraseTool,
  roomCellSelection,
  safeSetPointerCapture,
  selectedRoomId,
  shapeSelection,
  shapeToolLabel,
  usesBrushShapeDraft,
} from "./dungeonStudioPreviewTools";
import { clamp, clampPan, wheelZoomPan } from "./dungeonStudioPreviewViewport";
import {
  closestDiagonalDirection,
  closestOrthogonalDirection,
  DUNGEON_STUDIO_CELL_SIZE,
  type DungeonStudioShapeDraft,
} from "./DungeonStudioPreviewElements";

const CELL_SIZE = DUNGEON_STUDIO_CELL_SIZE;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.35;

type ShapeDraft = DungeonStudioShapeDraft;

type UseDungeonStudioPreviewInteractionArgs = {
  activeTool: DungeonStudioTool;
  brushShape: DungeonStudioBrushShape;
  deleteTarget: DungeonStudioDeleteTarget;
  document: DungeonStudioDocument;
  selected: DungeonStudioSelection;
  onDocumentChange: (
    update: (current: DungeonStudioDocument) => DungeonStudioDocument,
    selection: DungeonStudioSelection,
    options?: DungeonStudioChangeOptions,
  ) => void;
};

export function useDungeonStudioPreviewInteraction({
  activeTool,
  brushShape,
  deleteTarget,
  document,
  selected,
  onDocumentChange,
}: UseDungeonStudioPreviewInteractionArgs) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const drawing = useRef(false);
  const brushStrokeStarted = useRef(false);
  const erasingStroke = useRef(false);
  const edgeStrokeStarted = useRef(false);
  const edgeStrokeAction = useRef<DungeonStudioEdgeStrokeAction>("add");
  const edgeStrokeKind = useRef<"wall" | "cliff-edge">("wall");
  const roomSelectionCells = useRef<GridCell[]>([]);
  const roomBrushTargetId = useRef<string | null>(null);
  const shapeDraftRef = useRef<ShapeDraft | null>(null);
  const eraseShapeDraft = useRef(false);
  const lastPaintedCell = useRef("");
  const lastPaintedEdge = useRef("");
  const [shapeDraft, setShapeDraft] = useState<ShapeDraft | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fillPreviewCells, setFillPreviewCells] = useState<GridCell[]>([]);
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

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nextZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, zoom - Math.sign(event.deltaY) * ZOOM_STEP),
    );
    if (nextZoom === zoom) return;
    setPan(wheelZoomPan(event, rect, pan, dimensions, zoom, nextZoom));
    setZoom(nextZoom);
  }

  function resetView() {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.altKey) return startPan(event);
    event.preventDefault();
    safeSetPointerCapture(event);
    if (event.button === 2) return startEraseStroke(event);
    if (activeTool === "select") return selectCell(event);
    if (activeTool === "room-fill") return applyRoomFill(event);
    if (isDraggableEdgeTool(activeTool)) return startEdgeStroke(event);
    if (activeTool === "room-select" && brushShape === "single") {
      drawing.current = true;
      roomSelectionCells.current = [];
      return addRoomSelectionCell(event);
    }
    if (usesBrushShapeDraft(activeTool, brushShape)) return startBrushShapeDraft(event);
    if (isBrushTool(activeTool)) {
      roomBrushTargetId.current =
        activeTool === "room-brush"
          ? (selectedRoomId(selected) ?? nextRoomRegionId(document))
          : null;
      drawing.current = true;
      brushStrokeStarted.current = false;
      return applyCellTool(event);
    }
    return applyEdgeTool(event);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (panStart.current) return movePan(event);
    if (shapeDraftRef.current) return updateShapeDraft(event);
    if (activeTool === "room-fill") updateRoomFillPreview(event);
    if (!drawing.current) return;
    if (edgeStrokeStarted.current) applyEdgeStroke(event);
    else if (activeTool === "room-select" && !erasingStroke.current) addRoomSelectionCell(event);
    else applyCellTool(event);
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    panStart.current = null;
    if (shapeDraftRef.current) applyShapeDraft(event);
    resetStrokeState();
  }

  function handlePointerCancel() {
    panStart.current = null;
    resetStrokeState();
    cancelShapeDraft();
  }

  function handlePointerLeave() {
    setFillPreviewCells([]);
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

  function startEraseStroke(event: PointerEvent<HTMLDivElement>) {
    erasingStroke.current = true;
    if (isEdgeEraseTool(activeTool)) return startEdgeEraseStroke(event);
    if (usesBrushShapeDraft(activeTool, brushShape)) return startBrushShapeDraft(event, true);
    drawing.current = true;
    brushStrokeStarted.current = false;
    applyCellTool(event);
  }

  function resetStrokeState() {
    drawing.current = false;
    brushStrokeStarted.current = false;
    erasingStroke.current = false;
    edgeStrokeStarted.current = false;
    roomSelectionCells.current = [];
    roomBrushTargetId.current = null;
    lastPaintedCell.current = "";
    lastPaintedEdge.current = "";
    eraseShapeDraft.current = false;
  }

  function startBrushShapeDraft(event: PointerEvent<HTMLDivElement>, erase = false) {
    eraseShapeDraft.current = erase;
    if (activeTool === "room-brush" && !erase) {
      roomBrushTargetId.current = selectedRoomId(selected) ?? nextRoomRegionId(document);
    }
    const point = gridPointForEvent(event);
    if (!point) return;
    const draft = {
      tool: brushShapePreviewTool(brushShape),
      start: point.cell,
      current: point.cell,
      cells: brushShapeCells(document, brushShape, point.cell, point.cell),
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
      cells: brushShapeCells(document, brushShape, currentDraft.start, point.cell),
    } satisfies ShapeDraft;
    shapeDraftRef.current = draft;
    setShapeDraft(draft);
  }

  function applyShapeDraft(event: PointerEvent<HTMLDivElement>) {
    updateShapeDraft(event);
    const draft = shapeDraftRef.current;
    if (!draft) return;
    const selection = eraseShapeDraft.current
      ? ({
          type: "region",
          cells: draft.cells,
          label: "Erase area",
        } satisfies DungeonStudioSelection)
      : shapeSelection({
          activeTool,
          cells: draft.cells,
          fallbackLabel: shapeToolLabel(draft.tool),
          roomId: roomBrushTargetId.current,
          selected,
        });
    onDocumentChange(
      (current) =>
        eraseShapeDraft.current
          ? applyPreviewEraseUpdates(current, draft.cells, activeTool, deleteTarget)
          : applyPreviewCellUpdates(current, draft.cells, {
              activeTool,
              deleteTarget,
              roomBrushTargetId: roomBrushTargetId.current,
            }),
      selection,
    );
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
    const existingRoomId = selectedRoomId(selected);
    const cells = roomFillCells(document, point.cell, { roomId: existingRoomId });
    if (!cells.length) return;
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
    setFillPreviewCells(
      point ? roomFillCells(document, point.cell, { roomId: selectedRoomId(selected) }) : [],
    );
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
    onDocumentChange(
      (current) =>
        erasingStroke.current
          ? applyPreviewEraseUpdates(current, [point.cell], activeTool, deleteTarget)
          : applyPreviewCellUpdates(current, [point.cell], {
              activeTool,
              deleteTarget,
              roomBrushTargetId: roomBrushTargetId.current,
            }),
      selection,
      { mergeWithPrevious },
    );
  }

  function startEdgeStroke(event: PointerEvent<HTMLDivElement>) {
    const point = edgePointForEvent(event);
    if (!point) return;
    edgeStrokeKind.current = activeTool === "cliff-edge" ? "cliff-edge" : "wall";
    edgeStrokeAction.current =
      edgeFeatureAt(document, point.cell, point.direction)?.kind === edgeStrokeKind.current
        ? "remove"
        : "add";
    drawing.current = true;
    edgeStrokeStarted.current = true;
    lastPaintedEdge.current = "";
    applyEdgeStroke(event);
  }

  function startEdgeEraseStroke(event: PointerEvent<HTMLDivElement>) {
    const point = edgePointForEvent(event);
    if (!point) return;
    edgeStrokeAction.current = "remove";
    edgeStrokeKind.current = activeTool === "cliff-edge" ? "cliff-edge" : "wall";
    drawing.current = true;
    edgeStrokeStarted.current = true;
    lastPaintedEdge.current = "";
    applyEdgeStroke(event);
  }

  function applyEdgeStroke(event: PointerEvent<HTMLDivElement>) {
    const point = edgePointForEvent(event);
    if (!point) return;
    const key = `${point.cell.x},${point.cell.y},${point.direction}`;
    if (key === lastPaintedEdge.current) return;
    lastPaintedEdge.current = key;
    const kind = edgeStrokeKind.current;
    if (
      edgeStrokeAction.current === "add" &&
      !canToggleEdgeFeature(document, point.cell, point.direction)
    ) {
      onDocumentChange((current) => current, {
        type: "edge",
        cell: point.cell,
        direction: point.direction,
        kind: `Invalid ${kind}`,
      });
      return;
    }
    onDocumentChange(
      (current) =>
        applyEdgeFeatureStroke(
          current,
          point.cell,
          point.direction,
          kind,
          edgeStrokeAction.current,
        ),
      { type: "edge", cell: point.cell, direction: point.direction, kind },
      { mergeWithPrevious: brushStrokeStarted.current },
    );
    brushStrokeStarted.current = true;
  }

  function applyEdgeTool(event: PointerEvent<HTMLDivElement>) {
    const point = edgePointForEvent(event);
    if (!point) return;
    const kind =
      activeTool === "door" ? "door" : activeTool === "cliff-edge" ? "cliff-edge" : "wall";
    if (!canToggleEdgeFeature(document, point.cell, point.direction)) {
      onDocumentChange((current) => current, {
        type: "edge",
        cell: point.cell,
        direction: point.direction,
        kind: `Invalid ${kind}`,
      });
      return;
    }
    onDocumentChange((current) => toggleEdgeFeature(current, point.cell, point.direction, kind), {
      type: "edge",
      cell: point.cell,
      direction: point.direction,
      kind,
    });
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
    return { cell, localX: svgX - cell.x * CELL_SIZE, localY: svgY - cell.y * CELL_SIZE };
  }

  function edgePointForEvent(event: PointerEvent<HTMLDivElement>) {
    const point = gridPointForEvent(event);
    if (!point) return null;
    return {
      ...point,
      direction:
        activeTool === "diagonal-wall"
          ? closestDiagonalDirection(point.localX, point.localY)
          : closestOrthogonalDirection(point.localX, point.localY),
    };
  }

  return {
    dimensions,
    fillPreviewCells,
    handlePointerCancel,
    handlePointerDown,
    handlePointerEnd,
    handlePointerLeave,
    handlePointerMove,
    handleWheel,
    maxZoom: MAX_ZOOM,
    minZoom: MIN_ZOOM,
    resetView,
    shapeDraft,
    viewBox,
    viewportRef,
    zoom,
    zoomStep: ZOOM_STEP,
    changeZoom,
  };
}
