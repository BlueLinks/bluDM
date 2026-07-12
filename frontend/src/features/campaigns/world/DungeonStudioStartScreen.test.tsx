import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DungeonStudioStartScreen } from "./DungeonStudioStartScreen";

describe("DungeonStudioStartScreen", () => {
  it("lets a DM choose custom or preview and accept generated output", () => {
    const onStartCustom = vi.fn();
    const onAcceptGenerated = vi.fn();

    render(
      <DungeonStudioStartScreen
        locationName="The Sunken Keep"
        onStartCustom={onStartCustom}
        onAcceptGenerated={onAcceptGenerated}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Fully custom dungeon/i }));
    expect(onStartCustom).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: /Randomly generated dungeon/i }));
    expect(screen.getByRole("img", { name: /Generated dungeon preview/i })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "keep-seed" } });
    fireEvent.click(screen.getByRole("button", { name: /Accept and edit/i }));

    expect(onAcceptGenerated).toHaveBeenCalledWith(expect.objectContaining({ seed: "keep-seed" }));
  });
});
