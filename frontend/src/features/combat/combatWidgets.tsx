import { ChevronDown, HeartPulse, ScrollText, Sparkles, Swords, WandSparkles } from "lucide-react";
import React, { useEffect } from "react";
import { damageTypeOptions } from "../../components/shared/damageTypes";
import { Button, DeathSaveTrack, Input, SectionPanel, Select } from "../../components/ui";
import { actionSummary } from "../../lib/domain/combat";
import type {
  CreatureAction,
  CreatureSpell,
  EncounterRun,
  EncounterRunCombatant,
} from "../../types";
import type { CombatRollFlash } from "./combatTypes";
import { RunTargetCombatantCard } from "../encounters/EncounterCombatantCard";
import { RunCombatantAvatar as Avatar } from "./RunCombatantAvatar";

export function CombatStatusBar({
  combatantCount,
  elapsed,
  run,
  showMeters,
  onEnd,
  onMeters,
  onMove,
  onUndo,
}: {
  combatantCount: number;
  elapsed: number;
  run: EncounterRun;
  showMeters: boolean;
  onEnd: () => void;
  onMeters: () => void;
  onMove: (direction: "next" | "previous") => void;
  onUndo: () => void;
}) {
  return (
    <div className="combat-panel grid gap-2 rounded-lg border border-border bg-card p-2 md:grid-cols-[1fr_auto_1fr] md:items-center xl:p-3">
      <div />
      <div className="flex items-stretch justify-center gap-1 sm:gap-2">
        <Button
          className="self-stretch px-4 text-lg"
          variant="secondary"
          onClick={() => void onMove("previous")}
          title="Previous turn"
        >
          &larr;
        </Button>
        <div className="grid min-w-0 grid-cols-3 overflow-hidden rounded-lg border border-border bg-background text-center">
          <div className="px-2 py-2 sm:px-4">
            <div className="text-xs font-bold uppercase text-muted-foreground">Round</div>
            <div className="text-lg font-black">{run.currentRound}</div>
          </div>
          <div className="border-x border-border px-2 py-2 sm:px-4">
            <div className="text-xs font-bold uppercase text-muted-foreground">Turn</div>
            <div className="text-lg font-black">
              {run.currentTurnIndex + 1}/{combatantCount}
            </div>
          </div>
          <div className="px-2 py-2 sm:px-4">
            <div className="text-xs font-bold uppercase text-muted-foreground">Timer</div>
            <div className="text-lg font-black">
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
            </div>
          </div>
        </div>
        <Button
          className="self-stretch px-4 text-lg"
          variant="secondary"
          onClick={() => void onMove("next")}
          title="Next turn"
        >
          &rarr;
        </Button>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onUndo}>
          Undo
        </Button>
        <Button variant="secondary" onClick={onMeters}>
          {showMeters ? "Hide meters" : "Meters"}
        </Button>
        <Button variant="danger" onClick={onEnd}>
          Finish Combat
        </Button>
      </div>
    </div>
  );
}

export function ActiveTurnHeader({
  combatant,
  selected,
  children,
}: {
  combatant: EncounterRunCombatant;
  selected: EncounterRunCombatant | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-2 md:grid-cols-[auto_minmax(13rem,auto)_minmax(0,1fr)] md:items-center xl:grid-cols-[auto_minmax(280px,auto)_minmax(220px,1fr)]">
      <div className="flex min-w-0 items-center gap-2 xl:gap-3">
        <Avatar combatant={combatant} />
        <div>
          <div className="text-xs font-bold uppercase text-muted-foreground">Current Turn</div>
          <div className="text-lg font-semibold">{combatant.displayName}</div>
          <div className="text-sm text-muted-foreground">
            Initiative {combatant.initiativeSet ? combatant.initiative : "-"}
          </div>
        </div>
      </div>
      {children}
      <TargetSummary combatant={selected} />
    </div>
  );
}

function TargetSummary({ combatant }: { combatant: EncounterRunCombatant | null }) {
  if (!combatant) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm font-semibold text-muted-foreground xl:px-4 xl:py-3">
        No target selected
      </div>
    );
  }
  return (
    <div
      className="justify-self-stretch md:justify-self-end"
      title={`Targeted: ${combatant.displayName}`}
    >
      <RunTargetCombatantCard combatant={combatant} />
    </div>
  );
}

