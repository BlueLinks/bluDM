import type { PointerEvent } from "react";
import { supportsBrushShape, type DungeonStudioBrushShape } from "./dungeonStudioBrushes";
import {
  isTerrainTool,
  type DungeonStudioSelection,
  type DungeonStudioShapeTool,
  type DungeonStudioTool,
} from "./dungeonStudioEditing";
import type { GridCell } from "./dungeonStudioDocument";

export function isBrushTool(tool: DungeonStudioTool) {
  return (
    tool === "floor" ||
    tool === "erase" ||
    tool === "delete" ||
    tool === "erase-room" ||
    tool === "room-brush" ||
    tool === "erase-terrain" ||
    isTerrainTool(tool)
  );
}

export function roomCellSelection(
  activeTool: DungeonStudioTool,
  cell: GridCell,
  roomId: string | null,
): DungeonStudioSelection {
  if (activeTool === "room-brush") {
    return { type: "region", cells: [cell], label: "Room brush", roomId: roomId ?? undefined };
  }
  return { type: "cell", cell };
}

export function selectedRoomId(selection: DungeonStudioSelection) {
  return selection?.type === "region" ? selection.roomId : undefined;
}

export function shapeSelection({
  activeTool,
  cells,
  fallbackLabel,
  roomId,
  selected,
}: {
  activeTool: DungeonStudioTool;
  cells: GridCell[];
  fallbackLabel: string;
  roomId: string | null;
  selected: DungeonStudioSelection;
}): DungeonStudioSelection {
  if (activeTool === "room-brush") {
    return {
      type: "region",
      cells,
      label: selected?.type === "region" && selected.roomId ? selected.label : "Room brush",
      roomId: roomId ?? undefined,
    };
  }
  if (activeTool === "room-select") return { type: "region", cells, label: "Room selection" };
  return { type: "region", cells, label: fallbackLabel };
}

export function usesBrushShapeDraft(tool: DungeonStudioTool, brushShape: DungeonStudioBrushShape) {
  return brushShape !== "single" && supportsBrushShape(tool);
}

export function shapeToolLabel(tool: DungeonStudioShapeTool) {
  switch (tool) {
    case "rectangle-room":
      return "Rectangle room";
    case "square-room":
      return "Square room";
    case "circle-room":
      return "Round room";
    case "ellipse-room":
      return "Oval room";
  }
}

export function isDraggableEdgeTool(tool: DungeonStudioTool) {
  return tool === "wall" || tool === "diagonal-wall" || tool === "cliff-edge";
}

export function isEdgeEraseTool(tool: DungeonStudioTool) {
  return tool === "wall" || tool === "diagonal-wall" || tool === "door" || tool === "cliff-edge";
}

export function safeSetPointerCapture(event: PointerEvent<HTMLDivElement>) {
  try {
    event.currentTarget.setPointerCapture(event.pointerId);
  } catch {
    // Programmatic QA events do not always create an active pointer; real pointer input still captures.
  }
}
