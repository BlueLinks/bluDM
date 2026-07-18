import {
  eraseFloorCell,
  eraseTerrainCell,
  isTerrainTool,
  nextRoomRegionId,
  paintFloorCells,
  paintRoomCells,
  paintTerrainCells,
  type DungeonStudioTool,
} from "./dungeonStudioEditing";
import type { DungeonStudioDocument, GridCell } from "./dungeonStudioDocument";
import {
  applyDeleteTarget,
  contextualEraseTargetForTool,
  type DungeonStudioDeleteTarget,
} from "./dungeonStudioBrushes";

export function applyPreviewEraseUpdates(
  current: DungeonStudioDocument,
  cells: GridCell[],
  activeTool: DungeonStudioTool,
  deleteTarget: DungeonStudioDeleteTarget,
) {
  return applyDeleteTarget(current, cells, contextualEraseTargetForTool(activeTool, deleteTarget));
}

export function applyPreviewCellUpdates(
  current: DungeonStudioDocument,
  cells: GridCell[],
  options: {
    activeTool: DungeonStudioTool;
    deleteTarget: DungeonStudioDeleteTarget;
    roomBrushTargetId: string | null;
  },
) {
  if (options.activeTool === "delete")
    return applyDeleteTarget(current, cells, options.deleteTarget);
  if (options.activeTool === "erase") {
    return cells.reduce((nextDocument, cell) => eraseFloorCell(nextDocument, cell), current);
  }
  if (options.activeTool === "erase-room") return applyDeleteTarget(current, cells, "rooms");
  if (options.activeTool === "room-select") return current;
  if (options.activeTool === "room-brush") {
    return paintRoomCells(current, cells, options.roomBrushTargetId ?? nextRoomRegionId(current));
  }
  if (options.activeTool === "erase-terrain") {
    return cells.reduce((nextDocument, cell) => eraseTerrainCell(nextDocument, cell), current);
  }
  if (isTerrainTool(options.activeTool))
    return paintTerrainCells(current, cells, options.activeTool);
  return paintFloorCells(current, cells);
}
