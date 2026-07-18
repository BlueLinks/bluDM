import { Dice5, Pencil, RotateCcw } from "lucide-react";
import type { RollLogEntry } from "../../components/RollLogProvider";
import { damageTypes } from "../../components/shared/damageTypes";
import { Button, Input } from "../../components/ui";
import type { ActionRollPart } from "../../types";
import { adjustDamageComponent } from "./resolutionModel";

export type AddRollLogEntry = (entry: Omit<RollLogEntry, "createdAt" | "id">) => void;

export function ActionHitResult({
  actionSpecial,
  damage,
  editingDamage,
  immunities,
  missEffect,
  resistances,
  rollVersions,
  rolls,
  totalDamage,
  vulnerabilities,
  calculatedDamage,
  onDamageChange,
  onEditingChange,
  onRerollDamage,
  onRerollRoll,
  onResolve,
}: {
  actionSpecial: string;
  damage: string;
  editingDamage: boolean;
  immunities: string[];
  missEffect: string;
  resistances: string[];
  rollVersions: Record<string, number>;
  rolls: ActionRollPart[];
  totalDamage: number;
  vulnerabilities: string[];
  calculatedDamage: number;
  onDamageChange: (damage: string) => void;
  onEditingChange: (editing: boolean | ((current: boolean) => boolean)) => void;
  onRerollDamage: () => void;
  onRerollRoll: (roll: ActionRollPart, segment: "base" | "critical") => void;
  onResolve: (override: string, damage: number) => void;
}) {
  return (
    <div className="grid gap-4 rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase text-muted-foreground">Damage Breakdown</div>
          <div className="text-sm text-muted-foreground">
            Base roll plus modifier. Critical hits add a second full roll plus modifier.
          </div>
        </div>
        <Button type="button" icon={Dice5} variant="secondary" onClick={onRerollDamage}>
          Reroll all damage
        </Button>
      </div>
      <div className="mt-2 grid gap-2">
        {rolls.map((roll) => (
          <DamageRollLine
            key={rollKey(roll)}
            roll={roll}
            version={rollVersions[rollKey(roll)] ?? 0}
            vulnerabilities={vulnerabilities}
            resistances={resistances}
            immunities={immunities}
            onReroll={onRerollRoll}
          />
        ))}
        {rolls.length === 0 && (
          <div className="text-sm text-muted-foreground">This action has no damage roll parts.</div>
        )}
      </div>
      <div className="grid gap-2 rounded-md border border-border bg-card p-3 text-sm">
        <div>
          <span className="font-semibold">On hit:</span> {actionSpecial}
        </div>
        <div>
          <span className="font-semibold">On miss:</span> {missEffect}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-3">
        <div>
          <div className="text-xs font-bold uppercase text-muted-foreground">Total Damage</div>
          {editingDamage ? (
            <Input
              className="mt-1 w-28 text-center text-xl font-black"
              type="number"
              min={0}
              value={damage}
              onChange={(event) => onDamageChange(event.target.value)}
            />
          ) : (
            <div className="text-3xl font-black text-destructive">{totalDamage}</div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            icon={Pencil}
            variant="secondary"
            onClick={() => onEditingChange((current) => !current)}
          >
            {editingDamage ? "Done" : "Edit"}
          </Button>
          {editingDamage && (
            <Button
              type="button"
              icon={RotateCcw}
              variant="ghost"
              onClick={() => onDamageChange(String(calculatedDamage))}
            >
              Reset
            </Button>
          )}
        </div>
      </div>
      <div className="grid overflow-hidden rounded-lg border border-border sm:grid-cols-4">
        <Button
          className="rounded-none py-3"
          variant="primary"
          onClick={() => onResolve("full", totalDamage)}
        >
          Full
        </Button>
        <Button
          className="rounded-none border-y border-border py-3 sm:border-x sm:border-y-0"
          variant="secondary"
          onClick={() => onResolve("half", totalDamage)}
        >
          Half
        </Button>
        <Button
          className="rounded-none border-b border-border py-3 sm:border-b-0 sm:border-r"
          variant="danger"
          onClick={() => onResolve("double", totalDamage)}
        >
          Double
        </Button>
        <Button
          className="rounded-none py-3"
          variant="ghost"
          onClick={() => onResolve("ignore", totalDamage)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function DamageRollLine({
  version,
  roll,
  vulnerabilities,
  resistances,
  immunities,
  onReroll,
}: {
  version: number;
  roll: ActionRollPart;
  vulnerabilities: string[];
  resistances: string[];
  immunities: string[];
  onReroll: (roll: ActionRollPart, segment: "base" | "critical") => void;
}) {
  const damageType = roll.damageType.trim().toLowerCase();
  const damage = damageTypes.find((type) => type.id === damageType);
  const Icon = damage?.icon;
  const total = Number(roll.total) || 0;
  const baseRolled = baseRolledValue(roll);
  const criticalExtra = Number(roll.criticalRolledValue) || 0;
  const defense = damageAdjustment(damageType, total, vulnerabilities, resistances, immunities);
  return (
    <div
      key={`${rollKey(roll)}-${version}`}
      className="damage-roll-line grid gap-3 rounded-md border border-border bg-card p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-companion-metadata" />}
          <span className="font-semibold">{damage?.label ?? roll.damageType}</span>
          <span className="text-xs text-muted-foreground">
            {roll.diceCount}d{roll.dieSize}
            {roll.fixedValue > 0
              ? ` + ${roll.fixedValue}`
              : roll.fixedValue < 0
                ? ` - ${Math.abs(roll.fixedValue)}`
                : ""}
          </span>
        </div>
        <div className={["text-sm font-bold", defense.tone].join(" ")}>
          {defense.label}: {defense.total}
        </div>
      </div>
      <div
        className={["grid gap-2", criticalExtra > 0 ? "sm:grid-cols-3" : "sm:grid-cols-2"].join(
          " ",
        )}
      >
        <DamageSegment
          label="Base roll"
          value={baseRolled}
          modifier={roll.fixedValue}
          total={baseRolled + roll.fixedValue}
          onReroll={() => onReroll(roll, "base")}
        />
        {criticalExtra > 0 && (
          <DamageSegment
            label="Critical roll"
            value={criticalExtra}
            modifier={0}
            total={criticalExtra}
            critical
            onReroll={() => onReroll(roll, "critical")}
          />
        )}
        <div className="rounded-md border border-border bg-background px-3 py-2">
          <div className="text-xs font-bold uppercase text-muted-foreground">Total</div>
          <div className="text-lg font-black">{total}</div>
        </div>
      </div>
    </div>
  );
}

function DamageSegment({
  critical = false,
  label,
  modifier,
  total,
  value,
  onReroll,
}: {
  critical?: boolean;
  label: string;
  modifier: number;
  total: number;
  value: number;
  onReroll: () => void;
}) {
  return (
    <div
      className={[
        "rounded-md border px-3 py-2",
        critical ? "border-warning/50 bg-warning/10" : "border-border bg-background",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div
            className={[
              "text-xs font-bold uppercase",
              critical ? "text-warning" : "text-muted-foreground",
            ].join(" ")}
          >
            {label}
          </div>
          <div className={["text-lg font-black", critical ? "text-warning" : ""].join(" ")}>
            {total}
          </div>
          <div className="text-xs text-muted-foreground">
            {value}
            {modifier === 0 ? "" : ` ${modifier > 0 ? "+" : "-"} ${Math.abs(modifier)}`}
          </div>
        </div>
        <Button type="button" icon={Dice5} size="sm" variant="secondary" onClick={onReroll}>
          Reroll
        </Button>
      </div>
    </div>
  );
}

function damageAdjustment(
  damageType: string,
  total: number,
  vulnerabilities: string[],
  resistances: string[],
  immunities: string[],
) {
  const adjusted = adjustDamageComponent(total, damageType, {
    vulnerabilities,
    resistances,
    immunities,
  });
  const labels = {
    immune: "Immune",
    vulnerable: "Vulnerable",
    resistant: "Resistant",
    normal: "Normal",
  };
  const tones = {
    immune: "text-info",
    vulnerable: "text-destructive",
    resistant: "text-warning",
    normal: "text-muted-foreground",
  };
  return { label: labels[adjusted.defense], total: adjusted.amount, tone: tones[adjusted.defense] };
}

export function bumpRollVersions(rolls: ActionRollPart[], current: Record<string, number>) {
  return rolls.reduce<Record<string, number>>(
    (next, roll) => {
      const key = rollKey(roll);
      next[key] = (current[key] ?? 0) + 1;
      return next;
    },
    { ...current },
  );
}

export function rollKey(roll: ActionRollPart) {
  return roll.id ?? `${roll.damageType}-${roll.sortOrder ?? 0}`;
}

function baseRolledValue(roll: ActionRollPart) {
  return (
    Number(roll.rolledValue) ||
    Math.max(
      0,
      (Number(roll.total) || 0) - (Number(roll.criticalRolledValue) || 0) - roll.fixedValue,
    )
  );
}

export function adjustRollsForCritical(rolls: ActionRollPart[], critical: boolean) {
  return rolls.map((roll) => {
    const baseRolled = baseRolledValue(roll);
    const criticalRolledValue = critical
      ? Number(roll.criticalRolledValue) || rollDiceTotal(roll.diceCount, roll.dieSize)
      : 0;
    return {
      ...roll,
      rolledValue: baseRolled,
      criticalRolledValue,
      total: damageRollTotal(baseRolled, criticalRolledValue, roll.fixedValue),
    };
  });
}

export function rerollRollSegment(
  roll: ActionRollPart,
  segment: "base" | "critical",
  critical: boolean,
) {
  const rolledValue =
    segment === "base" ? rollDiceTotal(roll.diceCount, roll.dieSize) : baseRolledValue(roll);
  const criticalRolledValue = critical
    ? segment === "critical"
      ? rollDiceTotal(roll.diceCount, roll.dieSize)
      : Number(roll.criticalRolledValue) || rollDiceTotal(roll.diceCount, roll.dieSize)
    : 0;
  return {
    ...roll,
    rolledValue,
    criticalRolledValue,
    total: damageRollTotal(rolledValue, criticalRolledValue, roll.fixedValue),
  };
}

export function rerollDamageRolls(rolls: ActionRollPart[], critical: boolean) {
  return rolls.map((roll) => {
    const rolledValue = rollDiceTotal(roll.diceCount, roll.dieSize);
    const criticalRolledValue = critical ? rollDiceTotal(roll.diceCount, roll.dieSize) : 0;
    const total = damageRollTotal(rolledValue, criticalRolledValue, roll.fixedValue);
    return { ...roll, rolledValue, criticalRolledValue, total };
  });
}

function damageRollTotal(baseRolled: number, criticalRolled: number, fixedValue: number) {
  return Math.max(0, baseRolled + criticalRolled + fixedValue);
}

function rollDiceTotal(count: number, dieSize: number) {
  const safeCount = Math.max(1, Number(count) || 1);
  const safeDie = Math.max(2, Number(dieSize) || 6);
  let total = 0;
  for (let index = 0; index < safeCount; index += 1) {
    total += Math.floor(Math.random() * safeDie) + 1;
  }
  return total;
}

export function adjustDamageTotal(
  rolls: ActionRollPart[],
  vulnerabilities: string[],
  resistances: string[],
  immunities: string[],
) {
  return rolls.reduce(
    (total, roll) =>
      total +
      damageAdjustment(
        roll.damageType.trim().toLowerCase(),
        Number(roll.total) || 0,
        vulnerabilities,
        resistances,
        immunities,
      ).total,
    0,
  );
}

export function logDamageRoll(
  addRollLogEntry: AddRollLogEntry,
  title: string,
  targetName: string,
  rolls: ActionRollPart[],
) {
  const total = rolls.reduce((sum, roll) => sum + (Number(roll.total) || 0), 0);
  addRollLogEntry({
    title,
    notation: rolls.map((roll) => `${roll.diceCount}d${roll.dieSize}`).join(" + "),
    detail: rolls.map(damageRollDetail).join(" · "),
    total,
    target: targetName,
    rollType: "Damage",
  });
}

function damageRollDetail(roll: ActionRollPart) {
  const base = baseRolledValue(roll);
  const critical = Number(roll.criticalRolledValue) || 0;
  const modifier =
    roll.fixedValue === 0 ? "" : ` ${roll.fixedValue > 0 ? "+" : "-"} ${Math.abs(roll.fixedValue)}`;
  return `${roll.damageType}: ${base}${critical ? ` + crit ${critical}` : ""}${modifier}`;
}
