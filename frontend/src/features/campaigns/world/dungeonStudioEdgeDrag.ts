import type { DungeonStudioEdgeDirection } from "./dungeonStudioDocument";
import { DUNGEON_STUDIO_CELL_SIZE } from "./DungeonStudioPreviewElements";

export type DungeonStudioEdgeDragAxis = "horizontal" | "vertical";

export type DungeonStudioEdgeDragState = {
  startSvgX: number;
  startSvgY: number;
  startLocalX: number;
  startLocalY: number;
  lockedAxis?: DungeonStudioEdgeDragAxis;
};

const EDGE_DRAG_LOCK_THRESHOLD = DUNGEON_STUDIO_CELL_SIZE / 3;

export function edgeDragAxisForDelta(
  deltaX: number,
  deltaY: number,
  threshold = EDGE_DRAG_LOCK_THRESHOLD,
): DungeonStudioEdgeDragAxis | undefined {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  if (Math.max(absX, absY) < threshold) return undefined;
  return absX >= absY ? "horizontal" : "vertical";
}

export function edgeDragDirectionForAxis(
  drag: DungeonStudioEdgeDragState,
): DungeonStudioEdgeDirection | undefined {
  if (drag.lockedAxis === "horizontal") {
    return drag.startLocalY <= DUNGEON_STUDIO_CELL_SIZE / 2 ? "n" : "s";
  }
  if (drag.lockedAxis === "vertical") {
    return drag.startLocalX <= DUNGEON_STUDIO_CELL_SIZE / 2 ? "w" : "e";
  }
  return undefined;
}

export function updateEdgeDragAxis(
  drag: DungeonStudioEdgeDragState,
  svgX: number,
  svgY: number,
): DungeonStudioEdgeDragState {
  if (drag.lockedAxis) return drag;
  return {
    ...drag,
    lockedAxis: edgeDragAxisForDelta(svgX - drag.startSvgX, svgY - drag.startSvgY),
  };
}
