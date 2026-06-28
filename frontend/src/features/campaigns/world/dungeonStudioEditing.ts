import {
  cellKey,
  edgeKey,
  normalizeEdgeReference,
  serializeDungeonStudioDocument,
  type DungeonStudioDocument,
  type DungeonStudioEdgeDirection,
  type DungeonStudioEdgeFeature,
  type GridCell,
} from "./dungeonStudioDocument";

export type DungeonStudioTool =
  | "floor"
  | "erase"
  | "rectangle-room"
  | "square-room"
  | "circle-room"
  | "ellipse-room"
  | "wall"
  | "diagonal-wall"
  | "door";

export type DungeonStudioShapeTool = Extract<
  DungeonStudioTool,
  "rectangle-room" | "square-room" | "circle-room" | "ellipse-room"
>;

export type DungeonStudioSelection =
  | { type: "cell"; cell: GridCell }
  | { type: "edge"; cell: GridCell; direction: DungeonStudioEdgeDirection; kind: string }
  | { type: "region"; cells: GridCell[]; label: string }
  | null;

export type DungeonStudioHistoryStacks = {
  undoStack: DungeonStudioDocument[];
  redoStack: DungeonStudioDocument[];
};

export function paintFloorCell(document: DungeonStudioDocument, cell: GridCell) {
  return paintFloorCells(document, [cell]);
}

export function paintFloorCells(document: DungeonStudioDocument, cells: GridCell[]) {
  const validCells = cells.filter((cell) => cellInBounds(document, cell));
  if (!validCells.length) return document;
  return updateFloorCells(document, (currentCells) => mergeCells(currentCells, validCells));
}

export function eraseFloorCell(document: DungeonStudioDocument, cell: GridCell) {
  return eraseFloorCells(document, [cell]);
}

export function eraseFloorCells(document: DungeonStudioDocument, cells: GridCell[]) {
  const eraseKeys = new Set(cells.map(cellKey));
  const nextDocument = updateFloorCells(document, (currentCells) =>
    currentCells.filter((item) => !eraseKeys.has(cellKey(item))),
  );
  const floorKeys = new Set(floorCells(nextDocument).map(cellKey));
  return {
    ...nextDocument,
    rooms: nextDocument.rooms.map((room) => ({
      ...room,
      cells: room.cells.filter((roomCell) => floorKeys.has(cellKey(roomCell))),
    })),
  };
}

export function toggleEdgeFeature(
  document: DungeonStudioDocument,
  cell: GridCell,
  direction: DungeonStudioEdgeDirection,
  kind: DungeonStudioEdgeFeature["kind"],
): DungeonStudioDocument {
  const edge = normalizeEdgeReference(cell, direction);
  const key = edgeKey(edge.cell, edge.direction);
  const existing = document.edges.find(
    (feature) => edgeKey(feature.cell, feature.direction) === key,
  );
  const remaining = document.edges.filter(
    (feature) => edgeKey(feature.cell, feature.direction) !== key,
  );
  if (existing?.kind === kind) return { ...document, edges: remaining };
  return {
    ...document,
    edges: [
      ...remaining,
      {
        id: `${kind}-${key}`,
        cell: edge.cell,
        direction: edge.direction,
        kind,
        state: kind === "door" ? "closed" : undefined,
      },
    ],
  };
}

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

export function isShapeTool(tool: DungeonStudioTool): tool is DungeonStudioShapeTool {
  return (
    tool === "rectangle-room" ||
    tool === "square-room" ||
    tool === "circle-room" ||
    tool === "ellipse-room"
  );
}

export function addOuterWallsAroundFloorCells(
  document: DungeonStudioDocument,
  regionCells?: GridCell[],
): DungeonStudioDocument {
  const sourceCells = regionCells?.length ? regionCells : floorCells(document);
  const validCells = sourceCells.filter((cell) => cellInBounds(document, cell));
  if (!validCells.length) return document;

  const sourceKeys = new Set(validCells.map(cellKey));
  const existingEdges = new globalThis.Map(
    document.edges.map((feature) => [edgeKey(feature.cell, feature.direction), feature]),
  );
  const nextEdges = [...document.edges];

  for (const cell of validCells) {
    for (const direction of ORTHOGONAL_DIRECTIONS) {
      const neighbor = neighborCell(cell, direction);
      if (cellInBounds(document, neighbor) && sourceKeys.has(cellKey(neighbor))) continue;

      const edge = normalizeEdgeReference(cell, direction);
      const key = edgeKey(edge.cell, edge.direction);
      if (existingEdges.has(key)) continue;

      const wall = {
        id: `wall-${key}`,
        cell: edge.cell,
        direction: edge.direction,
        kind: "wall",
      } satisfies DungeonStudioEdgeFeature;
      existingEdges.set(key, wall);
      nextEdges.push(wall);
    }
  }

  return { ...document, edges: nextEdges };
}

