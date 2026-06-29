import { Circle, MousePointer2, RectangleHorizontal } from "lucide-react";
import type { ElementType } from "react";
import {
  circleRoomCells,
  deleteMapCells,
  deleteWallFeaturesForCells,
  eraseFloorCells,
  eraseRoomCells,
  eraseTerrainCells,
  isTerrainTool,
  rectangleRoomCells,
  type DungeonStudioTool,
} from "./dungeonStudioEditing";
import type { DungeonStudioDocument, GridCell } from "./dungeonStudioDocument";

export type DungeonStudioBrushShape = "single" | "rectangle" | "circle";
export type DungeonStudioDeleteTarget = "all" | "floor" | "terrain" | "rooms" | "walls";

export type BrushShapeOption = {
  shape: DungeonStudioBrushShape;
  label: string;
  icon: ElementType;
};

export const brushShapeOptions: BrushShapeOption[] = [
  { shape: "single", label: "Single", icon: MousePointer2 },
  { shape: "rectangle", label: "Rectangle", icon: RectangleHorizontal },
  { shape: "circle", label: "Circle", icon: Circle },
];

export const deleteTargetOptions: Array<{ target: DungeonStudioDeleteTarget; label: string }> = [
  { target: "all", label: "Everything touched" },
  { target: "floor", label: "Floor cells" },
  { target: "terrain", label: "Terrain cells" },
  { target: "rooms", label: "Room assignments" },
  { target: "walls", label: "Walls/doors only" },
];

export function brushShapeCells(
  document: DungeonStudioDocument,
  shape: DungeonStudioBrushShape,
  start: GridCell,
  end: GridCell,
) {
  if (shape === "rectangle") return rectangleRoomCells(document, start, end);
  if (shape === "circle") return circleRoomCells(document, start, end);
  return [end];
}

export function deleteTargetLabel(target: DungeonStudioDeleteTarget) {
  return (
    deleteTargetOptions.find((option) => option.target === target)?.label ?? "Everything touched"
  );
}

export function applyDeleteTarget(
  document: DungeonStudioDocument,
  cells: GridCell[],
  target: DungeonStudioDeleteTarget,
) {
  if (target === "floor") return eraseFloorCells(document, cells);
  if (target === "terrain") return eraseTerrainCells(document, cells);
  if (target === "rooms") return eraseRoomCells(document, cells);
  if (target === "walls") return deleteWallFeaturesForCells(document, cells);
  return deleteMapCells(document, cells);
}

export function contextualEraseTargetForTool(
  tool: DungeonStudioTool,
  deleteTarget: DungeonStudioDeleteTarget,
): DungeonStudioDeleteTarget {
  if (tool === "delete") return deleteTarget;
  if (
    tool === "room-select" ||
    tool === "room-brush" ||
    tool === "room-fill" ||
    tool === "erase-room"
  ) {
    return "rooms";
  }
  if (tool === "erase-terrain" || isTerrainTool(tool)) return "terrain";
  if (tool === "wall" || tool === "diagonal-wall" || tool === "door") return "walls";
  if (tool === "select") return "all";
  return "floor";
}

export function brushShapeLabel(shape: DungeonStudioBrushShape) {
  switch (shape) {
    case "single":
      return "Single";
    case "rectangle":
      return "Rectangle";
    case "circle":
      return "Circle";
  }
}

export function brushShapePreviewTool(shape: DungeonStudioBrushShape) {
  return shape === "circle" ? "circle-room" : "rectangle-room";
}

export function supportsBrushShape(tool: DungeonStudioTool) {
  return (
    tool === "floor" ||
    tool === "erase" ||
    tool === "delete" ||
    tool === "water" ||
    tool === "chasm" ||
    tool === "cliff" ||
    tool === "erase-terrain" ||
    tool === "room-select" ||
    tool === "room-brush" ||
    tool === "erase-room"
  );
}
