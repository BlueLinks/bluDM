import { Circle, MousePointer2, RectangleHorizontal } from "lucide-react";
import type { ElementType } from "react";
import {
  circleRoomCells,
  rectangleRoomCells,
  type DungeonStudioTool,
} from "./dungeonStudioEditing";
import type { DungeonStudioDocument, GridCell } from "./dungeonStudioDocument";

export type DungeonStudioBrushShape = "single" | "rectangle" | "circle";
export type DungeonStudioDeleteTarget = "contents" | "walls";

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
  { target: "contents", label: "Cells + walls" },
  { target: "walls", label: "Walls only" },
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
  return deleteTargetOptions.find((option) => option.target === target)?.label ?? "Cells + walls";
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
