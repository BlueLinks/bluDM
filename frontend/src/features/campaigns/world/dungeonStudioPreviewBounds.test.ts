import { describe, expect, it } from "vitest";
import { createDungeonStudioDocument } from "./dungeonStudioDocument";
import { paintFloorCells } from "./dungeonStudioEditing";
import { dungeonStudioPreviewViewBox } from "./dungeonStudioPreviewBounds";

function documentWithContent() {
  return {
    ...paintFloorCells(createDungeonStudioDocument(), [
      { x: 20, y: 10 },
      { x: 21, y: 10 },
      { x: 22, y: 10 },
    ]),
    rooms: [
      {
        id: "room-1",
        locationId: "room-1",
        label: "Entry",
        color: "#14b8a6",
        cells: [{ x: 20, y: 10 }],
      },
      { id: "room-2", label: "Hall", color: "#8b5cf6", cells: [{ x: 21, y: 10 }] },
    ],
  };
}

describe("dungeonStudioPreviewViewBox", () => {
  it("frames full dungeon content tightly with padding", () => {
    expect(dungeonStudioPreviewViewBox(documentWithContent())).toBe("456 216 120 72");
  });

  it("zooms room previews around the room and adjacent context", () => {
    expect(dungeonStudioPreviewViewBox(documentWithContent(), "room-1")).toBe("432 192 144 120");
  });

  it("uses a padded room viewport without expanding to the full grid", () => {
    const fullPreview = viewBoxNumbers(dungeonStudioPreviewViewBox(documentWithContent()));
    const roomPreview = viewBoxNumbers(
      dungeonStudioPreviewViewBox(documentWithContent(), "room-1"),
    );

    expect(roomPreview.width).toBeGreaterThan(24);
    expect(roomPreview.height).toBeGreaterThan(24);
    expect(roomPreview.width).toBeGreaterThan(fullPreview.width);
    expect(roomPreview.width).toBeLessThan(960);
    expect(roomPreview.height).toBeLessThan(720);
  });

  it("falls back to full content when a focused room cannot be found", () => {
    expect(dungeonStudioPreviewViewBox(documentWithContent(), "missing-room")).toBe(
      dungeonStudioPreviewViewBox(documentWithContent()),
    );
  });

  it("falls back to the full grid for empty maps", () => {
    expect(dungeonStudioPreviewViewBox(createDungeonStudioDocument())).toBe("0 0 960 720");
  });
});

function viewBoxNumbers(viewBox: string) {
  const [, , width, height] = viewBox.split(" ").map(Number);
  return { width, height };
}
