import {
  ArrowRight,
  HeartPulse,
  ListChecks,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  Swords,
  WandSparkles,
  X,
} from "lucide-react";
import { damageTypeOptions } from "../../components/shared/damageTypes";
import { InitialsAvatar, StatChip } from "../../components/shared/displayPrimitives";
import { Button, Input, Select } from "../../components/ui";
import { effectiveAC, effectiveMaxHP } from "../../lib/domain/combat";
import type { CreatureAction, CreatureSpell, EncounterRunCombatant } from "../../types";
import { CombatActionPicker } from "./CombatActionPicker";
import { DeathSaveControls } from "./combatWidgets";

export type HpMultiplier = "half" | "full" | "double";

export function CombatContextPanel({
  actions,
  actor,
  actorNeedsDeathSaves,
  combatants,
  currentTurn,
  damageType,
  hpAmount,
  hpMultiplier,
  spellSlotsTracked,
  spells,
  targetIDs,
  onAction,
  onActorChange,
  onAmountChange,
  onClearTargets,
  onDamageTypeChange,
  onDeathSave,
  onHpMultiplierChange,
  onManual,
  onManualResolution,
  onOpenManualSlots,
  onOpenCombatLog,
  onOpenSpells,
  onRequestSave,
  onRemoveTarget,
}: {
  actions: CreatureAction[];
  actor: EncounterRunCombatant;
  actorNeedsDeathSaves: boolean;
  combatants: EncounterRunCombatant[];
  currentTurn: EncounterRunCombatant;
  damageType: string;
  hpAmount: string;
  hpMultiplier: HpMultiplier;
  spellSlotsTracked: boolean;
  spells: CreatureSpell[];
  targetIDs: string[];
  onAction: (action: CreatureAction, event?: React.MouseEvent) => void;
  onActorChange: (id: string) => void;
  onAmountChange: (value: string) => void;
  onClearTargets: () => void;
  onDamageTypeChange: (value: string) => void;
  onDeathSave: (
    action: "success" | "failure" | "undo-success" | "undo-failure" | "stabilize",
  ) => void;
  onHpMultiplierChange: (multiplier: HpMultiplier) => void;
  onManual: (mode: "damage" | "healing" | "temporary") => void;
  onManualResolution: () => void;
  onOpenManualSlots: () => void;
  onOpenCombatLog: () => void;
  onOpenSpells: (spell?: CreatureSpell) => void;
  onRequestSave: () => void;
  onRemoveTarget: (id: string) => void;
}) {
  const targets = combatants.filter((combatant) => targetIDs.includes(combatant.id));
  const hasTargets = targets.length > 0;
  const actionDisabledReason =
    targets.length === 0
      ? "Select one target before choosing an attack."
      : targets.length > 1
        ? "Attacks currently resolve against one target at a time."
        : undefined;

  return (
    <section
      aria-label="Turn actions"
      className="combat-panel rounded-lg border border-border bg-card px-3 pb-[0.6875rem] pt-2.5"
    >
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(17rem,0.92fr)_2.5rem_minmax(30rem,1.45fr)_2.5rem_minmax(18rem,1.05fr)] xl:items-center">
        <CombatantSummary
          combatant={actor}
          detail={`Initiative ${actor.initiativeSet ? actor.initiative : "—"}`}
        />
        <FlowArrow />
        {actorNeedsDeathSaves ? (
          <DeathSaveControls combatant={actor} onDeathSave={onDeathSave} />
        ) : (
          <div className="-ml-0.5 grid w-[32.75rem] max-w-full min-w-0 gap-2.5">
            <div className="grid min-w-0 gap-2.5 sm:grid-cols-[5.875rem_minmax(12rem,1.2fr)_minmax(9rem,1fr)]">
              <Input
                aria-label="HP adjustment amount"
                className="!min-h-9 !py-1.5 text-center font-semibold tabular-nums"
                inputMode="numeric"
                min={0}
                placeholder="Amount"
                type="number"
                value={hpAmount}
                onChange={(event) => onAmountChange(event.target.value)}
              />
              <CombatActionPicker
                actions={actions}
                actionDisabledReason={actionDisabledReason}
                spells={spells}
                triggerLabel={actions[0]?.name || spells[0]?.spellName || "Choose action"}
                onAction={onAction}
                onSpell={onOpenSpells}
              />
              <Select
                className="!min-h-9 !py-1.5"
                value={damageType}
                placeholder="Damage type"
                options={damageTypeOptions()}
                onValueChange={onDamageTypeChange}
              />
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-[0.92fr_1.03fr_1.08fr_0.8fr]">
              <Button
                className="!h-[2.3125rem] whitespace-nowrap px-2 !py-1 text-xs"
                type="button"
                icon={Swords}
                variant="danger"
                disabled={!hasTargets}
                onClick={() => onManual("damage")}
              >
                Damage
              </Button>
              <Button
                className="!h-[2.3125rem] whitespace-nowrap px-2 !py-1 text-xs"
                type="button"
                icon={HeartPulse}
                variant="success"
                disabled={!hasTargets}
                onClick={() => onManual("healing")}
              >
                Heal
              </Button>
              <Button
                className="!h-[2.3125rem] whitespace-nowrap px-2 !py-1 text-xs"
                type="button"
                icon={ShieldCheck}
                variant="outline"
                disabled={!hasTargets}
                onClick={onRequestSave}
              >
                Request save
              </Button>
              <MoreActions
                actor={actor}
                combatants={combatants}
                currentTurn={currentTurn}
                hasTargets={hasTargets}
                hpMultiplier={hpMultiplier}
                spellSlotsTracked={spellSlotsTracked}
                spells={spells}
                onActorChange={onActorChange}
                onHpMultiplierChange={onHpMultiplierChange}
                onManualResolution={onManualResolution}
                onOpenCombatLog={onOpenCombatLog}
                onOpenManualSlots={onOpenManualSlots}
                onOpenSpells={onOpenSpells}
                onTemporary={() => onManual("temporary")}
              />
            </div>
          </div>
        )}
        <FlowArrow />
        <TargetSummary
          targets={targets}
          onClearTargets={onClearTargets}
          onRemoveTarget={onRemoveTarget}
        />
      </div>
    </section>
  );
}

