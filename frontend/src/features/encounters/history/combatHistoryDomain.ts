import type { CombatLogEvent, EncounterRun, EncounterRunCombatant } from "../../../types";
import { formatCombatDuration } from "../../combat/trackerPageHelpers";

export type ReportMetric = "damage" | "healing" | "time";
export type ReportSide = "party" | "enemy" | "all";
export const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;
export const duration = (ms: number | null | undefined) =>
  ms == null ? "Not recorded" : formatCombatDuration(ms / 1000);
export const partyMember = (person: EncounterRunCombatant) =>
  person.side === "player" || person.side === "friendly";
export const dateLabel = (timestamp: string) =>
  new Date(timestamp).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const outcomeLabel = (status: string) =>
  status === "ended" ? "Completed" : "Awaiting summary";

export function activeTime(run: EncounterRun) {
  return run.timing?.combatStartedAt
    ? Object.values(run.timing.turnTimeMs).reduce((a, b) => a + b, 0)
    : null;
}

export function metricValue(
  person: EncounterRunCombatant,
  metric: ReportMetric,
  run: EncounterRun,
): number | null {
  if (metric === "damage") return person.damageDealt;
  if (metric === "healing") return person.healingDone;
  return run.timing?.combatStartedAt ? (run.timing.turnTimeMs[person.id] ?? 0) : null;
}

export function completedTurns(person: EncounterRunCombatant, run: EncounterRun) {
  return (
    run.timing?.turns?.filter((turn) => turn.combatantId === person.id && turn.completed) ?? []
  );
}

export function averageTurn(person: EncounterRunCombatant, run: EncounterRun) {
  const turns = completedTurns(person, run);
  return turns.length
    ? turns.reduce((total, turn) => total + turn.durationMs, 0) / turns.length
    : null;
}

export function reportEvents(run: EncounterRun) {
  const events = [...(run.events ?? [])].sort((a, b) => a.sequence - b.sequence);
  const undone = new Set(
    events
      .filter((event) => event.eventType === "undo")
      .map((event) => String(event.payload.undoneEventId)),
  );
  const byId = new Map(events.map((event) => [event.id, event]));
  let round = 0;
  return events.map((event) => {
    if (event.eventType === "combat_began") round = 1;
    if (event.eventType === "turn_changed")
      round = number(record(event.payload.after).round) || round;
    if (event.eventType === "undo") {
      const original = byId.get(String(event.payload.undoneEventId));
      if (original?.eventType === "turn_changed")
        round = number(record(original.payload.before).round) || round;
    }
    return { event, round, undone: undone.has(event.id) };
  });
}

export function eventAmounts(event: CombatLogEvent) {
  const payload = event.payload;
  if (["manual_hp", "damage_resolved"].includes(event.eventType)) {
    const healing = payload.mode === "healing";
    const amount = number(payload.amount ?? payload.finalDamage ?? payload.damage);
    const before = record(payload.targetBefore).currentHitPoints;
    const after = record(payload.targetAfter).currentHitPoints;
    const effective =
      healing && typeof before === "number" && typeof after === "number"
        ? Math.max(0, after - before)
        : amount;
    return {
      damage: healing ? 0 : amount,
      healing: healing ? effective : 0,
      overheal: healing ? Math.max(0, number(payload.requestedAmount ?? amount) - effective) : 0,
    };
  }
  const results =
    event.eventType === "resolution_applied" && Array.isArray(payload.results)
      ? payload.results.map(record)
      : [];
  return results.reduce<{ damage: number; healing: number; overheal: number }>(
    (total, result) => ({
      damage: total.damage + number(result.finalDamage),
      healing: total.healing + number(result.healing),
      overheal:
        total.overheal +
        (result.healingBlocked
          ? 0
          : Math.max(
              0,
              number(result.healingRequested ?? result.healing) - number(result.healing),
            )),
    }),
    { damage: 0, healing: 0, overheal: 0 },
  );
}

export function overhealing(person: EncounterRunCombatant, run: EncounterRun) {
  return reportEvents(run)
    .filter(({ event, undone }) => !undone && event.actorId === person.id)
    .reduce((total, { event }) => total + eventAmounts(event).overheal, 0);
}

// Quote every cell and neutralize spreadsheet formulas in user-authored names.
export function reportCSV(run: EncounterRun, encounterName: string) {
  const quote = (value: string | number) =>
    `"${String(value)
      .replace(/^[\s=+\-@]/, "'$&")
      .replaceAll('"', '""')}"`;
  const rows: (string | number)[][] = [
    [
      "Encounter",
      "Combatant",
      "Side",
      "Damage done",
      "Damage taken",
      "Healing restored",
      "Turn seconds",
      "Completed turns",
      "Average turn seconds",
    ],
  ];
  for (const person of run.combatants ?? []) {
    const time = metricValue(person, "time", run);
    const average = averageTurn(person, run);
    rows.push([
      encounterName,
      person.displayName,
      person.side,
      person.damageDealt,
      person.damageTaken,
      person.healingDone,
      time == null ? "Not recorded" : time / 1000,
      run.timing?.turns ? completedTurns(person, run).length : "Not recorded",
      average == null ? "Not recorded" : average / 1000,
    ]);
  }
  return rows.map((row) => row.map(quote).join(",")).join("\r\n");
}

export function downloadReport(run: EncounterRun, name: string) {
  const url = URL.createObjectURL(
    new Blob([reportCSV(run, name)], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `combat-${run.id}.csv`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
