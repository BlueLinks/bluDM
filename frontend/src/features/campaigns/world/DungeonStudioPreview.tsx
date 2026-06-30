import { useMemo } from "react";
import {
  implicitBoundaryWalls,
  type DungeonStudioChangeOptions,
  type DungeonStudioSelection,
  type DungeonStudioTool,
} from "./dungeonStudioEditing";
import type { DungeonStudioDocument } from "./dungeonStudioDocument";
import type { DungeonStudioBrushShape, DungeonStudioDeleteTarget } from "./dungeonStudioBrushes";
import { cellLayerFill } from "./dungeonStudioPreviewViewport";
import { DungeonStudioCanvasToolbar } from "./DungeonStudioCanvasToolbar";
import { useDungeonStudioPreviewInteraction } from "./useDungeonStudioPreviewInteraction";
import {
  CellRect,
  EdgeLine,
  FillPreview,
  GridLines,
  RoomOverlay,
  SelectionOverlay,
  ShapePreview,
} from "./DungeonStudioPreviewElements";

export function DungeonStudioPreview({
  activeTool,
  brushShape,
  canRedo,
  canUndo,
  deleteTarget,
  dirty,
  document,
  saving,
  selected,
  onDocumentChange,
  onRedo,
  onSave,
  onUndo,
}: {
  activeTool: DungeonStudioTool;
  brushShape: DungeonStudioBrushShape;
  canRedo: boolean;
  canUndo: boolean;
  deleteTarget: DungeonStudioDeleteTarget;
  dirty: boolean;
  document: DungeonStudioDocument;
  saving: boolean;
  selected: DungeonStudioSelection;
  onDocumentChange: (
    update: (current: DungeonStudioDocument) => DungeonStudioDocument,
    selection: DungeonStudioSelection,
    options?: DungeonStudioChangeOptions,
  ) => void;
  onRedo: () => void;
  onSave: () => void;
  onUndo: () => void;
}) {
  const implicitWalls = useMemo(() => implicitBoundaryWalls(document), [document]);
  const {
    changeZoom,
    dimensions,
    fillPreviewCells,
    handlePointerCancel,
    handlePointerDown,
    handlePointerEnd,
    handlePointerLeave,
    handlePointerMove,
    handleWheel,
    maxZoom,
    minZoom,
    resetView,
    shapeDraft,
    viewBox,
    viewportRef,
    zoom,
    zoomStep,
  } = useDungeonStudioPreviewInteraction({
    activeTool,
    brushShape,
    deleteTarget,
    document,
    selected,
    onDocumentChange,
  });

  return (
    <div className="grid min-w-0 gap-3">
      <DungeonStudioCanvasToolbar
        canRedo={canRedo}
        canUndo={canUndo}
        dirty={dirty}
        maxZoom={maxZoom}
        minZoom={minZoom}
        saving={saving}
        zoom={zoom}
        onRedo={onRedo}
        onResetView={resetView}
        onSave={onSave}
        onUndo={onUndo}
        onZoomIn={() => changeZoom(zoomStep)}
        onZoomOut={() => changeZoom(-zoomStep)}
      />
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
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
        onContextMenu={(event) => event.preventDefault()}
        onAuxClick={(event) => {
          if (event.button === 1) event.preventDefault();
        }}
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
