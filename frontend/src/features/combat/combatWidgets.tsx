import { ChevronDown, HeartPulse, ScrollText, Shield, Skull, Swords } from "lucide-react";
import React, { useEffect } from "react";
import { damageTypes } from "../../components/shared/damageTypes";
import { Badge, Button, DeathSaveTrack, Input, SectionPanel, Select } from "../../components/ui";
import { defaultCombatantColor } from "../../lib/domain/options";
import {
  actionSummary,
  effectiveAC,
  effectiveMaxHP,
  hpBarColor,
  hpPercent,
} from "../../lib/domain/combat";
import type { CreatureAction, EncounterRun, EncounterRunCombatant } from "../../types";
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
    <div className="grid gap-2 rounded-lg border border-border bg-card p-2 md:grid-cols-[1fr_auto_1fr] md:items-center xl:p-3">
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
      className="flex min-w-0 items-center gap-2 justify-self-stretch rounded-lg border border-border bg-background px-2 py-2 md:justify-self-end xl:gap-3 xl:px-3"
      title={`Targeted: ${combatant.displayName}`}
    >
      <Avatar combatant={combatant} />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold uppercase text-muted-foreground">Targeting</div>
        <div className="truncate text-sm font-semibold">{combatant.displayName}</div>
        <div className="mt-1 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 font-bold text-sky-700 dark:text-sky-200">
            <Shield className="h-3.5 w-3.5" /> {effectiveAC(combatant)}
          </span>
          <span className="inline-flex items-center gap-1 font-bold text-rose-700 dark:text-rose-200">
            <HeartPulse className="h-3.5 w-3.5" /> {combatant.currentHitPoints}/
            {effectiveMaxHP(combatant)}
          </span>
        </div>
      </div>
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
}: {
  actions: CreatureAction[];
  damageType: string;
  disabled: boolean;
  hpAmount: string;
  onAction: (action: CreatureAction, event?: React.MouseEvent) => void;
  onAmountChange: (value: string) => void;
  onDamageTypeChange: (value: string) => void;
  onManual: (mode: "damage" | "healing") => void;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-background p-2">
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
        </div>
      </div>
    </div>
  );
}

