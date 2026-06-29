import {
  Check,
  Eraser,
  ListChecks,
  PaintBucket,
  Paintbrush,
  Pencil,
  Plus,
  Square,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ActionRow } from "../../../components/layout";
import { Button } from "../../../components/ui";
import type { DungeonStudioSelection, DungeonStudioTool } from "./dungeonStudioEditing";
import type { DungeonStudioRoomRegion } from "./dungeonStudioDocument";
import { toolLabel } from "./dungeonStudioToolText";

export function DungeonStudioRoomInspector({
  activeTool,
  canCreateRoom,
  rooms,
  selected,
  selectedRoom,
  onCreateRoomFromSelection,
  onDeleteRoom,
  onDoneRoom,
  onEditRoom,
  onRenameRoom,
  onStartNewRoom,
  onToolChange,
}: {
  activeTool: DungeonStudioTool;
  canCreateRoom: boolean;
  rooms: DungeonStudioRoomRegion[];
  selected: DungeonStudioSelection;
  selectedRoom?: DungeonStudioRoomRegion;
  onCreateRoomFromSelection: () => void;
  onDeleteRoom: (roomId: string) => void;
  onDoneRoom: () => void;
  onEditRoom: (roomId: string) => void;
  onRenameRoom: (roomId: string, label: string) => void;
  onStartNewRoom: () => void;
  onToolChange: (tool: DungeonStudioTool) => void;
}) {
  const [draftName, setDraftName] = useState(selectedRoom?.label ?? "");
  const selectedCells = selected?.type === "region" ? selected.cells.length : 0;

  useEffect(() => {
    setDraftName(selectedRoom?.label ?? "");
  }, [selectedRoom?.id, selectedRoom?.label]);

  return (
    <div className="grid gap-3">
      <ActiveRoomCard
        draftName={draftName}
        selectedRoom={selectedRoom}
        onDeleteRoom={onDeleteRoom}
        onDoneRoom={onDoneRoom}
        onDraftNameChange={setDraftName}
        onRenameRoom={onRenameRoom}
        onStartNewRoom={onStartNewRoom}
      />
      <RoomPaintActionsCard
        activeTool={activeTool}
        canCreateRoom={canCreateRoom}
        selectedCells={selectedCells}
        onCreateRoomFromSelection={onCreateRoomFromSelection}
        onToolChange={onToolChange}
      />
      <ExistingRoomsCard rooms={rooms} selectedRoom={selectedRoom} onEditRoom={onEditRoom} />
    </div>
  );
}

function ActiveRoomCard({
  draftName,
  selectedRoom,
  onDeleteRoom,
  onDoneRoom,
  onDraftNameChange,
  onRenameRoom,
  onStartNewRoom,
}: {
  draftName: string;
  selectedRoom?: DungeonStudioRoomRegion;
  onDeleteRoom: (roomId: string) => void;
  onDoneRoom: () => void;
  onDraftNameChange: (name: string) => void;
  onRenameRoom: (roomId: string, label: string) => void;
  onStartNewRoom: () => void;
}) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-xs font-bold uppercase text-muted-foreground">Active room</div>
      {selectedRoom ? (
        <div className="mt-2 grid gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <RoomColor color={selectedRoom.color} />
            Editing {selectedRoom.label}
          </div>
          <label className="grid gap-1 text-xs font-semibold uppercase text-muted-foreground">
            Room name
            <input
              className="rounded-md border border-border bg-card px-2 py-1.5 text-sm font-semibold normal-case text-foreground"
              value={draftName}
              onChange={(event) => onDraftNameChange(event.target.value)}
            />
          </label>
          <ActionRow>
            <Button
              type="button"
              icon={Pencil}
              size="sm"
              variant="secondary"
              disabled={!draftName.trim() || draftName.trim() === selectedRoom.label}
              onClick={() => onRenameRoom(selectedRoom.id, draftName)}
            >
              Save name
            </Button>
            <Button type="button" icon={Check} size="sm" variant="secondary" onClick={onDoneRoom}>
              Done
            </Button>
          </ActionRow>
          <ActionRow>
            <Button type="button" icon={Plus} size="sm" variant="ghost" onClick={onStartNewRoom}>
              Start another
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
          <p className="text-xs text-muted-foreground">
            No active room. Select cells, fill an enclosed area, or edit an existing room below.
          </p>
          <Button type="button" icon={Plus} size="sm" variant="secondary" onClick={onStartNewRoom}>
            Start a room
          </Button>
        </div>
      )}
    </div>
  );
}

function RoomPaintActionsCard({
  activeTool,
  canCreateRoom,
  selectedCells,
  onCreateRoomFromSelection,
  onToolChange,
}: {
  activeTool: DungeonStudioTool;
  canCreateRoom: boolean;
  selectedCells: number;
  onCreateRoomFromSelection: () => void;
  onToolChange: (tool: DungeonStudioTool) => void;
}) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-xs font-bold uppercase text-muted-foreground">Paint and fill</div>
      <div className="mt-2 grid gap-2">
        <ActionRow>
          <RoomToolButton
            activeTool={activeTool}
            icon={Square}
            tool="room-select"
            onToolChange={onToolChange}
          >
            Select cells
          </RoomToolButton>
          <RoomToolButton
            activeTool={activeTool}
            icon={Paintbrush}
            tool="room-brush"
            onToolChange={onToolChange}
          >
            Paint room
          </RoomToolButton>
        </ActionRow>
        <ActionRow>
          <RoomToolButton
            activeTool={activeTool}
            icon={PaintBucket}
            tool="room-fill"
            onToolChange={onToolChange}
          >
            Fill bounded
          </RoomToolButton>
          <RoomToolButton
            activeTool={activeTool}
            icon={Eraser}
            tool="erase-room"
            onToolChange={onToolChange}
          >
            Erase room
          </RoomToolButton>
        </ActionRow>
        <Button
          type="button"
          className="w-full"
          disabled={!canCreateRoom}
          icon={ListChecks}
          size="sm"
          variant="secondary"
          onClick={onCreateRoomFromSelection}
        >
          Create room from selection{selectedCells ? ` (${selectedCells})` : ""}
        </Button>
        <p className="text-xs text-muted-foreground">
          {toolLabel(activeTool)} is active. Room Fill stops at walls and doors; right-click erases
          room assignment in Room mode.
        </p>
      </div>
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
      <div className="text-xs font-bold uppercase text-muted-foreground">Edit existing room</div>
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

function RoomToolButton({
  activeTool,
  children,
  icon,
  tool,
  onToolChange,
}: {
  activeTool: DungeonStudioTool;
  children: string;
  icon: typeof Square;
  tool: Extract<DungeonStudioTool, "room-select" | "room-brush" | "room-fill" | "erase-room">;
  onToolChange: (tool: DungeonStudioTool) => void;
}) {
  return (
    <Button
      type="button"
      icon={icon}
      size="sm"
      variant={activeTool === tool ? "primary" : "secondary"}
      onClick={() => onToolChange(tool)}
    >
      {children}
    </Button>
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
