import { Check, Dice5, RotateCcw, X } from "lucide-react";
import { InitialsAvatar } from "../../components/shared/displayPrimitives";
import { Button, Field, Input } from "../../components/ui";
import type { EncounterRunCombatant, RollMode } from "../../types";
import {
  isSaveTargetResolved,
  previewResolutionTarget,
  saveModifier,
  type ResolutionTarget,
} from "./resolutionModel";

type ResultMethod = "automatic" | "physical" | "outcome";

export function SaveResultList({
  combatants,
  results,
  showDamage,
  onChange,
  onRoll,
}: {
  combatants: EncounterRunCombatant[];
  results: ResolutionTarget[];
  showDamage: boolean;
  onChange: (target: ResolutionTarget) => void;
  onRoll: (target: ResolutionTarget) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      {results.map((result) => {
        const combatant = combatants.find((item) => item.id === result.targetId);
        if (!combatant) return null;
        return (
          <SaveResultRow
            key={result.targetId}
            combatant={combatant}
            result={result}
            showDamage={showDamage}
            onChange={onChange}
            onRoll={onRoll}
          />
        );
      })}
    </div>
  );
}

function SaveResultRow({
  combatant,
  result,
  showDamage,
  onChange,
  onRoll,
}: {
  combatant: EncounterRunCombatant;
  result: ResolutionTarget;
  showDamage: boolean;
  onChange: (target: ResolutionTarget) => void;
  onRoll: (target: ResolutionTarget) => void;
}) {
  const modifier = saveModifier(combatant, result.saveAbility);
  const resolved = isSaveTargetResolved(result);
  const preview = previewResolutionTarget(combatant, result);

  function setMethod(method: ResultMethod) {
    if (method === "automatic") {
      onChange({
        ...result,
        rollSource: "automatic",
        d20Rolls: [],
        rollTotal: 0,
        outcome: "pending",
      });
      return;
    }
    if (method === "physical") {
      onChange({
        ...result,
        rollSource: "physical",
        d20Rolls: [],
        rollTotal: 0,
        outcome: "pending",
      });
      return;
    }
    onChange({
      ...result,
      rollSource: "outcome",
      d20Rolls: [],
      rollTotal: 0,
      outcome:
        result.outcome === "success" || result.outcome === "failure" ? result.outcome : "pending",
    });
  }

  function enterPhysicalRoll(value: string, index: number) {
    const d20Rolls = [...result.d20Rolls];
    d20Rolls[index] = Math.min(20, Math.max(0, Number(value) || 0));
    const requiredRolls = result.rollMode === "normal" ? 1 : 2;
    const rolls = d20Rolls.slice(0, requiredRolls).filter((roll) => roll > 0);
    const selected = selectedPhysicalRoll(rolls, result.rollMode);
    const total = selected > 0 ? selected + modifier : 0;
    const complete = rolls.length === requiredRolls;
    onChange({
      ...result,
      rollSource: "physical",
      d20Rolls: rolls,
      rollTotal: total,
      outcome: complete ? (total >= result.dc ? "success" : "failure") : "pending",
    });
  }

  function changeRollMode(rollMode: RollMode) {
    if (result.rollSource === "outcome") {
      onChange({ ...result, rollMode });
      return;
    }
    const rolls =
      result.rollSource === "physical"
        ? result.d20Rolls.slice(0, rollMode === "normal" ? 1 : 2)
        : [];
    const selected = selectedPhysicalRoll(rolls, rollMode);
    const complete = rolls.length === (rollMode === "normal" ? 1 : 2);
    const total = selected > 0 ? selected + modifier : 0;
    onChange({
      ...result,
      rollMode,
      d20Rolls: rolls,
      rollTotal: total,
      outcome: complete ? (total >= result.dc ? "success" : "failure") : "pending",
    });
  }

  return (
    <div
      className={[
        "grid gap-3 border-b border-border p-3 last:border-b-0",
        result.included ? "bg-card" : "bg-surface opacity-60",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-2">
        <InitialsAvatar name={combatant.displayName} src={combatant.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{combatant.displayName}</div>
          <div className="text-xs text-muted-foreground">
            {result.saveAbility.toUpperCase()} save {formatModifier(modifier)} vs DC {result.dc}
          </div>
        </div>
        <SaveStatus result={result} resolved={resolved} />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label={`${result.included ? "Exclude" : "Include"} ${combatant.displayName}`}
          onClick={() => onChange({ ...result, included: !result.included })}
        >
          {result.included ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        </Button>
      </div>

      {result.included && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[9rem_10rem_minmax(0,1fr)] lg:items-end">
          <Field label="Roll mode">
            <NativeSelect
              label={`${combatant.displayName} roll mode`}
              value={result.rollMode}
              options={[
                { value: "normal", label: "Normal" },
                { value: "advantage", label: "Advantage" },
                { value: "disadvantage", label: "Disadvantage" },
              ]}
              onChange={(value) => changeRollMode(value as RollMode)}
            />
          </Field>
          <Field label="Result method">
            <NativeSelect
              label={`${combatant.displayName} result method`}
              value={result.rollSource}
              options={[
                { value: "automatic", label: "Roll in bluDM" },
                { value: "physical", label: "Enter physical dice" },
                { value: "outcome", label: "Mark outcome" },
              ]}
              onChange={(value) => setMethod(value as ResultMethod)}
            />
          </Field>
          <SaveResultControl
            combatant={combatant}
            modifier={modifier}
            result={result}
            resolved={resolved}
            onChange={onChange}
            onEnterPhysicalRoll={enterPhysicalRoll}
            onRoll={onRoll}
          />
        </div>
      )}

      {result.included && resolved && showDamage && (
        <div className="text-xs text-muted-foreground">
          {preview.finalDamage} damage · projected {preview.projectedHitPoints} HP
          {preview.projectedTemporaryHitPoints > 0
            ? ` + ${preview.projectedTemporaryHitPoints} temp`
            : ""}
        </div>
      )}
    </div>
  );
}

function SaveResultControl({
  combatant,
  modifier,
  result,
  resolved,
  onChange,
  onEnterPhysicalRoll,
  onRoll,
}: {
  combatant: EncounterRunCombatant;
  modifier: number;
  result: ResolutionTarget;
  resolved: boolean;
  onChange: (target: ResolutionTarget) => void;
  onEnterPhysicalRoll: (value: string, index: number) => void;
  onRoll: (target: ResolutionTarget) => void;
}) {
  if (result.rollSource === "physical") {
    const needsSecond = result.rollMode !== "normal";
    const selected = selectedPhysicalRoll(result.d20Rolls, result.rollMode);
    return (
      <div className="grid gap-1.5">
        <div className={needsSecond ? "grid grid-cols-2 gap-2" : "grid"}>
          <Field label="First die">
            <PhysicalD20Input
              label={`First die for ${combatant.displayName}`}
              value={result.d20Rolls[0]}
              onChange={(value) => onEnterPhysicalRoll(value, 0)}
            />
          </Field>
          {needsSecond && (
            <Field label="Second die">
              <PhysicalD20Input
                label={`Second die for ${combatant.displayName}`}
                value={result.d20Rolls[1]}
                onChange={(value) => onEnterPhysicalRoll(value, 1)}
              />
            </Field>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {resolved
            ? `${result.rollMode === "advantage" ? "Higher" : result.rollMode === "disadvantage" ? "Lower" : "Die"} ${selected} ${formatModifier(modifier)} = ${result.rollTotal}`
            : needsSecond
              ? "Enter both dice to resolve this save."
              : "Enter the physical d20 result."}
        </div>
      </div>
    );
  }

  if (result.rollSource === "outcome") {
    return (
      <Field label="Reported outcome">
        <NativeSelect
          label={`${combatant.displayName} save outcome`}
          value={result.outcome === "success" || result.outcome === "failure" ? result.outcome : ""}
          options={[
            { value: "", label: "Choose success or failure" },
            { value: "success", label: "Success" },
            { value: "failure", label: "Failure" },
          ]}
          onChange={(value) =>
            onChange({
              ...result,
              outcome: value === "success" || value === "failure" ? value : "pending",
              rollSource: "outcome",
              d20Rolls: [],
              rollTotal: 0,
            })
          }
        />
      </Field>
    );
  }

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        icon={resolved ? RotateCcw : Dice5}
        onClick={() => onRoll(result)}
      >
        {resolved ? "Reroll" : "Roll"}
      </Button>
      <div className="text-sm">
        {resolved ? (
          <>
            <span className="font-semibold tabular-nums">{automaticRollLabel(result)}</span>
            <span className="ml-2 text-muted-foreground">
              {result.outcome === "success" ? "Success" : "Failure"}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Ready to roll.</span>
        )}
      </div>
    </div>
  );
}

function SaveStatus({ result, resolved }: { result: ResolutionTarget; resolved: boolean }) {
  if (!result.included) {
    return <span className="text-xs font-medium text-muted-foreground">Excluded</span>;
  }
  if (!resolved) {
    return <span className="text-xs font-medium text-muted-foreground">Pending</span>;
  }
  const method =
    result.rollSource === "physical"
      ? "Entered"
      : result.rollSource === "outcome"
        ? "Marked"
        : "Rolled";
  return (
    <span
      className={[
        "text-xs font-semibold",
        result.outcome === "success" ? "text-success" : "text-destructive",
      ].join(" ")}
    >
      {method} · {result.outcome === "success" ? "Success" : "Failure"}
    </span>
  );
}

function PhysicalD20Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      aria-label={label}
      inputMode="numeric"
      min={1}
      max={20}
      placeholder="d20"
      type="number"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function NativeSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      className="min-h-10 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function selectedPhysicalRoll(rolls: number[], mode: RollMode) {
  if (rolls.length === 0) return 0;
  if (mode === "advantage") return Math.max(...rolls);
  if (mode === "disadvantage") return Math.min(...rolls);
  return rolls[0];
}

function automaticRollLabel(result: ResolutionTarget) {
  if (result.d20Rolls.length > 1) {
    return `${result.d20Rolls.join(" / ")} → ${result.rollTotal}`;
  }
  return `${result.d20Rolls[0]} → ${result.rollTotal}`;
}

function formatModifier(value: number) {
  return value >= 0 ? `+${value}` : String(value);
}
