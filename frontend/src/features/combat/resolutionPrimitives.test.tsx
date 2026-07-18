import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { DamageComponentEditor } from "./resolutionPrimitives";
import type { ResolutionDamageComponent } from "./resolutionModel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DamageComponentEditor", () => {
  it("rolls base and critical dice while leaving the modifier single", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    render(<Harness critical />);

    fireEvent.click(screen.getByRole("button", { name: "Roll damage component 1" }));

    expect(screen.getByLabelText<HTMLInputElement>("Rolled total").value).toBe("6");
    expect(screen.getByText("Dice 1 · critical 1 · modifier +4")).toBeTruthy();
  });

  it("marks an edited total as a manual override", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Rolled total"), { target: { value: "17" } });
    expect(screen.getByText("Manual total override")).toBeTruthy();
  });
});

function Harness({ critical = false }: { critical?: boolean }) {
  const [components, setComponents] = useState<ResolutionDamageComponent[]>([
    {
      id: "damage",
      source: "Test",
      formula: "1d6 + 4",
      amount: 0,
      damageType: "slashing",
      criticalBehavior: "double_dice",
      mitigation: "apply",
    },
  ]);
  return (
    <DamageComponentEditor components={components} critical={critical} onChange={setComponents} />
  );
}
