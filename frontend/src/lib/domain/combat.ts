import type {
  CreatureAction,
  EncounterCombatant,
  EncounterRunCombatant,
  Player,
} from "../../types";
import {
  encounterRuleset2014,
  encounterRuleset2024,
  type EncounterRuleset,
} from "./encounterRulesets";

type DifficultyThresholds = {
  easy: number;
  medium: number;
  hard: number;
  deadly: number;
  low: number;
  moderate: number;
  high: number;
};

export type EncounterDifficulty = {
  ruleset: EncounterRuleset;
  thresholds: DifficultyThresholds;
  enemyXP: number;
  xpBudget: number;
  xpSpent: number;
  multiplier: number;
  adjustedXP: number;
  label: string;
};

const xpThresholds2014ByLevel: Record<
  number,
  { easy: number; medium: number; hard: number; deadly: number }
> = {
  1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
  2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
  3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
  4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
  5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
  6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
  7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
  8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
  9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
  10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
  11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
  12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
  13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
  14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
  15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
  16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
  17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
  18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
  19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 },
};

const xpBudgets2024ByLevel: Record<number, { low: number; moderate: number; high: number }> = {
  1: { low: 50, moderate: 75, high: 100 },
  2: { low: 100, moderate: 150, high: 200 },
  3: { low: 150, moderate: 225, high: 400 },
  4: { low: 250, moderate: 375, high: 500 },
  5: { low: 500, moderate: 750, high: 1100 },
  6: { low: 600, moderate: 1000, high: 1400 },
  7: { low: 750, moderate: 1300, high: 1700 },
  8: { low: 1000, moderate: 1700, high: 2100 },
  9: { low: 1300, moderate: 2000, high: 2600 },
  10: { low: 1600, moderate: 2300, high: 3100 },
  11: { low: 1900, moderate: 2900, high: 4100 },
  12: { low: 2200, moderate: 3700, high: 4700 },
  13: { low: 2600, moderate: 4200, high: 5400 },
  14: { low: 2900, moderate: 4900, high: 6200 },
  15: { low: 3300, moderate: 5400, high: 7800 },
  16: { low: 3800, moderate: 6100, high: 9800 },
  17: { low: 4500, moderate: 7200, high: 11700 },
  18: { low: 5000, moderate: 8700, high: 14200 },
  19: { low: 5500, moderate: 10700, high: 17200 },
  20: { low: 6400, moderate: 13200, high: 22000 },
};

export function rollHitDiceClient(hitDice: string, fallback: number) {
  const match = hitDice
    .trim()
    .toLowerCase()
    .match(/^(\d+)d(\d+)\s*([+-]\s*\d+)?$/);
  if (!match) return fallback;
  const count = Number(match[1]);
  const die = Number(match[2]);
  const modifier = match[3] ? Number(match[3].replace(/\s/g, "")) : 0;
  if (!count || !die) return fallback;
  let total = modifier;
  for (let index = 0; index < count; index++) total += Math.floor(Math.random() * die) + 1;
  return Math.max(1, total);
}

export function calculateEncounterDifficulty(
  players: Player[],
  enemies: EncounterCombatant[],
  ruleset: EncounterRuleset = encounterRuleset2014,
): EncounterDifficulty {
  const levels = players.map((player) => numericLevel(player.characterSheet.level));
  return difficultyFromXP(
    thresholdsForLevels(levels, ruleset),
    enemies.reduce((total, enemy) => total + combatantXP(enemy), 0),
    enemies.length,
    ruleset,
  );
}

export function calculateCombatantEncounterDifficulty(
  combatants: EncounterCombatant[],
  ruleset: EncounterRuleset = encounterRuleset2014,
) {
  const players = combatants.filter((combatant) => combatant.sourceType === "player");
  const enemies = combatants.filter((combatant) => combatant.side === "enemy");
  return difficultyFromXP(
    thresholdsForLevels(
      players.map((player) => numericLevel(combatantSheet(player).level)),
      ruleset,
    ),
    enemies.reduce((total, enemy) => total + combatantXP(enemy), 0),
    enemies.length,
    ruleset,
  );
}

