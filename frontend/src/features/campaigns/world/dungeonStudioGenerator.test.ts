import { describe, expect, it } from "vitest";
import { studioDocumentSignature } from "./dungeonStudioEditing";
import {
  defaultDungeonStudioGeneratorSettings,
  generateDungeonStudioDocument,
} from "./dungeonStudioGenerator";

const settings = {
  ...defaultDungeonStudioGeneratorSettings,
  seed: "test-seed",
  width: 28,
  height: 20,
  roomCount: 5,
};

describe("dungeonStudioGenerator", () => {
  it("reproduces the same editable document from the same seed and settings", () => {
    const first = generateDungeonStudioDocument(settings);
    const second = generateDungeonStudioDocument(settings);

    expect(studioDocumentSignature(first)).toBe(studioDocumentSignature(second));
    expect(first.layers.some((layer) => layer.cellKind === "floor" && layer.cells.length > 0)).toBe(
      true,
    );
    expect(first.edges.some((edge) => edge.kind === "wall")).toBe(true);
  });

  it("generates normal entities for stairs and furniture", () => {
    const document = generateDungeonStudioDocument({
      ...settings,
      addFurniture: true,
      addStairs: true,
    });

    expect(document.entities.some((entity) => entity.kind === "stairs")).toBe(true);
    expect(
      document.entities.some((entity) => entity.kind === "prop" || entity.kind === "light"),
    ).toBe(true);
  });
});
