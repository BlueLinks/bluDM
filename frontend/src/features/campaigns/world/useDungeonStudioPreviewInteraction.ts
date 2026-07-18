import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  applyEdgeFeatureStroke,
  canToggleEdgeFeature,
  edgeFeatureAt,
  entityAtCell,
  nextRoomRegionId,
  paintRoomCells,
  placeObjectEntity,
  roomFillCells,
  roomRegionForCell,
  toggleEdgeFeature,
  type DungeonStudioChangeOptions,
  type DungeonStudioEdgeStrokeAction,
  type DungeonStudioSelection,
  type DungeonStudioTool,
} from "./dungeonStudioEditing";
import { type DungeonStudioDocument, type GridCell } from "./dungeonStudioDocument";
import {
  edgeDragStateFromPoint,
  edgePathForDrag,
  hoverEdgePath,
  updateEdgeDragAxis,
  type DungeonStudioEdgeDragState,
  type DungeonStudioEdgePathSegment,
} from "./dungeonStudioEdgeDrag";
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
import { clamp } from "./dungeonStudioPreviewViewport";
import {
  closestDiagonalDirection,
  closestOrthogonalDirection,
  DUNGEON_STUDIO_CELL_SIZE,
  type DungeonStudioShapeDraft,
} from "./DungeonStudioPreviewElements";
import { useDungeonStudioViewport } from "./useDungeonStudioViewport";

const CELL_SIZE = DUNGEON_STUDIO_CELL_SIZE;

type ShapeDraft = DungeonStudioShapeDraft;

