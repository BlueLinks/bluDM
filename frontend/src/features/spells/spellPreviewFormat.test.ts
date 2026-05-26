import { describe, expect, it } from "vitest";
import { formatRollPart } from "./spellPreviewFormat";

describe("spellPreviewFormat", () => {
  it("formats structured spell effects with friendly labels", () => {
    const area = formatRollPart({
      conditionName: "",
      damageType: "",
      diceCount: 0,
      dieSize: 0,
      effectConfig: {
        outcome: "save_for_damage",
        trigger: "appear_move_enter_or_end_turn",
      },
      fixedValue: 0,
      rollKind: "area_trigger",
    } as never);
    const battlefield = formatRollPart({
      conditionName: "",
      damageType: "",
      diceCount: 0,
      dieSize: 0,
      effectConfig: {
        heightFeet: 40,
        kind: "spell_area",
        radiusFeet: 5,
        shape: "cylinder",
      },
      fixedValue: 0,
      rollKind: "battlefield_object",
    } as never);
    const table = formatRollPart({
      conditionName: "",
      damageType: "",
      diceCount: 0,
      dieSize: 0,
      effectConfig: {
        dice: "1d8",
        name: "Prismatic Rays",
        rows: [
          { roll: 1, name: "Red", diceCount: 10, dieSize: 6, damageType: "fire" },
          { roll: 2, name: "Orange", effectText: "Acid ray" },
        ],
      },
      fixedValue: 0,
      rollKind: "roll_table",
    } as never);
    const layered = formatRollPart({
      conditionName: "",
      damageType: "",
      diceCount: 0,
      dieSize: 0,
      effectConfig: {
        layers: [
          {
            color: "Red",
            diceCount: 10,
            dieSize: 6,
            damageType: "fire",
            effectText: "Dexterity save or take damage",
            order: 1,
            removal: "Destroyed by cold damage.",
          },
          {
            color: "Violet",
            effectText: "Blinded",
            order: 7,
            removal: "Destroyed by Dispel Magic.",
          },
        ],
        name: "Prismatic Layers",
      },
      fixedValue: 0,
      rollKind: "layered_effect",
    } as never);

    expect(area).toBe(
      "Area: Appears, enters, is moved in, or ends turn there: save against damage",
    );
    expect(battlefield).toBe(
      "Battlefield object: Persistent spell area · Cylinder · 5 ft. · 40 ft. high",
    );
    expect(table).toContain("1. Red: 10d6 fire");
    expect(table).toContain("2. Orange: Acid ray");
    expect(layered).toContain("Prismatic Layers · 2 layers");
    expect(layered).toContain("1. Red: 10d6 fire");
    expect(layered).toContain("7. Violet: Blinded");
    expect(`${area} ${battlefield} ${table} ${layered}`).not.toMatch(
      /[a-z]+_[a-z]+|[a-z]+[A-Z][a-z]+/,
    );
  });
});
