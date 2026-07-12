import { describe, expect, it } from "vitest";
import { createDungeonStudioDocument } from "./dungeonStudioDocument";
import {
  planStudioRoomLocationSync,
  studioRoomAnchor,
  studioRoomLocationInput,
} from "./dungeonStudioLocationSync";
import type { CampaignLocation } from "./travelTypes";

describe("Dungeon Studio location sync", () => {
  it("plans missing Campaign World rooms for unlinked studio rooms", () => {
    const document = {
      ...createDungeonStudioDocument({ scope: "floor" }),
      rooms: [room("room-1", "Guard room")],
    };

    const plan = planStudioRoomLocationSync({
      document,
      locations: [],
      mapId: "map-1",
      parentLocationId: "floor-1",
    });

    expect(plan.createRooms.map((item) => item.id)).toEqual(["room-1"]);
    expect(plan.deleteLocations).toEqual([]);
  });

  it("links existing managed locations and deletes duplicates", () => {
    const document = {
      ...createDungeonStudioDocument({ scope: "floor" }),
      rooms: [room("room-1", "Guard room")],
    };
    const primary = location("location-1", "room-1");
    const duplicate = location("location-2", "room-1");

    const plan = planStudioRoomLocationSync({
      document,
      locations: [primary, duplicate],
      mapId: "map-1",
      parentLocationId: "floor-1",
    });

    expect(plan.linkRoomLocationIds).toEqual({ "room-1": "location-1" });
    expect(plan.deleteLocations.map((item) => item.id)).toEqual(["location-2"]);
  });

  it("updates renamed rooms and marks locations with a studio anchor", () => {
    const document = {
      ...createDungeonStudioDocument({ scope: "floor" }),
      rooms: [room("room-1", "New name", "location-1")],
    };
    const staleLocation = {
      ...location("location-1", "room-1"),
      name: "Old name",
      mapAnchor: {},
    };

    const plan = planStudioRoomLocationSync({
      document,
      locations: [staleLocation],
      mapId: "map-1",
      parentLocationId: "floor-1",
    });

    expect(plan.updateLocations).toHaveLength(1);
    expect(plan.updateLocations[0].payload.name).toBe("New name");
    expect(studioRoomAnchor(plan.updateLocations[0].payload, "map-1")?.roomId).toBe("room-1");
  });

  it("plans stale managed locations for deletion", () => {
    const document = createDungeonStudioDocument({ scope: "floor" });

    const plan = planStudioRoomLocationSync({
      document,
      locations: [location("location-1", "room-removed")],
      mapId: "map-1",
      parentLocationId: "floor-1",
    });

    expect(plan.deleteLocations.map((item) => item.id)).toEqual(["location-1"]);
  });

  it("builds a room payload without dropping existing notes", () => {
    const payload = studioRoomLocationInput({
      existingLocation: {
        ...location("location-1", "room-1"),
        notes: "Public",
        dmNotes: "Secret",
        tags: ["locked"],
      },
      mapId: "map-1",
      parentLocationId: "floor-1",
      room: room("room-1", "Vault"),
    });

    expect(payload).toMatchObject({
      dmNotes: "Secret",
      name: "Vault",
      notes: "Public",
      tags: ["locked"],
    });
  });
});

function room(id: string, label: string, locationId?: string) {
  return {
    id,
    label,
    locationId,
    color: "#14b8a6",
    cells: [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  };
}

function location(id: string, roomId: string): CampaignLocation {
  return {
    id,
    campaignId: "campaign-1",
    parentLocationId: "floor-1",
    name: "Guard room",
    locationType: "room",
    notes: "",
    summary: "Room mapped in Dungeon Studio.",
    mapAnchor: { dungeonStudio: { managed: true, mapId: "map-1", roomId } },
  };
}
