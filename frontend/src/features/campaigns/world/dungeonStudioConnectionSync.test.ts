import { describe, expect, it } from "vitest";
import {
  connectedStudioRoomsForRoom,
  desiredRoomConnections,
  planStudioRoomConnectionSync,
} from "./dungeonStudioConnectionSync";
import { createDungeonStudioDocument, type DungeonStudioDocument } from "./dungeonStudioDocument";
import type { CampaignLocationLink } from "./travelTypes";

describe("dungeonStudioConnectionSync", () => {
  it("derives standard door links from room topology", () => {
    expect(desiredRoomConnections(studioDocument())).toEqual([
      {
        sourceLocationId: "room-a",
        targetLocationId: "room-b",
        linkType: "door",
      },
    ]);
  });

  it("plans generated link creation and stale generated link deletion", () => {
    const plan = planStudioRoomConnectionSync({
      document: studioDocument(),
      links: [autoLink({ targetLocationId: "stale-room" })],
      mapId: "map-1",
    });

    expect(plan.createLinks).toEqual([
      expect.objectContaining({
        sourceLocationId: "room-a",
        targetLocationId: "room-b",
        linkType: "door",
        label: "Dungeon Studio door",
        notes: "Dungeon Studio auto-link:map-1",
      }),
    ]);
    expect(plan.deleteLinks.map((link) => link.id)).toEqual(["link-1"]);
  });

  it("does not duplicate an existing manual room connection", () => {
    const plan = planStudioRoomConnectionSync({
      document: studioDocument(),
      links: [
        link({
          sourceLocationId: "room-a",
          targetLocationId: "room-b",
          linkType: "door",
          notes: "Manual lock notes",
        }),
      ],
      mapId: "map-1",
    });

    expect(plan.createLinks).toEqual([]);
    expect(plan.deleteLinks).toEqual([]);
  });

  it("lists connected rooms for the selected Studio room", () => {
    const connections = connectedStudioRoomsForRoom(studioDocument(), "studio-room-a");

    expect(
      connections.map((connection) => `${connection.room.id}:${connection.connectionType}`),
    ).toEqual(["studio-room-b:door"]);
  });
});

function studioDocument(overrides: Partial<DungeonStudioDocument> = {}) {
  return {
    ...createDungeonStudioDocument({ scope: "floor" }),
    layers: [
      {
        id: "floor",
        name: "Floor",
        kind: "cells" as const,
        visible: true,
        opacity: 1,
        cellKind: "floor" as const,
        cells: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
        ],
      },
    ],
    edges: [{ id: "door-1", cell: { x: 2, y: 1 }, direction: "w" as const, kind: "door" as const }],
    rooms: [
      {
        id: "studio-room-a",
        locationId: "room-a",
        label: "Entry",
        color: "#14b8a6",
        cells: [{ x: 1, y: 1 }],
      },
      {
        id: "studio-room-b",
        locationId: "room-b",
        label: "Hall",
        color: "#8b5cf6",
        cells: [{ x: 2, y: 1 }],
      },
    ],
    ...overrides,
  };
}

function autoLink(overrides: Partial<CampaignLocationLink> = {}) {
  return link({ notes: "Dungeon Studio auto-link:map-1", ...overrides });
}

function link(overrides: Partial<CampaignLocationLink> = {}): CampaignLocationLink {
  return {
    id: "link-1",
    campaignId: "campaign-1",
    sourceLocationId: "room-a",
    targetLocationId: "room-b",
    linkType: "door",
    label: "",
    direction: "bidirectional",
    visibility: "dm",
    notes: "",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}
