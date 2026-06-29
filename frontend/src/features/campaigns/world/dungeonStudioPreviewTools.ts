import type { PointerEvent } from "react";
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

export function safeSetPointerCapture(event: PointerEvent<HTMLDivElement>) {
  try {
    event.currentTarget.setPointerCapture(event.pointerId);
  } catch {
    // Programmatic QA events do not always create an active pointer; real pointer input still captures.
  }
}
