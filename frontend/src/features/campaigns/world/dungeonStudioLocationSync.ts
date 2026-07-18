import type { CampaignLocation, CampaignLocationInput } from "./travelTypes";
import type { DungeonStudioDocument, DungeonStudioRoomRegion } from "./dungeonStudioDocument";

type StudioRoomAnchor = {
  managed: true;
  mapId: string;
  roomId: string;
};

export type StudioRoomLocationUpdate = {
  location: CampaignLocation;
  payload: CampaignLocationInput;
  room: DungeonStudioRoomRegion;
};

export type StudioRoomLocationSyncPlan = {
  createRooms: DungeonStudioRoomRegion[];
  deleteLocations: CampaignLocation[];
  linkRoomLocationIds: Record<string, string>;
  updateLocations: StudioRoomLocationUpdate[];
};

export function planStudioRoomLocationSync({
  document,
  locations,
  mapId,
  parentLocationId,
}: {
  document: DungeonStudioDocument;
  locations: CampaignLocation[];
  mapId: string;
  parentLocationId: string;
}): StudioRoomLocationSyncPlan {
  const roomsById = new Map(document.rooms.map((room) => [room.id, room]));
  const locationsById = new Map(locations.map((location) => [location.id, location]));
  const managedRoomsByRoomId = new Map<string, CampaignLocation[]>();
  const linkedLocationIds = new Set(
    document.rooms.map((room) => room.locationId).filter(Boolean) as string[],
  );

  for (const location of locations) {
    const anchor = studioRoomAnchor(location, mapId);
    if (!anchor || location.parentLocationId !== parentLocationId) continue;
    const existing = managedRoomsByRoomId.get(anchor.roomId) ?? [];
    managedRoomsByRoomId.set(anchor.roomId, [...existing, location]);
  }

  const createRooms: DungeonStudioRoomRegion[] = [];
  const deleteLocations: CampaignLocation[] = [];
  const linkRoomLocationIds: Record<string, string> = {};
  const updateLocations: StudioRoomLocationUpdate[] = [];

  for (const room of document.rooms) {
    const linkedLocation = room.locationId ? locationsById.get(room.locationId) : undefined;
    const managedMatches = managedRoomsByRoomId.get(room.id) ?? [];
    const keptLocation = validRoomLocation(linkedLocation, parentLocationId)
      ? linkedLocation
      : managedMatches[0];

    if (!keptLocation) {
      createRooms.push(room);
      continue;
    }

    linkRoomLocationIds[room.id] = keptLocation.id;
    const payload = studioRoomLocationInput({
      existingLocation: keptLocation,
      mapId,
      parentLocationId,
      room,
    });
    if (roomLocationNeedsUpdate(keptLocation, payload)) {
      updateLocations.push({ location: keptLocation, payload, room });
    }

    for (const duplicate of managedMatches) {
      if (duplicate.id !== keptLocation.id) deleteLocations.push(duplicate);
    }
  }

  for (const [roomId, managedLocations] of managedRoomsByRoomId) {
    if (roomsById.has(roomId)) continue;
    deleteLocations.push(...managedLocations);
  }

  return {
    createRooms,
    deleteLocations: uniqueLocations(deleteLocations, linkedLocationIds),
    linkRoomLocationIds,
    updateLocations,
  };
}

export function studioRoomLocationInput({
  existingLocation,
  mapId,
  parentLocationId,
  room,
}: {
  existingLocation?: CampaignLocation;
  mapId: string;
  parentLocationId: string;
  room: DungeonStudioRoomRegion;
}): CampaignLocationInput {
  return {
    parentLocationId,
    name: room.label.trim() || "Unnamed room",
    locationType: "room",
    customTypeLabel: existingLocation?.customTypeLabel,
    summary: "Room mapped in Dungeon Studio.",
    notes: existingLocation?.notes ?? "",
    publicNotes: existingLocation?.publicNotes ?? existingLocation?.notes ?? "",
    dmNotes: existingLocation?.dmNotes ?? "",
    tags: existingLocation?.tags ?? [],
    sortOrder: existingLocation?.sortOrder,
    status: existingLocation?.status,
    mapAnchor: {
      ...(existingLocation?.mapAnchor ?? {}),
      dungeonStudio: studioRoomMapAnchor(mapId, room.id),
    },
  };
}

export function studioRoomAnchor(
  location: Pick<CampaignLocation, "mapAnchor">,
  mapId: string,
): StudioRoomAnchor | null {
  const value = location.mapAnchor?.dungeonStudio;
  if (!value || typeof value !== "object") return null;
  const anchor = value as Partial<StudioRoomAnchor>;
  if (anchor.managed !== true || anchor.mapId !== mapId || !anchor.roomId) return null;
  return anchor as StudioRoomAnchor;
}

function studioRoomMapAnchor(mapId: string, roomId: string): StudioRoomAnchor {
  return { managed: true, mapId, roomId };
}

function validRoomLocation(location: CampaignLocation | undefined, parentLocationId: string) {
  return Boolean(
    location && location.locationType === "room" && location.parentLocationId === parentLocationId,
  );
}

function roomLocationNeedsUpdate(location: CampaignLocation, payload: CampaignLocationInput) {
  return (
    location.name !== payload.name ||
    location.locationType !== payload.locationType ||
    location.parentLocationId !== payload.parentLocationId ||
    location.summary !== payload.summary ||
    JSON.stringify(location.mapAnchor ?? {}) !== JSON.stringify(payload.mapAnchor ?? {})
  );
}

function uniqueLocations(locations: CampaignLocation[], protectedIds: Set<string>) {
  const seen = new Set<string>();
  return locations.filter((location) => {
    if (protectedIds.has(location.id) || seen.has(location.id)) return false;
    seen.add(location.id);
    return true;
  });
}
