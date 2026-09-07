import { creaturePayload, actionPayload } from "../../lib/api/payloads";
import { blankAction } from "../../lib/domain/forms";
import type { Creature, CreatureAction, CreatureSpellcastingProfile } from "../../types";
import { emptyCreatureForm } from "./creatureEditorModel";
export function creatureFixture(patch: Partial<Creature> = {}): Creature {
  return {
    ...creaturePayload({
      ...emptyCreatureForm,
      name: "Ashen Wolf",
      size: "Large",
      creatureType: "Beast",
      challengeRating: "1",
      abilityScores: { ...emptyCreatureForm.abilityScores, str: "17", wis: "12" },
      skillProficiencies: ["Perception"],
      skillAdjustments: { Perception: 2 },
    }),
    id: "wolf",
    librarySource: "user",
    readOnly: false,
    sourceKey: "",
    sourceLabel: "",
    createdAt: "",
    updatedAt: "",
    ...patch,
  };
}
export function actionFixture(patch: Partial<CreatureAction> = {}): CreatureAction {
  return {
    ...actionPayload({
      ...blankAction(),
      name: "Ember Bite",
      description: "The bite scorches its target.",
      attackModifier: "5",
      rolls: [
        {
          id: "roll",
          rollKind: "damage",
          damageType: "fire",
          magical: true,
          diceCount: "0",
          dieSize: "0",
          fixedValue: "7",
        },
      ],
    }),
    id: "bite",
    creatureId: "wolf",
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
    ...patch,
  };
}
export function spellcastingFixture(): CreatureSpellcastingProfile {
  return {
    creatureId: "wolf",
    spellcastingAbility: "wis",
    innateSpellcastingAbility: "wis",
    casterLevel: 3,
    spellSaveDC: 13,
    spellAttackBonus: 5,
    slots: { 1: 2 },
    spells: [
      {
        id: "spell-link",
        creatureId: "wolf",
        spellName: "Faerie Fire",
        spellId: "spell",
        spellLevel: 1,
        librarySource: "user",
        sourceKey: "",
        sourceLabel: "",
        prepared: false,
        innate: true,
        sortOrder: 0,
      },
    ],
  };
}
