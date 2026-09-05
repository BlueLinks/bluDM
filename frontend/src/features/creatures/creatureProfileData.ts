import { abilityModifier } from "../../lib/domain/forms";
import { abilities, skillDefinitions } from "../../lib/domain/options";
import type { Creature, CreatureAction, CreatureSpellcastingProfile } from "../../types";

export const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
export const signed = (value: number) => (value >= 0 ? `+${value}` : String(value));
export const humanize = (value: string) =>
  value.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
export function valueText(value: unknown): string {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join(", ");
  if (typeof value === "object")
    return Object.entries(record(value))
      .map(([key, item]) => `${humanize(key)}: ${valueText(item)}`)
      .join("; ");
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : "";
}
export const creaturePB = (rating: string) => Math.max(2, Math.ceil((Number(rating) || 0) / 4) + 1);
export function profileAbilities(creature: Creature) {
  const scores = record(creature.statBlock.abilityScores ?? creature.statBlock.abilities);
  return abilities.map(({ key, label }) => {
    const score = Number(scores[key] ?? 10);
    return { key, label, score, modifier: signed(abilityModifier(score)) };
  });
}
export function profileFacts(creature: Creature): [string, string][] {
  const s = creature.statBlock;
  const abilityScores = record(s.abilityScores ?? s.abilities);
  const pb = creaturePB(creature.challengeRating);
  const saves =
    s.savingThrowProficiencies !== undefined
      ? list(s.savingThrowProficiencies)
          .map(
            (key) =>
              `${String(key).toUpperCase()} ${signed(abilityModifier(Number(abilityScores[String(key)] ?? 10)) + pb)}`,
          )
          .join(", ")
      : Object.entries(record(s.abilitySaveProficiencies))
          .map(([key, value]) => `${key.toUpperCase()} ${signed(Number(value))}`)
          .join(", ");
  const adjustments = record(s.skillAdjustments);
  const skills =
    s.skillProficiencies !== undefined
      ? skillDefinitions
          .filter(
            (skill) =>
              list(s.skillProficiencies).includes(skill.name) ||
              list(s.skillExpertise).includes(skill.name) ||
              adjustments[skill.name],
          )
          .map(
            (skill) =>
              `${skill.name} ${signed(abilityModifier(Number(abilityScores[skill.ability] ?? 10)) + (list(s.skillExpertise).includes(skill.name) ? pb * 2 : list(s.skillProficiencies).includes(skill.name) ? pb : 0) + Number(adjustments[skill.name] ?? 0))}`,
          )
          .join(", ")
      : Object.entries(record(s.skills))
          .map(([key, value]) => `${humanize(key)} ${signed(Number(value))}`)
          .join(", ");
  const senses = Object.entries(record(s.senses)).flatMap(([key, value]) => {
    if (key.startsWith("passive")) return [];
    if (typeof value === "object")
      return record(value).enabled ? [`${key} ${valueText(record(value).range)} ft.`] : [];
    return value ? [`${humanize(key)} ${valueText(value)}`] : [];
  });
  const passive = s.passivePerception ?? record(s.senses).passive_perception;
  if (passive !== undefined) senses.push(`passive Perception ${valueText(passive)}`);
  if (s.passiveInvestigation !== undefined)
    senses.push(`passive Investigation ${valueText(s.passiveInvestigation)}`);
  if (s.passiveInsight !== undefined) senses.push(`passive Insight ${valueText(s.passiveInsight)}`);
  const defenses = record(s.defenses);
  return [
    [
      "Speed",
      Object.entries(record(s.speed))
        .filter(([, value]) => Boolean(value) && value !== "0")
        .map(
          ([key, value]) =>
            `${key} ${valueText(value)}${typeof value === "number" || /^\d+$/.test(String(value)) ? " ft." : ""}`,
        )
        .join(", "),
    ],
    ["Saving throws", saves],
    ["Skills", skills],
    ["Senses", senses.join(", ")],
    ["Vulnerabilities", valueText(s.damageVulnerabilities ?? defenses.vulnerabilities)],
    ["Resistances", valueText(s.damageResistances ?? defenses.resistances)],
    ["Damage immunities", valueText(s.damageImmunities ?? defenses.immunities)],
    ["Condition immunities", valueText(s.conditionImmunities ?? defenses.conditionImmunities)],
    ["Languages", valueText(s.languages)],
  ].filter(([, value]) => value) as [string, string][];
}
export type ProfileFeature = { name: string; description: string; detail?: string };
const sectionKeys = [
  ["Traits", "trait", "specialAbilities"],
  ["Actions", "action", "actions"],
  ["Bonus actions", "bonus_action", "bonusActions"],
  ["Reactions", "reaction", "reactions"],
  ["Legendary actions", "legendary_action", "legendaryActions"],
  ["Mythic actions", "mythic_action", "mythicActions"],
  ["Lair actions", "lair_action", "lairActions"],
] as const;
export function actionRollText(action: CreatureAction) {
  return (action.rolls ?? [])
    .map((roll) => {
      const dice =
        roll.diceCount > 0 && roll.dieSize > 0
          ? `${roll.diceCount}d${roll.dieSize}${roll.fixedValue ? signed(roll.fixedValue) : ""}`
          : String(roll.fixedValue);
      return `${dice} ${roll.damageType || roll.rollKind}${roll.magical ? " (magical)" : ""}`;
    })
    .join(" + ");
}
export function profileFeatures(creature: Creature, actions: CreatureAction[] = []) {
  return sectionKeys
    .map(([title, section, rawKey]) => {
      const typed = actions.filter((action) => (action.displaySection || "action") === section);
      const names = new Set(typed.map((action) => action.name.toLowerCase()));
      const raw =
        section === "trait"
          ? (creature.statBlock.traits ?? creature.statBlock[rawKey])
          : creature.statBlock[rawKey];
      const items: ProfileFeature[] = list(raw)
        .map(record)
        .filter((item) => !names.has(String(item.name).toLowerCase()))
        .map((item) => ({
          name: valueText(item.name),
          description: valueText(item.description ?? item.desc),
        }));
      items.push(
        ...typed.map((action) => ({
          name: action.name,
          description: action.description,
          detail: [
            ["melee_weapon", "ranged_weapon", "melee_spell", "ranged_spell"].includes(
              action.actionType,
            )
              ? `${signed(action.attackModifier)} to hit`
              : "",
            action.reach ? `reach ${action.reach} ft.` : "",
            action.range ? `range ${action.range} ft.` : "",
            actionRollText(action),
            action.recharge ? `Recharge ${action.recharge}` : "",
            action.limitedUses ? `${action.limitedUses} uses ${action.limitType}` : "",
            action.aoeType ? `${action.aoeType} ${action.aoeSize} ft.` : "",
            action.hitSpecialEvent !== "none" ? action.hitSpecialEvent : "",
            action.missEffect && action.missEffect !== "none" ? `Miss: ${action.missEffect}` : "",
          ]
            .filter(Boolean)
            .join(" · "),
        })),
      );
      const introduction =
        section === "legendary_action"
          ? valueText(creature.statBlock.legendaryDescription)
          : section === "mythic_action"
            ? valueText(creature.statBlock.mythicDescription)
            : "";
      return { title, items, introduction };
    })
    .filter((group) => group.items.length || group.introduction);
}
export function profileSpells(creature: Creature, profile?: CreatureSpellcastingProfile) {
  const hasCasting =
    profile &&
    (profile.spellcastingAbility || profile.innateSpellcastingAbility || profile.spells.length);
  if (!hasCasting) return valueText(creature.statBlock.spellcasting);
  return [
    profile.spellcastingAbility &&
      `${profile.spellcastingAbility.toUpperCase()} · DC ${profile.spellSaveDC} · ${signed(profile.spellAttackBonus)} to hit`,
    profile.innateSpellcastingAbility &&
      `Innate: ${profile.innateSpellcastingAbility.toUpperCase()}`,
    ...Object.entries(profile.slots)
      .filter(([, count]) => Number(count) > 0)
      .map(([level, count]) => `Level ${level}: ${valueText(count)} slots`),
    ...profile.spells.map(
      (spell) =>
        `${spell.spellName} (${spell.spellLevel === 0 ? "cantrip" : `level ${spell.spellLevel}`}${spell.innate ? ", innate" : ""})`,
    ),
  ]
    .filter(Boolean)
    .join("; ");
}
