import { describe, expect, it } from "vitest";
import type { EncounterCombatant, EncounterRunCombatant, Player } from "../../types";
import { calculateEncounterDifficulty, effectiveAC, effectiveMaxHP, encounterMultiplier, hpBarColor, hpPercent, isDownEnemy } from "./combat";
import { createId } from "./ids";

function player(level: number): Player {
  return {
    id: createId("player"),
    campaignId: "campaign",
    characterName: "Test Hero",
    playerName: "Tester",
    avatarUrl: "",
    armorClass: 14,
    maxHitPoints: 20,
    currentHitPoints: 20,
    temporaryHitPoints: 0,
    temporaryMaxHitPoints: 0,
    experiencePoints: 0,
    characterSheet: { level },
    createdAt: "",
    updatedAt: ""
  };
}

function enemy(xp: number): EncounterCombatant {
  return {
    id: createId("enemy"),
    encounterId: "encounter",
    sourceType: "creature",
    creatureId: "creature",
    side: "enemy",
    displayName: "Enemy",
    colorLabel: "",
    avatarUrl: "",
    armorClass: 12,
    maxHitPoints: 10,
    currentHitPoints: 10,
    rolledHp: false,
    sortOrder: 0,
    snapshot: { creature: { xp } },
    createdAt: "",
    updatedAt: ""
  };
}

function runCombatant(overrides: Partial<EncounterRunCombatant> = {}): EncounterRunCombatant {
  return {
    id: createId("combatant"),
    encounterRunId: "run",
    sourceType: "creature",
    side: "enemy",
    displayName: "Enemy",
    colorLabel: "",
    avatarUrl: "",
    armorClass: 13,
    maxHitPoints: 40,
    currentHitPoints: 20,
    temporaryHitPoints: 0,
    maxHitPointsModifier: 0,
    armorClassBonus: 0,
    armorClassOverride: 0,
    maxHitPointsOverride: 0,
    currentHitPointsOverride: 0,
    initiative: 10,
    initiativeSet: true,
    sortOrder: 0,
    defeated: false,
    conditions: [],
    damageDealt: 0,
    damageTaken: 0,
    healingDone: 0,
    healingReceived: 0,
    kills: 0,
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    stable: false,
    snapshot: {},
    ...overrides
  };
}

describe("combat domain helpers", () => {
  it("uses DMG encounter multipliers", () => {
    expect(encounterMultiplier(0)).toBe(0);
    expect(encounterMultiplier(1)).toBe(1);
    expect(encounterMultiplier(2)).toBe(1.5);
    expect(encounterMultiplier(7)).toBe(2.5);
    expect(encounterMultiplier(15)).toBe(4);
  });

  it("calculates encounter difficulty from player thresholds and enemy xp", () => {
    expect(calculateEncounterDifficulty([player(1)], [enemy(50)]).label).toBe("Medium");
    expect(calculateEncounterDifficulty([player(1)], [enemy(200)]).label).toBe("Over Deadly");
  });

  it("derives effective defenses and hp percentage", () => {
    expect(effectiveAC(runCombatant({ armorClass: 12, armorClassBonus: 2 }))).toBe(14);
    expect(effectiveAC(runCombatant({ armorClass: 12, armorClassOverride: 18 }))).toBe(18);
    expect(effectiveMaxHP(runCombatant({ maxHitPoints: 30, maxHitPointsModifier: 5 }))).toBe(35);
    expect(hpPercent(runCombatant({ maxHitPoints: 40, currentHitPoints: 20 }))).toBe(50);
    expect(hpBarColor(50)).toBe("hsl(60 70% 45%)");
  });

  it("classifies downed enemies for target grouping", () => {
    expect(isDownEnemy(runCombatant({ side: "enemy", currentHitPoints: 0 }))).toBe(true);
    expect(isDownEnemy(runCombatant({ side: "player", currentHitPoints: 0 }))).toBe(false);
  });
});
