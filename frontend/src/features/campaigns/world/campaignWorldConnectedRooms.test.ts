import { describe, expect, it } from "vitest";
import {
  connectedRoomsForLocation,
  type InferredRoomConnection,
} from "./campaignWorldConnectedRooms";
import {
  createDungeonStudioDocument,
  dungeonStudioMapInput,
  type DungeonStudioDocument,
} from "./dungeonStudioDocument";
import type { CampaignLocation, CampaignMap } from "./travelTypes";

describe("connectedRoomsForLocation", () => {
  it("infers connected rooms from adjacent Studio room regions", () => {
    const connections = connectedRoomsForLocation({
      location: entryRoom,
      locations: [entryRoom, hallRoom],
      maps: [studioMap(studioDocument())],
    });

    expect(connectionLabels(connections)).toEqual(["Hall:door"]);
  });

  it("does not infer a connection through a solid wall", () => {
    const document = studioDocument({
      edges: [{ id: "wall-1", cell: { x: 2, y: 1 }, direction: "w", kind: "wall" }],
    });

    expect(
      connectedRoomsForLocation({
        location: entryRoom,
        locations: [entryRoom, hallRoom],
        maps: [studioMap(document)],
      }),
    ).toHaveLength(0);
  });
});

function connectionLabels(connections: InferredRoomConnection[]) {
  return connections.map(
    (connection) => `${connection.targetLocation.name}:${connection.connectionType}`,
  );
}

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
        id: "studio-room-1",
        locationId: entryRoom.id,
        label: entryRoom.name,
        color: "#14b8a6",
        cells: [{ x: 1, y: 1 }],
      },
      {
        id: "studio-room-2",
        locationId: hallRoom.id,
        label: hallRoom.name,
        color: "#8b5cf6",
        cells: [{ x: 2, y: 1 }],
      },
    ],
    ...overrides,
  };
}

function studioMap(document: DungeonStudioDocument): CampaignMap {
  const input = dungeonStudioMapInput(floorLocation, document);
  return {
    ...input,
    id: "map-1",
    campaignId: "campaign-1",
    description: input.description ?? "",
    calibrationPixelLength: input.calibrationPixelLength ?? 20,
    calibrationDistance: input.calibrationDistance ?? 5,
    imageUrl: undefined,
    createdAt: "",
    updatedAt: "",
  };
}

const floorLocation = location({ id: "floor-1", name: "Upper Floor", locationType: "floor" });
const entryRoom = location({
  id: "room-1",
  name: "Entry",
  locationType: "room",
  parentLocationId: floorLocation.id,
});
const hallRoom = location({
  id: "room-2",
  name: "Hall",
  locationType: "room",
  parentLocationId: floorLocation.id,
});

function location(overrides: Partial<CampaignLocation>): CampaignLocation {
  return {
    id: "loc-1",
    campaignId: "campaign-1",
    name: "Location",
    locationType: "custom",
    notes: "",
    ...overrides,
  };
}
