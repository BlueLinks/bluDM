import { describe, expect, it } from "vitest";
import type { EncounterRunCombatant } from "../../types";
import {
  blankResolutionTarget,
  isSaveTargetResolved,
  outcomeDamageMultiplier,
  parseDamageFormula,
  previewResolutionTarget,
  rollDamageComponent,
  rollSavingThrow,
  saveModifier,
} from "./resolutionModel";

describe("combat resolution model", () => {
  it("rolls normal, advantage, and disadvantage saves with proficiency", () => {
    const combatant = fixture({
      snapshot: {
        creature: {
          statBlock: {
            proficiencyBonus: 2,
            abilityScores: { dex: 16 },
            savingThrowProficiencies: ["dex"],
          },
        },
      },
    });
    expect(saveModifier(combatant, "dex")).toBe(5);
    expect(rollSavingThrow(combatant, "dex", "normal", () => 8)).toMatchObject({ total: 13 });
    const advantageDice = [4, 17];
    expect(
      rollSavingThrow(combatant, "dex", "advantage", () => advantageDice.shift() ?? 1),
    ).toMatchObject({ d20Rolls: [4, 17], total: 22 });
    const disadvantageDice = [14, 3];
    expect(
      rollSavingThrow(combatant, "dex", "disadvantage", () => disadvantageDice.shift() ?? 1),
    ).toMatchObject({ d20Rolls: [14, 3], total: 8 });
  });

  it("applies mitigation per damage component", () => {
    const combatant = fixture({
      snapshot: {
        creature: {
          statBlock: {
            damageResistances: ["fire"],
            damageImmunities: ["poison"],
            damageVulnerabilities: ["cold"],
          },
        },
      },
    });
    const target = blankResolutionTarget(combatant.id);
    target.damageComponents = [
      component("fire", 10),
      component("poison", 7),
      component("cold", 4),
      component("slashing", 3),
    ];
    const preview = previewResolutionTarget(combatant, target);
    expect(preview.rawDamage).toBe(24);
    expect(preview.finalDamage).toBe(16);
    expect(preview.components.map((item) => item.finalAmount)).toEqual([5, 0, 8, 3]);
  });

  it("can explicitly bypass mitigation for one component", () => {
    const combatant = fixture({
      snapshot: { creature: { statBlock: { damageResistances: ["fire"] } } },
    });
    const target = blankResolutionTarget(combatant.id);
    target.damageComponents = [
      { ...component("fire", 10), mitigation: "apply" },
      { ...component("fire", 6), mitigation: "ignore" },
    ];
    const preview = previewResolutionTarget(combatant, target);
    expect(preview.finalDamage).toBe(11);
    expect(preview.components.map((item) => item.defense)).toEqual(["resistant", "ignored"]);
  });

  it("parses flat and dice formulas and rolls critical dice without doubling modifiers", () => {
    expect(parseDamageFormula("2d6 + 3")).toEqual({ diceCount: 2, dieSize: 6, modifier: 3 });
    expect(parseDamageFormula("7")).toEqual({ diceCount: 0, dieSize: 0, modifier: 7 });
    expect(parseDamageFormula("not dice")).toBeNull();

    const dice = [3, 5];
    const rolled = rollDamageComponent(
      { ...component("slashing", 0), formula: "1d8 + 4" },
      true,
      () => dice.shift() ?? 1,
    );
    expect(rolled).toMatchObject({
      rolledValue: 3,
      criticalRolledValue: 5,
      modifier: 4,
      amount: 12,
      manualOverride: false,
    });
  });

  it("supports components whose dice are not doubled on a critical", () => {
    const rolled = rollDamageComponent(
      {
        ...component("poison", 0),
        formula: "1d4 + 2",
        criticalBehavior: "normal",
      },
      true,
      () => 4,
    );
    expect(rolled).toMatchObject({ rolledValue: 4, criticalRolledValue: 0, amount: 6 });
  });

  it("absorbs damage with temporary HP before normal HP", () => {
    const combatant = fixture({ currentHitPoints: 20, temporaryHitPoints: 6 });
    const target = blankResolutionTarget(combatant.id);
    target.damageComponents = [component("force", 9)];
    const preview = previewResolutionTarget(combatant, target);
    expect(preview.projectedTemporaryHitPoints).toBe(0);
    expect(preview.projectedHitPoints).toBe(17);
  });

  it("does not restore temporary HP with healing and does not stack lower temporary HP", () => {
    const combatant = fixture({ currentHitPoints: 10, temporaryHitPoints: 8 });
    const target = blankResolutionTarget(combatant.id);
    target.healing = 5;
    target.temporaryHitPoints = 4;
    expect(previewResolutionTarget(combatant, target)).toMatchObject({
      projectedHitPoints: 15,
      projectedTemporaryHitPoints: 8,
    });
    target.temporaryHitPoints = 12;
    expect(previewResolutionTarget(combatant, target).projectedTemporaryHitPoints).toBe(12);
    target.temporaryHitPoints = 3;
    target.temporaryHitPointsMode = "replace";
    expect(previewResolutionTarget(combatant, target).projectedTemporaryHitPoints).toBe(3);
  });

  it("maps successful saves to half, none, or full damage", () => {
    expect(outcomeDamageMultiplier("pending", "half")).toBe(0);
    expect(outcomeDamageMultiplier("success", "half")).toBe(0.5);
    expect(outcomeDamageMultiplier("success", "none")).toBe(0);
    expect(outcomeDamageMultiplier("success", "full")).toBe(1);
    expect(outcomeDamageMultiplier("failure", "half")).toBe(1);
  });

  it("requires complete dice or a manual outcome before resolving a save", () => {
    const target = blankResolutionTarget("target");
    target.outcome = "success";
    target.rollSource = "outcome";
    expect(isSaveTargetResolved(target)).toBe(true);

    target.rollSource = "physical";
    target.rollMode = "advantage";
    target.d20Rolls = [14];
    expect(isSaveTargetResolved(target)).toBe(false);
    target.d20Rolls = [14, 6];
    expect(isSaveTargetResolved(target)).toBe(true);

    target.outcome = "pending";
    expect(isSaveTargetResolved(target)).toBe(false);
  });

  it("previews direct HP changes and defeated or recovered state", () => {
    const combatant = fixture({ currentHitPoints: 12 });
    const target = blankResolutionTarget(combatant.id);
    target.directHitPoints = 0;
    expect(previewResolutionTarget(combatant, target)).toMatchObject({
      projectedHitPoints: 0,
      defeated: true,
    });
    target.directHitPoints = 7;
    expect(previewResolutionTarget(combatant, target)).toMatchObject({
      projectedHitPoints: 7,
      defeated: false,
    });
  });
});

function component(damageType: string, amount: number) {
  return { id: damageType, source: "test", formula: "", amount, damageType };
}

function fixture(overrides: Partial<EncounterRunCombatant> = {}): EncounterRunCombatant {
  return {
    id: "target-1",
    encounterRunId: "run-1",
    sourceType: "creature",
    side: "enemy",
    displayName: "Target",
    colorLabel: "",
    avatarUrl: "",
    armorClass: 12,
    maxHitPoints: 30,
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
