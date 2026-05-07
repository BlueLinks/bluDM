import type { CreatureAction, EncounterCombatant, EncounterRunCombatant, Player } from "../../types";

const xpThresholdsByLevel: Record<number, { easy: number; medium: number; hard: number; deadly: number }> = {
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
  20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 }
};

export function rollHitDiceClient(hitDice: string, fallback: number) {
  const match = hitDice.trim().toLowerCase().match(/^(\d+)d(\d+)\s*([+-]\s*\d+)?$/);
  if (!match) return fallback;
  const count = Number(match[1]);
  const die = Number(match[2]);
  const modifier = match[3] ? Number(match[3].replace(/\s/g, "")) : 0;
  if (!count || !die) return fallback;
  let total = modifier;
  for (let index = 0; index < count; index++) total += Math.floor(Math.random() * die) + 1;
  return Math.max(1, total);
}

export function calculateEncounterDifficulty(players: Player[], enemies: EncounterCombatant[]) {
  const thresholds = players.reduce((total, player) => {
    const sheetLevel = typeof player.characterSheet.level === "number" ? player.characterSheet.level : 1;
    const threshold = xpThresholdsByLevel[Math.max(1, Math.min(20, sheetLevel))] ?? xpThresholdsByLevel[1];
    return { easy: total.easy + threshold.easy, medium: total.medium + threshold.medium, hard: total.hard + threshold.hard, deadly: total.deadly + threshold.deadly };
  }, { easy: 0, medium: 0, hard: 0, deadly: 0 });
  return difficultyFromXP(thresholds, enemies.reduce((total, enemy) => total + combatantXP(enemy), 0), enemies.length);
}

export function calculateRunEncounterDifficulty(combatants: EncounterRunCombatant[]) {
  const players = combatants.filter((combatant) => combatant.sourceType === "player");
  const enemies = combatants.filter((combatant) => combatant.side === "enemy");
  const thresholds = players.reduce((total, player) => {
    const sheet = combatantSheet(player);
    const sheetLevel = typeof sheet.level === "number" ? sheet.level : 1;
    const threshold = xpThresholdsByLevel[Math.max(1, Math.min(20, sheetLevel))] ?? xpThresholdsByLevel[1];
    return { easy: total.easy + threshold.easy, medium: total.medium + threshold.medium, hard: total.hard + threshold.hard, deadly: total.deadly + threshold.deadly };
  }, { easy: 0, medium: 0, hard: 0, deadly: 0 });
  return difficultyFromXP(thresholds, enemies.reduce((total, enemy) => total + runCombatantXP(enemy), 0), enemies.length);
}

function difficultyFromXP(thresholds: { easy: number; medium: number; hard: number; deadly: number }, enemyXP: number, count: number) {
  const multiplier = encounterMultiplier(count);
  const adjustedXP = Math.round(enemyXP * multiplier);
  let label = "Trivial";
  if (thresholds.deadly > 0 && adjustedXP >= thresholds.deadly * 1.5) label = "Over Deadly";
  else if (adjustedXP >= thresholds.deadly) label = "Deadly";
  else if (adjustedXP >= thresholds.hard) label = "Hard";
  else if (adjustedXP >= thresholds.medium) label = "Medium";
  else if (adjustedXP >= thresholds.easy) label = "Easy";
  return { thresholds, enemyXP, multiplier, adjustedXP, label };
}

export function combatantXP(combatant: EncounterCombatant) {
  const creature = combatant.snapshot?.creature;
  return creature && typeof creature === "object" && "xp" in creature && typeof creature.xp === "number" ? creature.xp : 0;
}

export function runCombatantXP(combatant: EncounterRunCombatant) {
  const creature = combatant.snapshot?.creature;
  return creature && typeof creature === "object" && "xp" in creature && typeof creature.xp === "number" ? creature.xp : 0;
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
  return Math.max(0, Math.min(100, Math.round((combatant.currentHitPoints / effectiveMaxHP(combatant)) * 100)));
}

