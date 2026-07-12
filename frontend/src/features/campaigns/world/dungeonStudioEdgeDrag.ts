import type { DungeonStudioEdgeDirection, GridCell } from "./dungeonStudioDocument";
import { DUNGEON_STUDIO_CELL_SIZE } from "./DungeonStudioPreviewElements";

export type DungeonStudioEdgeDragAxis = "horizontal" | "vertical" | "diagonal-ne" | "diagonal-nw";

export type DungeonStudioEdgeDragPoint = {
  cell: GridCell;
  direction: DungeonStudioEdgeDirection;
  svgX: number;
  svgY: number;
  localX: number;
  localY: number;
};

export type DungeonStudioEdgePathSegment = {
  cell: GridCell;
  direction: DungeonStudioEdgeDirection;
};

export type DungeonStudioEdgeDragState = {
  startSvgX: number;
  startSvgY: number;
  startLocalX: number;
  startLocalY: number;
  startCell: GridCell;
  startDirection: DungeonStudioEdgeDirection;
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

export function edgeDragAxisForDiagonalDirection(direction: DungeonStudioEdgeDirection) {
  return direction === "nw" || direction === "sw" ? "diagonal-nw" : "diagonal-ne";
}

export function edgeDragDirectionForAxis(
  drag: DungeonStudioEdgeDragState,
): DungeonStudioEdgeDirection | undefined {
  if (drag.lockedAxis === "horizontal") return horizontalDirection(drag.startDirection);
  if (drag.lockedAxis === "vertical") return verticalDirection(drag.startDirection);
  if (drag.lockedAxis === "diagonal-ne") return "ne";
  if (drag.lockedAxis === "diagonal-nw") return "nw";
  return undefined;
}

export function updateEdgeDragAxis(
  drag: DungeonStudioEdgeDragState,
  svgX: number,
  svgY: number,
): DungeonStudioEdgeDragState {
  if (drag.lockedAxis) return drag;
  const lockedAxis = isDiagonal(drag.startDirection)
    ? edgeDragAxisForDiagonalDirection(drag.startDirection)
    : edgeDragAxisForDelta(svgX - drag.startSvgX, svgY - drag.startSvgY);
  return { ...drag, lockedAxis };
}

export function edgeDragStateFromPoint(
  point: DungeonStudioEdgeDragPoint,
): DungeonStudioEdgeDragState {
  return {
    startSvgX: point.svgX,
    startSvgY: point.svgY,
    startLocalX: point.localX,
    startLocalY: point.localY,
    startCell: point.cell,
    startDirection: point.direction,
  };
}

export function edgePathForDrag(
  drag: DungeonStudioEdgeDragState,
  point: Pick<DungeonStudioEdgeDragPoint, "cell" | "svgX" | "svgY">,
): DungeonStudioEdgePathSegment[] {
  const locked = drag.lockedAxis ? drag : updateEdgeDragAxis(drag, point.svgX, point.svgY);
  const direction = edgeDragDirectionForAxis(locked) ?? drag.startDirection;
  if (locked.lockedAxis === "horizontal" || direction === "n" || direction === "s") {
    return range(drag.startCell.x, point.cell.x).map((x) => ({
      cell: { x, y: drag.startCell.y },
      direction: horizontalDirection(direction),
    }));
  }
  if (locked.lockedAxis === "vertical" || direction === "e" || direction === "w") {
    return range(drag.startCell.y, point.cell.y).map((y) => ({
      cell: { x: drag.startCell.x, y },
      direction: verticalDirection(direction),
    }));
  }
  const axis = locked.lockedAxis ?? edgeDragAxisForDiagonalDirection(direction);
  const step = diagonalStepForDrag(axis, point.svgX - drag.startSvgX, point.svgY - drag.startSvgY);
  return range(0, step).map((offset) => ({
    cell:
      axis === "diagonal-nw"
        ? { x: drag.startCell.x - offset, y: drag.startCell.y + offset }
        : { x: drag.startCell.x + offset, y: drag.startCell.y + offset },
    direction: axis === "diagonal-nw" ? "nw" : "ne",
  }));
}

export function hoverEdgePath(point: Pick<DungeonStudioEdgeDragPoint, "cell" | "direction">) {
  return [{ cell: point.cell, direction: point.direction }];
}

function horizontalDirection(direction: DungeonStudioEdgeDirection) {
  return direction === "s" ? "s" : "n";
}

function verticalDirection(direction: DungeonStudioEdgeDirection) {
  return direction === "e" ? "e" : "w";
}

function isDiagonal(direction: DungeonStudioEdgeDirection) {
  return direction === "ne" || direction === "nw" || direction === "se" || direction === "sw";
}

function diagonalStepForDrag(axis: DungeonStudioEdgeDragAxis, deltaX: number, deltaY: number) {
  const raw =
    axis === "diagonal-nw"
      ? (deltaY - deltaX) / (2 * DUNGEON_STUDIO_CELL_SIZE)
      : (deltaX + deltaY) / (2 * DUNGEON_STUDIO_CELL_SIZE);
  return Math.round(raw);
}

function range(start: number, end: number) {
  const step = start <= end ? 1 : -1;
  const values: number[] = [];
  for (let value = start; step > 0 ? value <= end : value >= end; value += step) {
    values.push(value);
  }
  return values;
}
