import {
  cellKey,
  edgeKey,
  type DungeonStudioDocument,
  type DungeonStudioEdgeDirection,
  type DungeonStudioEdgeFeature,
  type GridCell,
} from "./dungeonStudioDocument";

const ORTHOGONAL_DIRECTIONS = ["n", "e", "s", "w"] as const;

export function implicitBoundaryWalls(document: DungeonStudioDocument): DungeonStudioEdgeFeature[] {
  const floorKeys = new Set(floorCells(document).map(cellKey));
  const explicitEdgeKeys = new Set(
    document.edges.map((edge) => edgeKey(edge.cell, edge.direction)),
  );
  const walls: DungeonStudioEdgeFeature[] = [];

  for (const cell of floorCells(document)) {
    for (const direction of ORTHOGONAL_DIRECTIONS) {
      const neighbor = neighborCell(cell, direction);
      if (floorKeys.has(cellKey(neighbor))) continue;
      const key = edgeKey(cell, direction);
      if (explicitEdgeKeys.has(key)) continue;
      const normalized = normalizedWall(cell, direction);
      walls.push({
        id: `implicit-wall-${key}`,
        cell: normalized.cell,
        direction: normalized.direction,
        kind: "wall",
      });
    }
  }

  return walls;
}

export function hasBlockingWall(
  document: DungeonStudioDocument,
  cell: GridCell,
  direction: DungeonStudioEdgeDirection,
) {
  const key = edgeKey(cell, direction);
  return document.edges.some(
    (edge) =>
      edgeKey(edge.cell, edge.direction) === key &&
      (edge.kind === "wall" || edge.kind === "door") &&
      (edge.direction === "n" ||
        edge.direction === "e" ||
        edge.direction === "s" ||
        edge.direction === "w"),
  );
}

export function neighborCell(cell: GridCell, direction: DungeonStudioEdgeDirection): GridCell {
  if (direction === "n") return { x: cell.x, y: cell.y - 1 };
  if (direction === "e") return { x: cell.x + 1, y: cell.y };
  if (direction === "s") return { x: cell.x, y: cell.y + 1 };
  if (direction === "w") return { x: cell.x - 1, y: cell.y };
  return cell;
}

function normalizedWall(cell: GridCell, direction: DungeonStudioEdgeDirection) {
  if (direction === "e") return { cell: { x: cell.x + 1, y: cell.y }, direction: "w" as const };
  if (direction === "s") return { cell: { x: cell.x, y: cell.y + 1 }, direction: "n" as const };
  return { cell, direction };
}

function floorCells(document: DungeonStudioDocument) {
  return document.layers
    .filter((layer) => layer.kind === "cells" && layer.cellKind === "floor")
    .flatMap((layer) => layer.cells);
}
