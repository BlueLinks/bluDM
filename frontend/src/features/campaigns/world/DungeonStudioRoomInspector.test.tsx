import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DungeonStudioRoomInspector } from "./DungeonStudioRoomInspector";
import type { DungeonStudioRoomRegion } from "./dungeonStudioDocument";

const rooms: DungeonStudioRoomRegion[] = [
  { id: "room-1", label: "Guard Room", color: "#14b8a6", cells: [{ x: 1, y: 1 }] },
  { id: "room-2", label: "Crypt", color: "#8b5cf6", cells: [{ x: 2, y: 1 }] },
];

afterEach(cleanup);

describe("DungeonStudioRoomInspector", () => {
  it("defaults to selecting rooms without duplicate creation controls", () => {
    renderRoomInspector();

    expect(screen.getByText("Select a room")).toBeTruthy();
    expect(screen.getByText(/Use Add room in the top bar/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Create room from selection/i })).toBeNull();
    expect(screen.queryByText("Assign room cells")).toBeNull();
    expect(screen.queryByRole("button", { name: /Create world link/i })).toBeNull();
  });

  it("saves selected room details and returns through one Save action", () => {
    const onDeleteRoom = vi.fn();
    const onEditRoom = vi.fn();
    const onRenameRoom = vi.fn();

    renderRoomInspector({
      activeTool: "room-brush",
      onDeleteRoom,
      onEditRoom,
      onRenameRoom,
      selected: { type: "region", cells: rooms[0].cells, label: "Guard Room", roomId: "room-1" },
      selectedRoom: rooms[0],
      selectedRoomConnections: [{ connectionType: "door", room: rooms[1] }],
    });

    expect(screen.getByText("Editing room: Guard Room")).toBeTruthy();
    expect(screen.getByDisplayValue("Guard Room")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Done editing/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Start next room/i })).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: /Crypt/i })[0]);
    fireEvent.change(screen.getByDisplayValue("Guard Room"), { target: { value: "Barracks" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: /Delete room/i }));

    expect(onEditRoom).toHaveBeenCalledWith("room-2");
    expect(onRenameRoom).toHaveBeenCalledWith("room-1", "Barracks");
    expect(onDeleteRoom).toHaveBeenCalledWith("room-1");
  });
});

function renderRoomInspector(
  overrides: Partial<Parameters<typeof DungeonStudioRoomInspector>[0]> = {},
) {
  render(
    <DungeonStudioRoomInspector
      activeTool="room-select"
      rooms={rooms}
      roomLocations={[]}
      selected={null}
      selectedRoomConnections={[]}
      onDeleteRoom={vi.fn()}
      onEditRoom={vi.fn()}
      onRenameRoom={vi.fn()}
      onRoomColorChange={vi.fn()}
      onRoomThemeChange={vi.fn()}
      {...overrides}
    />,
  );
}