export function CombatControls({
  actions,
  damageType,
  disabled,
  hpAmount,
  onAction,
  onAmountChange,
  onDamageTypeChange,
  onManual,
  onOpenManualSlots,
  onOpenSpells,
  spells,
  spellSlotsTracked,
}: {
  actions: CreatureAction[];
  damageType: string;
  disabled: boolean;
  hpAmount: string;
  onAction: (action: CreatureAction, event?: React.MouseEvent) => void;
  onAmountChange: (value: string) => void;
  onDamageTypeChange: (value: string) => void;
  onManual: (mode: "damage" | "healing") => void;
  onOpenManualSlots: () => void;
  onOpenSpells: () => void;
  spells: CreatureSpell[];
  spellSlotsTracked: boolean;
}) {
  return (
    <div className="combat-panel min-w-0 rounded-lg border border-border bg-background p-2">
      <div className="grid min-w-0 gap-2 sm:grid-cols-[5.25rem_auto_minmax(8rem,1fr)] sm:items-stretch xl:grid-cols-[6.25rem_auto_auto]">
        <div className="flex-none">
          <Input
            className="h-full min-h-20 text-center text-2xl font-black tabular-nums"
            type="number"
            placeholder="Amount"
            value={hpAmount}
            onChange={(event) => onAmountChange(event.target.value)}
            disabled={disabled}
            title={disabled ? "Select a target first" : ""}
          />
        </div>
        <div className="grid gap-1.5">
          <Button
            className="min-h-9"
            disabled={disabled}
            icon={Swords}
            variant="danger"
            onClick={() => onManual("damage")}
            title="Apply damage"
          >
            Damage
          </Button>
          <Button
            className="min-h-9"
            disabled={disabled}
            icon={HeartPulse}
            variant="success"
            onClick={() => onManual("healing")}
            title="Apply healing"
          >
            Heal
          </Button>
        </div>
        <div className="grid gap-1.5">
          <DamageTypeControl value={damageType} onChange={onDamageTypeChange} disabled={disabled} />
          {actions.length > 0 && (
            <ActionMenu actions={actions} disabled={disabled} onAction={onAction} />
          )}
          {spells.length > 0 && (
            <Button type="button" variant="secondary" icon={Sparkles} onClick={onOpenSpells}>
              Spells
            </Button>
          )}
          {spellSlotsTracked && (
            <Button
              type="button"
              variant="secondary"
              icon={WandSparkles}
              onClick={onOpenManualSlots}
            >
              Slots
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ActionMenu({
  actions,
  disabled,
  disabledReason,
  onAction,
}: {
  actions: CreatureAction[];
  disabled: boolean;
  disabledReason?: string;
  onAction: (action: CreatureAction, event?: React.MouseEvent) => void;
}) {
  return (
    <details className="group relative">
      <summary
        className={[
          "inline-flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-primary/35 bg-primary/10 px-3 py-2 text-sm font-bold text-primary transition hover:bg-primary/20",
          disabled ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
        title={
          disabled
            ? disabledReason || "Select a target first"
            : "Choose an action. Shift-click roll for advantage, Control-click for disadvantage."
        }
      >
        <ScrollText className="h-4 w-4" />
        Actions
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 top-12 z-30 grid w-[min(420px,calc(100vw-2rem))] gap-2 rounded-lg border border-border bg-card p-2 shadow-xl">
        {actions.map((action) => (
          <div
            className="grid gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-[1fr_auto] sm:items-center"
            key={action.id}
          >
            <div className="min-w-0">
              <div className="truncate font-semibold">{action.name}</div>
              <div className="text-xs text-muted-foreground">
                {actionSummary(action) || "No damage roll"}
              </div>
            </div>
            <Button type="button" size="sm" onClick={(event) => onAction(action, event)}>
              Roll
            </Button>
          </div>
        ))}
      </div>
    </details>
  );
}

function DamageTypeControl({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="min-w-0" title={disabled ? "Select a target first" : "Damage type"}>
      <Select
        value={value}
        placeholder="Damage type"
        options={damageTypeOptions()}
        onValueChange={onChange}
      />
    </div>
  );
}

export function DeathSaveControls({
  combatant,
  onDeathSave,
}: {
  combatant: EncounterRunCombatant;
  onDeathSave: (
    action: "success" | "failure" | "undo-success" | "undo-failure" | "stabilize",
  ) => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-background p-3">
      <div>
        <div className="text-xs font-bold uppercase text-muted-foreground">Death Saves</div>
        <div className="text-sm text-muted-foreground">
          {combatant.stable ? "Stable" : "At 0 HP. Track run-only death saves here."}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <DeathSaveTrack
          successes={combatant.deathSaveSuccesses}
          failures={combatant.deathSaveFailures}
          onUndoSuccess={() => onDeathSave("undo-success")}
          onUndoFailure={() => onDeathSave("undo-failure")}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="success" onClick={() => onDeathSave("success")}>
          Add success
        </Button>
        <Button variant="danger" onClick={() => onDeathSave("failure")}>
          Add failure
        </Button>
        <Button variant="secondary" onClick={() => onDeathSave("stabilize")}>
          Stabilize
        </Button>
      </div>
    </div>
  );
}

export function TopOfRoundMarker() {
  return (
    <div className="flex items-center gap-2 py-1 text-[0.68rem] font-bold uppercase text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      Top of Round
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function RollFlash({
  flash,
  onDone,
}: {
  flash: CombatRollFlash | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(onDone, 1800);
    return () => window.clearTimeout(timer);
  }, [flash, onDone]);
  if (!flash) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[1000] grid place-items-center px-4">
      <div
        key={flash.id ?? `${flash.title}-${flash.total}-${flash.detail}-${flash.subtitle ?? ""}`}
        className="roll-flash w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-2xl"
      >
        <div className="text-sm font-bold uppercase text-muted-foreground">{flash.title}</div>
        {flash.subtitle && <div className="text-xs text-muted-foreground">{flash.subtitle}</div>}
        <div className="my-2 text-6xl font-black text-primary">{flash.total}</div>
        <div className="text-sm font-medium text-muted-foreground">{flash.detail}</div>
      </div>
    </div>
  );
}

export function DamageMeters({ combatants }: { combatants: EncounterRunCombatant[] }) {
  return (
    <SectionPanel
      title="Damage Meters"
      icon={HeartPulse}
      className="combat-panel combat-section-panel max-h-[calc(100svh-15.5rem)] min-h-0 overflow-hidden p-3"
      bodyClassName="max-h-[calc(100svh-20rem)] min-h-0 overflow-y-auto pr-1"
    >
      <div className="grid gap-2">
        {[...combatants]
          .sort((a, b) => b.damageDealt - a.damageDealt)
          .map((combatant) => (
            <div
              key={combatant.id}
              className="rounded-md border border-border bg-background p-3 text-sm"
            >
              <div className="flex justify-between font-semibold">
                <span>{combatant.displayName}</span>
                <span>{combatant.damageDealt}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Taken {combatant.damageTaken} · Healing {combatant.healingDone} · Kills{" "}
                {combatant.kills}
              </div>
            </div>
          ))}
      </div>
    </SectionPanel>
  );
}
