import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ActionRow } from "../../../components/layout";
import { Button } from "../../../components/ui";
import type { DungeonStudioRoomRegion } from "./dungeonStudioDocument";

export function DungeonStudioRoomInspector({
  selectedRoom,
  onDeleteRoom,
  onDoneRoom,
  onRenameRoom,
  onStartNewRoom,
}: {
  selectedRoom?: DungeonStudioRoomRegion;
  onDeleteRoom: (roomId: string) => void;
  onDoneRoom: () => void;
  onRenameRoom: (roomId: string, label: string) => void;
  onStartNewRoom: () => void;
}) {
  const [draftName, setDraftName] = useState(selectedRoom?.label ?? "");

  useEffect(() => {
    setDraftName(selectedRoom?.label ?? "");
  }, [selectedRoom?.id, selectedRoom?.label]);

  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-xs font-bold uppercase text-muted-foreground">Room workflow</div>
      {selectedRoom ? (
        <div className="mt-2 grid gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: selectedRoom.color }}
              aria-hidden="true"
            />
            Editing {selectedRoom.label}
          </div>
          <label className="grid gap-1 text-xs font-semibold uppercase text-muted-foreground">
            Room name
            <input
              className="rounded-md border border-border bg-card px-2 py-1.5 text-sm font-semibold normal-case text-foreground"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
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
          <p className="text-xs text-muted-foreground">
            Room Brush and Room Fill add cells to this room. Done clears the active room so the next
            stroke can create a new one.
          </p>
        </div>
      ) : (
        <div className="mt-2 grid gap-2">
          <p className="text-xs text-muted-foreground">
            Select an existing room, drag a room selection, or start a new room region.
          </p>
          <Button type="button" icon={Plus} size="sm" variant="secondary" onClick={onStartNewRoom}>
            Start new room
          </Button>
        </div>
      )}
    </div>
  );
}
