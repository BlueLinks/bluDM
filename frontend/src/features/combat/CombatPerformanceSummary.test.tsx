import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { EncounterRun, EncounterRunCombatant } from "../../types";
import { CombatPerformanceSummary } from "./CombatPerformanceSummary";

afterEach(cleanup);

describe("CombatPerformanceSummary", () => {
  it("freezes both timers while XP and loot are being assigned", () => {
    const run: EncounterRun = {
      id: "run",
      encounterId: "encounter",
      status: "active",
      isTest: false,
      currentRound: 1,
      currentTurnIndex: 0,
      startedAt: "2026-09-24T10:00:00Z",
      summary: {},
      combatants: [combatant("hero", "Hero", 0, 0)],
      timing: {
        combatStartedAt: "2026-09-24T10:00:00Z",
        combatFinishedAt: "2026-09-24T10:01:00Z",
        turnTimeMs: { hero: 60000 },
      },
    };
    render(<CombatPerformanceSummary run={run} />);
    expect(within(panel("Turn times")).getAllByText("1:00")).toHaveLength(2);
    expect(within(panel("Damage done")).getByText("No damage recorded.")).toBeTruthy();
    expect(within(panel("Healing done")).getByText("No healing recorded.")).toBeTruthy();
  });
  it("ranks only contributors in compact damage and healing meters", () => {
    const startedAt = "2026-09-24T10:00:00Z";
    const endedAt = "2026-09-24T10:02:00Z";
    const combatants = [
      combatant("wolf", "Wolf", 5, 0),
      combatant("hero", "Hero", 12, 8),
      combatant("spectator", "Spectator", 0, 0),
    ];
    const run: EncounterRun = {
      id: "run",
      encounterId: "encounter",
      status: "ended",
      isTest: false,
      currentRound: 1,
      currentTurnIndex: 1,
      startedAt,
      endedAt,
      summary: {},
      combatants,
      timing: {
        combatStartedAt: startedAt,
        turnTimeMs: { hero: 90000, wolf: 30000 },
      },
    };

    render(<CombatPerformanceSummary run={run} />);

    const damageMeters = within(panel("Damage done")).getAllByRole("meter");
    const healingMeters = within(panel("Healing done")).getAllByRole("meter");
    expect(damageMeters.map((meter) => meter.getAttribute("aria-label"))).toEqual([
      "Hero damage",
      "Wolf damage",
    ]);
    expect(damageMeters[0].getAttribute("aria-valuenow")).toBe("12");
    expect(damageMeters[1].getAttribute("aria-valuenow")).toBe("5");
    expect(damageMeters[1].querySelector('[aria-hidden="true"]')?.getAttribute("style")).toBe(
      "width: 41.66666666666667%;",
    );
    expect(healingMeters.map((meter) => meter.getAttribute("aria-label"))).toEqual([
      "Hero healing",
    ]);
    expect(within(panel("Turn times")).getByText("2:00")).toBeTruthy();
    expect(within(panel("Turn times")).getByText("1:30")).toBeTruthy();
    expect(within(panel("Turn times")).getByText("0:30")).toBeTruthy();
    expect(within(panel("Turn times")).getByText("0:00")).toBeTruthy();
  });
});

function panel(title: string) {
  const section = screen.getByRole("heading", { name: title }).closest("section");
  if (!section) throw new Error(`${title} panel was not rendered`);
  return section;
}

function combatant(
  id: string,
  displayName: string,
  damageDealt: number,
  healingDone: number,
): EncounterRunCombatant {
  return {
    id,
    displayName,
    damageDealt,
    healingDone,
    encounterRunId: "run",
    sourceType: "creature",
    side: "enemy",
    colorLabel: "",
    avatarUrl: "",
    armorClass: 12,
    maxHitPoints: 20,
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
    damageTaken: 0,
    healingReceived: 0,
    kills: 0,
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    stable: false,
    snapshot: {},
  };
}
