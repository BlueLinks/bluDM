import { describe, expect, it } from "vitest";
import type { ActionFormState, SpellFormState } from "../../types";
import { actionPayload, spellPayload } from "./payloads";

describe("api payload builders", () => {
  it("normalizes creature action roll numbers without dropping metadata", () => {
    const payload = actionPayload({
      actionType: "melee_weapon",
      aoeSize: "",
      aoeType: "none",
      attackModifier: "4",
      description: "A quick strike.",
      hitSpecialEvent: "none",
      iconAssetId: "",
      iconAttribution: "",
      iconKey: "sword",
      iconSource: "library",
      iconUrl: "",
      limitType: "none",
      limitedUses: "",
      missEffect: "half",
      name: "Shortsword",
      range: "",
      reach: "5",
      recharge: "",
      rolls: [
        {
          damageType: "piercing",
          diceCount: "2",
          dieSize: "6",
          fixedValue: "-1",
          magical: false,
          rollKind: "damage",
        },
      ],
      sourceTemplateId: "template-1",
    } as ActionFormState);

    expect(payload).toMatchObject({
      attackModifier: 4,
      missEffect: "half",
      reach: 5,
      sourceTemplateId: "template-1",
      rolls: [{ damageType: "piercing", diceCount: 2, dieSize: 6, fixedValue: -1 }],
    });
  });

  it("omits disabled spell scaling while keeping active area and projectile scaling", () => {
    const payload = spellPayload({
      actions: [
        {
          actionType: "save",
          attackAbilityOverride: "normal",
          attackModifier: "",
          damageAbilityOverride: "normal",
          damageTypeChoice: "specific",
          damageTypeOptions: ["fire"],
          hitSpecialEvent: "none",
          name: "Flame",
          rolls: [
            {
              addPrimaryStatModifier: false,
              cantrip11DiceCount: "3",
              cantrip11DieSize: "10",
              cantrip17DiceCount: "4",
              cantrip17DieSize: "10",
              cantrip5DiceCount: "2",
              cantrip5DieSize: "10",
              conditionName: "",
              damageType: "fire",
              diceCount: "1",
              dieSize: "10",
              effectConfig: undefined,
              fixedValue: "",
              id: "roll-1",
              magical: true,
              rollKind: "damage",
              scalingDiceCount: "2",
              scalingDieSize: "8",
              scalingFixedValue: "4",
              scalingFromLevel: "3",
              scalingStepSize: "2",
              scalingType: "none",
              timing: "immediate",
            },
          ],
          saveAbility: "dex",
          successfulSaveEffect: "half",
          weaponSource: "chosen_weapon",
        },
      ],
      aoeSize: "20",
      aoeType: "Sphere",
      areaScaling: {
        additionalSize: "5",
        description: "Wider fire.",
        scaleFromLevel: "4",
        scalingType: "spell_level",
        stepSize: "1",
      },
      castType: "Action",
      castingTrigger: "cast",
      classes: ["Wizard"],
      components: { material: true, somatic: true, verbal: true },
      concentration: true,
      description: "A precise flame.",
      duration: "1 minute",
      durationScale: "minute",
      durationType: "timed",
      durationValue: "1",
      higherLevel: "",
      level: "3",
      materialComponents: "ruby dust",
      name: "Test Flame",
      projectileScaling: {
        additionalProjectiles: "1",
        baseProjectiles: "3",
        cantrip11Targets: "3",
        cantrip17Targets: "4",
        cantrip5Targets: "2",
        description: "More bolts.",
        scaleFromLevel: "4",
        scalingType: "spell_level",
        stepSize: "1",
      },
      range: "120 feet",
      rangeFeet: "120",
      rangeType: "ranged",
      ritual: false,
      scalingType: "none",
      school: "Evocation",
      sourceMaterial: "Homebrew",
      sourceNote: "",
      targetAnchor: "point",
      targetPattern: "area",
      triggerDetail: "",
    } as SpellFormState);

    expect(payload.mechanics.areaScaling).toEqual({
      additionalSize: 5,
      description: "Wider fire.",
      scaleFromLevel: 4,
      scalingType: "spell_level",
      stepSize: 1,
    });
    expect(payload.projectileScaling).toMatchObject({
      additionalProjectiles: 1,
      baseProjectiles: 3,
      cantripScaling: { "5": { targets: 2 }, "11": { targets: 3 }, "17": { targets: 4 } },
    });
    expect(payload.actions[0].rolls[0]).toMatchObject({
      diceCount: 1,
      dieSize: 10,
      scalingDiceCount: 0,
      scalingDieSize: 6,
      scalingFixedValue: 0,
      scalingFromLevel: 0,
    });
  });
});
