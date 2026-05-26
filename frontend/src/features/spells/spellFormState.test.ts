import { describe, expect, it } from "vitest";
import { spellPayload } from "../../lib/api/payloads";
import type { Spell } from "../../types";
import { spellToForm } from "./spellFormState";

describe("spell form state", () => {
  it("round-trips nested prismatic effect config when copying and saving", () => {
    const rollTableConfig = {
      dice: "1d8",
      instruction: "Roll once for each target.",
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
        {
          effectText: "Roll twice more and reroll any 8.",
          effects: [{ conditionName: "Roll twice more and reroll any 8.", rollKind: "custom" }],
          name: "Special",
          rerollRule: "Roll twice more and reroll any 8.",
          roll: 8,
        },
      ],
    };
    const layeredConfig = {
      areaSpell: true,
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
        {
          color: "Violet",
          condition: "Blinded",
          effectText: "Blinded, then possible planar teleport.",
          order: 7,
          removal: "Destroyed by Dispel Magic.",
          repeatSave: "wis",
          saveAbility: "dex",
          saveEffect: "manual",
        },
      ],
      name: "Prismatic Layers",
      riderText: "Track seven layers in order.",
    };

    const form = spellToForm(
      makeSpell([
        { effectConfig: rollTableConfig, rollKind: "roll_table" },
        { effectConfig: layeredConfig, rollKind: "layered_effect" },
      ]),
    );
    const payload = spellPayload(form);

    expect(payload.actions[0].rolls[0].effectConfig).toEqual(rollTableConfig);
    expect(payload.actions[0].rolls[1].effectConfig).toEqual(layeredConfig);
  });
});

function makeSpell(
  rolls: Array<{ effectConfig: Record<string, unknown>; rollKind: string }>,
): Spell {
  return {
    actions: [
      {
        actionType: "save",
        attackAbilityOverride: "normal",
        attackModifier: 0,
        damageAbilityOverride: "normal",
        damageTypeChoice: "specific",
        damageTypeOptions: ["fire"],
        hitSpecialEvent: "none",
        id: "action-1",
        name: "Prismatic",
        rolls: rolls.map((roll, index) => ({
          addPrimaryStatModifier: false,
          cantripScaling: {},
          conditionName: "",
          damageType: "",
          diceCount: 0,
          dieSize: 6,
          effectConfig: roll.effectConfig,
          fixedValue: 0,
          id: `roll-${index + 1}`,
          magical: true,
          rollKind: roll.rollKind,
          scalingDiceCount: 0,
          scalingDieSize: 6,
          scalingFixedValue: 0,
          scalingFromLevel: 0,
          scalingStepSize: 1,
          scalingType: "none",
          timing: "immediate",
        })),
        saveAbility: "dex",
        successfulSaveEffect: "half",
        weaponSource: "chosen_weapon",
      },
    ],
    aoeSize: 60,
    aoeType: "Cone",
    castType: "Action",
    castingTime: "1 Action",
    classes: ["Wizard"],
    components: { material: true, materialText: "", somatic: true, verbal: true },
    concentration: false,
    description: "",
    duration: "Instantaneous",
    durationScale: "Minute",
    durationType: "Instantaneous",
    durationValue: 0,
    higherLevel: "",
    id: "spell-1",
    level: 7,
    materialComponents: "",
    mechanics: {},
    name: "Prismatic Test",
    projectileScaling: undefined,
    range: "Self",
    rangeFeet: 0,
    rangeType: "Self",
    ritual: false,
    scalingType: "none",
    school: "Evocation",
    sourceMaterial: "SRD",
    sourceNote: "",
  } as unknown as Spell;
}