export function calculateRunEncounterDifficulty(
  combatants: EncounterRunCombatant[],
  ruleset: EncounterRuleset = encounterRuleset2014,
) {
  const players = combatants.filter((combatant) => combatant.sourceType === "player");
  const enemies = combatants.filter((combatant) => combatant.side === "enemy");
  return difficultyFromXP(
    thresholdsForLevels(
      players.map((player) => numericLevel(combatantSheet(player).level)),
      ruleset,
    ),
    enemies.reduce((total, enemy) => total + runCombatantXP(enemy), 0),
    enemies.length,
    ruleset,
  );
}

function difficultyFromXP(
  thresholds: DifficultyThresholds,
  enemyXP: number,
  count: number,
  ruleset: EncounterRuleset,
): EncounterDifficulty {
  if (ruleset === encounterRuleset2024) {
    let label = "Trivial";
    if (enemyXP > 0 && enemyXP <= thresholds.low) label = "Low";
    else if (enemyXP > 0 && enemyXP <= thresholds.moderate) label = "Moderate";
    else if (enemyXP > 0 && enemyXP <= thresholds.high) label = "High";
    else if (enemyXP > 0) label = "Over High";
    const xpBudget =
      label === "Low"
        ? thresholds.low
        : label === "Moderate"
          ? thresholds.moderate
          : label === "High" || label === "Over High"
            ? thresholds.high
            : 0;
    return {
      ruleset,
      thresholds,
      enemyXP,
      xpBudget,
      xpSpent: enemyXP,
      multiplier: 1,
      adjustedXP: enemyXP,
      label,
    };
  }
  const multiplier = encounterMultiplier(count);
  const adjustedXP = Math.round(enemyXP * multiplier);
  let label = "Trivial";
  if (thresholds.deadly > 0 && adjustedXP >= thresholds.deadly * 1.5) label = "Over Deadly";
  else if (adjustedXP >= thresholds.deadly) label = "Deadly";
  else if (adjustedXP >= thresholds.hard) label = "Hard";
  else if (adjustedXP >= thresholds.medium) label = "Medium";
  else if (adjustedXP >= thresholds.easy) label = "Easy";
  return {
    ruleset,
    thresholds,
    enemyXP,
    xpBudget: 0,
    xpSpent: enemyXP,
    multiplier,
    adjustedXP,
    label,
  };
}

function thresholdsForLevels(levels: number[], ruleset: EncounterRuleset): DifficultyThresholds {
  return levels.reduce<DifficultyThresholds>(
    (total, level) => {
      if (ruleset === encounterRuleset2024) {
        const budget = xpBudgets2024ByLevel[level] ?? xpBudgets2024ByLevel[1];
        total.low += budget.low;
        total.moderate += budget.moderate;
        total.high += budget.high;
      } else {
        const threshold = xpThresholds2014ByLevel[level] ?? xpThresholds2014ByLevel[1];
        total.easy += threshold.easy;
        total.medium += threshold.medium;
        total.hard += threshold.hard;
        total.deadly += threshold.deadly;
      }
      return total;
    },
    { easy: 0, medium: 0, hard: 0, deadly: 0, low: 0, moderate: 0, high: 0 },
  );
}

function numericLevel(value: unknown) {
  return Math.max(1, Math.min(20, typeof value === "number" ? value : 1));
}

export function combatantXP(combatant: EncounterCombatant) {
  const creature = sheetRecord(combatant.snapshot?.creature ?? combatant.snapshot);
  return typeof creature.xp === "number" ? creature.xp : 0;
}

export function runCombatantXP(combatant: EncounterRunCombatant) {
  const creature = sheetRecord(combatant.snapshot?.creature ?? combatant.snapshot);
  return typeof creature.xp === "number" ? creature.xp : 0;
}

export function encounterMultiplier(count: number) {
  if (count <= 1) return count === 1 ? 1 : 0;
  if (count === 2) return 1.5;
  if (count <= 6) return 2;
  if (count <= 10) return 2.5;
  if (count <= 14) return 3;
  return 4;
}

export function hpPercent(combatant: EncounterRunCombatant) {
  return Math.max(
    0,
    Math.min(100, Math.round((combatant.currentHitPoints / effectiveMaxHP(combatant)) * 100)),
  );
}

export function hpBarColor(percent: number) {
  return `hsl(${Math.max(0, Math.min(120, Math.round(percent * 1.2)))} 70% 45%)`;
}

export function effectiveAC(combatant: EncounterRunCombatant) {
  return combatant.armorClassOverride > 0
    ? combatant.armorClassOverride
    : combatant.armorClass + combatant.armorClassBonus;
}

