import type { CombatLogEvent } from "../../types";

export type CombatLogFilter =
  | "all"
  | "rolls"
  | "damage"
  | "healing"
  | "conditions"
  | "turns"
  | "notes";

export const combatLogFilters: { id: CombatLogFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "rolls", label: "Rolls" },
  { id: "damage", label: "Damage" },
  { id: "healing", label: "Healing" },
  { id: "conditions", label: "Conditions" },
  { id: "turns", label: "Turns" },
  { id: "notes", label: "Notes" },
];

export function matchesCombatLogFilter(event: CombatLogEvent, filter: CombatLogFilter) {
  if (filter === "all") return true;
  const type = event.eventType;
  const payload = event.payload ?? {};
  const results = Array.isArray(payload.results) ? payload.results : [];
  if (filter === "rolls") {
    return type.includes("rolled") || type.includes("action") || type === "resolution_applied";
  }
  if (filter === "damage") {
    return (
      type.includes("damage") || results.some((result) => numberField(result, "finalDamage") > 0)
    );
  }
  if (filter === "healing") {
    return type.includes("heal") || results.some((result) => numberField(result, "healing") > 0);
  }
  if (filter === "conditions") {
    return (
      type.includes("condition") ||
      results.some((result) => arrayField(result, "conditions").length > 0)
    );
  }
  if (filter === "turns") return type === "combat_began" || type === "turn_changed";
  return (
    type.includes("note") || (typeof payload.notes === "string" && payload.notes.trim() !== "")
  );
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numberField(value: unknown, key: string) {
  return Number(record(value)[key]) || 0;
}

function arrayField(value: unknown, key: string) {
  const field = record(value)[key];
  return Array.isArray(field) ? field.map((item: unknown) => item) : [];
}
