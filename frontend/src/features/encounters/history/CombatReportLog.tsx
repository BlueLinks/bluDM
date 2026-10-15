import { useState } from "react";
import { ActionRow } from "../../../components/layout";
import { Badge, Button, Select } from "../../../components/ui";
import type { EncounterRun } from "../../../types";
import { eventLabel } from "../../combat/CombatLog";
import { CombatLogDetails } from "../../combat/CombatLogDetails";
import { matchesCombatLogFilter } from "../../combat/combatLogFilters";
import { duration, eventAmounts, reportEvents } from "./combatHistoryDomain";

export function CombatReportLog({
  run,
  initialRound,
}: {
  run: EncounterRun;
  initialRound: number | null;
}) {
  const [round, setRound] = useState(initialRound === null ? "all" : String(initialRound));
  const [kind, setKind] = useState<"all" | "damage" | "healing">("all");
  const events = reportEvents(run);
  const rounds = [...new Set(events.map((entry) => entry.round))].sort((a, b) => a - b);
  const visible = events.filter(
    (entry) =>
      (round === "all" || entry.round === Number(round)) &&
      matchesCombatLogFilter(entry.event, kind),
  );
  return (
    <div className="grid min-w-0 gap-4">
      <div>
        <h3 className="text-lg font-semibold">Round log</h3>
        <p className="text-sm text-muted-foreground">
          Applied results, manual entries, and corrections from the complete combat log.
        </p>
      </div>
      <ActionRow>
        <div role="group" aria-label="Filter round" className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={round === "all" ? "primary" : "ghost"}
            aria-pressed={round === "all"}
            onClick={() => setRound("all")}
          >
            All rounds
          </Button>
          {rounds.map((value) => (
            <Button
              key={value}
              size="sm"
              variant={round === String(value) ? "primary" : "ghost"}
              aria-pressed={round === String(value)}
              onClick={() => setRound(String(value))}
            >
              {value === 0 ? "Preparation" : `Round ${value}`}
            </Button>
          ))}
        </div>
        <Select
          ariaLabel="Event type"
          placeholder="Event type"
          value={kind}
          onValueChange={(value) =>
            setKind(value === "damage" || value === "healing" ? value : "all")
          }
          options={[
            { value: "all", label: "All events" },
            { value: "damage", label: "Damage only" },
            { value: "healing", label: "Healing only" },
          ]}
        />
      </ActionRow>
      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground">No events match these filters.</p>
      )}
      {rounds
        .filter((value) => visible.some((entry) => entry.round === value))
        .map((value) => (
          <details
            key={`${value}-${round}-${kind}`}
            open={round !== "all" || value === (visible[0]?.round ?? 0)}
            className="history-round"
          >
            <summary>
              {value === 0 ? "Preparation" : `Round ${value}`}
              <span>
                {duration(
                  run.timing?.turns
                    ?.filter((turn) => turn.round === value)
                    .reduce((total, turn) => total + turn.durationMs, 0),
                )}{" "}
                active
              </span>
            </summary>
            <ol className="history-events">
              {visible
                .filter((entry) => entry.round === value)
                .map(({ event, undone }) => {
                  const amounts = eventAmounts(event);
                  return (
                    <li key={event.id} className={undone ? "history-event-undone" : ""}>
                      <time dateTime={event.createdAt}>
                        {new Date(event.createdAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </time>
                      <details>
                        <summary>
                          {eventLabel(event, run.combatants ?? [])}
                          {undone && <Badge tone="metadata">Undone · excluded</Badge>}
                        </summary>
                        <CombatLogDetails event={event} combatants={run.combatants ?? []} />
                        <p className="mt-2 text-xs text-muted-foreground">
                          {event.eventType === "manual_hp"
                            ? "Manual entry"
                            : "Recorded combat event"}
                          {event.actorId
                            ? ` · ${run.combatants?.find((person) => person.id === event.actorId)?.displayName ?? "Unknown source"}`
                            : " · No source attributed"}
                          {amounts.overheal > 0 && ` · ${amounts.overheal} HP overheal`}
                        </p>
                      </details>
                      <span className="tabular-nums">
                        {amounts.damage > 0 && `${amounts.damage} damage`}
                        {amounts.damage > 0 && amounts.healing > 0 && " · "}
                        {amounts.healing > 0 && `+${amounts.healing} HP`}
                      </span>
                    </li>
                  );
                })}
            </ol>
          </details>
        ))}
      <p className="text-xs text-muted-foreground">
        Timestamps are the recorded local time. Undone entries remain visible and do not contribute
        to totals.
      </p>
    </div>
  );
}
