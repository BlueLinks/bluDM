import type { DungeonStudioTool } from "./dungeonStudioEditing";

export type ToolMode = "select" | "floor" | "terrain" | "room" | "object" | "delete";

export function modeForTool(tool: DungeonStudioTool): ToolMode {
  if (tool === "select") return "select";
  if (tool === "object") return "object";
  if (tool === "water" || tool === "chasm" || tool === "cliff" || tool === "cliff-edge") {
    return "terrain";
  }
  if (
    tool === "room-select" ||
    tool === "room-brush" ||
    tool === "room-fill" ||
    tool === "erase-room"
  )
    return "room";
  if (tool === "delete" || tool === "erase" || tool === "erase-terrain") return "delete";
  return "floor";
}

export function modeLabel(mode: ToolMode) {
  switch (mode) {
    case "select":
      return "Select";
    case "floor":
      return "Floor";
    case "terrain":
      return "Terrain";
    case "room":
      return "Room";
    case "object":
      return "Objects";
    case "delete":
      return "Delete";
  }
}

export function toolLabel(tool: DungeonStudioTool) {
  switch (tool) {
    case "select":
      return "Select";
    case "floor":
      return "Floor Brush";
    case "erase":
      return "Floor Eraser";
    case "delete":
      return "Delete Brush";
    case "room-select":
      return "Room Select";
    case "room-brush":
      return "Room Brush";
    case "room-fill":
      return "Room Fill";
    case "erase-room":
      return "Room Eraser";
    case "rectangle-room":
      return "Rectangle Room";
    case "square-room":
      return "Square Room";
    case "circle-room":
      return "Round Room";
    case "ellipse-room":
      return "Oval Room";
    case "water":
      return "Water";
    case "chasm":
      return "Chasm";
    case "cliff":
      return "Cliff Terrain";
    case "erase-terrain":
      return "Terrain Eraser";
    case "wall":
      return "Wall Edge";
    case "diagonal-wall":
      return "Diagonal Wall";
    case "door":
      return "Door";
    case "cliff-edge":
      return "Cliff Edge";
    case "object":
      return "Object";
  }
}

export function toolTip(tool: DungeonStudioTool) {
  switch (tool) {
    case "select":
      return "Click a cell or edge to inspect it without changing the map.";
    case "floor":
      return "Drag across grid cells to paint floor. Change Brush shape for rectangle or circle strokes.";
    case "erase":
      return "Erase floor cells with the active brush shape. Boundary walls update automatically.";
    case "delete":
      return "Delete the selected target with the active brush shape. Right-click uses this same target.";
    case "room-select":
      return "Select floor cells for a room region with the active brush shape.";
    case "room-brush":
      return "Paint cells into the active room with the active brush shape.";
    case "room-fill":
      return "Hover over a floor cell to preview the bounded area, then click to assign it. Walls and doors stop the fill.";
    case "erase-room":
      return "Remove room-region coverage with the active brush shape while keeping floor and walls intact.";
    case "rectangle-room":
      return "Drag to preview a grid-snapped rectangle, then release to paint it as floor.";
    case "square-room":
      return "Drag an equal-sided room footprint snapped to cells.";
    case "circle-room":
      return "Drag to preview a round room approximation.";
    case "ellipse-room":
      return "Drag to preview an oval room approximation.";
    case "water":
      return "Paint water terrain with the active brush shape.";
    case "chasm":
      return "Mark pits, holes, or void spaces with the active brush shape.";
    case "cliff":
      return "Mark cliff or elevation terrain with the active brush shape.";
    case "erase-terrain":
      return "Remove water, chasm, and cliff terrain with the active brush shape.";
    case "wall":
      return "Click or drag across valid floor or terrain edges to place a wall stroke.";
    case "diagonal-wall":
      return "Click or drag through valid floor or terrain cells to place diagonal walls.";
    case "door":
      return "Click near a valid floor or terrain edge to place or remove a closed door.";
    case "cliff-edge":
      return "Click near a valid floor or terrain edge to toggle an amber cliff boundary.";
    case "object":
      return "Choose a catalog item, then click a grid cell to place it. Select placed objects to rotate, duplicate, move, or delete.";
  }
}
