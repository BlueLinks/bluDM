import { useCallback, useEffect, useState, type MouseEvent } from "react";
import type { NavigateFunction } from "react-router-dom";
import type { Encounter, EncounterRun, EncounterRunCombatant, RollMode } from "../../types";
import { api } from "../../lib/api";
import type { HpMultiplier } from "./CombatContextPanel";

export function combatStartTimestamp(run: EncounterRun | null) {
  return (
    run?.timing?.combatStartedAt ??
    run?.events?.find((event) => event.eventType === "combat_began")?.createdAt ??
    run?.startedAt ??
    ""
  );
}

export function useCombatElapsed(startedAt: string, endedAt?: string) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timestamp = Date.parse(startedAt);
    if (!Number.isFinite(timestamp)) {
      setElapsed(0);
      return;
    }
    const finish = endedAt ? Date.parse(endedAt) : NaN;
    const update = () =>
      setElapsed(
        Math.max(
          0,
          Math.floor(((Number.isFinite(finish) ? finish : Date.now()) - timestamp) / 1000),
        ),
      );
    update();
    if (Number.isFinite(finish)) return;
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt, endedAt]);

  return elapsed;
}

export function useRunTimers(run: EncounterRun | null) {
  const combatStartedAt = combatStartTimestamp(run);
  const fallbackElapsed = useCombatElapsed(run?.timing ? "" : combatStartedAt);
  const turnElapsed = useCombatElapsed(run?.timing?.currentTurnStartedAt ?? "");
  const elapsed = run?.timing ? completedTurnSeconds(run) + turnElapsed : fallbackElapsed;
  return { combatStartedAt, elapsed, turnElapsed };
}

export function completedTurnSeconds(run: EncounterRun) {
  return Object.values(run.timing?.turnTimeMs ?? {}).reduce((total, ms) => total + ms, 0) / 1000;
}

export async function loadTrackerRun(runID: string) {
  const payload = await api.encounterRun(runID);
  return payload.run.status === "active" && payload.run.timing?.combatFinishedAt
    ? (await api.resumeCombat(runID)).run
    : payload.run;
}

export function useCombatRunLoader(runID: string | undefined, navigate: NavigateFunction) {
  const [run, setRun] = useState<EncounterRun | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!runID) return;
    try {
      const loadedRun = await loadTrackerRun(runID);
      setRun(loadedRun);
      void api
        .encounter(loadedRun.encounterId)
        .then((payload) => setEncounter(payload.encounter))
        .catch(() => setEncounter(null));
      if (loadedRun.status === "setup") void navigate(`/encounter-runs/${runID}/initiative`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load combat tracker");
    }
  }, [navigate, runID]);
  useEffect(() => void load(), [load]);
  useEncounterRunRefresh(runID, load);
  return { run, setRun, encounter, error, setError };
}

export function formatCombatDuration(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const remainder = String(whole % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}`
    : `${minutes}:${remainder}`;
}

export function useEncounterRunRefresh(
  runId: string | undefined,
  refresh: () => void | Promise<void>,
) {
  useEffect(() => {
    const refreshRun = (event: Event) => {
      const detail = (event as CustomEvent<{ runId?: string }>).detail;
      if (detail?.runId === runId) void refresh();
    };
    window.addEventListener("bludm:encounter-run-updated", refreshRun);
    return () => window.removeEventListener("bludm:encounter-run-updated", refreshRun);
  }, [refresh, runId]);
}

export function combatTrackerBreadcrumbs(encounterName?: string) {
  return [{ label: "Encounter Runs", to: "/campaigns" }, { label: encounterName || "Encounter" }];
}

export function hasLivingEnemies(combatants: EncounterRunCombatant[]) {
  return combatants.some(
    (combatant) =>
      combatant.side === "enemy" && combatant.currentHitPoints > 0 && !combatant.defeated,
  );
}

export function needsDeathSaves(combatant: EncounterRunCombatant | undefined) {
  return Boolean(
    combatant &&
    combatant.sourceType === "player" &&
    combatant.currentHitPoints <= 0 &&
    !combatant.stable,
  );
}

export function rollModeFromEvent(event?: MouseEvent): RollMode {
  if (event?.shiftKey) return "advantage";
  if (event?.ctrlKey) return "disadvantage";
  return "normal";
}

export function stringFromResult(value: unknown, key: string) {
  if (!value || typeof value !== "object") return "";
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" ? candidate : "";
}

export function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function hpAdjustmentAmount(value: string, multiplier: HpMultiplier) {
  const amount = Math.max(0, Number(value) || 0);
  if (multiplier === "half") return Math.floor(amount / 2);
  if (multiplier === "double") return amount * 2;
  return amount;
}

export function spellLevelLabel(level: number) {
  if (level === 1) return "1st-level";
  if (level === 2) return "2nd-level";
  if (level === 3) return "3rd-level";
  return `${level}th-level`;
}
