import { describe, expect, it } from "vitest";
import { createDungeonStudioDocument, edgeKey } from "./dungeonStudioDocument";
import {
  addOuterWallsAroundFloorCells,
  circleRoomCells,
  commitDungeonStudioChange,
  ellipseRoomCells,
  eraseFloorCell,
  eraseTerrainCell,
  floorCells,
  paintFloorCell,
  paintFloorCells,
  paintTerrainCell,
  rectangleRoomCells,
  redoDungeonStudioChange,
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
