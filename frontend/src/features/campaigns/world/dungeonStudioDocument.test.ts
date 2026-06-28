import { describe, expect, it } from "vitest";
import {
  cellKey,
  createDungeonStudioDocument,
  dungeonStudioMapInput,
  edgeKey,
  parseDungeonStudioDocument,
  serializeDungeonStudioMetadata,
  studioMapForLocation,
} from "./dungeonStudioDocument";
import type { CampaignMap } from "./travelTypes";

describe("dungeonStudioDocument", () => {
  it("parses missing studio metadata into safe defaults", () => {
    const document = parseDungeonStudioDocument(undefined, { scope: "floor" });

    expect(document.kind).toBe("dungeon-studio");
    expect(document.scope).toBe("floor");
    expect(document.grid).toEqual({ width: 40, height: 30, cellSizeFeet: 5 });
    expect(document.layers[0]).toMatchObject({ id: "floor", cellKind: "floor", cells: [] });
  });

  it("normalizes stale or invalid metadata without throwing", () => {
    const document = parseDungeonStudioDocument({ studio: { kind: "other", version: 99 } });

    expect(document.kind).toBe("dungeon-studio");
    expect(document.layers).toHaveLength(1);
  });

  it("serializes and round-trips a sample studio document", () => {
    const sample = createDungeonStudioDocument({ scope: "dungeon" });
    sample.layers[0].cells = [
      { x: 1, y: 1 },
      { x: 1, y: 1 },
      { x: 999, y: 999 },
    ];
    sample.edges = [
      { id: "wall-1", cell: { x: 1, y: 1 }, direction: "e", kind: "wall" },
      { id: "door-1", cell: { x: 2, y: 1 }, direction: "w", kind: "door", state: "closed" },
    ];
    sample.rooms = [
      {
        id: "room-1",
        label: "Guard Room",
        color: "#14b8a6",
        cells: [{ x: 1, y: 1 }],
      },
    ];

    const metadata = serializeDungeonStudioMetadata({ untouched: true }, sample);
    const roundTrip = parseDungeonStudioDocument(metadata);

    expect((metadata as Record<string, unknown>).untouched).toBe(true);
    expect(roundTrip.layers[0].cells).toEqual([{ x: 1, y: 1 }]);
    expect(roundTrip.edges).toHaveLength(2);
    expect(roundTrip.rooms[0]).toMatchObject({ label: "Guard Room", cells: [{ x: 1, y: 1 }] });
  });

  it("creates stable cell and edge keys", () => {
    expect(cellKey({ x: 4, y: 7 })).toBe("4,7");
    expect(edgeKey({ x: 4, y: 7 }, "e")).toBe(edgeKey({ x: 5, y: 7 }, "w"));
    expect(edgeKey({ x: 4, y: 7 }, "s")).toBe(edgeKey({ x: 4, y: 8 }, "n"));
    expect(edgeKey({ x: 4, y: 7 }, "ne")).toBe("4,7,ne");
  });

  it("finds studio maps by location and creates map inputs with studio metadata", () => {
    const payload = dungeonStudioMapInput({
      id: "loc-1",
      name: "Upper Vault",
      locationType: "floor",
    });
    const map = {
      ...payload,
      id: "map-1",
      campaignId: "campaign-1",
      description: payload.description ?? "",
      calibrationPixelLength: payload.calibrationPixelLength ?? 0,
      calibrationDistance: payload.calibrationDistance ?? 0,
      metadata: payload.metadata,
      createdAt: "now",
      updatedAt: "now",
    } satisfies CampaignMap;

    expect(payload.mapType).toBe("floor");
    expect(parseDungeonStudioDocument(payload.metadata).scope).toBe("floor");
    expect(studioMapForLocation([map], "loc-1")?.id).toBe("map-1");
  });
});
