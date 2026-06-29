import { cellKey, type DungeonStudioDocument, type GridCell } from "./dungeonStudioDocument";

const ROOM_REGION_COLORS = ["#14b8a6", "#8b5cf6", "#f97316", "#22c55e", "#06b6d4"];

export function createRoomRegion(
  document: DungeonStudioDocument,
  cells: GridCell[],
  roomId = nextRoomRegionId(document),
) {
  return paintRoomCells(document, cells, roomId);
}

export function paintRoomCells(
  document: DungeonStudioDocument,
  cells: GridCell[],
  roomId = nextRoomRegionId(document),
) {
  const floorKeys = new Set(floorCells(document).map(cellKey));
  const validCells = cells.filter(
    (cell) => cellInBounds(document, cell) && floorKeys.has(cellKey(cell)),
  );
  if (!validCells.length) return document;
  const paintedKeys = new Set(validCells.map(cellKey));
  const existingRoom = document.rooms.find((room) => room.id === roomId);
  const nextRoom = existingRoom
    ? { ...existingRoom, cells: mergeCells(existingRoom.cells, validCells) }
    : {
        id: roomId,
        label: nextRoomRegionLabel(document),
        color: roomRegionColor(document.rooms.length),
        cells: mergeCells([], validCells),
      };
  const otherRooms = document.rooms.map((room) =>
    room.id === roomId
      ? nextRoom
      : { ...room, cells: room.cells.filter((cell) => !paintedKeys.has(cellKey(cell))) },
  );
  return {
    ...document,
    rooms: existingRoom ? otherRooms : [...otherRooms, nextRoom],
  };
}

export function eraseRoomCells(document: DungeonStudioDocument, cells: GridCell[]) {
  const eraseKeys = new Set(cells.map(cellKey));
  if (!eraseKeys.size) return document;
  return {
    ...document,
    rooms: document.rooms.map((room) => ({
      ...room,
      cells: room.cells.filter((cell) => !eraseKeys.has(cellKey(cell))),
    })),
  };
}

export function roomRegionForCell(document: DungeonStudioDocument, cell: GridCell) {
  const key = cellKey(cell);
  return document.rooms.find((room) => room.cells.some((roomCell) => cellKey(roomCell) === key));
}

export function nextRoomRegionId(document: DungeonStudioDocument) {
  const existingIds = new Set(document.rooms.map((room) => room.id));
  let index = document.rooms.length + 1;
  while (existingIds.has(`room-${index}`)) index += 1;
  return `room-${index}`;
}

function floorCells(document: DungeonStudioDocument) {
  return document.layers
    .filter((layer) => layer.kind === "cells" && layer.cellKind === "floor")
    .flatMap((layer) => layer.cells);
}

function mergeCells(currentCells: GridCell[], nextCells: GridCell[]) {
  const merged = new Map(currentCells.map((cell) => [cellKey(cell), cell]));
  nextCells.forEach((cell) => merged.set(cellKey(cell), cell));
  return [...merged.values()].sort((left, right) => left.y - right.y || left.x - right.x);
}

function nextRoomRegionLabel(document: DungeonStudioDocument) {
  return `Room ${document.rooms.length + 1}`;
}

function roomRegionColor(index: number) {
  return ROOM_REGION_COLORS[index % ROOM_REGION_COLORS.length];
}

function cellInBounds(document: DungeonStudioDocument, cell: GridCell) {
  return (
    cell.x >= 0 && cell.x < document.grid.width && cell.y >= 0 && cell.y < document.grid.height
  );
}
