import { useEffect, useState, type MouseEvent } from "react";
import type { EncounterRun, EncounterRunCombatant, RollMode } from "../../types";
import type { HpMultiplier } from "./CombatContextPanel";

export function combatStartTimestamp(run: EncounterRun | null) {
  return (
    run?.events?.find((event) => event.eventType === "combat_began")?.createdAt ??
    run?.startedAt ??
    ""
  );
}

export function useCombatElapsed(startedAt: string) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timestamp = Date.parse(startedAt);
    if (!Number.isFinite(timestamp)) return;
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - timestamp) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  return elapsed;
}

export function combatTrackerBreadcrumbs(encounterName?: string) {
  return [
    { label: "Campaigns", to: "/campaigns" },
    { label: encounterName || "Encounter" },
    { label: "Combat" },
  ];
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
