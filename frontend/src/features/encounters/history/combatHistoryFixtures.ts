import type { CombatLogEvent, EncounterRun, EncounterRunCombatant } from "../../../types";
import type { CombatReport } from "../../../lib/api/combatHistory";

export function historyCombatant(
  id: string,
  displayName: string,
  side: EncounterRunCombatant["side"] = "player",
): EncounterRunCombatant {
  return {
    id,
    displayName,
    side,
    encounterRunId: "run-1",
    sourceType: side === "player" ? "player" : "creature",
    colorLabel: "",
    avatarUrl: "",
    armorClass: 15,
    maxHitPoints: 20,
    currentHitPoints: 18,
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
  };
}

export function historyEvent(
  id: string,
  sequence: number,
  eventType: string,
  payload: Record<string, unknown> = {},
): CombatLogEvent {
  return {
    id,
    sequence,
    eventType,
    payload,
    encounterRunId: "run-1",
    actorId: "hero",
    targetId: "enemy",
    createdAt: `2026-10-15T12:${String(sequence).padStart(2, "0")}:00Z`,
  };
}

export function historyRun(): EncounterRun {
  const hero = { ...historyCombatant("hero", "Wrenn"), damageDealt: 18, healingDone: 2 };
  const enemy = { ...historyCombatant("enemy", "Goblin", "enemy"), damageTaken: 18 };
  return {
    id: "run-1",
    encounterId: "encounter-1",
    status: "ended",
    isTest: false,
    currentRound: 1,
    currentTurnIndex: 1,
    startedAt: "2026-10-15T12:00:00Z",
    endedAt: "2026-10-15T12:03:00Z",
    summary: {},
    combatants: [hero, enemy],
    timing: {
      combatStartedAt: "2026-10-15T12:00:00Z",
      combatFinishedAt: "2026-10-15T12:02:00Z",
      turnTimeMs: { hero: 90000, enemy: 30000 },
      turns: [
        {
          combatantId: "hero",
          round: 1,
          startedAt: "2026-10-15T12:00:00Z",
          endedAt: "2026-10-15T12:01:30Z",
          durationMs: 90000,
          completed: true,
        },
        {
          combatantId: "enemy",
          round: 1,
          startedAt: "2026-10-15T12:01:30Z",
          endedAt: "2026-10-15T12:02:00Z",
          durationMs: 30000,
          completed: true,
        },
      ],
    },
    events: [
      historyEvent("start", 0, "combat_began"),
      historyEvent("damage", 1, "manual_hp", { mode: "damage", amount: 18 }),
      historyEvent("heal", 2, "manual_hp", {
        mode: "healing",
        amount: 2,
        requestedAmount: 10,
        targetBefore: { currentHitPoints: 18 },
        targetAfter: { currentHitPoints: 20 },
      }),
    ],
  };
}

export function historyReport(): CombatReport {
  return { campaignId: "campaign-1", encounterName: "Bridge ambush", run: historyRun() };
}
