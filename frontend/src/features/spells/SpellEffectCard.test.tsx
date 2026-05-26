import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SpellEffectCard } from "./SpellEffectCard";
import type { SpellActionRollFormState } from "../../types";

describe("SpellEffectCard", () => {
  it("renders base AC dice mode", () => {
    const roll: SpellActionRollFormState = {
      id: "roll-1",
      rollKind: "base_ac",
      damageType: "force",
      magical: true,
      diceCount: "1",
      dieSize: "12",
      fixedValue: "0",
      addPrimaryStatModifier: false,
      conditionName: "",
      effectConfig: { calculationMode: "dice" },
      timing: "immediate",
      scalingType: "none",
      scalingFromLevel: "1",
      scalingDiceCount: "0",
      scalingDieSize: "6",
      scalingFixedValue: "0",
      scalingStepSize: "1",
      cantrip5DiceCount: "0",
      cantrip5DieSize: "6",
      cantrip11DiceCount: "0",
      cantrip11DieSize: "6",
      cantrip17DiceCount: "0",
      cantrip17DieSize: "6",
    };

    render(
      <SpellEffectCard
        index={0}
        roll={roll}
        rolls={[roll]}
        onChange={() => undefined}
        onRemove={() => undefined}
      />,
    );

    expect(screen.getByText("AC dice")).toBeTruthy();
  });

  it("renders roll modifier with compact dice controls and legacy category selection", () => {
    let rolls = [
      makeRoll({
        effectConfig: { category: "saving_throw", dice: "1d4" },
        rollKind: "roll_modifier",
      }),
    ];

    render(
      <SpellEffectCard
        index={0}
        roll={rolls[0]}
        rolls={rolls}
        onChange={(next) => {
          rolls = next;
        }}
        onRemove={() => undefined}
      />,
    );

    expect(screen.getByText("Roll categories")).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>("Saving throws").checked).toBe(true);
    expect(screen.getAllByText("Dice").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Die").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Modifier").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText("Attack rolls"));

    expect(rolls[0].effectConfig.categories).toEqual(["saving_throw", "attack_roll"]);
  });

  it("edits roll table rows without dropping nested data", () => {
    let rolls = [
      makeRoll({
        effectConfig: {
          dice: "1d8",
          instruction: "Roll once per target.",
          name: "Prismatic Rays",
          rows: [
            {
              damageType: "fire",
              diceCount: 10,
              dieSize: 6,
              effectText: "Fire ray",
              effects: [{ damageType: "fire", diceCount: 10, dieSize: 6, rollKind: "damage" }],
              name: "Red",
              roll: 1,
              saveAbility: "dex",
              saveEffect: "half",
            },
          ],
        },
        rollKind: "roll_table",
      }),
    ];

    render(
      <SpellEffectCard
        index={0}
        roll={rolls[0]}
        rolls={rolls}
        onChange={(next) => {
          rolls = next;
        }}
        onRemove={() => undefined}
      />,
    );

    expect(screen.getAllByText("Prismatic Rays: 1d8 · 1 outcomes").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText<HTMLInputElement>("Outcome name")[0].value).toBe("Red");

    fireEvent.change(screen.getAllByLabelText("Outcome name")[0], { target: { value: "Ruby" } });

    expect(rolls[0].effectConfig.rows).toEqual([
      expect.objectContaining({
        damageType: "fire",
        effects: [expect.objectContaining({ rollKind: "damage" })],
        name: "Ruby",
        roll: 1,
        saveAbility: "dex",
      }),
      expect.objectContaining({ roll: 2 }),
      expect.objectContaining({ roll: 3 }),
      expect.objectContaining({ roll: 4 }),
      expect.objectContaining({ roll: 5 }),
      expect.objectContaining({ roll: 6 }),
      expect.objectContaining({ roll: 7 }),
      expect.objectContaining({ roll: 8 }),
    ]);
  });

  it("edits layered effects without dropping layer metadata", () => {
    let rolls = [
      makeRoll({
        effectConfig: {
          layers: [
            {
              color: "Red",
              damageType: "fire",
              diceCount: 10,
              dieSize: 6,
              effectText: "Dexterity save or take damage.",
              order: 1,
              removal: "Destroyed by cold damage.",
              saveAbility: "dex",
              saveEffect: "half",
            },
          ],
          name: "Prismatic Layers",
          riderText: "Track seven layers in order.",
        },
        rollKind: "layered_effect",
      }),
    ];

    render(
      <SpellEffectCard
        index={0}
        roll={rolls[0]}
        rolls={rolls}
        onChange={(next) => {
          rolls = next;
        }}
        onRemove={() => undefined}
      />,
    );

    expect(screen.getAllByText("Prismatic Layers · 1 layers").length).toBeGreaterThan(0);
    expect(screen.getByLabelText<HTMLInputElement>("Color").value).toBe("Red");

    fireEvent.change(screen.getByLabelText("Color"), { target: { value: "Crimson" } });

    expect(rolls[0].effectConfig.layers).toEqual([
      expect.objectContaining({
        color: "Crimson",
        damageType: "fire",
        order: 1,
        removal: "Destroyed by cold damage.",
      }),
    ]);
  });
});

function makeRoll(overrides: Partial<SpellActionRollFormState> = {}): SpellActionRollFormState {
  return {
    id: "roll-1",
    rollKind: "damage",
    damageType: "force",
    magical: true,
    diceCount: "1",
    dieSize: "6",
    fixedValue: "0",
    addPrimaryStatModifier: false,
    conditionName: "",
    effectConfig: {},
    timing: "immediate",
    scalingType: "none",
    scalingFromLevel: "1",
    scalingDiceCount: "0",
    scalingDieSize: "6",
    scalingFixedValue: "0",
    scalingStepSize: "1",
    cantrip5DiceCount: "0",
    cantrip5DieSize: "6",
    cantrip11DiceCount: "0",
    cantrip11DieSize: "6",
    cantrip17DiceCount: "0",
    cantrip17DieSize: "6",
    ...overrides,
  };
}
