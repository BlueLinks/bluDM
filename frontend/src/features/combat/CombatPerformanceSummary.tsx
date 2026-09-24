import { HeartPulse, Swords, Timer } from "lucide-react";
import { ResponsiveGrid } from "../../components/layout";
import { InitialsAvatar } from "../../components/shared/displayPrimitives";
import { SectionPanel } from "../../components/ui";
import type { EncounterRun, EncounterRunCombatant } from "../../types";
import { runCombatantAvatarSrc } from "./domain";
import {
  combatStartTimestamp,
  completedTurnSeconds,
  formatCombatDuration,
  useCombatElapsed,
} from "./trackerPageHelpers";

type MeterKind = "damage" | "healing";

function meterValue(combatant: EncounterRunCombatant, kind: MeterKind) {
  return kind === "damage" ? combatant.damageDealt : combatant.healingDone;
}

export function CombatPerformanceSummary({ run }: { run: EncounterRun }) {
  const fallbackElapsed = useCombatElapsed(
    run.timing ? "" : combatStartTimestamp(run),
    run.endedAt,
  );
  const turnElapsed = useCombatElapsed(run.timing?.currentTurnStartedAt ?? "");
  const elapsed = run.timing ? completedTurnSeconds(run) + turnElapsed : fallbackElapsed;
  const combatants = run.combatants ?? [];
  const activeID = combatants[run.currentTurnIndex]?.id;
  const damageDealers = combatants
    .filter((combatant) => combatant.damageDealt > 0)
    .sort((a, b) => b.damageDealt - a.damageDealt);
  const healers = combatants
    .filter((combatant) => combatant.healingDone > 0)
    .sort((a, b) => b.healingDone - a.healingDone);
  const turnTimes = combatants
    .map((combatant) => ({
      combatant,
      seconds:
        (run.timing?.turnTimeMs[combatant.id] ?? 0) / 1000 +
        (run.status === "active" && combatant.id === activeID ? turnElapsed : 0),
    }))
    .sort((a, b) => b.seconds - a.seconds);

  return (
    <div className="grid gap-4">
      <ResponsiveGrid variant="equal2" className="items-start">
        <RankedMeter title="Damage done" kind="damage" combatants={damageDealers} />
        <RankedMeter title="Healing done" kind="healing" combatants={healers} />
      </ResponsiveGrid>
      <SectionPanel
        title="Turn times"
        icon={Timer}
        className="min-w-0"
        action={
          <span className="text-sm text-muted-foreground">
            Total{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {formatCombatDuration(elapsed)}
            </span>
          </span>
        }
      >
        {turnTimes.length ? (
          <ol className="grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
            {turnTimes.map(({ combatant, seconds }) => (
              <li
                key={combatant.id}
                className="flex min-w-0 items-center gap-2 border-b border-border/70 py-1.5 text-sm"
              >
                <CombatantAvatar combatant={combatant} />
                <span className="min-w-0 flex-1 truncate" title={combatant.displayName}>
                  {combatant.displayName}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {formatCombatDuration(seconds)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No turn times recorded.</p>
        )}
      </SectionPanel>
    </div>
  );
}

function RankedMeter({
  title,
  kind,
  combatants,
}: {
  title: string;
  kind: MeterKind;
  combatants: EncounterRunCombatant[];
}) {
  const max = combatants.length ? meterValue(combatants[0], kind) : 1;
  const fill = kind === "damage" ? "bg-destructive/30" : "bg-success/30";

  return (
    <SectionPanel title={title} icon={kind === "damage" ? Swords : HeartPulse} className="min-w-0">
      {combatants.length ? (
        <ol className="space-y-1.5">
          {combatants.map((combatant, index) => {
            const value = meterValue(combatant, kind);
            return (
              <li key={combatant.id} className="flex min-w-0 items-center gap-2 text-sm">
                <span className="w-5 shrink-0 text-right tabular-nums text-muted-foreground">
                  {index + 1}.
                </span>
                <CombatantAvatar combatant={combatant} />
                <div
                  role="meter"
                  aria-label={`${combatant.displayName} ${kind}`}
                  aria-valuemin={0}
                  aria-valuemax={max}
                  aria-valuenow={value}
                  className="relative flex h-9 min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden rounded border border-border bg-surface px-2 text-surface-foreground"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 ${fill}`}
                    style={{ width: `${(value / max) * 100}%` }}
                  />
                  <span
                    className="relative min-w-0 truncate font-medium"
                    title={combatant.displayName}
                  >
                    {combatant.displayName}
                  </span>
                  <span className="relative shrink-0 font-semibold tabular-nums">
                    {value.toLocaleString()}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">
          No {kind === "damage" ? "damage" : "healing"} recorded.
        </p>
      )}
    </SectionPanel>
  );
}

function CombatantAvatar({ combatant }: { combatant: EncounterRunCombatant }) {
  return (
    <InitialsAvatar
      name={combatant.displayName}
      src={runCombatantAvatarSrc(combatant)}
      size="sm"
      tone={combatant.side === "player" ? "personal" : "primary"}
    />
  );
}
