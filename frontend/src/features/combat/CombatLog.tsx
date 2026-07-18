import { ScrollText } from "lucide-react";
import { useState } from "react";
import { SectionPanel } from "../../components/ui";
import type { CombatLogEvent, EncounterRunCombatant } from "../../types";
import { CombatLogDetails } from "./CombatLogDetails";
import { combatLogFilters, matchesCombatLogFilter, type CombatLogFilter } from "./combatLogFilters";

export function CombatLog({
  combatants,
  events,
  startedAt,
}: {
  combatants: EncounterRunCombatant[];
  events: CombatLogEvent[];
  startedAt: string;
}) {
  const [filter, setFilter] = useState<CombatLogFilter>("all");
  const visibleEvents = events
    .filter((event) => matchesCombatLogFilter(event, filter))
    .slice(0, 50);
  return (
    <SectionPanel
      title="Combat Log"
      icon={ScrollText}
      className="combat-panel combat-log-panel p-2 xl:p-3"
      bodyClassName="max-h-48 overflow-y-auto"
    >
      <div className="mb-2 flex gap-1 overflow-x-auto" aria-label="Combat log filters">
        {combatLogFilters.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={filter === option.id}
            className={[
              "shrink-0 rounded-md px-2 py-1 text-xs font-semibold",
              filter === option.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            ].join(" ")}
            onClick={() => setFilter(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {visibleEvents.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          {events.length === 0 ? "Combat events will appear here." : "No events match this filter."}
        </div>
      ) : (
        <ol className="grid gap-x-6 gap-y-1 md:grid-cols-2" aria-label="Recent combat events">
          {visibleEvents.map((event) => (
            <li
              key={event.id}
              className={[
                "grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] gap-2 border-l-2 px-2 py-1 text-xs",
                eventTone(event.eventType),
              ].join(" ")}
            >
              <time className="tabular-nums text-muted-foreground" dateTime={event.createdAt}>
                {elapsedLabel(startedAt, event.createdAt)}
              </time>
              <details className="min-w-0">
                <summary className="cursor-pointer list-none text-foreground marker:hidden">
                  {eventLabel(event, combatants)}
                </summary>
                <CombatLogDetails event={event} combatants={combatants} />
              </details>
            </li>
          ))}
        </ol>
      )}
    </SectionPanel>
  );
}

export function eventLabel(event: CombatLogEvent, combatants: EncounterRunCombatant[]) {
  const actor = combatantName(event.actorId, combatants);
  const target = combatantName(event.targetId, combatants);
  const payload = event.payload ?? {};
  const amount = numberValue(payload.amount ?? payload.finalDamage ?? payload.damage);
  const damageType = textValue(payload.damageType);

  switch (event.eventType) {
    case "combat_began":
      return "Combat started";
    case "turn_changed": {
      const after = recordValue(payload.after);
      const turnIndex = numberValue(after.turnIndex);
      const next = combatants[turnIndex];
      return next ? `${next.displayName}'s turn began` : "Turn advanced";
    }
    case "manual_hp": {
      const mode = textValue(payload.mode);
      if (mode === "healing") {
        return `${actor || "The DM"} healed ${target || "a combatant"} for ${amount}${resultingHP(payload)}`;
      }
      return `${actor || "The DM"} dealt ${amount}${damageType ? ` ${damageType}` : ""} damage to ${target || "a combatant"}${resultingHP(payload)}`;
    }
    case "damage_resolved":
      return `${target || "A combatant"} took ${amount} damage${resultingHP(payload)}`;
    case "resolution_applied": {
      const sourceName = textValue(payload.sourceName) || "Manual resolution";
      const results = Array.isArray(payload.results) ? payload.results : [];
      const targetNames = results
        .map((result) => textValue(recordValue(result).targetName))
        .filter(Boolean);
      return `${actor || "The DM"} resolved ${sourceName}${targetNames.length ? ` for ${targetNames.join(", ")}` : ""}`;
    }
    case "healing_blocked":
      return `Healing was blocked for ${target || "a combatant"}`;
    case "action_executed": {
      const action = recordValue(payload.action);
      const name = textValue(action.name) || "an action";
      return `${actor || "A combatant"} used ${name}${target ? ` against ${target}` : ""}`;
    }
    case "damage_cancelled":
      return `${actor || "A combatant"}'s damage to ${target || "a target"} was not applied`;
    case "check_rolled": {
      const label = textValue(payload.label) || "check";
      const total = numberValue(payload.total);
      return `${actor || "A combatant"} rolled ${label}: ${total}`;
    }
    case "spell_cast": {
      const spell = recordValue(payload.spell);
      return `${actor || "A combatant"} cast ${textValue(spell.name) || "a spell"}`;
    }
    case "spell_slot_manual":
      return `${actor || "A combatant"}'s spell slots were updated`;
    case "death_save_updated":
      return `${actor || target || "A combatant"}'s death saves were updated`;
    case "concentration_resolved":
      return `${actor || "A combatant"}'s concentration check was resolved`;
    case "combatant_edited":
      return `${target || "A combatant"} was updated`;
    case "combatants_added":
      return "Combatants were added to the encounter";
    case "undo":
      return "The last combat change was undone";
    default:
      return sentenceCase(event.eventType);
  }
}

function combatantName(id: string | undefined, combatants: EncounterRunCombatant[]) {
  if (!id) return "";
  return combatants.find((combatant) => combatant.id === id)?.displayName ?? "";
}

function resultingHP(payload: Record<string, unknown>) {
  const after = recordValue(payload.targetAfter);
  const hp = after.currentHitPoints;
  return typeof hp === "number" ? ` (${hp} HP remaining)` : "";
}

function elapsedLabel(startedAt: string, createdAt: string) {
  const start = Date.parse(startedAt);
  const created = Date.parse(createdAt);
  if (!Number.isFinite(start) || !Number.isFinite(created)) return "--:--";
  const elapsed = Math.max(0, Math.floor((created - start) / 1000));
  return `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
}

function eventTone(eventType: string) {
  if (eventType.includes("damage") || eventType.includes("defeat")) {
    return "border-destructive/70";
  }
  if (eventType.includes("heal") || eventType === "undo") return "border-success/70";
  if (eventType.includes("turn") || eventType === "combat_began") return "border-primary/70";
  return "border-border";
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function sentenceCase(value: string) {
  const label = value.replaceAll("_", " ").trim();
  return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : "Combat updated";
}
