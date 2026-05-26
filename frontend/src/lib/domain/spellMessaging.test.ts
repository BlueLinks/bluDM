import { describe, expect, it } from "vitest";
import {
  friendlyAdvantageEffect,
  friendlyAreaTriggerSummary,
  friendlyBattlefieldObject,
  friendlyDamageDefense,
  friendlyLayeredEffect,
  friendlyLayeredEffectDetails,
  friendlyMechanicKey,
  friendlyMechanicValue,
  friendlyOption,
  friendlyRepeatSave,
  friendlyRerollEffect,
  friendlyRollCategories,
  friendlyRollTable,
  friendlyRollTableDetails,
} from "./spellMessaging";

describe("spellMessaging", () => {
  it("formats internal spell mechanics as friendly labels", () => {
    expect(friendlyOption("manual_special")).toBe("Manual / special trigger");
    expect(friendlyOption("chosen_target")).toBe("Chosen target");
    expect(friendlyOption("target_rolls")).toBe("Target's rolls");
    expect(friendlyMechanicKey("castingTrigger")).toBe("Casting trigger");
    expect(friendlyMechanicValue("targetAnchor", "chosen_target")).toBe("Chosen target");
  });

  it("formats multiple roll categories naturally", () => {
    expect(
      friendlyRollCategories({
        categories: ["attack_roll", "ability_check", "saving_throw"],
      }),
    ).toBe("attack rolls, ability checks, and saving throws");
  });

  it("formats Silvery Barbs style reroll and advantage effects", () => {
    expect(
      friendlyRerollEffect({
        appliesTo: "triggering_creature",
        categories: ["attack_roll", "ability_check", "saving_throw"],
        mode: "reroll_use_lower",
      }),
    ).toBe(
      "Triggering creature rerolls attack rolls, ability checks, and saving throws and uses the lower roll.",
    );
    expect(
      friendlyAdvantageEffect({
        appliesTo: "target_rolls",
        categories: ["attack_roll", "ability_check", "saving_throw"],
        state: "advantage",
      }),
    ).toBe("Target's rolls have advantage on attack rolls, ability checks, and saving throws.");
  });

  it("formats all selected roll categories without expanding every category", () => {
    const allCategories = [
      "attack_roll",
      "saving_throw",
      "ability_check",
      "damage_roll",
      "death_save",
      "dexterity_saving_throw",
      "wisdom_saving_throw",
      "strength_d20_test",
    ];
    expect(friendlyRollCategories({ categories: allCategories })).toBe("all roll categories");
    expect(
      friendlyRerollEffect({
        appliesTo: "triggering_creature",
        categories: allCategories,
        mode: "reroll_use_lower",
      }),
    ).toBe("Triggering creature rerolls the d20 and uses the lower roll.");
    expect(
      friendlyAdvantageEffect({
        appliesTo: "target_rolls",
        categories: allCategories,
        state: "advantage",
      }),
    ).toBe("Target's rolls have advantage on all roll categories.");
  });

  it("formats area, defense, repeat-save, and battlefield configs without raw keys", () => {
    expect(
      friendlyAreaTriggerSummary({
        outcome: "save_for_damage",
        trigger: "appear_move_enter_or_end_turn",
      }),
    ).toBe("Appears, enters, is moved in, or ends turn there: save against damage");
    expect(
      friendlyDamageDefense({
        damageTypes: ["fire", "cold"],
        mode: "resistance",
        restriction: "spell",
      }),
    ).toBe("Resistance to Fire and Cold Spell damage only");
    expect(
      friendlyRepeatSave({
        ability: "wis",
        checkType: "saving_throw",
        successOutcome: "end_effect",
      }),
    ).toBe("Repeat Saving throw (Wisdom); success: End the effect");
    expect(
      friendlyBattlefieldObject({
        heightFeet: 40,
        kind: "spell_area",
        radiusFeet: 5,
        shape: "cylinder",
      }),
    ).toBe("Battlefield object: Persistent spell area · Cylinder · 5 ft. · 40 ft. high");
    expect(
      friendlyBattlefieldObject({
        kind: "wall",
        layers: [{ color: "Red" }, { color: "Orange" }],
        shape: "wall",
      }),
    ).toBe("Battlefield object: Wall or barrier · Wall · 2 layers");
    expect(
      friendlyRollTable({
        dice: "1d8",
        name: "Prismatic Rays",
        rows: [{ roll: 1 }, { roll: 2 }],
      }),
    ).toBe("Prismatic Rays: 1d8 · 2 outcomes");
    expect(
      friendlyRollTableDetails({
        dice: "1d8",
        name: "Prismatic Rays",
        rows: [{ damageType: "fire", diceCount: 10, dieSize: 6, name: "Red", roll: 1 }],
      }),
    ).toContain("1. Red: 10d6 fire");
    expect(
      friendlyLayeredEffect({
        layers: [{ color: "Red" }, { color: "Orange" }],
        name: "Prismatic Layers",
      }),
    ).toBe("Prismatic Layers · 2 layers");
    expect(
      friendlyLayeredEffectDetails({
        layers: [
          {
            color: "Red",
            damageType: "fire",
            diceCount: 10,
            dieSize: 6,
            effectText: "Dexterity save or take damage",
            order: 1,
            removal: "Destroyed by cold damage.",
          },
        ],
        name: "Prismatic Layers",
      }),
    ).toContain("1. Red: 10d6 fire; Dexterity save or take damage");
  });
});
