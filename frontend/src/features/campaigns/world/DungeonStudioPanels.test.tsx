import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DungeonStudioInspectorPanel,
  DungeonStudioToolOptionsBar,
  DungeonStudioToolPanel,
} from "./DungeonStudioPanels";
import { createDungeonStudioDocument } from "./dungeonStudioDocument";

describe("DungeonStudioPanels", () => {
  it("renders primary editor tools in the left palette", () => {
    const onToolChange = vi.fn();

    render(
      <DungeonStudioToolPanel
        activeTool="select"
        brushShape="single"
        deleteTarget="all"
        onBrushShapeChange={vi.fn()}
        onDeleteTargetChange={vi.fn()}
        onToolChange={onToolChange}
      />,
    );

    ["Select", "Floor", "Terrain", "Room", "Wall", "Door", "Delete"].forEach((name) => {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Wall" }));
    expect(onToolChange).toHaveBeenCalledWith("wall");
  });

  it("renders active tool options and clear delete target labels", () => {
    const onDeleteTargetChange = vi.fn();

    render(
      <DungeonStudioToolOptionsBar
        activeTool="delete"
        brushShape="rectangle"
        deleteTarget="rooms"
        onBrushShapeChange={vi.fn()}
        onDeleteTargetChange={onDeleteTargetChange}
        onToolChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Active tool")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Targeted delete" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rectangle" })).toBeTruthy();
    [
      "Everything touched",
      "Floor cells",
      "Terrain cells",
      "Room assignments",
      "Walls/doors only",
    ].forEach((name) => expect(screen.getByRole("button", { name })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Walls/doors only" }));
    expect(onDeleteTargetChange).toHaveBeenCalledWith("walls");
  });

  it("shows the room workflow only for room context", () => {
    const document = createDungeonStudioDocument();
    const commonProps = {
      document,
      floorCellCount: 0,
      mapName: "Test map",
      selected: null,
      onCreateRoomFromSelection: vi.fn(),
      onDeleteRoom: vi.fn(),
      onDoneRoom: vi.fn(),
      onEditRoom: vi.fn(),
      onRenameRoom: vi.fn(),
      onStartNewRoom: vi.fn(),
      onToolChange: vi.fn(),
    };
    const { rerender } = render(
      <DungeonStudioInspectorPanel activeTool="delete" {...commonProps} />,
    );

    expect(screen.getByText("Inspector")).toBeTruthy();
    expect(screen.queryByText("Active room")).toBeNull();

    rerender(<DungeonStudioInspectorPanel activeTool="room-fill" {...commonProps} />);

    expect(screen.getByText("Room workflow")).toBeTruthy();
    expect(screen.getByText("Active room")).toBeTruthy();
  });
});
