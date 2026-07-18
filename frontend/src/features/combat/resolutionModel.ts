import {
  abilityScoresFromSheet,
  combatantSheet,
  effectiveMaxHP,
  proficiencyBonusFromCombatSheet,
  stringArrayFromSheet,
} from "../../lib/domain/combat";
import { abilityModifier } from "../../lib/domain/forms";
import type { EncounterRunCombatant, RollMode } from "../../types";

export type ResolutionKind = "attack" | "save" | "spell" | "healing" | "manual";
export type RollSource = "automatic" | "physical" | "outcome";
export type ResolutionOutcome =
  | "pending"
  | "success"
  | "failure"
  | "hit"
  | "miss"
  | "critical"
  | "applied";

export type ResolutionDamageComponent = {
  id: string;
  source: string;
  formula: string;
  amount: number;
  damageType: string;
  rolledValue?: number;
  criticalRolledValue?: number;
  modifier?: number;
  criticalBehavior?: "double_dice" | "normal";
  mitigation?: "apply" | "ignore";
  manualOverride?: boolean;
};

export type ResolutionCondition = {
  name: string;
  duration: string;
  expiry: string;
  saveAbility: string;
  saveDC: number;
  note: string;
};

export type ResolutionTarget = {
  targetId: string;
  included: boolean;
  outcome: ResolutionOutcome;
  saveAbility: string;
  dc: number;
  rollMode: RollMode;
  rollSource: RollSource;
  d20Rolls: number[];
  rollTotal: number;
  damageMultiplier: number;
  damageComponents: ResolutionDamageComponent[];
  healing: number;
  temporaryHitPoints?: number;
  temporaryHitPointsMode: "max" | "replace";
  directHitPoints?: number;
  conditions: ResolutionCondition[];
};

export type ResolutionResource = {
  kind: "spell_slot";
  spellLevel: number;
};

export type CombatResolutionDraft = {
  actorId?: string;
  kind: ResolutionKind;
  sourceName: string;
  notes: string;
  targets: ResolutionTarget[];
  resource?: ResolutionResource;
};

export type ResolutionTargetPreview = {
  rawDamage: number;
  finalDamage: number;
  currentHitPoints: number;
  currentTemporaryHitPoints: number;
  projectedHitPoints: number;
  projectedTemporaryHitPoints: number;
  defeated: boolean;
  components: Array<
    ResolutionDamageComponent & { scaledAmount: number; finalAmount: number; defense: string }
  >;
};

export type DamageDefenses = {
  vulnerabilities: string[];
  resistances: string[];
  immunities: string[];
};

export function saveModifier(combatant: EncounterRunCombatant, ability: string) {
  const sheet = combatantSheet(combatant);
  const scores = abilityScoresFromSheet(sheet);
  const normalized = ability.trim().toLowerCase();
  const score = Number(scores[normalized]) || 10;
  const proficient = stringArrayFromSheet(sheet.savingThrowProficiencies).some(
    (item) => item.toLowerCase() === normalized,
  );
  return abilityModifier(score) + (proficient ? proficiencyBonusFromCombatSheet(sheet) : 0);
}

export function rollSavingThrow(
  combatant: EncounterRunCombatant,
  ability: string,
  mode: RollMode,
  die: () => number = rollD20,
) {
  const first = clampD20(die());
  const rolls = mode === "normal" ? [first] : [first, clampD20(die())];
  const selected =
    mode === "advantage"
      ? Math.max(...rolls)
      : mode === "disadvantage"
        ? Math.min(...rolls)
        : first;
  const modifier = saveModifier(combatant, ability);
  return { d20Rolls: rolls, modifier, total: selected + modifier };
}

export function outcomeDamageMultiplier(
  outcome: ResolutionOutcome,
  successRule: "half" | "none" | "full",
) {
  if (outcome === "pending") return 0;
  if (outcome !== "success") return 1;
  if (successRule === "half") return 0.5;
  if (successRule === "none") return 0;
  return 1;
}

export function previewResolutionTarget(
  combatant: EncounterRunCombatant,
  target: ResolutionTarget,
): ResolutionTargetPreview {
  const defenses = damageDefenses(combatant);
  const components = target.damageComponents.map((component) => {
    const scaledAmount = Math.floor(
      Math.max(0, component.amount) * Math.max(0, target.damageMultiplier),
    );
    const adjustment =
      component.mitigation === "ignore"
        ? { amount: scaledAmount, defense: "ignored" as const }
        : adjustDamageComponent(scaledAmount, component.damageType, defenses);
    return {
      ...component,
      scaledAmount,
      finalAmount: adjustment.amount,
      defense: adjustment.defense,
    };
  });
  const rawDamage = target.damageComponents.reduce(
    (total, component) => total + Math.max(0, component.amount),
    0,
  );
  const finalDamage = components.reduce((total, component) => total + component.finalAmount, 0);
  const temporaryDamage = Math.min(combatant.temporaryHitPoints, finalDamage);
  const hpDamage = finalDamage - temporaryDamage;
  let hitPoints = Math.max(0, combatant.currentHitPoints - hpDamage);
  let temporaryHitPoints = Math.max(0, combatant.temporaryHitPoints - temporaryDamage);

  hitPoints = Math.min(effectiveMaxHP(combatant), hitPoints + Math.max(0, target.healing));
  if (target.directHitPoints !== undefined) {
    hitPoints = Math.min(effectiveMaxHP(combatant), Math.max(0, target.directHitPoints));
  }
  if (target.temporaryHitPoints !== undefined) {
    const next = Math.max(0, target.temporaryHitPoints);
    temporaryHitPoints =
      target.temporaryHitPointsMode === "replace" ? next : Math.max(temporaryHitPoints, next);
  }

  return {
    rawDamage,
    finalDamage,
    currentHitPoints: combatant.currentHitPoints,
    currentTemporaryHitPoints: combatant.temporaryHitPoints,
    projectedHitPoints: hitPoints,
    projectedTemporaryHitPoints: temporaryHitPoints,
    defeated: combatant.sourceType !== "player" && hitPoints <= 0,
    components,
  };
}

