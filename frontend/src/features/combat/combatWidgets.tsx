import { ChevronDown, HeartPulse, ScrollText, Shield, Skull, Zap } from "lucide-react";
import React, { useEffect } from "react";
import { damageTypes } from "../../components/shared/damageTypes";
import { Badge, Button, DeathSaveTrack, Input, SectionPanel, Select } from "../../components/ui";
import { api } from "../../lib/api";
import { abilities, skillDefinitions } from "../../lib/domain/options";
import { abilityModifier, modifierTone } from "../../lib/domain/forms";
import {
  abilityScoresFromSheet,
  actionSummary,
  combatantSheet,
  effectiveAC,
  effectiveMaxHP,
  hpBarColor,
  hpPercent,
  proficiencyBonusFromCombatSheet,
  rollDiceDetail,
  rollModeLabel,
  sheetRecord,
  speedFromSheet,
  stringArrayFromSheet,
} from "../../lib/domain/combat";
import type { CreatureAction, EncounterRun, EncounterRunCombatant, RollMode } from "../../types";
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
    <div className="grid gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
      <div />
      <div className="flex items-stretch justify-center gap-2">
        <Button
          className="self-stretch px-4 text-lg"
          variant="secondary"
          onClick={() => void onMove("previous")}
          title="Previous turn"
        >
          &larr;
        </Button>
        <div className="grid min-w-56 grid-cols-3 overflow-hidden rounded-lg border border-border bg-background text-center">
          <div className="px-4 py-2">
            <div className="text-xs font-bold uppercase text-muted-foreground">Round</div>
            <div className="text-lg font-black">{run.currentRound}</div>
          </div>
          <div className="border-x border-border px-4 py-2">
            <div className="text-xs font-bold uppercase text-muted-foreground">Turn</div>
            <div className="text-lg font-black">
              {run.currentTurnIndex + 1}/{combatantCount}
            </div>
          </div>
          <div className="px-4 py-2">
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
    <div className="grid gap-3 md:grid-cols-[auto_1fr] md:items-center xl:grid-cols-[auto_1fr_auto]">
      <div className="flex items-center gap-3">
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
      <div className="rounded-lg border border-dashed border-border bg-background px-4 py-3 text-sm font-semibold text-muted-foreground">
        No target selected
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
      title={`Targeted: ${combatant.displayName}`}
    >
      <Avatar combatant={combatant} />
      <div className="min-w-0">
        <div className="text-xs font-bold uppercase text-muted-foreground">Targeting</div>
        <div className="max-w-44 truncate text-sm font-semibold">{combatant.displayName}</div>
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
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="w-24 text-center font-semibold"
          type="number"
          placeholder="Amount"
          value={hpAmount}
          onChange={(event) => onAmountChange(event.target.value)}
          disabled={disabled}
          title={disabled ? "Select a target first" : ""}
        />
        <DamageTypeControl value={damageType} onChange={onDamageTypeChange} disabled={disabled} />
        <Button disabled={disabled} variant="danger" onClick={() => onManual("damage")}>
          Damage
        </Button>
        <Button disabled={disabled} variant="success" onClick={() => onManual("healing")}>
          Heal
        </Button>
        {actions.length > 0 && (
          <ActionMenu actions={actions} disabled={disabled} onAction={onAction} />
        )}
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
    <div className="min-w-44" title={disabled ? "Select a target first" : "Damage type"}>
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
  const sideTone = active
    ? "border-primary bg-primary/10"
    : selected
      ? "border-primary bg-primary/5"
      : down
        ? "border-red-500/30 bg-red-950/5 opacity-80"
        : combatant.side === "enemy"
          ? "border-red-500/25 bg-red-500/5"
          : combatant.side === "friendly"
            ? "border-emerald-500/25 bg-emerald-500/5"
            : "border-border bg-background";
  return (
    <div className="grid grid-cols-[2.25rem_1fr] items-start gap-1">
      <div
        className={[
          "mt-4 grid h-8 w-8 place-items-center rounded-full border text-sm font-black",
          active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-foreground",
        ].join(" ")}
      >
        {combatant.initiativeSet ? combatant.initiative : "-"}
      </div>
      <div className={["rounded-lg border p-3 transition", sideTone].join(" ")}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            onClick={onSelect}
          >
            <Avatar combatant={combatant} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200"
                  title="Armor Class"
                >
                  <Shield className="absolute h-8 w-8 opacity-20" />
                  <span className="relative text-lg font-black">{effectiveAC(combatant)}</span>
                </div>
                <div
                  className={[
                    "truncate font-semibold",
                    combatant.side === "enemy"
                      ? "text-red-700 dark:text-red-300"
                      : combatant.side === "friendly"
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "",
                  ].join(" ")}
                >
                  {combatant.displayName}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {active && <Badge tone="friendly">Acting</Badge>}
                {down && (
                  <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-300">
                    <Skull className="h-3.5 w-3.5" /> Down
                  </span>
                )}
              </div>
            </div>
          </button>
          <Button type="button" size="sm" variant="ghost" onClick={onEdit}>
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
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: hpBarColor(pct) }}
            />
          </div>
        )}
        <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
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

