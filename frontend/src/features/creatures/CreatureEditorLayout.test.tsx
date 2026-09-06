import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CreatureEditorLayout } from "./CreatureEditorLayout";

afterEach(cleanup);

describe("CreatureEditorLayout", () => {
  it("keeps keyboard resizing within useful editor and preview limits", () => {
    render(
      <CreatureEditorLayout
        active="essentials"
        onSection={() => undefined}
        preview={<p>Long preview</p>}
      >
        <p>Editor fields</p>
      </CreatureEditorLayout>,
    );

    const separator = screen.getByRole("separator", { name: "Resize editor and preview" });
    expect(separator.getAttribute("aria-valuenow")).toBe("60");
    expect(separator.getAttribute("aria-valuetext")).toBe("Editor 60%, preview 40%");

    fireEvent.keyDown(separator, { key: "End" });
    expect(separator.getAttribute("aria-valuenow")).toBe("70");
    fireEvent.keyDown(separator, { key: "ArrowRight" });
    expect(separator.getAttribute("aria-valuenow")).toBe("70");

    fireEvent.keyDown(separator, { key: "Home" });
    expect(separator.getAttribute("aria-valuenow")).toBe("45");
    fireEvent.keyDown(separator, { key: "ArrowLeft" });
    expect(separator.getAttribute("aria-valuenow")).toBe("45");

    fireEvent.doubleClick(separator);
    expect(separator.getAttribute("aria-valuenow")).toBe("60");
  });
});
