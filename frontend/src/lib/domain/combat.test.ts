import { describe, expect, it } from "vitest";
import type { EncounterCombatant, EncounterRunCombatant, Player } from "../../types";
import {
  calculateEncounterDifficulty,
  combatantFrameColor,
  combatantSheet,
  effectiveAC,
  effectiveMaxHP,
  encounterMultiplier,
  hpBarTone,
  hpPercent,
  isDownEnemy,
  saveBonusFromSheet,
  skillBonusFromSheet,
  speedFromSheet,
} from "./combat";
import { createId } from "./ids";
import { encounterRuleset2024 } from "./encounterRulesets";

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
    updatedAt: "",
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
    updatedAt: "",
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
    ...overrides,
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

  it("uses 2024 budgets without monster-count multipliers", () => {
    const difficulty = calculateEncounterDifficulty(
      Array.from({ length: 5 }, () => player(4)),
      Array.from({ length: 5 }, () => enemy(300)),
      encounterRuleset2024,
    );

    expect(difficulty.thresholds.moderate).toBe(1875);
    expect(difficulty.xpBudget).toBe(1875);
    expect(difficulty.xpSpent).toBe(1500);
    expect(difficulty.adjustedXP).toBe(1500);
    expect(difficulty.multiplier).toBe(1);
    expect(difficulty.label).toBe("Moderate");
  });

  it("derives effective defenses and hp percentage", () => {
    expect(effectiveAC(runCombatant({ armorClass: 12, armorClassBonus: 2 }))).toBe(14);
    expect(effectiveAC(runCombatant({ armorClass: 12, armorClassOverride: 18 }))).toBe(18);
    expect(effectiveMaxHP(runCombatant({ maxHitPoints: 30, maxHitPointsModifier: 5 }))).toBe(35);
    expect(hpPercent(runCombatant({ maxHitPoints: 40, currentHitPoints: 20 }))).toBe(50);
    expect(hpBarTone(100)).toBe("bg-success");
    expect(hpBarTone(50)).toBe("bg-warning");
    expect(hpBarTone(25)).toBe("bg-destructive");
  });

  it("keeps custom and legacy frame colours visible across themes", () => {
    expect(combatantFrameColor(runCombatant({ colorLabel: "#7c3aed" }))).toBe("#7c3aed");
    expect(combatantFrameColor(runCombatant({ colorLabel: "primary" }))).toBe(
      "hsl(var(--primary))",
    );
    expect(combatantFrameColor(runCombatant({ colorLabel: "danger" }))).toBe(
      "hsl(var(--destructive))",
    );
    expect(combatantFrameColor(runCombatant({ colorLabel: "slate" }))).toBe(
      "hsl(var(--companion-metadata))",
    );
  });

  it("reads standard creature scores, explicit saves, skills, speed, and defenses", () => {
    const sheet = combatantSheet(
      runCombatant({
        snapshot: {
          creature: {
            challengeRating: "1",
            statBlock: {
              abilities: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
              abilitySaveProficiencies: { dex: 4 },
              skills: { perception: 3, stealth: 4 },
              speed: { walk: "40 ft." },
              defenses: { resistances: ["fire"] },
            },
          },
        },
      }),
    );
    expect(sheet.abilityScores).toMatchObject({ str: 12, dex: 15, int: 3 });
    expect(saveBonusFromSheet(sheet, "dex")).toBe(4);
    expect(saveBonusFromSheet(sheet, "int")).toBe(-4);
    expect(skillBonusFromSheet(sheet, "Perception", "wis")).toBe(3);
    expect(skillBonusFromSheet(sheet, "Stealth", "dex")).toBe(4);
    expect(speedFromSheet(sheet)).toBe(40);
    expect(sheet.damageResistances).toEqual(["fire"]);
  });

  it("derives custom creature proficiencies and expertise without changing explicit zeroes", () => {
    const sheet = combatantSheet(
      runCombatant({
        snapshot: {
          creature: {
            statBlock: {
              abilityScores: { str: 10, dex: 14, wis: 16 },
              proficiencyBonus: 3,
              savingThrowProficiencies: ["wis"],
              skillProficiencies: ["Stealth"],
              skillExpertise: ["Perception"],
              skillBonuses: { Athletics: 0 },
            },
          },
        },
      }),
    );
    expect(saveBonusFromSheet(sheet, "wis")).toBe(6);
    expect(skillBonusFromSheet(sheet, "Stealth", "dex")).toBe(5);
    expect(skillBonusFromSheet(sheet, "Perception", "wis")).toBe(9);
    expect(skillBonusFromSheet(sheet, "Athletics", "str")).toBe(0);
  });

  it("classifies downed enemies for target grouping", () => {
    expect(isDownEnemy(runCombatant({ side: "enemy", currentHitPoints: 0 }))).toBe(true);
    expect(isDownEnemy(runCombatant({ side: "player", currentHitPoints: 0 }))).toBe(false);
  });
});
