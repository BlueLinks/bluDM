import type { DungeonStudioDocument, GridCell } from "./dungeonStudioDocument";
import type { DungeonStudioShapeTool } from "./dungeonStudioEditing";

export function rectangleRoomCells(
  document: DungeonStudioDocument,
  start: GridCell,
  end: GridCell,
) {
  return boundedRectangleCells(document, start, end);
}

export function squareRoomCells(document: DungeonStudioDocument, start: GridCell, end: GridCell) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const side = Math.max(Math.abs(dx), Math.abs(dy));
  const squareEnd = {
    x: start.x + side * directionSign(dx),
    y: start.y + side * directionSign(dy),
  };
  return boundedRectangleCells(document, start, squareEnd);
}

export function ellipseRoomCells(document: DungeonStudioDocument, start: GridCell, end: GridCell) {
  return boundedEllipseCells(document, start, end);
}

export function circleRoomCells(document: DungeonStudioDocument, start: GridCell, end: GridCell) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const radius = Math.max(Math.abs(dx), Math.abs(dy));
  const circleEnd = {
    x: start.x + radius * directionSign(dx),
    y: start.y + radius * directionSign(dy),
  };
  return boundedEllipseCells(document, start, circleEnd);
}

export function shapeRoomCells(
  document: DungeonStudioDocument,
  tool: DungeonStudioShapeTool,
  start: GridCell,
  end: GridCell,
) {
  switch (tool) {
    case "rectangle-room":
      return rectangleRoomCells(document, start, end);
    case "square-room":
      return squareRoomCells(document, start, end);
    case "circle-room":
      return circleRoomCells(document, start, end);
    case "ellipse-room":
      return ellipseRoomCells(document, start, end);
  }
}

function boundedRectangleCells(document: DungeonStudioDocument, start: GridCell, end: GridCell) {
  const bounds = cellBounds(document, start, end);
  const cells: GridCell[] = [];
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) cells.push({ x, y });
  }
  return cells;
}

function boundedEllipseCells(document: DungeonStudioDocument, start: GridCell, end: GridCell) {
  const bounds = cellBounds(document, start, end);
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const radiusX = width / 2;
  const radiusY = height / 2;
  const centerX = bounds.minX + radiusX;
  const centerY = bounds.minY + radiusY;
  const cells: GridCell[] = [];

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const normalizedX = (x + 0.5 - centerX) / radiusX;
      const normalizedY = (y + 0.5 - centerY) / radiusY;
      if (normalizedX * normalizedX + normalizedY * normalizedY <= 1) cells.push({ x, y });
    }
  }

  return cells.length ? cells : boundedRectangleCells(document, start, end);
}

function cellBounds(document: DungeonStudioDocument, start: GridCell, end: GridCell) {
  const startX = clamp(start.x, 0, document.grid.width - 1);
  const startY = clamp(start.y, 0, document.grid.height - 1);
  const endX = clamp(end.x, 0, document.grid.width - 1);
  const endY = clamp(end.y, 0, document.grid.height - 1);
  return {
    minX: Math.min(startX, endX),
    maxX: Math.max(startX, endX),
    minY: Math.min(startY, endY),
    maxY: Math.max(startY, endY),
  };
}

function directionSign(value: number) {
  return value < 0 ? -1 : 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
