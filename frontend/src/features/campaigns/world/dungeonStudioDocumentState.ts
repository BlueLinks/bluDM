import type { DungeonStudioDocument } from "./dungeonStudioDocument";

export function isBlankDungeonStudioDocument(document: DungeonStudioDocument) {
  const cellCount = document.layers.reduce((total, layer) => total + layer.cells.length, 0);
  return (
    cellCount === 0 &&
    document.edges.length === 0 &&
    document.rooms.length === 0 &&
    document.entities.length === 0 &&
    !document.generation
  );
}
