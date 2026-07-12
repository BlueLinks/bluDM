import { DUNGEON_STUDIO_CELL_SIZE } from "./DungeonStudioPreviewElements";
import type { DungeonStudioDocument, GridCell } from "./dungeonStudioDocument";

export function dungeonStudioPreviewViewBox(
  document: DungeonStudioDocument,
  focusRoomLocationId?: string,
) {
  const focusedCells = focusRoomLocationId
    ? focusedRoomPreviewCells(document, focusRoomLocationId)
    : null;
  const cells = focusedCells ?? documentContentCells(document);
  return viewBoxForCells(cells, document, focusedCells ? 2 : 1);
}

export function documentContentCells(document: DungeonStudioDocument) {
  return uniqueCells([
    ...document.layers.flatMap((layer) => layer.cells),
    ...document.rooms.flatMap((room) => room.cells),
    ...document.edges.map((edge) => edge.cell),
    ...document.entities.map((entity) => entity.cell),
  ]);
}

function focusedRoomPreviewCells(document: DungeonStudioDocument, locationId: string) {
  const room = document.rooms.find((item) => item.locationId === locationId);
  if (!room) return null;
  const adjacentRoomCells = document.rooms
    .filter((item) => item.id !== room.id && roomsTouch(room.cells, item.cells))
    .flatMap((item) => item.cells);
  const focusBounds = boundsForCells([...room.cells, ...adjacentRoomCells]);
  const nearbyEntities = focusBounds
    ? document.entities
        .filter((entity) => cellInPaddedBounds(entity.cell, focusBounds, 1))
        .map((e) => e.cell)
    : [];
  const nearbyEdges = focusBounds
    ? document.edges
        .filter((edge) => cellInPaddedBounds(edge.cell, focusBounds, 1))
        .map((e) => e.cell)
    : [];
  return uniqueCells([...room.cells, ...adjacentRoomCells, ...nearbyEntities, ...nearbyEdges]);
}

function viewBoxForCells(cells: GridCell[], document: DungeonStudioDocument, paddingCells: number) {
  const bounds = boundsForCells(cells);
  if (!bounds) {
    return `0 0 ${document.grid.width * DUNGEON_STUDIO_CELL_SIZE} ${document.grid.height * DUNGEON_STUDIO_CELL_SIZE}`;
  }
  const minX = Math.max(0, bounds.minX - paddingCells);
  const minY = Math.max(0, bounds.minY - paddingCells);
  const maxX = Math.min(document.grid.width, bounds.maxX + paddingCells + 1);
  const maxY = Math.min(document.grid.height, bounds.maxY + paddingCells + 1);
  const width = Math.max(1, maxX - minX) * DUNGEON_STUDIO_CELL_SIZE;
  const height = Math.max(1, maxY - minY) * DUNGEON_STUDIO_CELL_SIZE;
  return `${minX * DUNGEON_STUDIO_CELL_SIZE} ${minY * DUNGEON_STUDIO_CELL_SIZE} ${width} ${height}`;
}

function boundsForCells(cells: GridCell[]) {
  if (!cells.length) return null;
  const xs = cells.map((cell) => cell.x);
  const ys = cells.map((cell) => cell.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function cellInPaddedBounds(
  cell: GridCell,
  bounds: NonNullable<ReturnType<typeof boundsForCells>>,
  padding: number,
) {
  return (
    cell.x >= bounds.minX - padding &&
    cell.x <= bounds.maxX + padding &&
    cell.y >= bounds.minY - padding &&
    cell.y <= bounds.maxY + padding
  );
}

function roomsTouch(left: GridCell[], right: GridCell[]) {
  const rightKeys = new Set(right.map((cell) => `${cell.x},${cell.y}`));
  return left.some((cell) =>
    [
      `${cell.x + 1},${cell.y}`,
      `${cell.x - 1},${cell.y}`,
      `${cell.x},${cell.y + 1}`,
      `${cell.x},${cell.y - 1}`,
    ].some((key) => rightKeys.has(key)),
  );
}

function uniqueCells(cells: GridCell[]) {
  return [...new Map(cells.map((cell) => [`${cell.x},${cell.y}`, cell])).values()];
}
