import { Clock, HeartPulse, Swords, Users } from "lucide-react";
import { ActionRow, ResponsiveGrid } from "../../../components/layout";
import { InitialsAvatar } from "../../../components/shared/displayPrimitives";
import { Button, SectionPanel } from "../../../components/ui";
import type { EncounterRun } from "../../../types";
import { RankedMeter } from "../../combat/CombatPerformanceSummary";
import { runCombatantAvatarSrc } from "../../combat/domain";
import {
  averageTurn,
  completedTurns,
  duration,
  metricValue,
  overhealing,
  partyMember,
  type ReportMetric,
  type ReportSide,
} from "./combatHistoryDomain";

export function CombatReportMetrics({
  run,
  metric,
  side,
  onMetric,
  onSide,
  onRound,
}: {
  run: EncounterRun;
  metric: ReportMetric;
  side: ReportSide;
  onMetric: (value: ReportMetric) => void;
  onSide: (value: ReportSide) => void;
  onRound: (round: number) => void;
}) {
  const people = (run.combatants ?? []).filter(
    (person) =>
      side === "all" || (side === "party" ? partyMember(person) : person.side === "enemy"),
  );
  const ranked = [...people].sort(
    (a, b) => (metricValue(b, metric, run) ?? 0) - (metricValue(a, metric, run) ?? 0),
  );
  const values = Object.fromEntries(
    ranked.map((person) => [person.id, metricValue(person, metric, run) ?? 0]),
  );
  const title = { damage: "Damage done", healing: "Healing done", time: "Turn times" }[metric];
  return (
    <div className="grid min-w-0 gap-4">
      <ActionRow>
        <div role="group" aria-label="Report metric" className="flex flex-wrap gap-2">
          {(
            [
              { value: "damage", label: "Damage", icon: Swords },
              { value: "healing", label: "Healing", icon: HeartPulse },
              { value: "time", label: "Turn time", icon: Clock },
            ] as const
          ).map((option) => (
            <Button
              key={option.value}
              variant={metric === option.value ? "primary" : "ghost"}
              icon={option.icon}
              aria-pressed={metric === option.value}
              onClick={() => onMetric(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <div role="group" aria-label="Combatant side" className="ml-auto flex flex-wrap gap-2">
          {(
            [
              { value: "party", label: "Party" },
              { value: "enemy", label: "Enemies" },
              { value: "all", label: "All" },
            ] as const
          ).map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={side === option.value ? "primary" : "ghost"}
              aria-pressed={side === option.value}
              onClick={() => onSide(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </ActionRow>
      <ResponsiveGrid variant="equal2" className="items-start">
        {metric === "time" && !run.timing?.combatStartedAt ? (
          <SectionPanel title={title} icon={Clock}>
            <p className="text-sm text-muted-foreground">
              Turn timing was not recorded for this run.
            </p>
          </SectionPanel>
        ) : (
          <RankedMeter title={title} kind={metric} combatants={ranked} values={values} />
        )}
        <SectionPanel
          title="Combatant breakdown"
          icon={Users}
          bodyClassName="min-w-0 overflow-x-auto"
        >
          <table className="history-table">
            <caption className="sr-only">{title} by combatant</caption>
            <thead>
              <tr>
                <th>Combatant</th>
                <th className="number-cell">
                  {metric === "time" ? "Total" : metric === "healing" ? "Restored" : "Done"}
                </th>
                <th className="number-cell">
                  {metric === "time" ? "Avg / turn" : metric === "healing" ? "Overheal¹" : "Taken"}
                </th>
                <th className="number-cell">{metric === "time" ? "Turns" : "Share"}</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((person) => {
                const value = metricValue(person, metric, run);
                const total = Object.values(values).reduce((a, b) => a + b, 0);
                return (
                  <tr key={person.id}>
                    <td>
                      <span className="flex min-w-0 items-center gap-2">
                        <InitialsAvatar
                          name={person.displayName}
                          src={runCombatantAvatarSrc(person)}
                          size="sm"
                          tone={partyMember(person) ? "personal" : "primary"}
                        />
                        <span>{person.displayName}</span>
                      </span>
                    </td>
                    <td className="number-cell">{metric === "time" ? duration(value) : value}</td>
                    <td className="number-cell">
                      {metric === "time"
                        ? duration(averageTurn(person, run))
                        : metric === "healing"
                          ? overhealing(person, run)
                          : person.damageTaken}
                    </td>
                    <td className="number-cell">
                      {metric === "time"
                        ? run.timing?.turns
                          ? completedTurns(person, run).length
                          : "—"
                        : total
                          ? `${Math.round(((value ?? 0) / total) * 100)}%`
                          : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            {metric === "time"
              ? "Paused time is excluded. Averages use completed turns. Turn time describes table pace."
              : metric === "healing"
                ? "¹ Overheal includes only entries with a recorded requested amount. Older logs may not contain this detail."
                : "Applied damage after defenses. Undone changes are excluded."}
          </p>
        </SectionPanel>
      </ResponsiveGrid>
      <RoundBreakdown run={run} onRound={onRound} />
    </div>
  );
}

function RoundBreakdown({ run, onRound }: { run: EncounterRun; onRound: (round: number) => void }) {
  const turns = run.timing?.turns ?? [];
  const rounds = [...new Set(turns.map((turn) => turn.round))].sort((a, b) => a - b);
  if (!rounds.length) return null;
  return (
    <SectionPanel title="Round breakdown" icon={Clock}>
      <ResponsiveGrid variant="cards4">
        {rounds.map((round) => (
          <Button
            key={round}
            variant="outline"
            className="flex-col items-start"
            onClick={() => onRound(round)}
          >
            <span>Round {round}</span>
            <strong className="text-lg tabular-nums">
              {duration(
                turns
                  .filter((turn) => turn.round === round)
                  .reduce((total, turn) => total + turn.durationMs, 0),
              )}
            </strong>
            <span className="text-xs">View round →</span>
          </Button>
        ))}
      </ResponsiveGrid>
    </SectionPanel>
  );
}