function ActionMenu({
  actions,
  disabled,
  onAction,
}: {
  actions: CreatureAction[];
  disabled: boolean;
  onAction: (action: CreatureAction, event?: React.MouseEvent) => void;
}) {
  return (
    <details className="group relative">
      <summary
        className={[
          "inline-flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-500/20 dark:text-emerald-200",
          disabled ? "pointer-events-none opacity-60" : "",
        ].join(" ")}
        title={
          disabled
            ? "Select a target first"
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
            <Button
              type="button"
              size="sm"
              variant="success"
              onClick={(event) => onAction(action, event)}
            >
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
        options={damageTypes.map((type) => ({
          label: type.label,
          value: type.id,
          icon: type.icon,
        }))}
        onValueChange={onChange}
      />
    </div>
  );
}

export function TargetRow({
  active = false,
  down = false,
  combatant,
  selected,
  onSelect,
  onEdit,
  onDeathSave,
}: {
  active?: boolean;
  down?: boolean;
  combatant: EncounterRunCombatant;
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
  const colorStyle = combatantColorStyle(combatant.colorLabel);
  const sideTone =
    active && selected
      ? "border-sky-500 bg-sky-500/10 ring-2 ring-amber-400/70"
      : active
        ? "border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/40"
        : selected
          ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-400/70"
          : down
            ? "border-red-500/30 bg-red-950/5 opacity-80"
            : combatant.side === "enemy"
              ? "border-red-500/25 bg-red-500/5"
              : combatant.side === "friendly"
                ? "border-emerald-500/25 bg-emerald-500/5"
                : "border-border bg-background";
  return (
    <div className="combatant-row grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-1 xl:grid-cols-[2.25rem_minmax(0,1fr)]">
      <div
        className={[
          "mt-4 grid h-7 w-7 place-items-center rounded-full border text-xs font-black xl:h-8 xl:w-8 xl:text-sm",
          active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-foreground",
        ].join(" ")}
      >
        {combatant.initiativeSet ? combatant.initiative : "-"}
      </div>
      <div
        className={["target-row-card min-w-0 rounded-lg border p-1.5 xl:p-2", sideTone].join(" ")}
        style={colorStyle}
      >
        <div className="flex min-w-0 items-center gap-1.5 xl:gap-3">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left xl:gap-3"
            onClick={onSelect}
          >
            <Avatar combatant={combatant} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5 xl:gap-2">
                <div
                  className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200 xl:h-10 xl:w-10"
                  title="Armor Class"
                >
                  <Shield className="absolute h-7 w-7 opacity-20 xl:h-8 xl:w-8" />
                  <span className="relative text-base font-black xl:text-lg">
                    {effectiveAC(combatant)}
                  </span>
                </div>
                <div className="grid min-w-0 flex-1 gap-1">
                  <div
                    className={[
                      "min-w-0 flex-1 truncate font-semibold",
                      combatant.side === "enemy"
                        ? "text-red-700 dark:text-red-300"
                        : combatant.side === "friendly"
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "",
                    ].join(" ")}
                  >
                    {combatant.displayName}
                  </div>
                  <div className="flex min-w-0 justify-end gap-1">
                    {active && <StateBadge tone="acting">Acting</StateBadge>}
                    {selected && <StateBadge tone="target">Target</StateBadge>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {down && (
                  <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-300">
                    <Skull className="h-3.5 w-3.5" /> Down
                  </span>
                )}
              </div>
            </div>
          </button>
          <Button className="px-1.5" type="button" size="sm" variant="ghost" onClick={onEdit}>
            ...
          </Button>
        </div>
        {showDeathSaves ? (
          <div className="mt-2">
            <DeathSaveTrack
              successes={combatant.deathSaveSuccesses}
              failures={combatant.deathSaveFailures}
              onUndoSuccess={onDeathSave ? () => onDeathSave(combatant, "undo-success") : undefined}
              onUndoFailure={onDeathSave ? () => onDeathSave(combatant, "undo-failure") : undefined}
            />
          </div>
        ) : (
          <div
            key={`${combatant.id}-${combatant.currentHitPoints}-${combatant.temporaryHitPoints}`}
            className={[
              "mt-2 h-2 overflow-hidden rounded-full bg-muted",
              combatant.currentHitPoints <= 0 ? "hp-drop-zero" : "hp-bar-pulse",
            ].join(" ")}
          >
            <div
              className="hp-bar-fill h-full"
              style={{ width: `${pct}%`, backgroundColor: hpBarColor(pct) }}
            />
          </div>
        )}
        <div className="mt-1 flex min-w-0 flex-wrap gap-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <HeartPulse className="h-3.5 w-3.5" /> {combatant.currentHitPoints}/
            {effectiveMaxHP(combatant)} HP
          </span>
          {combatant.conditions.map((condition) => (
            <Badge key={condition}>{condition}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function StateBadge({ tone, children }: { tone: "acting" | "target"; children: React.ReactNode }) {
  return (
    <span
      className={[
        "rounded-md px-1.5 py-0.5 text-[0.62rem] font-black uppercase",
        tone === "acting"
          ? "bg-sky-500/20 text-sky-800 dark:text-sky-100"
          : "bg-amber-400/25 text-amber-800 dark:text-amber-100",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function combatantColorStyle(colorLabel: string): React.CSSProperties | undefined {
  const color = colorLabel.trim();
  if (!color || color === defaultCombatantColor || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return undefined;
  }
  return {
    borderColor: color,
    boxShadow: `inset 0 0 0 1px ${color}55`,
  };
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
  flash: { id?: string; title: string; total: number; detail: string; subtitle?: string } | null;
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
      className="max-h-[calc(100svh-15.5rem)] min-h-0 overflow-hidden p-3"
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
