import {
  circleRoomCells,
  ellipseRoomCells,
  rectangleRoomCells,
  shapeRoomCells,
  squareRoomCells,
} from "./dungeonStudioShapeGeometry";
export {
  createRoomRegion,
  deleteRoomRegion,
  eraseRoomCells,
  nextRoomRegionId,
  paintRoomCells,
  renameRoomRegion,
  roomFillCells,
  roomRegionForCell,
} from "./dungeonStudioRoomEditing";
export { implicitBoundaryWalls } from "./dungeonStudioWalls";
import {
  cellKey,
  edgeKey,
  normalizeEdgeReference,
  serializeDungeonStudioDocument,
  type DungeonStudioCellKind,
  type DungeonStudioDocument,
  type DungeonStudioEdgeDirection,
  type DungeonStudioEdgeFeature,
  type DungeonStudioTilesetKey,
  type GridCell,
} from "./dungeonStudioDocument";

export type DungeonStudioTool =
  | "select"
  | "floor"
  | "erase"
  | "delete"
  | "room-select"
  | "room-brush"
  | "room-fill"
  | "erase-room"
  | "rectangle-room"
  | "square-room"
  | "circle-room"
  | "ellipse-room"
  | "water"
  | "chasm"
  | "cliff"
  | "erase-terrain"
  | "wall"
  | "diagonal-wall"
  | "door"
  | "cliff-edge"
  | "object";

export type DungeonStudioShapeTool = Extract<
  DungeonStudioTool,
  "rectangle-room" | "square-room" | "circle-room" | "ellipse-room"
>;
export type DungeonStudioTerrainTool = Extract<DungeonStudioTool, "water" | "chasm" | "cliff">;

export type DungeonStudioSelection =
  | { type: "cell"; cell: GridCell }
  | { type: "edge"; cell: GridCell; direction: DungeonStudioEdgeDirection; kind: string }
  | { type: "region"; cells: GridCell[]; label: string; roomId?: string }
  | { type: "entity"; entityId: string }
  | null;

export type DungeonStudioHistoryStacks = {
  undoStack: DungeonStudioDocument[];
  redoStack: DungeonStudioDocument[];
};

export type DungeonStudioChangeOptions = {
  mergeWithPrevious?: boolean;
};

export function paintFloorCell(document: DungeonStudioDocument, cell: GridCell) {
  return paintFloorCells(document, [cell]);
}

export function paintFloorCells(document: DungeonStudioDocument, cells: GridCell[]) {
  return paintCellLayerCells(document, "floor", cells);
}

export function paintTerrainCell(
  document: DungeonStudioDocument,
  cell: GridCell,
  kind: DungeonStudioTerrainTool,
) {
  return paintTerrainCells(document, [cell], kind);
}

export function paintTerrainCells(
  document: DungeonStudioDocument,
  cells: GridCell[],
  kind: DungeonStudioTerrainTool,
) {
  const validCells = cells.filter((cell) => cellInBounds(document, cell));
  if (!validCells.length) return document;
  const paintedKeys = new Set(validCells.map(cellKey));
  const withoutOverlappingTerrain = removeCellsFromLayers(
    document,
    TERRAIN_CELL_KINDS.filter((cellKind) => cellKind !== kind),
    paintedKeys,
  );
  return paintCellLayerCells(withoutOverlappingTerrain, kind, validCells);
}

export function eraseTerrainCell(document: DungeonStudioDocument, cell: GridCell) {
  return eraseTerrainCells(document, [cell]);
}