export function effectiveMaxHP(combatant: EncounterRunCombatant) {
  return combatant.maxHitPointsOverride > 0
    ? combatant.maxHitPointsOverride
    : Math.max(1, combatant.maxHitPoints + combatant.maxHitPointsModifier);
}

export function combatantSheet(combatant: {
  snapshot: Record<string, unknown>;
}): Record<string, unknown> {
  const source = (combatant.snapshot.player ??
    combatant.snapshot.creature ??
    combatant.snapshot) as Record<string, unknown>;
  const raw =
    ((source.characterSheet ??
      source.character_sheet ??
      source.statBlock ??
      source.stat_block ??
      source) as Record<string, unknown>) || {};
  return {
    ...raw,
    abilityScores: raw.abilityScores ?? raw.ability_scores,
    className: raw.className ?? raw.class_name,
    proficiencyBonus: raw.proficiencyBonus ?? raw.proficiency_bonus,
    savingThrowProficiencies: raw.savingThrowProficiencies ?? raw.saving_throw_proficiencies,
    skillBonuses: raw.skillBonuses ?? raw.skill_bonuses,
    walkSpeed: raw.walkSpeed ?? raw.walk_speed,
  };
}

export function sheetRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function abilityScoresFromSheet(sheet: Record<string, unknown>) {
  return sheetRecord(sheet.abilityScores);
}

export function speedFromSheet(sheet: Record<string, unknown>) {
  const speed = sheetRecord(sheet.speed);
  return Number(speed.walk) || Number(sheet.walkSpeed) || 30;
}

export function stringArrayFromSheet(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function proficiencyBonusFromCombatSheet(sheet: Record<string, unknown>) {
  const explicit = Number(sheet.proficiencyBonus);
  if (explicit > 0) return explicit;
  return Math.max(2, Math.ceil((Number(sheet.level) || 1) / 4) + 1);
}

export function defeatedEnemyXP(combatants: EncounterRunCombatant[]) {
  return combatants
    .filter(
      (combatant) =>
        combatant.side === "enemy" && (combatant.defeated || combatant.currentHitPoints <= 0),
    )
    .reduce((total, combatant) => {
      const source = (combatant.snapshot.creature ?? {}) as Record<string, unknown>;
      return total + (Number(source.xp) || 0);
    }, 0);
}

export function rotateCombatants(
  combatants: EncounterRunCombatant[],
  activeIndex: number,
): Array<EncounterRunCombatant & { originalIndex: number }> {
  if (combatants.length === 0) return [];
  return combatants
    .map((combatant, index) => ({ ...combatant, originalIndex: index }))
    .slice(activeIndex)
    .concat(
      combatants
        .map((combatant, index) => ({ ...combatant, originalIndex: index }))
        .slice(0, activeIndex),
    );
}

export function rotateCombatantsFromActive(
  combatants: EncounterRunCombatant[],
  activeID?: string,
): Array<EncounterRunCombatant & { originalIndex: number }> {
  if (combatants.length === 0) return [];
  return rotateCombatants(
    combatants,
    Math.max(
      0,
      combatants.findIndex((combatant) => combatant.id === activeID),
    ),
  );
}

export function isDownEnemy(combatant: EncounterRunCombatant) {
  return combatant.side === "enemy" && (combatant.defeated || combatant.currentHitPoints <= 0);
}

export function actionSummary(action: CreatureAction) {
  if (!action.rolls?.length) return "";
  return action.rolls
    .map(
      (roll) =>
        `${roll.diceCount}d${roll.dieSize}${roll.fixedValue ? (roll.fixedValue > 0 ? `+${roll.fixedValue}` : roll.fixedValue) : ""} ${roll.damageType}`,
    )
    .join(" + ");
}

export function rollModeLabel(mode: string) {
  if (mode === "advantage") return "Advantage";
  if (mode === "disadvantage") return "Disadvantage";
  return "Normal";
}

export function rollDiceDetail(result: Record<string, unknown>) {
  const rolls = Array.isArray(result.d20Rolls)
    ? result.d20Rolls.map((roll) => Number(roll)).filter(Boolean)
    : [];
  const chosen = Number(result.d20) || rolls[0] || 0;
  return rolls.length > 1 ? `d20s ${rolls.join(", ")} (kept ${chosen})` : `d20 ${chosen}`;
}