type UseDungeonStudioPreviewInteractionArgs = {
  activeTool: DungeonStudioTool;
  brushShape: DungeonStudioBrushShape;
  deleteTarget: DungeonStudioDeleteTarget;
  document: DungeonStudioDocument;
  selectedObjectAssetKey: string;
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
  selectedObjectAssetKey,
  onDocumentChange,
}: UseDungeonStudioPreviewInteractionArgs) {
  const viewport = useDungeonStudioViewport(document);
  const drawing = useRef(false);
  const brushStrokeStarted = useRef(false);
  const erasingStroke = useRef(false);
  const edgeStrokeStarted = useRef(false);
  const edgeStrokeAction = useRef<DungeonStudioEdgeStrokeAction>("add");
  const edgeStrokeKind = useRef<"wall" | "cliff-edge">("wall");
  const edgeDrag = useRef<DungeonStudioEdgeDragState | null>(null);
  const roomBrushTargetId = useRef<string | null>(null);
  const shapeDraftRef = useRef<ShapeDraft | null>(null);
  const eraseShapeDraft = useRef(false);
  const lastPaintedCell = useRef("");
  const [shapeDraft, setShapeDraft] = useState<ShapeDraft | null>(null);
  const [fillPreviewCells, setFillPreviewCells] = useState<GridCell[]>([]);
  const [edgePreview, setEdgePreview] = useState<DungeonStudioEdgePathSegment[]>([]);
  const edgePreviewRef = useRef<DungeonStudioEdgePathSegment[]>([]);
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

  function setEdgePreviewState(edges: DungeonStudioEdgePathSegment[]) {
    edgePreviewRef.current = edges;
    setEdgePreview(edges);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.altKey || event.button === 1) {
      event.preventDefault();
      return viewport.startPan(event);
    }
    event.preventDefault();
    safeSetPointerCapture(event);
    if (event.button === 2) return startEraseStroke(event);
    if (activeTool === "select" || activeTool === "room-select") return selectCell(event);
    if (activeTool === "object") return placeSelectedObject(event);
    if (activeTool === "room-fill") return applyRoomFill(event);
    if (isDraggableEdgeTool(activeTool)) return startEdgeStroke(event);
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
    if (viewport.isPanning()) return viewport.movePan(event);
    if (shapeDraftRef.current) return updateShapeDraft(event);
    if (activeTool === "room-fill") updateRoomFillPreview(event);
    if (!drawing.current) return updateHoverPreview(event);
    if (edgeStrokeStarted.current) updateEdgeStrokePreview(event);
    else applyCellTool(event);
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    viewport.endPan();
    if (shapeDraftRef.current) applyShapeDraft(event);
    if (edgeStrokeStarted.current) commitEdgeStroke();
    resetStrokeState();
  }

  function handlePointerCancel() {
    viewport.endPan();
    resetStrokeState();
    cancelShapeDraft();
  }

  function handlePointerLeave() {
    setFillPreviewCells([]);
    if (!drawing.current) setEdgePreviewState([]);
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
    roomBrushTargetId.current = null;
    lastPaintedCell.current = "";
    edgeDrag.current = null;
    setEdgePreviewState([]);
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
    const entity = entityAtCell(document, point.cell);
    const room = roomRegionForCell(document, point.cell);
    onDocumentChange(
      (current) => current,
      entity
        ? { type: "entity", entityId: entity.id }
        : room
          ? { type: "region", cells: room.cells, label: room.label, roomId: room.id }
          : { type: "cell", cell: point.cell },
    );
  }

  function placeSelectedObject(event: PointerEvent<HTMLDivElement>) {
    const point = gridPointForEvent(event);
    if (!point || !selectedObjectAssetKey) return;
    onDocumentChange((current) => placeObjectEntity(current, point.cell, selectedObjectAssetKey), {
      type: "cell",
      cell: point.cell,
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
    edgeDrag.current = edgeDragStateFromPoint(point);
    edgeStrokeKind.current = activeTool === "cliff-edge" ? "cliff-edge" : "wall";
    edgeStrokeAction.current =
      edgeFeatureAt(document, point.cell, point.direction)?.kind === edgeStrokeKind.current
        ? "remove"
        : "add";
    drawing.current = true;
    edgeStrokeStarted.current = true;
    updateEdgeStrokePreview(event);
  }

  function startEdgeEraseStroke(event: PointerEvent<HTMLDivElement>) {
    const point = edgePointForEvent(event);
    if (!point) return;
    edgeDrag.current = edgeDragStateFromPoint(point);
    edgeStrokeAction.current = "remove";
    edgeStrokeKind.current = activeTool === "cliff-edge" ? "cliff-edge" : "wall";
    drawing.current = true;
    edgeStrokeStarted.current = true;
    updateEdgeStrokePreview(event);
  }

  function updateHoverPreview(event: PointerEvent<HTMLDivElement>) {
    if (!isDraggableEdgeTool(activeTool) && activeTool !== "door") return setEdgePreviewState([]);
    const point = edgePointForEvent(event);
    setEdgePreviewState(point ? hoverEdgePath(point) : []);
  }

  function updateEdgeStrokePreview(event: PointerEvent<HTMLDivElement>) {
    const point = edgePointForEvent(event);
    const drag = edgeDrag.current;
    if (!point || !drag) return;
    edgeDrag.current = updateEdgeDragAxis(drag, point.svgX, point.svgY);
    setEdgePreviewState(edgePathForDrag(edgeDrag.current, point));
  }

  function commitEdgeStroke() {
    const preview = edgePreviewRef.current;
    const kind = edgeStrokeKind.current;
    const validPreview = preview.filter(
      (edge) =>
        edgeStrokeAction.current === "remove" ||
        canToggleEdgeFeature(document, edge.cell, edge.direction),
    );
    const first = validPreview[0];
    if (!first) return;
    onDocumentChange(
      (current) =>
        validPreview.reduce(
          (next, edge) =>
            applyEdgeFeatureStroke(next, edge.cell, edge.direction, kind, edgeStrokeAction.current),
          current,
        ),
      { type: "edge", cell: first.cell, direction: first.direction, kind },
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
    const rect = viewport.viewportRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const svgX = viewport.pan.x + ((event.clientX - rect.left) / rect.width) * viewport.viewWidth;
    const svgY = viewport.pan.y + ((event.clientY - rect.top) / rect.height) * viewport.viewHeight;
    const cell = {
      x: clamp(Math.floor(svgX / CELL_SIZE), 0, document.grid.width - 1),
      y: clamp(Math.floor(svgY / CELL_SIZE), 0, document.grid.height - 1),
    };
    return {
      cell,
      localX: svgX - cell.x * CELL_SIZE,
      localY: svgY - cell.y * CELL_SIZE,
      svgX,
      svgY,
    };
  }

  function edgePointForEvent(event: PointerEvent<HTMLDivElement>) {
    const point = gridPointForEvent(event);
    if (!point) return null;
    if (activeTool === "diagonal-wall") {
      return { ...point, direction: closestDiagonalDirection(point.localX, point.localY) };
    }
    return {
      ...point,
      direction:
        edgeDrag.current?.startDirection ?? closestOrthogonalDirection(point.localX, point.localY),
    };
  }

  return {
    dimensions: viewport.dimensions,
    edgePreview,
    fillPreviewCells,
    handlePointerCancel,
    handlePointerDown,
    handlePointerEnd,
    handlePointerLeave,
    handlePointerMove,
    handleWheel: viewport.handleWheel,
    maxZoom: viewport.maxZoom,
    minZoom: viewport.minZoom,
    resetView: viewport.resetView,
    shapeDraft,
    viewBox: viewport.viewBox,
    viewportRef: viewport.viewportRef,
    zoom: viewport.zoom,
    zoomStep: viewport.zoomStep,
    changeZoom: viewport.changeZoom,
  };
}
