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

export type DungeonStudioTool = "floor" | "erase" | "wall" | "diagonal-wall" | "door";

export type DungeonStudioSelection =
  | { type: "cell"; cell: GridCell }
  | { type: "edge"; cell: GridCell; direction: DungeonStudioEdgeDirection; kind: string }
  | null;

export function paintFloorCell(document: DungeonStudioDocument, cell: GridCell) {
  return updateFloorCells(document, (cells) => {
    const nextCells = new globalThis.Map(cells.map((item) => [cellKey(item), item]));
    nextCells.set(cellKey(cell), cell);
    return [...nextCells.values()];
  });
}

export function eraseFloorCell(document: DungeonStudioDocument, cell: GridCell) {
  const nextDocument = updateFloorCells(document, (cells) =>
    cells.filter((item) => cellKey(item) !== cellKey(cell)),
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
