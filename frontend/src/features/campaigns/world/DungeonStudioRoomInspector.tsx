import { Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ActionRow } from "../../../components/layout";
import { Button } from "../../../components/ui";
import type { CampaignLocation } from "./travelTypes";
import type { DungeonStudioSelection, DungeonStudioTool } from "./dungeonStudioEditing";
import type { DungeonStudioRoomRegion, DungeonStudioTilesetKey } from "./dungeonStudioDocument";
import { dungeonStudioThemeOptions } from "./dungeonStudioThemes";

export function DungeonStudioRoomInspector({
  activeTool,
  rooms,
  roomLocations,
  selected,
  selectedRoom,
  selectedRoomConnections,
  onDeleteRoom,
  onEditRoom,
  onRenameRoom,
  onRoomColorChange,
  onRoomThemeChange,
}: {
  activeTool: DungeonStudioTool;
  rooms: DungeonStudioRoomRegion[];
  roomLocations: CampaignLocation[];
  selected: DungeonStudioSelection;
  selectedRoom?: DungeonStudioRoomRegion;
  selectedRoomConnections: Array<{
    connectionType: string;
    room: DungeonStudioRoomRegion;
  }>;
  onDeleteRoom: (roomId: string) => void;
  onEditRoom: (roomId: string) => void;
  onRenameRoom: (roomId: string, label: string) => void;
  onRoomColorChange: (roomId: string, color: string) => void;
  onRoomThemeChange: (roomId: string, theme: DungeonStudioTilesetKey | "") => void;
}) {
  const [draftName, setDraftName] = useState(selectedRoom?.label ?? "");
  const selectedCells = selected?.type === "region" ? selected.cells.length : 0;

  useEffect(() => {
    setDraftName(selectedRoom?.label ?? "");
  }, [selectedRoom?.id, selectedRoom?.label]);

  return (
    <div className="grid gap-3">
      <ActiveRoomCard
        activeTool={activeTool}
        draftName={draftName}
        selectedCells={selectedCells}
        selectedRoom={selectedRoom}
        selectedRoomConnections={selectedRoomConnections}
        roomLocations={roomLocations}
        onDeleteRoom={onDeleteRoom}
        onDraftNameChange={setDraftName}
        onEditRoom={onEditRoom}
        onRenameRoom={onRenameRoom}
        onRoomColorChange={onRoomColorChange}
        onRoomThemeChange={onRoomThemeChange}
      />
      <ExistingRoomsCard rooms={rooms} selectedRoom={selectedRoom} onEditRoom={onEditRoom} />
    </div>
  );
}

