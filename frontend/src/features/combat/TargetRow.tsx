import { CircleDot, MoreHorizontal, Shield, Skull } from "lucide-react";
import { Badge, DeathSaveTrack } from "../../components/ui";
import { effectiveAC, effectiveMaxHP, hpPercent } from "../../lib/domain/combat";
import { friendlyEffectLabel } from "../../lib/domain/spellMessaging";
import type { EncounterRunCombatant, EncounterRunEffect } from "../../types";
import { RunCombatantAvatar as Avatar } from "./RunCombatantAvatar";

export function TargetRow({
  active = false,
  activeEffects = [],
  down = false,
  combatant,
  position = 1,
  selected,
  onSelect,
  onEdit,
  onDeathSave,
}: {
  active?: boolean;
  activeEffects?: EncounterRunEffect[];
  down?: boolean;
  combatant: EncounterRunCombatant;
  position?: number;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDeathSave?: (
    combatant: EncounterRunCombatant,
    action: "success" | "failure" | "undo-success" | "undo-failure" | "stabilize",
  ) => void;
}) {
  const pct = hpPercent(combatant);
  const showDeathSaves = combatant.sourceType === "player" && combatant.currentHitPoints <= 0;
  const rowTone = selected
    ? "border-warning bg-warning/5 ring-1 ring-warning/35"
    : active
      ? "border-primary bg-primary/10 ring-1 ring-primary/35"
      : down
        ? "border-destructive/30 bg-destructive/5 opacity-80"
        : "border-border bg-background";

  return (
    <div
      aria-current={active ? "step" : undefined}
      className="combatant-row grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] items-center gap-1.5"
    >
      <div
        className={[
          "grid h-8 w-8 place-items-center rounded-md border text-sm font-bold tabular-nums",
          selected
            ? "border-border bg-background text-foreground"
            : active
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground",
        ].join(" ")}
        title={selected ? "Selected target" : `Position ${position}`}
      >
        {selected ? <CircleDot className="h-5 w-5" /> : position}
      </div>
      <div className={["target-row-card min-w-0 rounded-md border px-1 py-1", rowTone].join(" ")}>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            onClick={onSelect}
          >
            <Avatar combatant={combatant} />
            <div className="grid min-w-0 flex-1 grid-cols-[1.5rem_minmax(0,1fr)_11.75rem] items-center gap-1">
              <span className="shrink-0 text-sm font-bold tabular-nums text-muted-foreground">
                {combatant.initiativeSet ? combatant.initiative : "—"}
              </span>
              <span className="min-w-0 truncate border-l border-border pl-2 font-semibold">
                {combatant.displayName}
              </span>
              <div className="grid min-w-0 border-r border-border pr-3">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums text-muted-foreground"
                    title="Armor Class"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    AC {effectiveACForRow(combatant, activeEffects)}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {combatant.currentHitPoints} / {effectiveMaxHP(combatant)} HP
                  </span>
                </div>
                <div className="mt-1 h-1.5 min-w-0 overflow-hidden rounded-full bg-muted">
                  <div className="hp-bar-fill h-full bg-success" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          </button>
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            aria-label="Edit combatant"
            onClick={onEdit}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
        {down || combatant.conditions.length > 0 || activeEffects.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {down ? (
              <span className="inline-flex items-center gap-1 text-xs text-destructive">
                <Skull className="h-3.5 w-3.5" /> Down
              </span>
            ) : null}
            {combatant.conditions.map((condition) => (
              <Badge key={condition} tone="warning">
                {condition}
              </Badge>
            ))}
            {activeEffects.map((effect) => (
              <Badge key={effect.id} tone="info">
                {friendlyEffectLabel(effect)}
              </Badge>
            ))}
          </div>
        ) : null}
        {showDeathSaves ? (
          <div className="mt-2">
            <DeathSaveTrack
              successes={combatant.deathSaveSuccesses}
              failures={combatant.deathSaveFailures}
              onUndoSuccess={onDeathSave ? () => onDeathSave(combatant, "undo-success") : undefined}
              onUndoFailure={onDeathSave ? () => onDeathSave(combatant, "undo-failure") : undefined}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function effectiveACForRow(combatant: EncounterRunCombatant, effects: EncounterRunEffect[]) {
  const base = effectiveAC(combatant);
  return effects.reduce((total, effect) => {
    if (effect.effectKind === "ac_bonus") return total + (Number(effect.amount) || 0);
    if (effect.effectKind === "base_ac") return Math.max(total, Number(effect.amount) || total);
    return total;
  }, base);
}