export function eraseTerrainCells(document: DungeonStudioDocument, cells: GridCell[]) {
  return removeCellsFromLayers(document, TERRAIN_CELL_KINDS, new Set(cells.map(cellKey)));
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

export function deleteMapCells(document: DungeonStudioDocument, cells: GridCell[]) {
  const withoutTerrain = eraseTerrainCells(document, cells);
  const withoutFloors = eraseFloorCells(withoutTerrain, cells);
  return removeEdgeFeaturesByKeys(withoutFloors, edgeKeysTouchingCells(cells));
}

export {
  applyEdgeFeatureStroke,
  canToggleEdgeFeature,
  deleteWallFeaturesForCells,
  edgeFeatureAt,
  isSupportedEdgePlacement,
  removeEdgeFeature,
  setEdgeFeature,
  toggleEdgeFeature,
  type DungeonStudioEdgeStrokeAction,
} from "./dungeonStudioEdgeEditing";
export { circleRoomCells, ellipseRoomCells, rectangleRoomCells, shapeRoomCells, squareRoomCells };

export function isShapeTool(tool: DungeonStudioTool): tool is DungeonStudioShapeTool {
  return (
    tool === "rectangle-room" ||
    tool === "square-room" ||
    tool === "circle-room" ||
    tool === "ellipse-room"
  );
}

export function isTerrainTool(tool: DungeonStudioTool): tool is DungeonStudioTerrainTool {
  return tool === "water" || tool === "chasm" || tool === "cliff";
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
  return layerCells(document, "floor");
}

export function terrainCells(document: DungeonStudioDocument, kind: DungeonStudioTerrainTool) {
  return layerCells(document, kind);
}

export function updateDocumentTileset(
  document: DungeonStudioDocument,
  tileset: DungeonStudioTilesetKey,
) {
  return { ...document, tileset };
}

export function updateRoomRegionColor(
  document: DungeonStudioDocument,
  roomId: string,
  color: string,
) {
  return {
    ...document,
    rooms: document.rooms.map((room) => (room.id === roomId ? { ...room, color } : room)),
  };
}

export function updateRoomRegionTheme(
  document: DungeonStudioDocument,
  roomId: string,
  themeKey: DungeonStudioTilesetKey | "",
) {
  return {
    ...document,
    rooms: document.rooms.map((room) =>
      room.id === roomId ? { ...room, themeKey: themeKey || undefined } : room,
    ),
  };
}

export function linkRoomRegionLocation(
  document: DungeonStudioDocument,
  roomId: string,
  locationId: string | undefined,
) {
  return {
    ...document,
    rooms: document.rooms.map((room) =>
      room.id === roomId ? { ...room, locationId: locationId || undefined } : room,
    ),
  };
}

export {
  addCustomAsset,
  deleteObjectEntity,
  duplicateObjectEntity,
  entityAtCell,
  moveObjectEntity,
  placeObjectEntity,
  rotateObjectEntity,
  updateObjectEntityLink,
} from "./dungeonStudioEntityEditing";

export function layerCells(document: DungeonStudioDocument, kind: DungeonStudioCellKind) {
  return document.layers
    .filter((layer) => layer.kind === "cells" && layer.cellKind === kind)
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
  options: DungeonStudioChangeOptions = {},
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
    undoStack: options.mergeWithPrevious
      ? stacks.undoStack
      : [...stacks.undoStack, current].slice(-limit),
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
const TERRAIN_CELL_KINDS = ["water", "chasm", "cliff"] as const;

function updateFloorCells(
  document: DungeonStudioDocument,
  update: (cells: GridCell[]) => GridCell[],
): DungeonStudioDocument {
  return updateCellLayerCells(document, "floor", update);
}

function paintCellLayerCells(
  document: DungeonStudioDocument,
  kind: DungeonStudioCellKind,
  cells: GridCell[],
) {
  const validCells = cells.filter((cell) => cellInBounds(document, cell));
  if (!validCells.length) return document;
  return updateCellLayerCells(document, kind, (currentCells) =>
    mergeCells(currentCells, validCells),
  );
}

function updateCellLayerCells(
  document: DungeonStudioDocument,
  kind: DungeonStudioCellKind,
  update: (cells: GridCell[]) => GridCell[],
): DungeonStudioDocument {
  const layerIndex = document.layers.findIndex(
    (layer) => layer.kind === "cells" && layer.cellKind === kind,
  );
  if (layerIndex < 0) {
    return {
      ...document,
      layers: [
        ...document.layers,
        {
          id: kind,
          name: layerName(kind),
          kind: "cells",
          visible: true,
          opacity: kind === "floor" ? 1 : 0.9,
          cellKind: kind,
          cells: update([]),
        },
      ],
    };
  }
  return {
    ...document,
    layers: document.layers.map((layer, index) =>
      index === layerIndex ? { ...layer, cells: update(layer.cells) } : layer,
    ),
  };
}

function removeCellsFromLayers(
  document: DungeonStudioDocument,
  kinds: readonly DungeonStudioCellKind[],
  cellKeys: Set<string>,
) {
  if (!cellKeys.size) return document;
  return {
    ...document,
    layers: document.layers.map((layer) =>
      kinds.includes(layer.cellKind)
        ? { ...layer, cells: layer.cells.filter((cell) => !cellKeys.has(cellKey(cell))) }
        : layer,
    ),
  };
}

function mergeCells(currentCells: GridCell[], nextCells: GridCell[]) {
  const merged = new globalThis.Map(currentCells.map((item) => [cellKey(item), item]));
  for (const cell of nextCells) merged.set(cellKey(cell), cell);
  return [...merged.values()].sort((left, right) => left.y - right.y || left.x - right.x);
}

function edgeKeysTouchingCells(cells: GridCell[]) {
  return new Set(
    cells.flatMap((cell) =>
      (["n", "e", "s", "w", "ne", "nw", "se", "sw"] as const).map((direction) =>
        edgeKey(cell, direction),
      ),
    ),
  );
}

function removeEdgeFeaturesByKeys(document: DungeonStudioDocument, edgeKeys: Set<string>) {
  if (!edgeKeys.size) return document;
  return {
    ...document,
    edges: document.edges.filter((edge) => !edgeKeys.has(edgeKey(edge.cell, edge.direction))),
  };
}

function layerName(kind: DungeonStudioCellKind) {
  switch (kind) {
    case "floor":
      return "Floor";
    case "water":
      return "Water";
    case "chasm":
      return "Chasm";
    case "cliff":
      return "Cliff";
    case "rubble":
      return "Rubble";
    case "hazard":
      return "Hazard";
    case "road":
      return "Road";
    case "grass":
      return "Grass";
  }
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
