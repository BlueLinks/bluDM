import {
  edgeKey,
  type DungeonStudioDocument,
  type DungeonStudioEdgeDirection,
  type GridCell,
} from "./dungeonStudioDocument";
import type { CampaignLocationLink, CampaignLocationLinkInput } from "./travelTypes";

const AUTO_LINK_PREFIX = "Dungeon Studio auto-link:";

export type StudioRoomLinkPlan = {
  createLinks: CampaignLocationLinkInput[];
  deleteLinks: CampaignLocationLink[];
};

type DesiredRoomConnection = {
  sourceLocationId: string;
  targetLocationId: string;
  linkType: string;
};

export function planStudioRoomConnectionSync({
  document,
  links,
  mapId,
}: {
  document: DungeonStudioDocument;
  links: CampaignLocationLink[];
  mapId: string;
}): StudioRoomLinkPlan {
  const desired = desiredRoomConnections(document);
  const desiredKeys = new Set(desired.map(connectionKey));
  const autoLinks = links.filter((link) => isAutoStudioLink(link, mapId));
  const manualPairs = new Set(
    links.filter((link) => !isAutoStudioLink(link, mapId)).map((link) => pairKey(link)),
  );
  const existingAutoKeys = new Set(autoLinks.map(connectionKey));
  return {
    createLinks: desired
      .filter((connection) => !existingAutoKeys.has(connectionKey(connection)))
      .filter((connection) => !manualPairs.has(pairKey(connection)))
      .map((connection) => ({
        ...connection,
        direction: "bidirectional",
        visibility: "dm",
        label: studioLinkLabel(connection.linkType),
        notes: `${AUTO_LINK_PREFIX}${mapId}`,
      })),
    deleteLinks: autoLinks.filter((link) => !desiredKeys.has(connectionKey(link))),
  };
}

export function desiredRoomConnections(document: DungeonStudioDocument) {
  const connections = new Map<string, DesiredRoomConnection>();
  document.rooms.forEach((leftRoom, leftIndex) => {
    const sourceLocationId = leftRoom.locationId;
    if (!sourceLocationId) return;
    document.rooms.slice(leftIndex + 1).forEach((rightRoom) => {
      const targetLocationId = rightRoom.locationId;
      if (!targetLocationId) return;
      const linkType = roomConnectionType(document, leftRoom.cells, rightRoom.cells);
      if (!linkType) return;
      const connection = normalizeConnection({
        sourceLocationId,
        targetLocationId,
        linkType,
      });
      connections.set(pairKey(connection), connection);
    });
  });
  return [...connections.values()];
}

export function connectedStudioRoomsForRoom(document: DungeonStudioDocument, roomId: string) {
  const room = document.rooms.find((item) => item.id === roomId);
  if (!room) return [];
  return document.rooms
    .filter((candidate) => candidate.id !== room.id)
    .map((candidate) => ({
      connectionType: roomConnectionType(document, room.cells, candidate.cells),
      room: candidate,
    }))
    .filter((connection) => connection.connectionType)
    .sort((left, right) => left.room.label.localeCompare(right.room.label));
}

function roomConnectionType(
  document: DungeonStudioDocument,
  leftCells: GridCell[],
  rightCells: GridCell[],
) {
  const edges = new Map(document.edges.map((edge) => [edgeKey(edge.cell, edge.direction), edge]));
  const rightCellKeys = new Set(rightCells.map(cellKey));
  let hasPassage = false;

  for (const cell of leftCells) {
    for (const neighbor of cardinalNeighbors(cell)) {
      if (!rightCellKeys.has(cellKey(neighbor.cell))) continue;
      const edge = edges.get(edgeKey(cell, neighbor.direction));
      if (!edge) {
        hasPassage = true;
        continue;
      }
      if (edge.kind === "door" || edge.kind === "gate") return edge.kind;
    }
  }

  return hasPassage ? "passage" : "";
}

function cardinalNeighbors(cell: GridCell): Array<{
  cell: GridCell;
  direction: DungeonStudioEdgeDirection;
}> {
  return [
    { cell: { x: cell.x + 1, y: cell.y }, direction: "e" },
    { cell: { x: cell.x - 1, y: cell.y }, direction: "w" },
    { cell: { x: cell.x, y: cell.y + 1 }, direction: "s" },
    { cell: { x: cell.x, y: cell.y - 1 }, direction: "n" },
  ];
}

function normalizeConnection<T extends DesiredRoomConnection>(connection: T): T {
  return connection.sourceLocationId.localeCompare(connection.targetLocationId) <= 0
    ? connection
    : {
        ...connection,
        sourceLocationId: connection.targetLocationId,
        targetLocationId: connection.sourceLocationId,
      };
}

function isAutoStudioLink(link: CampaignLocationLink, mapId: string) {
  return link.notes === `${AUTO_LINK_PREFIX}${mapId}`;
}

function connectionKey(connection: DesiredRoomConnection) {
  const normalized = normalizeConnection(connection);
  return `${normalized.sourceLocationId}:${normalized.targetLocationId}:${normalized.linkType}`;
}

function pairKey(connection: Pick<DesiredRoomConnection, "sourceLocationId" | "targetLocationId">) {
  const [left, right] = [connection.sourceLocationId, connection.targetLocationId].sort();
  return `${left}:${right}`;
}

function studioLinkLabel(linkType: string) {
  if (linkType === "door") return "Dungeon Studio door";
  if (linkType === "gate") return "Dungeon Studio gate";
  return "Dungeon Studio passage";
}

function cellKey(cell: GridCell) {
  return `${cell.x},${cell.y}`;
}
