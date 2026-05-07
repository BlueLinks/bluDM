import type { ActionFormState, ActionRollFormState, ActionTemplate, ActionRollPart, CommonWeapon, Creature, CreatureAction, CreatureFormState } from "../../types";
import { abilities, creatureEnvironments, creatureTypes } from "./options";

export function abilityModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

export function signedModifier(score: number) {
  const mod = abilityModifier(score);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function modifierTone(modifier: number) {
  if (modifier >= 4) return "text-emerald-800 dark:text-emerald-300";
  if (modifier > 0) return "text-emerald-700 dark:text-emerald-400";
  if (modifier <= -4) return "text-red-800 dark:text-red-300";
  if (modifier < 0) return "text-red-700 dark:text-red-400";
  return "text-muted-foreground";
}

export function proficiencyBonus(level: string) {
  const parsed = Number(level) || 1;
  return Math.max(2, Math.ceil(parsed / 4) + 1);
}

export function blankRoll(): ActionRollFormState {
  return {
    id: crypto.randomUUID(),
    rollKind: "damage",
    damageType: "bludgeoning",
    magical: false,
    diceCount: "",
    dieSize: "6",
    fixedValue: ""
  };
}

export function blankAction(): ActionFormState {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    recharge: "",
    limitedUses: "",
    limitType: "day",
    reach: "",
    range: "",
    aoeType: "",
    aoeSize: "",
    actionType: "melee_weapon",
    attackModifier: "",
    missEffect: "none",
    hitSpecialEvent: "none",
    rolls: [blankRoll()]
  };
}

export function spiderStaffAction(): ActionFormState {
  return {
    ...blankAction(),
    id: crypto.randomUUID(),
    name: "Spider Staff",
    description: "A melee weapon attack with a venomous follow-up.",
    attackModifier: "4",
    rolls: [
      { ...blankRoll(), id: crypto.randomUUID(), damageType: "bludgeoning", diceCount: "2", dieSize: "6", fixedValue: "-1" },
      { ...blankRoll(), id: crypto.randomUUID(), damageType: "poison", diceCount: "3", dieSize: "6", fixedValue: "0" }
    ]
  };
}

export function actionFormFromTemplate(template: ActionTemplate): ActionFormState {
  return {
    id: crypto.randomUUID(),
    name: template.name,
    description: template.description,
    recharge: template.recharge,
    limitedUses: String(template.limitedUses),
    limitType: template.limitType || "day",
    reach: String(template.reach),
    range: String(template.range),
    aoeType: template.aoeType,
    aoeSize: String(template.aoeSize),
    actionType: template.actionType || "melee_weapon",
    attackModifier: String(template.attackModifier),
    missEffect: template.missEffect || "none",
    hitSpecialEvent: template.hitSpecialEvent || "none",
    rolls: template.rolls.length > 0 ? template.rolls.map((roll) => ({
      id: crypto.randomUUID(),
      rollKind: roll.rollKind,
      damageType: roll.damageType,
      magical: roll.magical,
      diceCount: String(roll.diceCount),
      dieSize: String(roll.dieSize),
      fixedValue: String(roll.fixedValue)
    })) : [blankRoll()]
  };
}

export function actionFormFromCreatureAction(action: CreatureAction): ActionFormState {
  return actionFormFromTemplate(action);
}

export function weaponAction(weapon: CommonWeapon, form: CreatureFormState): ActionFormState {
  const str = Number(form.abilityScores.str) || 10;
  const dex = Number(form.abilityScores.dex) || 10;
  const strMod = abilityModifier(str);
  const dexMod = abilityModifier(dex);
  const abilityMod = weapon.ability === "dex" ? dexMod : weapon.ability === "finesse" ? Math.max(strMod, dexMod) : strMod;
  const prof = Math.max(2, Math.ceil((Number(form.xp) || 0) / 2900));
  return {
    ...blankAction(),
    id: crypto.randomUUID(),
    name: weapon.name,
    actionType: weapon.range > weapon.reach ? "ranged_weapon" : "melee_weapon",
    attackModifier: String(abilityMod + prof),
    reach: String(weapon.reach),
    range: String(weapon.range),
    description: `${weapon.name} attack generated from current creature ability scores.`,
    rolls: [{
      ...blankRoll(),
      id: crypto.randomUUID(),
      damageType: weapon.damageType,
      diceCount: String(weapon.diceCount),
      dieSize: String(weapon.dieSize),
      fixedValue: String(abilityMod)
    }]
  };
}