export function CombatSheet({
  combatant,
  runID,
  compact = false,
  onRoll,
}: {
  combatant: EncounterRunCombatant;
  runID: string;
  compact?: boolean;
  onRoll: (
    message: string,
    flash: { title: string; total: number; detail: string; subtitle?: string },
  ) => void;
}) {
  const sheet = combatantSheet(combatant);
  const scores = abilityScoresFromSheet(sheet);
  const skills = sheetRecord(sheet.skillBonuses);
  const savingThrows = stringArrayFromSheet(sheet.savingThrowProficiencies);
  const profBonus = proficiencyBonusFromCombatSheet(sheet);
  async function roll(
    event: React.MouseEvent,
    label: string,
    ability: string,
    bonus: number,
    rollType: "Check" | "Saving Throw" = "Check",
  ) {
    const rollMode = rollModeFromEvent(event);
    const payload = await api.rollCheck(runID, {
      actorId: combatant.id,
      label,
      ability,
      bonus,
      rollMode,
    });
    const total = Number(payload.result.total) || 0;
    const d20 = Number(payload.result.d20) || 0;
    const title = `${label} ${rollType}`;
    onRoll(
      `${title}: ${total} (${rollModeLabel(rollMode)} ${d20} ${bonus >= 0 ? "+" : ""}${bonus})`,
      {
        title,
        subtitle: `${combatant.displayName} · ${rollType} · ${rollModeLabel(rollMode)}`,
        total,
        detail: `${rollDiceDetail(payload.result)} ${bonus >= 0 ? "+" : ""}${bonus}`,
      },
    );
  }
  return (
    <SectionPanel title={compact ? "Target Sheet" : "Active Sheet"} icon={ScrollText}>
      <div className="grid gap-3">
        <div className="grid grid-cols-3 gap-2">
          <IconStat icon={Shield} label="AC" value={effectiveAC(combatant)} tone="shield" />
          <IconStat
            icon={HeartPulse}
            label="HP"
            value={`${combatant.currentHitPoints}/${effectiveMaxHP(combatant)}`}
            tone="heart"
          />
          <IconStat icon={Zap} label="Speed" value={speedFromSheet(sheet)} tone="speed" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {abilities.map((ability) => {
            const score = Number(scores[ability.key]) || 10;
            const bonus = abilityModifier(score);
            const saveBonus = bonus + (savingThrows.includes(ability.key) ? profBonus : 0);
            return (
              <div
                key={ability.key}
                className="rounded-md border border-border bg-background p-2 text-center"
              >
                <div className="text-xs font-bold text-muted-foreground">{ability.label}</div>
                <div className="font-semibold">{score}</div>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    className="rounded border border-border bg-muted px-1.5 py-1 hover:bg-primary hover:text-primary-foreground"
                    title="Roll ability check. Shift-click for advantage, Control-click for disadvantage."
                    onClick={(event) =>
                      void roll(event, ability.label, ability.key, bonus, "Check")
                    }
                  >
                    <span className="block text-[0.62rem] font-black uppercase text-muted-foreground">
                      Mod
                    </span>
                    <span className={["block text-sm font-black", modifierTone(bonus)].join(" ")}>
                      {bonus >= 0 ? `+${bonus}` : bonus}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="rounded border border-border bg-muted px-1.5 py-1 hover:bg-primary hover:text-primary-foreground"
                    title="Roll saving throw. Shift-click for advantage, Control-click for disadvantage."
                    onClick={(event) =>
                      void roll(event, ability.label, ability.key, saveBonus, "Saving Throw")
                    }
                  >
                    <span className="block text-[0.62rem] font-black uppercase text-muted-foreground">
                      Save
                    </span>
                    <span
                      className={["block text-sm font-black", modifierTone(saveBonus)].join(" ")}
                    >
                      {saveBonus >= 0 ? `+${saveBonus}` : saveBonus}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid gap-1">
          {skillDefinitions.map((skill) => {
            const fallback = abilityModifier(Number(scores[skill.ability]) || 10);
            const bonus = Number(skills[skill.name]) || fallback;
            return (
              <button
                key={skill.name}
                type="button"
                className="flex justify-between rounded-md px-2 py-1 text-left text-sm hover:bg-muted"
                title="Shift-click for advantage, Control-click for disadvantage."
                onClick={(event) => void roll(event, skill.name, skill.ability, bonus, "Check")}
              >
                <span>{skill.name}</span>
                <span className={["font-bold", modifierTone(bonus)].join(" ")}>
                  {bonus >= 0 ? `+${bonus}` : bonus}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </SectionPanel>
  );
}

function IconStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  tone: "shield" | "heart" | "speed";
}) {
  const tones = {
    shield: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200",
    heart: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200",
    speed: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
  };
  return (
    <div
      className={[
        "grid justify-items-center gap-1 rounded-lg border px-2 py-3 text-center",
        tones[tone],
      ].join(" ")}
    >
      <div className="relative grid h-12 w-12 place-items-center">
        <Icon className="absolute h-12 w-12 opacity-20" />
        <div className="text-lg font-black">{value}</div>
      </div>
      <div className="text-[0.68rem] font-bold uppercase">{label}</div>
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
    <SectionPanel title="Damage Meters" icon={HeartPulse}>
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

function rollModeFromEvent(event?: React.MouseEvent): RollMode {
  if (event?.shiftKey) return "advantage";
  if (event?.ctrlKey) return "disadvantage";
  return "normal";
}