export function floorCells(document: DungeonStudioDocument) {
  return document.layers
    .filter((layer) => layer.kind === "cells" && layer.cellKind === "floor")
    .flatMap((layer) => layer.cells);
}

export function sameStudioDocument(left: DungeonStudioDocument, right: DungeonStudioDocument) {
  return studioDocumentSignature(left) === studioDocumentSignature(right);
}

export function studioDocumentSignature(document: DungeonStudioDocument) {
  return JSON.stringify(serializeDungeonStudioDocument(document));
}

export function commitDungeonStudioChange(
  current: DungeonStudioDocument,
  update: (current: DungeonStudioDocument) => DungeonStudioDocument,
  stacks: DungeonStudioHistoryStacks,
  limit = 50,
) {
  const nextDocument = update(current);
  if (sameStudioDocument(current, nextDocument)) {
    return {
      document: current,
      undoStack: stacks.undoStack,
      redoStack: stacks.redoStack,
      changed: false,
    };
  }
  return {
    document: nextDocument,
    undoStack: [...stacks.undoStack, current].slice(-limit),
    redoStack: [],
    changed: true,
  };
}

export function undoDungeonStudioChange(
  current: DungeonStudioDocument,
  stacks: DungeonStudioHistoryStacks,
  limit = 50,
) {
  const previous = stacks.undoStack.at(-1);
  if (!previous) {
    return {
      document: current,
      undoStack: stacks.undoStack,
      redoStack: stacks.redoStack,
      changed: false,
    };
  }
  return {
    document: previous,
    undoStack: stacks.undoStack.slice(0, -1),
    redoStack: [current, ...stacks.redoStack].slice(0, limit),
    changed: true,
  };
}

export function redoDungeonStudioChange(
  current: DungeonStudioDocument,
  stacks: DungeonStudioHistoryStacks,
  limit = 50,
) {
  const next = stacks.redoStack[0];
  if (!next) {
    return {
      document: current,
      undoStack: stacks.undoStack,
      redoStack: stacks.redoStack,
      changed: false,
    };
  }
  return {
    document: next,
    undoStack: [...stacks.undoStack, current].slice(-limit),
    redoStack: stacks.redoStack.slice(1),
    changed: true,
  };
}

const ORTHOGONAL_DIRECTIONS = ["n", "e", "s", "w"] as const;

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

function updateFloorCells(
  document: DungeonStudioDocument,
  update: (cells: GridCell[]) => GridCell[],
): DungeonStudioDocument {
  const floorLayerIndex = document.layers.findIndex(
    (layer) => layer.kind === "cells" && layer.cellKind === "floor",
  );
  if (floorLayerIndex < 0) {
    return {
      ...document,
      layers: [
        ...document.layers,
        {
          id: "floor",
          name: "Floor",
          kind: "cells",
          visible: true,
          opacity: 1,
          cellKind: "floor",
          cells: update([]),
        },
      ],
    };
  }
  return {
    ...document,
    layers: document.layers.map((layer, index) =>
      index === floorLayerIndex ? { ...layer, cells: update(layer.cells) } : layer,
    ),
  };
}

function mergeCells(currentCells: GridCell[], nextCells: GridCell[]) {
  const merged = new globalThis.Map(currentCells.map((item) => [cellKey(item), item]));
  for (const cell of nextCells) merged.set(cellKey(cell), cell);
  return [...merged.values()].sort((left, right) => left.y - right.y || left.x - right.x);
}

function neighborCell(cell: GridCell, direction: (typeof ORTHOGONAL_DIRECTIONS)[number]) {
  if (direction === "n") return { x: cell.x, y: cell.y - 1 };
  if (direction === "e") return { x: cell.x + 1, y: cell.y };
  if (direction === "s") return { x: cell.x, y: cell.y + 1 };
  return { x: cell.x - 1, y: cell.y };
}

function cellInBounds(document: DungeonStudioDocument, cell: GridCell) {
  return (
    cell.x >= 0 && cell.x < document.grid.width && cell.y >= 0 && cell.y < document.grid.height
  );
}

function directionSign(value: number) {
  return value < 0 ? -1 : 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
