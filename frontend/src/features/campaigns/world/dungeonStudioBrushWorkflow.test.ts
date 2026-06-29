import { describe, expect, it } from "vitest";
import { brushShapeCells } from "./dungeonStudioBrushes";
import { createDungeonStudioDocument, edgeKey } from "./dungeonStudioDocument";
import {
  commitDungeonStudioChange,
  createRoomRegion,
  deleteMapCells,
  deleteWallFeaturesForCells,
  eraseFloorCell,
  floorCells,
  implicitBoundaryWalls,
  paintFloorCell,
  paintFloorCells,
  paintRoomCells,
  paintTerrainCells,
  redoDungeonStudioChange,
  roomFillCells,
  terrainCells,
  toggleEdgeFeature,
  undoDungeonStudioChange,
} from "./dungeonStudioEditing";

describe("dungeonStudioBrushWorkflow", () => {
  it("updates implicit exposed-edge walls after floor paint and erase", () => {
    const painted = paintFloorCells(createDungeonStudioDocument(), [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
    const erased = eraseFloorCell(painted, { x: 2, y: 1 });

    expect(
      implicitBoundaryWalls(painted).map((edge) => edgeKey(edge.cell, edge.direction)),
    ).not.toContain("2,1,w");
    expect(
      implicitBoundaryWalls(erased).map((edge) => edgeKey(edge.cell, edge.direction)),
    ).toContain("2,1,w");
  });

  it("applies rectangle and circle brush shapes across floor room terrain and delete modes", () => {
    const document = createDungeonStudioDocument();
    const rectangle = brushShapeCells(document, "rectangle", { x: 1, y: 1 }, { x: 2, y: 2 });
    const circle = brushShapeCells(document, "circle", { x: 5, y: 5 }, { x: 6, y: 5 });
    const floor = paintFloorCells(document, rectangle);
    const terrain = paintTerrainCells(floor, circle, "water");
    const room = paintRoomCells(terrain, rectangle, "room-a");
    const deleted = deleteMapCells(room, rectangle);

    expect(floorCells(floor)).toEqual(rectangle);
    expect(terrainCells(terrain, "water")).toEqual(circle);
    expect(room.rooms[0].cells).toEqual(rectangle);
    expect(floorCells(deleted)).toEqual([]);
    expect(deleted.rooms[0].cells).toEqual([]);
  });

  it("deletes wall and door edges without deleting floor or room cells", () => {
    const document = createRoomRegion(
      toggleEdgeFeature(
        toggleEdgeFeature(
          paintFloorCells(createDungeonStudioDocument(), [
            { x: 1, y: 1 },
            { x: 2, y: 1 },
          ]),
          { x: 1, y: 1 },
          "n",
          "wall",
        ),
        { x: 2, y: 1 },
        "n",
        "door",
      ),
      [{ x: 1, y: 1 }],
    );
    const deleted = deleteWallFeaturesForCells(document, [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);

    expect(deleted.edges).toEqual([]);
    expect(floorCells(deleted)).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
    expect(deleted.rooms[0].cells).toEqual([{ x: 1, y: 1 }]);
  });

  it("protects existing room assignments when filling a new room", () => {
    const document = createRoomRegion(
      paintFloorCells(createDungeonStudioDocument(), [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ]),
      [{ x: 1, y: 1 }],
      "room-a",
    );
    const fillCells = roomFillCells(document, { x: 2, y: 1 });
    const filled = paintRoomCells(document, fillCells, "room-b");

    expect(fillCells).toEqual([
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ]);
    expect(filled.rooms.find((room) => room.id === "room-a")?.cells).toEqual([{ x: 1, y: 1 }]);
    expect(filled.rooms.find((room) => room.id === "room-b")?.cells).toEqual(fillCells);
    expect(roomFillCells(document, { x: 1, y: 1 })).toEqual([]);
  });

  it("undoes and redoes wall-only deletion", () => {
    const document = toggleEdgeFeature(
      paintFloorCell(createDungeonStudioDocument(), { x: 1, y: 1 }),
      { x: 1, y: 1 },
      "n",
      "wall",
    );
    const deleteCommit = commitDungeonStudioChange(
      document,
      (current) => deleteWallFeaturesForCells(current, [{ x: 1, y: 1 }]),
      { undoStack: [], redoStack: [] },
    );
    const undone = undoDungeonStudioChange(deleteCommit.document, {
      undoStack: deleteCommit.undoStack,
      redoStack: deleteCommit.redoStack,
    });
    const redone = redoDungeonStudioChange(undone.document, {
      undoStack: undone.undoStack,
      redoStack: undone.redoStack,
    });

    expect(deleteCommit.document.edges).toEqual([]);
    expect(undone.document.edges).toHaveLength(1);
    expect(redone.document.edges).toEqual([]);
  });
});
