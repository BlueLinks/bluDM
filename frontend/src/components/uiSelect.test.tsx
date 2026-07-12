import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./uiSelect";

describe("Select", () => {
  it("uses semantic surface tokens for the trigger and menu items", () => {
    render(
      <Select
        options={[
          { label: "Forest", value: "forest" },
          { label: "Ocean", value: "ocean" },
        ]}
        placeholder="Choose theme"
        value=""
        onValueChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("combobox");
    expect(trigger.className).toContain("bg-surface");
    expect(trigger.className).toContain("text-surface-foreground");
    expect(trigger.className).toContain("hover:bg-card");
  });
});
