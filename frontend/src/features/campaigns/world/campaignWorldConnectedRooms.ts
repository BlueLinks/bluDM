import {
  type DungeonStudioDocument,
  type DungeonStudioEdgeDirection,
  edgeKey,
  isDungeonStudioMap,
  parseDungeonStudioDocument,
} from "./dungeonStudioDocument";
import type { CampaignLocation, CampaignMap } from "./travelTypes";

export type InferredRoomConnection = {
  connectionType: string;
  id: string;
  targetLocation: CampaignLocation;
};

export function connectedRoomsForLocation({
  location,
  locations,
  maps,
}: {
  location: CampaignLocation;
  locations: CampaignLocation[];
  maps: CampaignMap[];
}): InferredRoomConnection[] {
  if ((location.locationType ?? "").toLowerCase() !== "room") return [];
  const connectedByLocationId = new Map<string, InferredRoomConnection>();

  maps.filter(isDungeonStudioMap).forEach((map) => {
    const document = parseDungeonStudioDocument(map.metadata, {
      scope: map.mapType === "floor" ? "floor" : "dungeon",
    });
    const currentRooms = document.rooms.filter((room) => room.locationId === location.id);
    currentRooms.forEach((currentRoom) => {
      document.rooms.forEach((candidateRoom) => {
        if (!candidateRoom.locationId || candidateRoom.id === currentRoom.id) return;
        const targetLocation = locations.find((item) => item.id === candidateRoom.locationId);
        if (!targetLocation || targetLocation.id === location.id) return;
        const connectionType = roomConnectionType(document, currentRoom.cells, candidateRoom.cells);
        if (!connectionType) return;

        const existing = connectedByLocationId.get(targetLocation.id);
        const next = {
          connectionType: betterConnectionType(existing?.connectionType, connectionType),
          id: `${map.id}-${currentRoom.id}-${candidateRoom.id}`,
          targetLocation,
        };
        connectedByLocationId.set(targetLocation.id, next);
      });
    });
  });

  return [...connectedByLocationId.values()].sort((left, right) =>
    left.targetLocation.name.localeCompare(right.targetLocation.name),
  );
}

function roomConnectionType(
  document: DungeonStudioDocument,
  leftCells: Array<{ x: number; y: number }>,
  rightCells: Array<{ x: number; y: number }>,
) {
  const edges = new Map(document.edges.map((edge) => [edgeKey(edge.cell, edge.direction), edge]));
  const rightCellKeys = new Set(rightCells.map((cell) => cellKey(cell)));
  let hasOpenAdjacency = false;

  for (const cell of leftCells) {
    for (const neighbor of cardinalNeighbors(cell)) {
      if (!rightCellKeys.has(cellKey(neighbor.cell))) continue;
      const edge = edges.get(edgeKey(cell, neighbor.direction));
      if (!edge) {
        hasOpenAdjacency = true;
        continue;
      }
      if (edge.kind === "door") return "door";
      if (edge.kind === "secret-door") return "secret door";
      if (edge.kind === "gate") return "gate";
    }
  }

  return hasOpenAdjacency ? "passage" : null;
}

function cardinalNeighbors(cell: { x: number; y: number }): Array<{
  cell: { x: number; y: number };
  direction: DungeonStudioEdgeDirection;
}> {
  return [
    { cell: { x: cell.x + 1, y: cell.y }, direction: "e" },
    { cell: { x: cell.x - 1, y: cell.y }, direction: "w" },
    { cell: { x: cell.x, y: cell.y + 1 }, direction: "s" },
    { cell: { x: cell.x, y: cell.y - 1 }, direction: "n" },
  ];
}

function cellKey(cell: { x: number; y: number }) {
  return `${cell.x},${cell.y}`;
}

function betterConnectionType(current: string | undefined, next: string) {
  if (!current) return next;
  const rank = (type: string) =>
    type === "secret door"
      ? 4
      : type === "door"
        ? 3
        : type === "gate"
          ? 2
          : type === "passage"
            ? 1
            : 0;
  return rank(next) > rank(current) ? next : current;
}