export function blankResolutionTarget(targetId: string): ResolutionTarget {
  return {
    targetId,
    included: true,
    outcome: "applied",
    saveAbility: "dex",
    dc: 10,
    rollMode: "normal",
    rollSource: "automatic",
    d20Rolls: [],
    rollTotal: 0,
    damageMultiplier: 1,
    damageComponents: [],
    healing: 0,
    temporaryHitPointsMode: "max",
    conditions: [],
  };
}

export function isSaveTargetResolved(target: ResolutionTarget) {
  if (target.outcome !== "success" && target.outcome !== "failure") return false;
  if (target.rollSource === "outcome") return true;
  const expectedRolls = target.rollMode === "normal" ? 1 : 2;
  return (
    target.d20Rolls.length === expectedRolls &&
    target.d20Rolls.every((roll) => Number.isInteger(roll) && roll >= 1 && roll <= 20)
  );
}

export function applyResolutionPayload(draft: CombatResolutionDraft) {
  return {
    actorId: draft.actorId,
    kind: draft.kind,
    sourceName: draft.sourceName,
    notes: draft.notes,
    resource: draft.resource,
    targets: draft.targets
      .filter((target) => target.included)
      .map(({ included, ...target }) => {
        if (!included) throw new Error("excluded resolution target");
        return target;
      }),
  };
}

function damageDefenses(combatant: EncounterRunCombatant) {
  const sheet = combatantSheet(combatant);
  return {
    vulnerabilities: normalized(stringArrayFromSheet(sheet.damageVulnerabilities)),
    resistances: normalized(stringArrayFromSheet(sheet.damageResistances)),
    immunities: normalized(stringArrayFromSheet(sheet.damageImmunities)),
  };
}

export function adjustDamageComponent(
  amount: number,
  damageType: string,
  defenses: DamageDefenses,
): { amount: number; defense: "immune" | "vulnerable" | "resistant" | "normal" } {
  const normalizedType = damageType.trim().toLowerCase();
  if (normalized(defenses.immunities).includes(normalizedType)) {
    return { amount: 0, defense: "immune" };
  }
  if (normalized(defenses.vulnerabilities).includes(normalizedType)) {
    return { amount: amount * 2, defense: "vulnerable" };
  }
  if (normalized(defenses.resistances).includes(normalizedType)) {
    return { amount: Math.floor(amount / 2), defense: "resistant" };
  }
  return { amount, defense: "normal" };
}

export type ParsedDamageFormula = {
  diceCount: number;
  dieSize: number;
  modifier: number;
};

export function parseDamageFormula(formula: string): ParsedDamageFormula | null {
  const normalizedFormula = formula.trim().replaceAll(" ", "");
  const dice = /^(\d*)d(\d+)(?:([+-])(\d+))?$/i.exec(normalizedFormula);
  if (dice) {
    const diceCount = Number(dice[1] || 1);
    const dieSize = Number(dice[2]);
    const modifier = Number(dice[4] || 0) * (dice[3] === "-" ? -1 : 1);
    if (diceCount < 1 || diceCount > 100 || dieSize < 2 || dieSize > 1000) return null;
    return { diceCount, dieSize, modifier };
  }
  if (!/^[+-]?\d+$/.test(normalizedFormula)) return null;
  return { diceCount: 0, dieSize: 0, modifier: Number(normalizedFormula) };
}

export function rollDamageComponent(
  component: ResolutionDamageComponent,
  critical = false,
  die: (dieSize: number) => number = rollDie,
): ResolutionDamageComponent | null {
  const parsed = parseDamageFormula(component.formula);
  if (!parsed) return null;
  const rolledValue = rollDamageDice(parsed.diceCount, parsed.dieSize, die);
  const criticalRolledValue =
    critical &&
    parsed.diceCount > 0 &&
    (component.criticalBehavior ?? "double_dice") === "double_dice"
      ? rollDamageDice(parsed.diceCount, parsed.dieSize, die)
      : 0;
  return {
    ...component,
    rolledValue,
    criticalRolledValue,
    modifier: parsed.modifier,
    amount: Math.max(0, rolledValue + criticalRolledValue + parsed.modifier),
    criticalBehavior: component.criticalBehavior ?? "double_dice",
    mitigation: component.mitigation ?? "apply",
    manualOverride: false,
  };
}

function normalized(values: string[]) {
  return values.map((value) => value.trim().toLowerCase());
}

function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

function rollDamageDice(count: number, dieSize: number, die: (dieSize: number) => number) {
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    total += Math.min(dieSize, Math.max(1, Math.floor(die(dieSize))));
  }
  return total;
}

function rollDie(dieSize: number) {
  return Math.floor(Math.random() * dieSize) + 1;
}

function clampD20(value: number) {
  return Math.min(20, Math.max(1, Math.floor(value)));
}
