import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import type { DungeonStudioDocument } from "./dungeonStudioDocument";
import { DUNGEON_STUDIO_CELL_SIZE } from "./DungeonStudioPreviewElements";
import { safeSetPointerCapture } from "./dungeonStudioPreviewTools";
import { clampPan, wheelZoomPan } from "./dungeonStudioPreviewViewport";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.35;

export function useDungeonStudioViewport(document: DungeonStudioDocument) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dimensions = useMemo(
    () => ({
      width: document.grid.width * DUNGEON_STUDIO_CELL_SIZE,
      height: document.grid.height * DUNGEON_STUDIO_CELL_SIZE,
    }),
    [document.grid.height, document.grid.width],
  );
  const viewWidth = dimensions.width / zoom;
  const viewHeight = dimensions.height / zoom;

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

  function startPan(event: PointerEvent<HTMLDivElement>) {
    panStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    safeSetPointerCapture(event);
  }

  function movePan(event: PointerEvent<HTMLDivElement>) {
    if (!panStart.current || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    setPan(
      clampPan(
        {
          x:
            panStart.current.panX - ((event.clientX - panStart.current.x) / rect.width) * viewWidth,
          y:
            panStart.current.panY -
            ((event.clientY - panStart.current.y) / rect.height) * viewHeight,
        },
        dimensions,
        zoom,
      ),
    );
  }

  return {
    changeZoom,
    dimensions,
    endPan: () => {
      panStart.current = null;
    },
    handleWheel,
    isPanning: () => Boolean(panStart.current),
    maxZoom: MAX_ZOOM,
    minZoom: MIN_ZOOM,
    movePan,
    pan,
    resetView,
    startPan,
    viewBox: `${pan.x} ${pan.y} ${viewWidth} ${viewHeight}`,
    viewHeight,
    viewportRef,
    viewWidth,
    zoom,
    zoomStep: ZOOM_STEP,
  };
}
