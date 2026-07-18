import { HeartPulse, ListChecks, ShieldCheck, WandSparkles, X } from "lucide-react";
import { useState } from "react";
import { damageTypeOptions } from "../../components/shared/damageTypes";
import { Button, Input, Select } from "../../components/ui";
import { effectiveMaxHP } from "../../lib/domain/combat";
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
  onOpenSpells: (spell?: CreatureSpell) => void;
  onRequestSave: () => void;
  onRemoveTarget: (id: string) => void;
}) {
  const targets = combatants.filter((combatant) => targetIDs.includes(combatant.id));
  const actionDisabledReason =
    targets.length === 0
      ? "Select one target before choosing an attack."
      : targets.length > 1
        ? "Attacks currently resolve against one target at a time."
        : undefined;

  return (
    <section
      aria-label="Turn actions"
      className="combat-panel rounded-lg border border-border bg-card p-2 xl:p-3"
    >
      <div className="grid gap-3">
        <div className="grid gap-3 border-b border-border pb-3 lg:grid-cols-2">
          <ActorControl
            actor={actor}
            combatants={combatants}
            currentTurn={currentTurn}
            onActorChange={onActorChange}
          />
          <TargetSummary
            targets={targets}
            onClearTargets={onClearTargets}
            onRemoveTarget={onRemoveTarget}
          />
        </div>

        {actorNeedsDeathSaves ? (
          <DeathSaveControls combatant={actor} onDeathSave={onDeathSave} />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
            <QuickHpForm
              amount={hpAmount}
              damageType={damageType}
              multiplier={hpMultiplier}
              targets={targets}
              onAmountChange={onAmountChange}
              onDamageTypeChange={onDamageTypeChange}
              onMultiplierChange={onHpMultiplierChange}
              onSubmit={onManual}
            />
            <ResolutionActionControls
              actions={actions}
              actionDisabledReason={actionDisabledReason}
              hasTargets={targets.length > 0}
              spells={spells}
              spellSlotsTracked={spellSlotsTracked}
              onAction={onAction}
              onManualResolution={onManualResolution}
              onOpenManualSlots={onOpenManualSlots}
              onOpenSpells={onOpenSpells}
              onRequestSave={onRequestSave}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function ActorControl({
  actor,
  combatants,
  currentTurn,
  onActorChange,
}: {
  actor: EncounterRunCombatant;
  combatants: EncounterRunCombatant[];
  currentTurn: EncounterRunCombatant;
  onActorChange: (id: string) => void;
}) {
  const outOfTurn = actor.id !== currentTurn.id;
  return (
    <div className="grid min-w-0 gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label className="text-sm font-semibold" htmlFor="encounter-acting-combatant">
          Acting combatant
        </label>
        <span className="text-xs text-muted-foreground">
          {outOfTurn ? `Current turn: ${currentTurn.displayName}` : "Matches current turn"}
        </span>
      </div>
      <div id="encounter-acting-combatant">
        <Select
          value={actor.id}
          placeholder="Choose combatant"
          options={combatants.map((combatant) => ({
            value: combatant.id,
            label: `${combatant.displayName} · ${sideLabel(combatant.side)}`,
          }))}
          onValueChange={onActorChange}
        />
      </div>
    </div>
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
  return (
    <div className="grid min-w-0 gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">
          {targets.length === 0
            ? "No targets selected"
            : `${targets.length} selected target${targets.length === 1 ? "" : "s"}`}
        </div>
        {targets.length > 0 && (
          <Button size="sm" variant="ghost" onClick={onClearTargets}>
            Clear
          </Button>
        )}
      </div>
      {targets.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
          Use the target control in initiative. Opening a sheet does not change targets.
        </div>
      ) : (
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {targets.map((target) => (
            <div
              key={target.id}
              className="flex w-full min-w-0 items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-sm sm:w-auto sm:flex-1"
            >
              <span className="min-w-0 flex-1 truncate font-medium">{target.displayName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                AC {target.armorClassOverride || target.armorClass + target.armorClassBonus} · HP{" "}
                {target.currentHitPoints}/{effectiveMaxHP(target)}
              </span>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Remove ${target.displayName} from targets`}
                onClick={() => onRemoveTarget(target.id)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResolutionActionControls({
  actions,
  actionDisabledReason,
  hasTargets,
  spells,
  spellSlotsTracked,
  onAction,
  onManualResolution,
  onOpenManualSlots,
  onOpenSpells,
  onRequestSave,
}: {
  actions: CreatureAction[];
  actionDisabledReason?: string;
  hasTargets: boolean;
  spells: CreatureSpell[];
  spellSlotsTracked: boolean;
  onAction: (action: CreatureAction, event?: React.MouseEvent) => void;
  onManualResolution: () => void;
  onOpenManualSlots: () => void;
  onOpenSpells: (spell?: CreatureSpell) => void;
  onRequestSave: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="col-span-2 text-sm font-semibold">Attacks, spells, and saves</div>
      {(actions.length > 0 || spells.length > 0) && (
        <CombatActionPicker
          actions={actions}
          actionDisabledReason={actionDisabledReason}
          spells={spells}
          onAction={onAction}
          onSpell={onOpenSpells}
        />
      )}
      <Button
        type="button"
        variant="secondary"
        icon={ShieldCheck}
        disabled={!hasTargets}
        onClick={onRequestSave}
      >
        Request save
      </Button>
      <Button
        type="button"
        variant="outline"
        icon={ListChecks}
        disabled={!hasTargets}
        onClick={onManualResolution}
      >
        Manual result
      </Button>
      {spellSlotsTracked && (
        <Button
          className="col-span-2"
          type="button"
          variant="ghost"
          icon={WandSparkles}
          onClick={onOpenManualSlots}
        >
          Manage spell slots
        </Button>
      )}
    </div>
  );
}

function QuickHpForm({
  amount: rawAmount,
  damageType,
  multiplier,
  targets,
  onAmountChange,
  onDamageTypeChange,
  onMultiplierChange,
  onSubmit,
}: {
  amount: string;
  damageType: string;
  multiplier: HpMultiplier;
  targets: EncounterRunCombatant[];
  onAmountChange: (value: string) => void;
  onDamageTypeChange: (value: string) => void;
  onMultiplierChange: (value: HpMultiplier) => void;
  onSubmit: (mode: "damage" | "healing" | "temporary") => void;
}) {
  const [mode, setMode] = useState<"damage" | "healing" | "temporary">("damage");
  const amount = adjustedAmount(rawAmount, multiplier);
  const canApply = targets.length > 0 && amount > 0;
  const apply = () => canApply && onSubmit(mode);

  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Quick damage and healing</div>
          <div className="text-xs text-muted-foreground">Enter applies to selected targets.</div>
        </div>
        {mode === "damage" && (
          <div className="w-full sm:w-48">
            <Select
              value={damageType}
              placeholder="Damage type"
              options={damageTypeOptions()}
              onValueChange={onDamageTypeChange}
            />
          </div>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-surface p-1">
          <ModeButton active={mode === "damage"} onClick={() => setMode("damage")}>
            Damage
          </ModeButton>
          <ModeButton active={mode === "healing"} onClick={() => setMode("healing")}>
            Healing
          </ModeButton>
          <ModeButton active={mode === "temporary"} onClick={() => setMode("temporary")}>
            Temp HP
          </ModeButton>
        </div>
        <Input
          aria-label="HP adjustment amount"
          autoComplete="off"
          className="text-center text-lg font-semibold tabular-nums"
          inputMode="numeric"
          min={0}
          placeholder="Amount"
          type="number"
          value={rawAmount}
          onChange={(event) => onAmountChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            apply();
          }}
        />
        <div className="grid grid-cols-3 gap-1">
          {(["half", "full", "double"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={multiplier === option}
              className={[
                "rounded-md border px-2 py-1.5 text-sm font-semibold capitalize transition",
                multiplier === option
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-surface",
              ].join(" ")}
              onClick={() => onMultiplierChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <Button
          type="submit"
          disabled={!canApply}
          icon={HeartPulse}
          variant={mode === "damage" ? "danger" : mode === "healing" ? "success" : "primary"}
        >
          {mode === "temporary" ? "Grant temporary HP" : `Apply ${mode}`}
          {targets.length > 1 ? ` to ${targets.length}` : ""}
        </Button>
      </div>
      {targets.length > 0 && amount > 0 && (
        <div className="text-xs text-muted-foreground">
          Adjusted amount: {amount} · {targets.length} target{targets.length === 1 ? "" : "s"}
        </div>
      )}
    </form>
  );
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={[
        "rounded px-2 py-1.5 text-sm font-semibold transition",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-surface-foreground hover:bg-card hover:text-foreground",
      ].join(" ")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function adjustedAmount(value: string, multiplier: HpMultiplier) {
  const amount = Math.max(0, Number(value) || 0);
  if (multiplier === "half") return Math.floor(amount / 2);
  if (multiplier === "double") return amount * 2;
  return amount;
}

function sideLabel(side: EncounterRunCombatant["side"]) {
  if (side === "player") return "Player";
  if (side === "friendly") return "Friendly";
  return "Enemy";
}