export function formatRolls(rolls: ActionRollPart[] | ActionRollFormState[]) {
  return rolls
    .map((roll) => {
      const diceCount = "diceCount" in roll ? roll.diceCount : "1";
      const dieSize = "dieSize" in roll ? roll.dieSize : "6";
      const fixed = Number(roll.fixedValue) || 0;
      return `${diceCount}d${dieSize}${fixed === 0 ? "" : fixed > 0 ? `+${fixed}` : fixed} ${roll.damageType}`;
    })
    .join(" + ");
}

function stringFromUnknown(value: unknown, fallback: string) {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

export function creatureToForm(creature: Creature | undefined, emptyCreatureForm: CreatureFormState): CreatureFormState {
  if (!creature) return emptyCreatureForm;
  const stat = creature.statBlock ?? {};
  const speed = typeof stat.speed === "object" && stat.speed ? stat.speed as Record<string, unknown> : {};
  const abilityScores = typeof stat.abilityScores === "object" && stat.abilityScores ? stat.abilityScores as Record<string, unknown> : {};
  const senses = typeof stat.senses === "object" && stat.senses ? stat.senses as CreatureFormState["senses"] : emptyCreatureForm.senses;
  const asStrings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return {
    ...emptyCreatureForm,
    imageAssetId: creature.imageAssetId ?? "",
    avatarUrl: creature.avatarUrl ?? "",
    name: creature.name,
    description: creature.description,
    size: creature.size,
    creatureType: creatureTypes.includes(creature.creatureType) ? creature.creatureType : "",
    creatureSubtype: typeof stat.creatureSubtype === "string" ? stat.creatureSubtype : "",
    alignment: creature.alignment,
    environment: typeof stat.environment === "string" && creatureEnvironments.includes(stat.environment) ? stat.environment : "",
    defaultDisposition: stat.defaultDisposition === "friendly" ? "friendly" : "enemy",
    armorClass: String(creature.armorClass),
    hitPoints: String(creature.hitPoints),
    hitDice: creature.hitDice,
    challengeRating: creature.challengeRating,
    xp: String(creature.xp),
    walkSpeed: stringFromUnknown(speed.walk, "30"),
    swimSpeed: stringFromUnknown(speed.swim, ""),
    flySpeed: stringFromUnknown(speed.fly, ""),
    burrowSpeed: stringFromUnknown(speed.burrow, ""),
    climbSpeed: stringFromUnknown(speed.climb, ""),
    languages: typeof stat.languages === "string" ? stat.languages : "",
    passivePerception: stringFromUnknown(stat.passivePerception, "10"),
    passiveInvestigation: stringFromUnknown(stat.passiveInvestigation, "10"),
    passiveInsight: stringFromUnknown(stat.passiveInsight, "10"),
    abilityScores: Object.fromEntries(abilities.map((ability) => [ability.key, stringFromUnknown(abilityScores[ability.key], "10")])) as CreatureFormState["abilityScores"],
    savingThrowProficiencies: asStrings(stat.savingThrowProficiencies),
    skillProficiencies: asStrings(stat.skillProficiencies),
    skillExpertise: asStrings(stat.skillExpertise),
    damageVulnerabilities: asStrings(stat.damageVulnerabilities),
    damageResistances: asStrings(stat.damageResistances),
    damageImmunities: asStrings(stat.damageImmunities),
    conditionImmunities: asStrings(stat.conditionImmunities),
    senses,
    spellcastingAbility: typeof stat.spellcastingAbility === "string" ? stat.spellcastingAbility : "",
    innateSpellcastingAbility: typeof stat.innateSpellcastingAbility === "string" ? stat.innateSpellcastingAbility : "",
    casterLevel: stringFromUnknown(stat.casterLevel, "0"),
    spellSaveDC: stringFromUnknown(stat.spellSaveDC, "10"),
    spellAttackBonus: stringFromUnknown(stat.spellAttackBonus, "0"),
    statBlock: JSON.stringify(stat, null, 2)
  };
}

export function creatureDefaultDisposition(creature: Creature): "friendly" | "enemy" {
  return creature.statBlock?.defaultDisposition === "friendly" ? "friendly" : "enemy";
}
