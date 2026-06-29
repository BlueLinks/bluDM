import { describe, expect, it } from "vitest";
import { brushShapeCells } from "./dungeonStudioBrushes";
import { createDungeonStudioDocument, edgeKey } from "./dungeonStudioDocument";
import {
  addOuterWallsAroundFloorCells,
  canToggleEdgeFeature,
  circleRoomCells,
  commitDungeonStudioChange,
  createRoomRegion,
  deleteMapCells,
  deleteRoomRegion,
  ellipseRoomCells,
  eraseFloorCell,
  eraseRoomCells,
  eraseTerrainCell,
  floorCells,
  implicitBoundaryWalls,
  paintFloorCell,
  paintFloorCells,
  paintRoomCells,
  paintTerrainCell,
  paintTerrainCells,
  renameRoomRegion,
  rectangleRoomCells,
  redoDungeonStudioChange,
  roomFillCells,
  roomRegionForCell,
  squareRoomCells,
  terrainCells,
  toggleEdgeFeature,
  undoDungeonStudioChange,
} from "./dungeonStudioEditing";

describe("dungeonStudioEditing", () => {
  it("paints and erases sparse floor cells", () => {
    const document = createDungeonStudioDocument();
    const painted = paintFloorCell(paintFloorCell(document, { x: 2, y: 3 }), { x: 2, y: 3 });
    const erased = eraseFloorCell(painted, { x: 2, y: 3 });

    expect(floorCells(painted)).toEqual([{ x: 2, y: 3 }]);
    expect(floorCells(erased)).toEqual([]);
  });

  it("removes erased floor cells from room regions", () => {
    const document = paintFloorCell(createDungeonStudioDocument(), { x: 1, y: 1 });
    const withRoom = {
      ...document,
      rooms: [{ id: "room-1", label: "Room", color: "#14b8a6", cells: [{ x: 1, y: 1 }] }],
    };

    expect(eraseFloorCell(withRoom, { x: 1, y: 1 }).rooms[0].cells).toEqual([]);
  });

  it("toggles wall and door edge features by normalized edge key", () => {
    const document = createDungeonStudioDocument();
    const wall = toggleEdgeFeature(document, { x: 1, y: 1 }, "e", "wall");
    const door = toggleEdgeFeature(wall, { x: 2, y: 1 }, "w", "door");
    const removedDoor = toggleEdgeFeature(door, { x: 2, y: 1 }, "w", "door");

    expect(edgeKey(wall.edges[0].cell, wall.edges[0].direction)).toBe("2,1,w");
    expect(door.edges).toMatchObject([{ kind: "door", state: "closed" }]);
    expect(removedDoor.edges).toEqual([]);
  });

  it("keeps diagonal wall edge references editable", () => {
    const document = toggleEdgeFeature(createDungeonStudioDocument(), { x: 4, y: 4 }, "ne", "wall");

    expect(document.edges[0]).toMatchObject({ cell: { x: 4, y: 4 }, direction: "ne" });
  });

  it("paints and erases sparse terrain cells without changing floors", () => {
    const document = paintFloorCell(createDungeonStudioDocument(), { x: 2, y: 2 });
    const water = paintTerrainCell(document, { x: 2, y: 2 }, "water");
    const chasm = paintTerrainCell(water, { x: 2, y: 2 }, "chasm");
    const erased = eraseTerrainCell(chasm, { x: 2, y: 2 });

    expect(floorCells(erased)).toEqual([{ x: 2, y: 2 }]);
    expect(terrainCells(water, "water")).toEqual([{ x: 2, y: 2 }]);
    expect(terrainCells(chasm, "water")).toEqual([]);
    expect(terrainCells(chasm, "chasm")).toEqual([{ x: 2, y: 2 }]);
    expect(terrainCells(erased, "chasm")).toEqual([]);
  });

  it("toggles cliff-edge features using the existing edge model", () => {
    const document = toggleEdgeFeature(
      createDungeonStudioDocument(),
      { x: 3, y: 3 },
      "s",
      "cliff-edge",
    );

    expect(document.edges[0]).toMatchObject({
      cell: { x: 3, y: 4 },
      direction: "n",
      kind: "cliff-edge",
    });
  });

  it("validates edge placement against floor and terrain geometry", () => {
    const empty = createDungeonStudioDocument();
    const floor = paintFloorCell(empty, { x: 2, y: 2 });
    const terrain = paintTerrainCell(empty, { x: 5, y: 5 }, "water");

    expect(canToggleEdgeFeature(empty, { x: 2, y: 2 }, "n")).toBe(false);
    expect(canToggleEdgeFeature(floor, { x: 2, y: 2 }, "n")).toBe(true);
    expect(canToggleEdgeFeature(terrain, { x: 5, y: 5 }, "e")).toBe(true);
  });

  it("deletes floor, terrain, and touched edges with one brush cell", () => {
    const document = toggleEdgeFeature(
      paintTerrainCell(
        paintFloorCell(createDungeonStudioDocument(), { x: 2, y: 2 }),
        { x: 2, y: 2 },
        "water",
      ),
      { x: 2, y: 2 },
      "n",
      "wall",
    );
    const deleted = deleteMapCells(document, [{ x: 2, y: 2 }]);

    expect(floorCells(deleted)).toEqual([]);
    expect(terrainCells(deleted, "water")).toEqual([]);
    expect(deleted.edges).toEqual([]);
  });

  it("generates grid-snapped rectangle and square floor cells", () => {
    const document = createDungeonStudioDocument();

    expect(rectangleRoomCells(document, { x: 1, y: 1 }, { x: 3, y: 2 })).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    ]);
    expect(squareRoomCells(document, { x: 1, y: 1 }, { x: 3, y: 2 })).toHaveLength(9);
  });

  it("approximates circle and ellipse rooms as occupied grid cells", () => {
    const document = createDungeonStudioDocument();
    const circle = circleRoomCells(document, { x: 1, y: 1 }, { x: 3, y: 2 });
    const ellipse = ellipseRoomCells(document, { x: 1, y: 1 }, { x: 4, y: 2 });

    expect(circle).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
    ]);
    expect(ellipse).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
    ]);
  });

  it("creates room regions from floor-cell selections only", () => {
    const document = paintFloorCells(createDungeonStudioDocument(), [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
    const withRoom = createRoomRegion(document, [
      { x: 1, y: 1 },
      { x: 9, y: 9 },
    ]);

    expect(withRoom.rooms).toHaveLength(1);
    expect(withRoom.rooms[0]).toMatchObject({ id: "room-1", label: "Room 1" });
    expect(withRoom.rooms[0].cells).toEqual([{ x: 1, y: 1 }]);
  });

  it("paints and erases room coverage without changing floors", () => {
    const document = paintFloorCells(createDungeonStudioDocument(), [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
    const firstRoom = paintRoomCells(document, [{ x: 1, y: 1 }], "room-a");
    const secondRoom = paintRoomCells(
      firstRoom,
      [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
      "room-b",
    );
    const erased = eraseRoomCells(secondRoom, [{ x: 2, y: 1 }]);

    expect(floorCells(erased)).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
    expect(secondRoom.rooms.find((room) => room.id === "room-a")?.cells).toEqual([]);
    expect(secondRoom.rooms.find((room) => room.id === "room-b")?.cells).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
    expect(erased.rooms.find((room) => room.id === "room-b")?.cells).toEqual([{ x: 1, y: 1 }]);
  });

  it("renames and deletes room regions", () => {
    const document = createRoomRegion(
      paintFloorCell(createDungeonStudioDocument(), { x: 3, y: 4 }),
      [{ x: 3, y: 4 }],
    );
    const renamed = renameRoomRegion(document, "room-1", "Altar Room");
    const deleted = deleteRoomRegion(renamed, "room-1");

    expect(renamed.rooms[0].label).toBe("Altar Room");
    expect(deleted.rooms).toEqual([]);
  });

  it("finds the room region for a selected cell", () => {
    const document = createRoomRegion(
      paintFloorCell(createDungeonStudioDocument(), { x: 3, y: 4 }),
      [{ x: 3, y: 4 }],
    );

    expect(roomRegionForCell(document, { x: 3, y: 4 })?.label).toBe("Room 1");
    expect(roomRegionForCell(document, { x: 4, y: 4 })).toBeUndefined();
  });

  it("fills room cells until manual walls while treating doors as pass-throughs", () => {
    const document = paintFloorCells(createDungeonStudioDocument(), [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ]);
    const withWall = toggleEdgeFeature(document, { x: 2, y: 1 }, "e", "wall");
    const withDoor = toggleEdgeFeature(withWall, { x: 2, y: 1 }, "e", "door");

    expect(roomFillCells(withWall, { x: 1, y: 1 })).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
    expect(roomFillCells(withDoor, { x: 1, y: 1 })).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ]);
  });

  it("derives implicit boundary walls without duplicating manual edges", () => {
    const document = paintFloorCells(createDungeonStudioDocument(), [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
    const withDoor = toggleEdgeFeature(document, { x: 1, y: 1 }, "n", "door");
    const wallKeys = implicitBoundaryWalls(withDoor).map((edge) =>
      edgeKey(edge.cell, edge.direction),
    );

    expect(wallKeys).not.toContain("1,1,n");
    expect(wallKeys).not.toContain("2,1,w");
    expect(wallKeys).toEqual(expect.arrayContaining(["1,1,w", "3,1,w"]));
  });

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

  it("undoes and redoes room rename and deletion", () => {
    const document = createRoomRegion(
      paintFloorCell(createDungeonStudioDocument(), { x: 1, y: 1 }),
      [{ x: 1, y: 1 }],
    );
    const renameCommit = commitDungeonStudioChange(
      document,
      (current) => renameRoomRegion(current, "room-1", "Named Room"),
      { undoStack: [], redoStack: [] },
    );
    const deleteCommit = commitDungeonStudioChange(
      renameCommit.document,
      (current) => deleteRoomRegion(current, "room-1"),
      { undoStack: renameCommit.undoStack, redoStack: renameCommit.redoStack },
    );
    const undoneDelete = undoDungeonStudioChange(deleteCommit.document, {
      undoStack: deleteCommit.undoStack,
      redoStack: deleteCommit.redoStack,
    });
    const redoneDelete = redoDungeonStudioChange(undoneDelete.document, {
      undoStack: undoneDelete.undoStack,
      redoStack: undoneDelete.redoStack,
    });

    expect(undoneDelete.document.rooms[0].label).toBe("Named Room");
    expect(redoneDelete.document.rooms).toEqual([]);
  });

  it("adds outer walls around floor cells without replacing door openings", () => {
    const document = paintFloorCells(createDungeonStudioDocument(), [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
    const withDoor = toggleEdgeFeature(document, { x: 1, y: 1 }, "n", "door");
    const wrapped = addOuterWallsAroundFloorCells(withDoor);
    const edgeKinds = new Map(
      wrapped.edges.map((edge) => [edgeKey(edge.cell, edge.direction), edge.kind]),
    );

    expect(wrapped.edges).toHaveLength(6);
    expect(edgeKinds.get("1,1,n")).toBe("door");
    expect(edgeKinds.get("1,1,w")).toBe("wall");
    expect(edgeKinds.get("3,1,w")).toBe("wall");
    expect(edgeKinds.has("2,1,w")).toBe(false);
  });

  it("wraps a selected region instead of every painted floor cell", () => {
    const document = paintFloorCells(createDungeonStudioDocument(), [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 8, y: 8 },
    ]);
    const wrapped = addOuterWallsAroundFloorCells(document, [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);

    expect(wrapped.edges.map((edge) => edgeKey(edge.cell, edge.direction))).not.toContain("8,8,n");
  });

  it("merges brush stroke commits into one undo entry", () => {
    const document = createDungeonStudioDocument();
    const first = commitDungeonStudioChange(
      document,
      (current) => paintFloorCell(current, { x: 1, y: 1 }),
      { undoStack: [], redoStack: [] },
    );
    const second = commitDungeonStudioChange(
      first.document,
      (current) => paintFloorCell(current, { x: 2, y: 1 }),
      { undoStack: first.undoStack, redoStack: first.redoStack },
      50,
      { mergeWithPrevious: true },
    );
    const undone = undoDungeonStudioChange(second.document, {
      undoStack: second.undoStack,
      redoStack: second.redoStack,
    });

    expect(second.undoStack).toHaveLength(1);
    expect(floorCells(undone.document)).toEqual([]);
  });

  it("undoes and redoes terrain and cliff-edge commits", () => {
    const document = createDungeonStudioDocument();
    const terrainCommit = commitDungeonStudioChange(
      document,
      (current) => paintTerrainCell(current, { x: 5, y: 5 }, "water"),
      { undoStack: [], redoStack: [] },
    );
    const edgeCommit = commitDungeonStudioChange(
      terrainCommit.document,
      (current) => toggleEdgeFeature(current, { x: 5, y: 5 }, "e", "cliff-edge"),
      { undoStack: terrainCommit.undoStack, redoStack: terrainCommit.redoStack },
    );
    const undoneEdge = undoDungeonStudioChange(edgeCommit.document, {
      undoStack: edgeCommit.undoStack,
      redoStack: edgeCommit.redoStack,
    });
    const undoneTerrain = undoDungeonStudioChange(undoneEdge.document, {
      undoStack: undoneEdge.undoStack,
      redoStack: undoneEdge.redoStack,
    });
    const redoneTerrain = redoDungeonStudioChange(undoneTerrain.document, {
      undoStack: undoneTerrain.undoStack,
      redoStack: undoneTerrain.redoStack,
    });

    expect(undoneEdge.document.edges).toEqual([]);
    expect(terrainCells(undoneTerrain.document, "water")).toEqual([]);
    expect(terrainCells(redoneTerrain.document, "water")).toEqual([{ x: 5, y: 5 }]);
  });

  it("undoes and redoes shape and auto-wall commits as single actions", () => {
    const document = createDungeonStudioDocument();
    const shapeCells = rectangleRoomCells(document, { x: 1, y: 1 }, { x: 2, y: 2 });
    const shapeCommit = commitDungeonStudioChange(
      document,
      (current) => paintFloorCells(current, shapeCells),
      { undoStack: [], redoStack: [] },
    );
    const wallCommit = commitDungeonStudioChange(
      shapeCommit.document,
      (current) => addOuterWallsAroundFloorCells(current, shapeCells),
      { undoStack: shapeCommit.undoStack, redoStack: shapeCommit.redoStack },
    );
    const undoneWalls = undoDungeonStudioChange(wallCommit.document, {
      undoStack: wallCommit.undoStack,
      redoStack: wallCommit.redoStack,
    });
    const undoneShape = undoDungeonStudioChange(undoneWalls.document, {
      undoStack: undoneWalls.undoStack,
      redoStack: undoneWalls.redoStack,
    });
    const redoneShape = redoDungeonStudioChange(undoneShape.document, {
      undoStack: undoneShape.undoStack,
      redoStack: undoneShape.redoStack,
    });

    expect(shapeCommit.changed).toBe(true);
    expect(wallCommit.changed).toBe(true);
    expect(undoneWalls.document.edges).toEqual([]);
    expect(floorCells(undoneShape.document)).toEqual([]);
    expect(floorCells(redoneShape.document)).toEqual(shapeCells);
  });
});
