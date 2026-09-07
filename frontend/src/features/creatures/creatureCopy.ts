import type { ActionDisplaySection } from "../../types/actions";
import { api } from "../../lib/api";
import { actionPayload } from "../../lib/api/payloads";
import { abilityModifier, blankAction, blankRoll } from "../../lib/domain/forms";
import { conditionImmunities, senseTypes, skillDefinitions } from "../../lib/domain/options";
import type { Creature, CreatureAction, CreatureSpellcastingProfile } from "../../types";
import { creaturePB, list, record, valueText } from "./creatureProfileData";

export type CreatureEditorData = {
  creature: Creature;
  actions: CreatureAction[];
  spellcasting?: CreatureSpellcastingProfile;
};
export async function loadCreatureEditor(
  id: string,
  standard = false,
): Promise<CreatureEditorData> {
  if (standard) {
    const payload = await api.creatures({
      includeUser: false,
      includeStandard: true,
      source: ["srd-2014", "srd-5-2-1"],
    });
    const creature = payload.creatures.find((item) => item.id === id);
    if (!creature) throw new Error("Source creature was not found");
    return standardEditorData(creature);
  }
  const [creature, actions, spellcasting] = await Promise.all([
    api.creature(id),
    api.creatureActions(id),
    api.creatureSpellcasting(id),
  ]);
  return {
    creature: creature.creature,
    actions: actions.actions,
    spellcasting: spellcasting.spellcasting,
  };
}
export function copyEditorData(data: CreatureEditorData): CreatureEditorData {
  return {
    ...data,
    creature: {
      ...data.creature,
      id: "",
      name: `${data.creature.name} Copy`,
      readOnly: false,
      librarySource: "user",
      statBlock: {
        ...data.creature.statBlock,
        copiedFrom: {
          id: data.creature.id,
          name: data.creature.name,
          sourceKey: data.creature.sourceKey,
          sourceLabel: data.creature.sourceLabel,
        },
      },
    },
    actions: data.actions.map((action) => ({
      ...action,
      sourceTemplateId: undefined,
      creatureId: "",
    })),
  };
}
export function standardEditorData(creature: Creature): CreatureEditorData {
  const stat = creature.statBlock;
  const scores = record(stat.abilities);
  const senses = record(stat.senses);
  const defenses = record(stat.defenses);
  const pb = creaturePB(creature.challengeRating);
  const skills = record(stat.skills);
  const proficiencies: string[] = [],
    expertise: string[] = [];
  const adjustments: Record<string, number> = {};
  for (const skill of skillDefinitions) {
    const key = skill.name.toLowerCase().replaceAll(" ", "_");
    const value = skills[key] ?? skills[skill.name.toLowerCase()];
    if (typeof value !== "number") continue;
    const extra = value - abilityModifier(Number(scores[skill.ability] ?? 10));
    if (extra >= pb * 2) expertise.push(skill.name);
    if (extra >= pb) proficiencies.push(skill.name);
    adjustments[skill.name] = extra - (extra >= pb * 2 ? pb * 2 : extra >= pb ? pb : 0);
  }
  const migrated = { ...stat };
  const actions: CreatureAction[] = [];
  const sections: [string, ActionDisplaySection][] = [
    ["actions", "action"],
    ["bonusActions", "bonus_action"],
    ["reactions", "reaction"],
    ["legendaryActions", "legendary_action"],
    ["mythicActions", "mythic_action"],
    ["lairActions", "lair_action"],
  ];
  for (const [key, section] of sections) {
    for (const feature of list(stat[key]).map(record))
      actions.push(standardAction(feature, section, actions.length));
    delete migrated[key];
  }
  return {
    actions,
    creature: {
      ...creature,
      statBlock: {
        ...migrated,
        importedStatBlock: stat,
        abilityScores: scores,
        speed: Object.fromEntries(
          Object.entries(record(stat.speed)).map(([key, value]) => [
            key,
            parseInt(String(value), 10) || 0,
          ]),
        ),
        senses: Object.fromEntries(
          senseTypes.map((name) => [
            name,
            {
              enabled: Boolean(senses[name.toLowerCase()]),
              range: String(parseInt(valueText(senses[name.toLowerCase()]), 10) || ""),
            },
          ]),
        ),
        passivePerception: senses.passive_perception ?? 10,
        savingThrowProficiencies: Object.keys(record(stat.abilitySaveProficiencies)),
        skillProficiencies: proficiencies,
        skillExpertise: expertise,
        skillAdjustments: adjustments,
        damageVulnerabilities: list(defenses.vulnerabilities).map((value) =>
          String(value).toLowerCase(),
        ),
        damageResistances: list(defenses.resistances).map((value) => String(value).toLowerCase()),
        damageImmunities: list(defenses.immunities).map((value) => String(value).toLowerCase()),
        conditionImmunities: list(defenses.conditionImmunities).map(
          (value) =>
            conditionImmunities.find(
              (name) => name.toLowerCase() === String(value).toLowerCase(),
            ) ?? value,
        ),
        traits: list(stat.specialAbilities),
      },
    },
  };
}
function standardAction(
  feature: Record<string, unknown>,
  section: ActionDisplaySection,
  index: number,
): CreatureAction {
  const action = blankAction();
  const description = valueText(feature.description ?? feature.desc);
  const rolls = list(feature.damage)
    .map(record)
    .flatMap((damage) => {
      const match = valueText(damage.damageDice)
        .replace(/\s/g, "")
        .match(/^(\d+)d(\d+)([+-]\d+)?$/);
      if (!match) return [];
      return [
        {
          ...blankRoll(),
          diceCount: match[1],
          dieSize: match[2],
          fixedValue: match[3] ?? "0",
          damageType: valueText(damage.damageType).toLowerCase(),
        },
      ];
    });
  return {
    ...actionPayload({
      ...action,
      name: valueText(feature.name),
      description,
      displaySection: section,
      attackModifier: valueText(feature.attackBonus ?? 0),
      actionType: description.startsWith("Ranged") ? "ranged_weapon" : "melee_weapon",
      reach: description.match(/reach (\d+) ft/)?.[1] ?? "",
      rolls,
    }),
    id: action.id,
    creatureId: "",
    sortOrder: index,
    createdAt: "",
    updatedAt: "",
  };
}