function ActiveRoomCard({
  activeTool,
  draftName,
  selectedCells,
  roomLocations,
  selectedRoom,
  selectedRoomConnections,
  onDeleteRoom,
  onDraftNameChange,
  onEditRoom,
  onRenameRoom,
  onRoomColorChange,
  onRoomThemeChange,
}: {
  activeTool: DungeonStudioTool;
  draftName: string;
  selectedCells: number;
  roomLocations: CampaignLocation[];
  selectedRoom?: DungeonStudioRoomRegion;
  selectedRoomConnections: Array<{
    connectionType: string;
    room: DungeonStudioRoomRegion;
  }>;
  onDeleteRoom: (roomId: string) => void;
  onDraftNameChange: (name: string) => void;
  onEditRoom: (roomId: string) => void;
  onRenameRoom: (roomId: string, label: string) => void;
  onRoomColorChange: (roomId: string, color: string) => void;
  onRoomThemeChange: (roomId: string, theme: DungeonStudioTilesetKey | "") => void;
}) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-sm font-semibold text-foreground">Room</div>
      {selectedRoom ? (
        <div className="mt-2 grid gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <RoomColor color={selectedRoom.color} />
            Editing room: {selectedRoom.label}
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedRoom.cells.length
              ? `${selectedRoom.cells.length} cells assigned.`
              : "No cells assigned yet."}
          </p>
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            Room name
            <input
              className="rounded-md border border-border bg-card px-2 py-1.5 text-sm font-semibold normal-case text-foreground"
              value={draftName}
              onChange={(event) => onDraftNameChange(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            Color
            <input
              className="h-9 w-20 rounded-md border border-border bg-card px-1"
              type="color"
              value={selectedRoom.color}
              onChange={(event) => onRoomColorChange(selectedRoom.id, event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            Room theme override
            <select
              className="rounded-md border border-border bg-card px-2 py-1.5 text-sm font-semibold text-foreground"
              value={selectedRoom.themeKey ?? ""}
              onChange={(event) =>
                onRoomThemeChange(
                  selectedRoom.id,
                  event.target.value as DungeonStudioTilesetKey | "",
                )
              }
            >
              <option value="">Use map theme</option>
              {dungeonStudioThemeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            {linkedRoomName(selectedRoom, roomLocations)}
          </p>
          {selectedRoomConnections.length ? (
            <div className="grid gap-1">
              <div className="text-xs font-semibold text-muted-foreground">Connected rooms</div>
              {selectedRoomConnections.map((connection) => (
                <button
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-left text-sm transition hover:border-accent/50"
                  key={connection.room.id}
                  type="button"
                  onClick={() => onEditRoom(connection.room.id)}
                >
                  <span className="min-w-0 truncate font-semibold">{connection.room.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {connection.connectionType}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          <ActionRow>
            <Button
              type="button"
              icon={Save}
              size="sm"
              variant="secondary"
              disabled={!draftName.trim()}
              onClick={() => onRenameRoom(selectedRoom.id, draftName)}
            >
              Save
            </Button>
            <Button
              type="button"
              icon={Trash2}
              size="sm"
              variant="danger"
              onClick={() => onDeleteRoom(selectedRoom.id)}
            >
              Delete room
            </Button>
          </ActionRow>
        </div>
      ) : (
        <div className="mt-2 grid gap-2">
          <div className="text-sm font-semibold text-foreground">
            {activeTool === "room-brush" || activeTool === "room-fill"
              ? "Adding room"
              : "Select a room"}
          </div>
          <p className="text-xs text-muted-foreground">
            {activeTool === "room-brush" || activeTool === "room-fill"
              ? selectedCells
                ? `${selectedCells} cells in the current room draft. Use Save in the top bar when finished.`
                : "Choose a brush in the top bar, then place the room on the map."
              : "Click an existing room on the map or choose one below. Use Add room in the top bar to create a new room."}
          </p>
        </div>
      )}
    </div>
  );
}

function ExistingRoomsCard({
  rooms,
  selectedRoom,
  onEditRoom,
}: {
  rooms: DungeonStudioRoomRegion[];
  selectedRoom?: DungeonStudioRoomRegion;
  onEditRoom: (roomId: string) => void;
}) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-sm font-semibold text-foreground">Rooms</div>
      {rooms.length ? (
        <div className="mt-2 grid gap-2">
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              className={[
                "flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-sm transition hover:border-accent/50",
                selectedRoom?.id === room.id
                  ? "border-accent/40 bg-accent/10"
                  : "border-border bg-card",
              ].join(" ")}
              onClick={() => onEditRoom(room.id)}
            >
              <span className="flex min-w-0 items-center gap-2 font-semibold">
                <RoomColor color={room.color} />
                <span className="min-w-0 truncate">{room.label}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {room.cells.length} cells
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          No rooms yet. Select or fill floor cells to create the first room.
        </p>
      )}
    </div>
  );
}

function RoomColor({ color }: { color: string }) {
  return (
    <span
      className="h-3 w-3 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

function linkedRoomName(room: DungeonStudioRoomRegion, roomLocations: CampaignLocation[]) {
  const location = room.locationId
    ? roomLocations.find((candidate) => candidate.id === room.locationId)
    : undefined;
  return location
    ? `Campaign World room: ${location.name}`
    : "Campaign World room will sync on save.";
}
