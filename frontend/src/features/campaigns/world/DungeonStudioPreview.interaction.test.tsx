import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { DungeonStudioPreview } from "./DungeonStudioPreview";
import { createDungeonStudioDocument } from "./dungeonStudioDocument";
import type { DungeonStudioDocument } from "./dungeonStudioDocument";

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value() {
      return {
        bottom: 600,
        height: 600,
        left: 0,
        right: 800,
        top: 0,
        width: 800,
        x: 0,
        y: 0,
        toJSON: () => undefined,
      };
    },
  });
});

function renderPreview({
  activeTool = "select",
  document = createDungeonStudioDocument(),
  onDocumentChange = () => undefined,
}: {
  activeTool?: Parameters<typeof DungeonStudioPreview>[0]["activeTool"];
  document?: DungeonStudioDocument;
  onDocumentChange?: Parameters<typeof DungeonStudioPreview>[0]["onDocumentChange"];
} = {}) {
  return render(
    <DungeonStudioPreview
      activeTool={activeTool}
      brushShape="single"
      canRedo={false}
      canUndo={false}
      deleteTarget="all"
      dirty={false}
      document={document}
      selected={null}
      selectedObjectAssetKey="table"
      onDocumentChange={onDocumentChange}
      onRedo={() => undefined}
      onUndo={() => undefined}
    />,
  );
}

function viewBoxNumbers(canvas: HTMLElement) {
  return canvas.querySelector("svg")?.getAttribute("viewBox")?.split(" ").map(Number) ?? [];
}

afterEach(cleanup);

describe("DungeonStudioPreview interactions", () => {
  it("keeps scroll-wheel zoom working", () => {
    renderPreview();
    const canvas = screen.getByRole("application");
    const initialWidth = viewBoxNumbers(canvas)[2];

    fireEvent.wheel(canvas, { deltaY: -100, clientX: 400, clientY: 300 });

    expect(viewBoxNumbers(canvas)[2]).toBeLessThan(initialWidth);
  });

  it("pans with middle mouse drag", () => {
    renderPreview();
    const canvas = screen.getByRole("application");
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    const initialX = viewBoxNumbers(canvas)[0];

    fireEvent.pointerDown(canvas, { button: 1, buttons: 4, clientX: 400, clientY: 300 });
    fireEvent.pointerMove(canvas, { button: 1, buttons: 4, clientX: 300, clientY: 300 });
    fireEvent.pointerUp(canvas, { button: 1, buttons: 0, clientX: 300, clientY: 300 });

    expect(viewBoxNumbers(canvas)[0]).toBeGreaterThan(initialX);
  });

  it("selects an existing room when the Room tool is in select mode", () => {
    const onDocumentChange = vi.fn();
    const document = createDungeonStudioDocument({
      grid: { width: 8, height: 6, cellSizeFeet: 5 },
    });
    document.rooms = [
      { id: "room-1", label: "Guard Room", color: "#14b8a6", cells: [{ x: 1, y: 1 }] },
    ];
    document.layers = [{ ...document.layers[0], cells: [{ x: 1, y: 1 }] }];
    renderPreview({ activeTool: "room-select", document, onDocumentChange });
    const canvas = screen.getByRole("application");

    fireEvent.pointerDown(canvas, { button: 0, buttons: 1, clientX: 150, clientY: 150 });

    expect(onDocumentChange).toHaveBeenCalledWith(expect.any(Function), {
      type: "region",
      cells: [{ x: 1, y: 1 }],
      label: "Guard Room",
      roomId: "room-1",
    });
  });
});
