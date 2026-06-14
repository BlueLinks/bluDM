import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiceRoller } from "./DiceRoller";
import { RollLogProvider } from "./RollLogProvider";

describe("DiceRoller", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("rolls standard dice and records the total", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.49);

    render(
      <RollLogProvider>
        <DiceRoller />
      </RollLogProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dice" }));
    fireEvent.change(screen.getByLabelText("d20 fixed modifier"), { target: { value: "2" } });
    const d20Row = screen.getByLabelText("d20 fixed modifier").closest(".grid");
    expect(d20Row).toBeTruthy();
    fireEvent.click(within(d20Row as HTMLElement).getByRole("button", { name: "Roll" }));

    expect(screen.getAllByText("Manual d20").length).toBeGreaterThan(0);
    expect(screen.getAllByText("12").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10 +2").length).toBeGreaterThan(0);
  });

  it("clamps custom dice count and die values to positive integers", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    render(
      <RollLogProvider>
        <DiceRoller />
      </RollLogProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dice" }));
    fireEvent.change(screen.getAllByLabelText("Custom die value")[0], { target: { value: "-1" } });
    fireEvent.change(screen.getByLabelText("Custom dice count"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Custom fixed modifier"), { target: { value: "-2" } });
    const customRow = screen.getAllByLabelText("Custom die value")[0].closest(".grid");
    expect(customRow).toBeTruthy();
    fireEvent.click(within(customRow as HTMLElement).getByRole("button", { name: "Roll" }));

    expect(screen.getAllByText("Manual d20").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 -2").length).toBeGreaterThan(0);
  });
});
