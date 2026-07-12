import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDungeonStudioDocument } from "./dungeonStudioDocument";
import { paintFloorCells } from "./dungeonStudioEditing";
import { DungeonStudioMapThumbnail } from "./DungeonStudioMapThumbnail";

const document = {
  ...paintFloorCells(createDungeonStudioDocument(), [
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
  ]),
  rooms: [
    {
      id: "room-1",
      locationId: "loc-room",
      label: "Entry",
      color: "#14b8a6",
      cells: [{ x: 2, y: 2 }],
    },
    { id: "room-2", label: "Hall", color: "#8b5cf6", cells: [{ x: 3, y: 2 }] },
  ],
};

describe("DungeonStudioMapThumbnail", () => {
  afterEach(() => cleanup());

  it("renders the real studio document and can focus a room", () => {
    render(<DungeonStudioMapThumbnail document={document} focusRoomLocationId="loc-room" />);

    expect(screen.getByRole("img", { name: /Dungeon map preview/i })).toBeTruthy();
    expect(screen.getByText("Entry")).toBeTruthy();
    expect(screen.getByText("Hall")).toBeTruthy();
  });

  it("navigates when a linked room is selected", () => {
    const onRoomSelect = vi.fn();

    render(<DungeonStudioMapThumbnail document={document} onRoomSelect={onRoomSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Open Entry" }));

    expect(onRoomSelect).toHaveBeenCalledWith("loc-room");
  });

  it("supports keyboard room navigation", () => {
    const onRoomSelect = vi.fn();

    render(<DungeonStudioMapThumbnail document={document} onRoomSelect={onRoomSelect} />);

    fireEvent.keyDown(screen.getByRole("button", { name: "Open Entry" }), { key: "Enter" });

    expect(onRoomSelect).toHaveBeenCalledWith("loc-room");
  });
});
