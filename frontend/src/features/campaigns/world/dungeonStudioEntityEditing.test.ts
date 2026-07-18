import { describe, expect, it } from "vitest";
import { createDungeonStudioDocument } from "./dungeonStudioDocument";
import {
  deleteObjectEntity,
  duplicateObjectEntity,
  moveObjectEntity,
  placeObjectEntity,
  rotateObjectEntity,
} from "./dungeonStudioEntityEditing";

const document = createDungeonStudioDocument();

describe("dungeonStudioEntityEditing", () => {
  it("places, moves, rotates, duplicates, and deletes catalog objects without touching room data", () => {
    const placed = placeObjectEntity(document, { x: 2, y: 3 }, "table");
    const entity = placed.entities[0];

    expect(entity.assetKey).toBe("table");
    expect(placed.rooms).toEqual([]);

    const moved = moveObjectEntity(placed, entity.id, { x: 4, y: 5 });
    expect(moved.entities[0].cell).toEqual({ x: 4, y: 5 });

    const rotated = rotateObjectEntity(moved, entity.id);
    expect(rotated.entities[0].rotation).toBe(90);

    const duplicated = duplicateObjectEntity(rotated, entity.id);
    expect(duplicated.entities).toHaveLength(2);
    expect(duplicated.rooms).toEqual([]);

    const deleted = deleteObjectEntity(duplicated, entity.id);
    expect(deleted.entities).toHaveLength(1);
  });
});
