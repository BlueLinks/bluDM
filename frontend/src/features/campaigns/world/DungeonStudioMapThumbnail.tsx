import { cellLayerFill, dungeonStudioDimensions } from "./dungeonStudioPreviewViewport";
import {
  DUNGEON_STUDIO_CELL_SIZE,
  EdgeLine,
  EntityMarker,
  RoomOverlay,
} from "./DungeonStudioPreviewElements";
import { dungeonStudioPreviewViewBox } from "./dungeonStudioPreviewBounds";
import type { DungeonStudioDocument } from "./dungeonStudioDocument";

export function DungeonStudioMapThumbnail({
  document,
  focusRoomLocationId,
  label = "Dungeon map preview",
  onRoomSelect,
}: {
  document: DungeonStudioDocument;
  focusRoomLocationId?: string;
  label?: string;
  onRoomSelect?: (locationId: string) => void;
}) {
  const dimensions = dungeonStudioDimensions(document);
  const focusRoom = focusRoomLocationId
    ? document.rooms.find((room) => room.locationId === focusRoomLocationId)
    : undefined;
  const adjacentRoomIds = focusRoom
    ? new Set(
        document.rooms
          .filter((room) => room.id !== focusRoom.id && roomsTouch(focusRoom.cells, room.cells))
          .map((room) => room.id),
      )
    : undefined;
  return (
    <svg
      role="img"
      aria-label={label}
      className="h-full min-h-32 w-full rounded-md border border-border bg-background"
      viewBox={dungeonStudioPreviewViewBox(document, focusRoomLocationId)}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width={dimensions.width} height={dimensions.height} fill="hsl(var(--background))" />
      {document.layers
        .filter((layer) => layer.visible)
        .flatMap((layer) =>
          layer.cells.map((cell) => (
            <rect
              key={`${layer.id}-${cell.x}-${cell.y}`}
              x={cell.x * DUNGEON_STUDIO_CELL_SIZE}
              y={cell.y * DUNGEON_STUDIO_CELL_SIZE}
              width={DUNGEON_STUDIO_CELL_SIZE}
              height={DUNGEON_STUDIO_CELL_SIZE}
              fill={cellLayerFill(layer.cellKind, document)}
              opacity={layer.opacity}
            />
          )),
        )}
      {document.rooms.map((room) =>
        !focusRoom || room.id === focusRoom.id || adjacentRoomIds?.has(room.id) ? (
          <RoomOverlay key={room.id} room={room} />
        ) : null,
      )}
      {document.edges.map((edge) => (
        <EdgeLine key={edge.id} edge={edge} />
      ))}
      {document.entities.map((entity) => (
        <EntityMarker customAssets={document.customAssets} entity={entity} key={entity.id} />
      ))}
      {onRoomSelect
        ? document.rooms.map((room) => {
            if (!room.locationId) return null;
            const locationId = room.locationId;
            const bounds = roomBounds(room.cells);
            if (!bounds) return null;
            return (
              <rect
                aria-label={`Open ${room.label}`}
                className="cursor-pointer outline-none"
                fill="transparent"
                key={`${room.id}-hit-target`}
                role="button"
                tabIndex={0}
                x={bounds.minX * DUNGEON_STUDIO_CELL_SIZE}
                y={bounds.minY * DUNGEON_STUDIO_CELL_SIZE}
                width={(bounds.maxX - bounds.minX + 1) * DUNGEON_STUDIO_CELL_SIZE}
                height={(bounds.maxY - bounds.minY + 1) * DUNGEON_STUDIO_CELL_SIZE}
                onClick={() => onRoomSelect(locationId)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onRoomSelect(locationId);
                  }
                }}
              />
            );
          })
        : null}
    </svg>
  );
}

function roomBounds(cells: Array<{ x: number; y: number }>) {
  if (!cells.length) return null;
  const xs = cells.map((cell) => cell.x);
  const ys = cells.map((cell) => cell.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function roomsTouch(left: Array<{ x: number; y: number }>, right: Array<{ x: number; y: number }>) {
  const rightKeys = new Set(right.map((cell) => `${cell.x},${cell.y}`));
  return left.some((cell) =>
    [
      `${cell.x + 1},${cell.y}`,
      `${cell.x - 1},${cell.y}`,
      `${cell.x},${cell.y + 1}`,
      `${cell.x},${cell.y - 1}`,
    ].some((key) => rightKeys.has(key)),
  );
}
