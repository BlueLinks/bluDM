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
  it("shows clear new-room draft state", () => {
    render(
      <DungeonStudioRoomInspector
        activeTool="room-select"
        canCreateRoom
        rooms={rooms}
        selected={{ type: "region", cells: rooms[0].cells, label: "Selection" }}
        onCreateRoomFromSelection={vi.fn()}
        onDeleteRoom={vi.fn()}
        onDoneRoom={vi.fn()}
        onEditRoom={vi.fn()}
        onRenameRoom={vi.fn()}
        onStartNewRoom={vi.fn()}
        onToolChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Room")).toBeTruthy();
    expect(screen.getByText("New room")).toBeTruthy();
    expect(screen.getByText(/cells selected but not saved as a room yet/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Create room from selection/i })).toBeTruthy();
  });

  it("groups room naming, paint/fill actions, creation, editing, and deletion", () => {
    const onToolChange = vi.fn();
    const onEditRoom = vi.fn();
    const onDeleteRoom = vi.fn();
    const onRenameRoom = vi.fn();

    render(
      <DungeonStudioRoomInspector
        activeTool="room-fill"
        canCreateRoom
        rooms={rooms}
        selected={{ type: "region", cells: rooms[0].cells, label: "Selection" }}
        selectedRoom={rooms[0]}
        onCreateRoomFromSelection={vi.fn()}
        onDeleteRoom={onDeleteRoom}
        onDoneRoom={vi.fn()}
        onEditRoom={onEditRoom}
        onRenameRoom={onRenameRoom}
        onStartNewRoom={vi.fn()}
        onToolChange={onToolChange}
      />,
    );

    expect(screen.getByText("Room")).toBeTruthy();
    expect(screen.getByText("Editing room: Guard Room")).toBeTruthy();
    expect(screen.getByDisplayValue("Guard Room")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Fill bounded/i })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Create room from selection/i }).hasAttribute("disabled"),
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /Paint room/i }));
    fireEvent.click(screen.getByRole("button", { name: /Crypt/i }));
    fireEvent.change(screen.getByDisplayValue("Guard Room"), { target: { value: "Barracks" } });
    fireEvent.click(screen.getByRole("button", { name: /Save name/i }));
    fireEvent.click(screen.getByRole("button", { name: /Delete room/i }));

    expect(onToolChange).toHaveBeenCalledWith("room-brush");
    expect(onEditRoom).toHaveBeenCalledWith("room-2");
    expect(onRenameRoom).toHaveBeenCalledWith("room-1", "Barracks");
    expect(onDeleteRoom).toHaveBeenCalledWith("room-1");
  });
});
