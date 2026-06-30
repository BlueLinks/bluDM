import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { DungeonStudioPreview } from "./DungeonStudioPreview";
import { createDungeonStudioDocument } from "./dungeonStudioDocument";

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

function renderPreview() {
  const document = createDungeonStudioDocument();
  return render(
    <DungeonStudioPreview
      activeTool="select"
      brushShape="single"
      canRedo={false}
      canUndo={false}
      deleteTarget="all"
      dirty={false}
      document={document}
      saving={false}
      selected={null}
      onDocumentChange={() => undefined}
      onRedo={() => undefined}
      onSave={() => undefined}
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
});