function CombatantSummary({
  combatant,
  detail,
  removable = false,
  onRemove,
}: {
  combatant: EncounterRunCombatant;
  detail: string;
  removable?: boolean;
  onRemove?: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-md border border-border bg-background px-4 py-3.5">
      <InitialsAvatar
        className="h-16 w-16 rounded-md text-base"
        name={combatant.displayName}
        size="md"
        src={combatant.avatarUrl}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{combatant.displayName}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
        <div className="mt-1 flex min-w-0 flex-wrap gap-1.5">
          <StatChip icon={Shield} label="AC" tone="primary" value={effectiveAC(combatant)} />
          <StatChip
            icon={HeartPulse}
            label="HP"
            tone="tertiary"
            value={`${combatant.currentHitPoints} / ${effectiveMaxHP(combatant)}`}
          />
        </div>
      </div>
      {removable ? (
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          aria-label={`Remove ${combatant.displayName} from targets`}
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function FlowArrow() {
  return (
    <ArrowRight
      className="mx-auto hidden h-5 w-5 text-muted-foreground xl:block"
      aria-hidden="true"
    />
  );
}

function TargetSummary({
  targets,
  onClearTargets,
  onRemoveTarget,
}: {
  targets: EncounterRunCombatant[];
  onClearTargets: () => void;
  onRemoveTarget: (id: string) => void;
}) {
  if (targets.length === 0) {
    return (
      <div className="grid min-h-20 place-items-center rounded-md border border-dashed border-border bg-background px-3 py-2 text-center text-sm text-muted-foreground">
        Select a target from the turn order
      </div>
    );
  }
  const target = targets[0];
  return (
    <div className="relative min-w-0">
      <CombatantSummary
        combatant={target}
        detail={targets.length > 1 ? `Targeting · +${targets.length - 1}` : "Targeting"}
        removable={targets.length > 1}
        onRemove={() => onRemoveTarget(target.id)}
      />
      {targets.length > 1 ? (
        <button
          type="button"
          className="absolute right-2 top-1 text-[0.65rem] font-semibold text-muted-foreground hover:text-foreground"
          onClick={onClearTargets}
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}

function MoreActions({
  actor,
  combatants,
  currentTurn,
  hasTargets,
  hpMultiplier,
  spellSlotsTracked,
  spells,
  onActorChange,
  onHpMultiplierChange,
  onManualResolution,
  onOpenCombatLog,
  onOpenManualSlots,
  onOpenSpells,
  onTemporary,
}: {
  actor: EncounterRunCombatant;
  combatants: EncounterRunCombatant[];
  currentTurn: EncounterRunCombatant;
  hasTargets: boolean;
  hpMultiplier: HpMultiplier;
  spellSlotsTracked: boolean;
  spells: CreatureSpell[];
  onActorChange: (id: string) => void;
  onHpMultiplierChange: (multiplier: HpMultiplier) => void;
  onManualResolution: () => void;
  onOpenCombatLog: () => void;
  onOpenManualSlots: () => void;
  onOpenSpells: (spell?: CreatureSpell) => void;
  onTemporary: () => void;
}) {
  return (
    <details className="group relative">
      <summary className="inline-flex h-[2.3125rem] min-h-0 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-semibold transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35">
        <MoreHorizontal className="h-4 w-4" />
        More
      </summary>
      <div className="absolute right-0 top-12 z-30 grid w-80 gap-3 rounded-lg border border-border bg-card p-3 shadow-xl">
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
          Acting combatant
          <Select
            value={actor.id}
            placeholder="Choose combatant"
            options={combatants.map((combatant) => ({
              value: combatant.id,
              label: `${combatant.displayName}${combatant.id === currentTurn.id ? " · current turn" : ""}`,
            }))}
            onValueChange={onActorChange}
          />
        </label>
        <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-surface p-1">
          {(["half", "full", "double"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={hpMultiplier === option}
              className={[
                "rounded px-2 py-1.5 text-xs font-semibold capitalize transition",
                hpMultiplier === option
                  ? "bg-primary text-primary-foreground"
                  : "text-surface-foreground hover:bg-card hover:text-foreground",
              ].join(" ")}
              onClick={() => onHpMultiplierChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="grid gap-1">
          <Button type="button" icon={ListChecks} variant="ghost" onClick={onOpenCombatLog}>
            Combat log
          </Button>
          <Button
            type="button"
            icon={ListChecks}
            variant="ghost"
            disabled={!hasTargets}
            onClick={onManualResolution}
          >
            Manual result
          </Button>
          <Button
            type="button"
            icon={HeartPulse}
            variant="ghost"
            disabled={!hasTargets}
            onClick={onTemporary}
          >
            Grant temporary HP
          </Button>
          {spells.length > 0 ? (
            <Button
              type="button"
              icon={WandSparkles}
              variant="ghost"
              onClick={() => onOpenSpells()}
            >
              Browse spells
            </Button>
          ) : null}
          {spellSlotsTracked ? (
            <Button type="button" icon={WandSparkles} variant="ghost" onClick={onOpenManualSlots}>
              Manage spell slots
            </Button>
          ) : null}
        </div>
      </div>
    </details>
  );
}