export function hpBarColor(percent: number) {
  return `hsl(${Math.max(0, Math.min(120, Math.round(percent * 1.2)))} 70% 45%)`;
}

export function effectiveAC(combatant: EncounterRunCombatant) {
  return combatant.armorClassOverride > 0 ? combatant.armorClassOverride : combatant.armorClass + combatant.armorClassBonus;
}

export function effectiveMaxHP(combatant: EncounterRunCombatant) {
  return combatant.maxHitPointsOverride > 0 ? combatant.maxHitPointsOverride : Math.max(1, combatant.maxHitPoints + combatant.maxHitPointsModifier);
}

export function combatantSheet(combatant: EncounterRunCombatant) {
  const source = (combatant.snapshot.player ?? combatant.snapshot.creature ?? combatant.snapshot) as Record<string, unknown>;
  return ((source.characterSheet ?? source.statBlock ?? source) as Record<string, unknown>) || {};
}

export function sheetRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export function abilityScoresFromSheet(sheet: Record<string, unknown>) {
  return sheetRecord(sheet.abilityScores);
}

export function speedFromSheet(sheet: Record<string, unknown>) {
  const speed = sheetRecord(sheet.speed);
  return Number(speed.walk) || Number(sheet.walkSpeed) || 30;
}

export function stringArrayFromSheet(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function proficiencyBonusFromCombatSheet(sheet: Record<string, unknown>) {
  const explicit = Number(sheet.proficiencyBonus);
  if (explicit > 0) return explicit;
  return Math.max(2, Math.ceil((Number(sheet.level) || 1) / 4) + 1);
}

export function defeatedEnemyXP(combatants: EncounterRunCombatant[]) {
  return combatants.filter((combatant) => combatant.side === "enemy" && (combatant.defeated || combatant.currentHitPoints <= 0)).reduce((total, combatant) => {
    const source = (combatant.snapshot.creature ?? {}) as Record<string, unknown>;
    return total + (Number(source.xp) || 0);
  }, 0);
}

export function rotateCombatants(combatants: EncounterRunCombatant[], activeIndex: number): Array<EncounterRunCombatant & { originalIndex: number }> {
  if (combatants.length === 0) return [];
  return combatants.map((combatant, index) => ({ ...combatant, originalIndex: index })).slice(activeIndex).concat(
    combatants.map((combatant, index) => ({ ...combatant, originalIndex: index })).slice(0, activeIndex)
  );
}

export function rotateCombatantsFromActive(combatants: EncounterRunCombatant[], activeID?: string): Array<EncounterRunCombatant & { originalIndex: number }> {
  if (combatants.length === 0) return [];
  return rotateCombatants(combatants, Math.max(0, combatants.findIndex((combatant) => combatant.id === activeID)));
}

export function isDownEnemy(combatant: EncounterRunCombatant) {
  return combatant.side === "enemy" && (combatant.defeated || combatant.currentHitPoints <= 0);
}

export function actionSummary(action: CreatureAction) {
  if (!action.rolls?.length) return "";
  return action.rolls.map((roll) => `${roll.diceCount}d${roll.dieSize}${roll.fixedValue ? roll.fixedValue > 0 ? `+${roll.fixedValue}` : roll.fixedValue : ""} ${roll.damageType}`).join(" + ");
}

export function rollModeLabel(mode: string) {
  if (mode === "advantage") return "Advantage";
  if (mode === "disadvantage") return "Disadvantage";
  return "Normal";
}

export function rollDiceDetail(result: Record<string, unknown>) {
  const rolls = Array.isArray(result.d20Rolls) ? result.d20Rolls.map((roll) => Number(roll)).filter(Boolean) : [];
  const chosen = Number(result.d20) || rolls[0] || 0;
  return rolls.length > 1 ? `d20s ${rolls.join(", ")} (kept ${chosen})` : `d20 ${chosen}`;
}
