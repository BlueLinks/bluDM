import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DungeonStudioInspectorPanel,
  DungeonStudioToolOptionsBar,
  DungeonStudioToolPanel,
} from "./DungeonStudioPanels";
import { createDungeonStudioDocument } from "./dungeonStudioDocument";

afterEach(cleanup);

describe("DungeonStudioPanels", () => {
  it("renders primary editor tools in the left palette", () => {
    const onToolChange = vi.fn();

    render(
      <DungeonStudioToolPanel
        activeTool="room-select"
        brushShape="rectangle"
        deleteTarget="all"
        onBrushShapeChange={vi.fn()}
        onDeleteTargetChange={vi.fn()}
        onToolChange={onToolChange}
      />,
    );

    const buttons = screen.getAllByRole("button").map((button) => button.textContent);
    expect(buttons).toEqual(["Floor", "Room", "Door", "Wall", "Terrain", "Objects", "Delete"]);
    ["Floor", "Room", "Door", "Wall", "Terrain", "Objects", "Delete"].forEach((name) => {
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

    expect(screen.getByText(/Active tool:/)).toBeTruthy();
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

  it("shows room add and brush controls in the top options bar", () => {
    const onStartNewRoom = vi.fn();
    const onToolChange = vi.fn();
    const onBrushShapeChange = vi.fn();

    render(
      <DungeonStudioToolOptionsBar
        activeTool="room-brush"
        brushShape="rectangle"
        deleteTarget="all"
        onBrushShapeChange={onBrushShapeChange}
        onDeleteTargetChange={vi.fn()}
        onStartNewRoom={onStartNewRoom}
        onToolChange={onToolChange}
      />,
    );

    expect(screen.getByText(/Active tool:/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Single" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rectangle" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Circle" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Fill" }));
    expect(onToolChange).toHaveBeenCalledWith("room-fill");
  });

  it("shows the room workflow only for room context", () => {
    const document = createDungeonStudioDocument();
    const commonProps = {
      document,
      floorCellCount: 0,
      mapName: "Test map",
      selected: null,
      selectedObjectAssetKey: "table",
      floorLocations: [],
      roomLocations: [],
      onCreateRoomLocation: vi.fn(),
      onDeleteEntity: vi.fn(),
      onDeleteRoom: vi.fn(),
      onDuplicateEntity: vi.fn(),
      onEditRoom: vi.fn(),
      onGlobalThemeChange: vi.fn(),
      onMoveEntityToSelection: vi.fn(),
      onObjectAssetChange: vi.fn(),
      onObjectLinkChange: vi.fn(),
      onRenameRoom: vi.fn(),
      onRoomColorChange: vi.fn(),
      onRoomThemeChange: vi.fn(),
      onRotateEntity: vi.fn(),
      onToolChange: vi.fn(),
      onUploadAsset: vi.fn(),
    };
    const { rerender } = render(
      <DungeonStudioInspectorPanel activeTool="delete" {...commonProps} />,
    );

    expect(screen.getByText("Inspector")).toBeTruthy();
    expect(screen.queryByText("Room")).toBeNull();

    rerender(<DungeonStudioInspectorPanel activeTool="room-fill" {...commonProps} />);

    expect(screen.getByText("Room workflow")).toBeTruthy();
    expect(screen.getAllByText("Room").length).toBeGreaterThan(0);
  });
});
