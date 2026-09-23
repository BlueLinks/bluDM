import { describe, expect, it } from "vitest";
import type { EncounterRunCombatant } from "../../types";
import { standardRunActions } from "./standardRunActions";

describe("standardRunActions", () => {
  it("makes a saved SRD Dire Wolf Bite rollable without turning traits into attacks", () => {
    const wolf = {
      sourceType: "creature",
      snapshot: {
        standardCreatureId: "dire-wolf",
        creature: {
          statBlock: {
            specialAbilities: [
              { name: "Pack Tactics", description: "The wolf has advantage near an ally." },
            ],
            actions: [
              { name: "Multiattack", description: "The wolf makes two attacks.", damage: [] },
              {
                name: "Bite",
                attackBonus: 5,
                description: "Melee Weapon Attack: +5 to hit, reach 5 ft.",
                damage: [{ damageDice: "2d6+3", damageType: "Piercing" }],
              },
            ],
          },
        },
      },
    } as unknown as EncounterRunCombatant;

    expect(standardRunActions(wolf)).toMatchObject([
      {
        id: "standard:actions:1",
        name: "Bite",
        attackModifier: 5,
        actionType: "melee_weapon",
        rolls: [{ diceCount: 2, dieSize: 6, fixedValue: 3, damageType: "piercing" }],
      },
    ]);
  });
});
