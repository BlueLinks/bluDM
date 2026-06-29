import {
  cellKey,
  edgeKey,
  normalizeEdgeReference,
  type DungeonStudioCellKind,
  type DungeonStudioDocument,
  type DungeonStudioEdgeDirection,
  type DungeonStudioEdgeFeature,
  type GridCell,
} from "./dungeonStudioDocument";

export type DungeonStudioEdgeStrokeAction = "add" | "remove";

export function deleteWallFeaturesForCells(document: DungeonStudioDocument, cells: GridCell[]) {
  const edgeKeys = edgeKeysTouchingCells(cells);
  if (!edgeKeys.size) return document;
  return {
    ...document,
    edges: document.edges.filter(
      (edge) => !edgeKeys.has(edgeKey(edge.cell, edge.direction)) || edge.kind === "cliff-edge",
    ),
  };
}

export function edgeFeatureAt(
  document: DungeonStudioDocument,
  cell: GridCell,
  direction: DungeonStudioEdgeDirection,
) {
  const key = edgeKey(cell, direction);
  return document.edges.find((feature) => edgeKey(feature.cell, feature.direction) === key);
}

export function applyEdgeFeatureStroke(
  document: DungeonStudioDocument,
  cell: GridCell,
  direction: DungeonStudioEdgeDirection,
  kind: DungeonStudioEdgeFeature["kind"],
  action: DungeonStudioEdgeStrokeAction,
): DungeonStudioDocument {
  if (action === "remove") return removeEdgeFeature(document, cell, direction);
  if (!canToggleEdgeFeature(document, cell, direction)) return document;
  return setEdgeFeature(document, cell, direction, kind);
}

export function removeEdgeFeature(
  document: DungeonStudioDocument,
  cell: GridCell,
  direction: DungeonStudioEdgeDirection,
): DungeonStudioDocument {
  const key = edgeKey(cell, direction);
  const edges = document.edges.filter(
    (feature) => edgeKey(feature.cell, feature.direction) !== key,
  );
  return edges.length === document.edges.length ? document : { ...document, edges };
}

export function setEdgeFeature(
  document: DungeonStudioDocument,
  cell: GridCell,
  direction: DungeonStudioEdgeDirection,
  kind: DungeonStudioEdgeFeature["kind"],
): DungeonStudioDocument {
  const edge = normalizeEdgeReference(cell, direction);
  const key = edgeKey(edge.cell, edge.direction);
  const existing = edgeFeatureAt(document, edge.cell, edge.direction);
  if (existing?.kind === kind) return document;
  const remaining = document.edges.filter(
    (feature) => edgeKey(feature.cell, feature.direction) !== key,
  );
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

export function toggleEdgeFeature(
  document: DungeonStudioDocument,
  cell: GridCell,
  direction: DungeonStudioEdgeDirection,
  kind: DungeonStudioEdgeFeature["kind"],
): DungeonStudioDocument {
  const existing = edgeFeatureAt(document, cell, direction);
  if (existing?.kind === kind) return removeEdgeFeature(document, cell, direction);
  return setEdgeFeature(document, cell, direction, kind);
}

export function canToggleEdgeFeature(
  document: DungeonStudioDocument,
  cell: GridCell,
  direction: DungeonStudioEdgeDirection,
) {
  const edge = normalizeEdgeReference(cell, direction);
  const key = edgeKey(edge.cell, edge.direction);
  const existing = document.edges.some(
    (feature) => edgeKey(feature.cell, feature.direction) === key,
  );
  return existing || isSupportedEdgePlacement(document, cell, direction);
}

export function isSupportedEdgePlacement(
  document: DungeonStudioDocument,
  cell: GridCell,
  direction: DungeonStudioEdgeDirection,
) {
  const edge = normalizeEdgeReference(cell, direction);
  const geometryKeys = new Set(
    document.layers
      .filter((layer) => layer.cellKind === "floor" || isTerrainCellKind(layer.cellKind))
      .flatMap((layer) => layer.cells.map(cellKey)),
  );
  if (direction === "ne" || direction === "nw" || direction === "se" || direction === "sw") {
    return geometryKeys.has(cellKey(edge.cell));
  }
  return supportedCellsForEdge(edge.cell, edge.direction).some(
    (supportCell) => cellInBounds(document, supportCell) && geometryKeys.has(cellKey(supportCell)),
  );
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

function supportedCellsForEdge(cell: GridCell, direction: DungeonStudioEdgeDirection) {
  if (direction === "n") return [cell, { x: cell.x, y: cell.y - 1 }];
  if (direction === "e") return [cell, { x: cell.x + 1, y: cell.y }];
  if (direction === "s") return [cell, { x: cell.x, y: cell.y + 1 }];
  if (direction === "w") return [cell, { x: cell.x - 1, y: cell.y }];
  return [cell];
}

function isTerrainCellKind(kind: DungeonStudioCellKind) {
  return kind === "water" || kind === "chasm" || kind === "cliff";
}

function cellInBounds(document: DungeonStudioDocument, cell: GridCell) {
  return (
    cell.x >= 0 && cell.x < document.grid.width && cell.y >= 0 && cell.y < document.grid.height
  );
}
