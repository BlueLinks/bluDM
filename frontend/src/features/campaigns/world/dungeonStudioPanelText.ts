import type { DungeonStudioSelection } from "./dungeonStudioEditing";

export function selectionLabel(selection: DungeonStudioSelection) {
  if (!selection) return "Nothing selected";
  if (selection.type === "cell") return `Cell ${selection.cell.x}, ${selection.cell.y}`;
  if (selection.type === "region") return `${selection.label}: ${selection.cells.length} cells`;
  if (selection.type === "entity") return `Object ${selection.entityId}`;
  return `${selection.kind} at ${selection.cell.x}, ${selection.cell.y} ${selection.direction}`;
}
