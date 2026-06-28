import { describe, expect, it } from "vitest";
import { createDungeonStudioDocument, edgeKey } from "./dungeonStudioDocument";
import {
  eraseFloorCell,
  floorCells,
  paintFloorCell,
  toggleEdgeFeature,
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
});
