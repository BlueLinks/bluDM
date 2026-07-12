import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DungeonStudioCanvasToolbar } from "./DungeonStudioCanvasToolbar";

describe("DungeonStudioCanvasToolbar", () => {
  it("keeps undo redo and zoom controls together", () => {
    const handlers = {
      onRedo: vi.fn(),
      onResetView: vi.fn(),
      onUndo: vi.fn(),
      onZoomIn: vi.fn(),
      onZoomOut: vi.fn(),
    };

    render(
      <DungeonStudioCanvasToolbar
        canRedo
        canUndo
        dirty
        maxZoom={4}
        minZoom={1}
        zoom={2}
        {...handlers}
      />,
    );

    ["Undo", "Redo", "Zoom out", "Zoom in", "Reset"].forEach((name) => {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));

    expect(handlers.onUndo).toHaveBeenCalledOnce();
    expect(handlers.onZoomIn).toHaveBeenCalledOnce();
  });
});
