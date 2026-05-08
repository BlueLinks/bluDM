import { Dice5, Pencil, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { damageTypes } from "../../components/shared/damageTypes";
import { Badge, Button, Input } from "../../components/ui";
import {
  combatantSheet,
  effectiveAC,
  effectiveMaxHP,
  rollDiceDetail,
  rollModeLabel,
  stringArrayFromSheet,
} from "../../lib/domain/combat";
import { hitSpecialEvents, missEffects } from "../../lib/domain/options";
import type { ActionRollPart, CreatureAction, EncounterRunCombatant, RollMode } from "../../types";
import { RunCombatantAvatar as Avatar } from "./RunCombatantAvatar";

export function ActionResult({
  result,
  target,
  onCancel,
  onResolve,
}: {
  result: Record<string, unknown>;
  target: EncounterRunCombatant;
  onCancel: () => void;
  onResolve: (override: string, damage: number) => void;
}) {
  const action = result.action as CreatureAction | undefined;
  const resultRolls = Array.isArray(result.rolls) ? (result.rolls as ActionRollPart[]) : [];
  const rollMode = typeof result.rollMode === "string" ? (result.rollMode as RollMode) : "normal";
  const adjustedDamage = Number(result.adjustedDamage) || 0;
  const targetAC = Number(result.targetAC) || 0;
  const attackModifier = Number(action?.attackModifier) || 0;
  const initialAttack = attackStateFromResult(result, attackModifier, targetAC);
  const [attack, setAttack] = useState(initialAttack);
  const calculatedHit = attack.hit;
  const critical = attack.critical;
  const attackDetail = `${rollDiceDetail(result)}${attackModifier === 0 ? "" : ` ${attackModifier > 0 ? "+" : ""}${attackModifier}`} vs AC ${targetAC} · ${rollModeLabel(rollMode)}`;
  const currentAttackDetail = `${rollDiceDetail({ d20: attack.d20, d20Rolls: attack.d20Rolls })}${attackModifier === 0 ? "" : ` ${attackModifier > 0 ? "+" : ""}${attackModifier}`} vs AC ${targetAC} · ${rollModeLabel(rollMode)}`;
  const rollAnimationKey = `${attack.d20}-${attack.attackTotal}-${attack.d20Rolls.join("-")}-${critical ? "crit" : "normal"}`;
  const [hit, setHit] = useState(calculatedHit);
  const [editingDamage, setEditingDamage] = useState(false);
  const [damage, setDamage] = useState(String(adjustedDamage));
  const [rolls, setRolls] = useState(resultRolls);
  const [damageAnimationVersion, setDamageAnimationVersion] = useState<Record<string, number>>({});
  useEffect(() => {
    const nextAttack = attackStateFromResult(result, attackModifier, targetAC);
    setAttack(nextAttack);
    setHit(nextAttack.hit);
    setDamage(String(adjustedDamage));
    setRolls(resultRolls);
    setDamageAnimationVersion({});
    setEditingDamage(false);
  }, [adjustedDamage, attackModifier, result, targetAC]);
  const totalDamage = Math.max(0, Number(damage) || 0);
  const sheet = combatantSheet(target);
  const vulnerabilities = stringArrayFromSheet(sheet.damageVulnerabilities);
  const resistances = stringArrayFromSheet(sheet.damageResistances);
  const immunities = stringArrayFromSheet(sheet.damageImmunities);
  const actionSpecial =
    hitSpecialEvents.find((event) => event.value === action?.hitSpecialEvent)?.label ?? "No effect";
  const missEffect =
    missEffects.find((effect) => effect.value === action?.missEffect)?.label ?? "No effect";
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
        <Avatar combatant={target} />
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase text-muted-foreground">Target</div>
          <div className="truncate text-lg font-semibold">{target.displayName}</div>
          <div className="text-sm text-muted-foreground">
            AC {effectiveAC(target)} · HP {target.currentHitPoints}/{effectiveMaxHP(target)}
          </div>
        </div>
      </div>
      <div
        key={rollAnimationKey}
        className={[
          "action-roll-card rounded-lg border bg-background p-4 transition",
          critical
            ? "crit-roll-card border-amber-400/70 bg-amber-500/10 shadow-lg shadow-amber-500/20"
            : "border-border",
        ].join(" ")}
      >
        <div
          className={[
            "text-xs font-bold uppercase",
            critical ? "text-amber-700 dark:text-amber-200" : "text-muted-foreground",
          ].join(" ")}
        >
          Roll To Hit
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <div
            className={
              critical
                ? "crit-roll-value text-5xl font-black leading-none text-amber-600 drop-shadow-sm dark:text-amber-200"
                : "action-roll-value text-2xl font-black"
            }
          >
            {attack.attackTotal}
          </div>
          <div className="text-sm text-muted-foreground">{currentAttackDetail || attackDetail}</div>
          <Badge tone={calculatedHit ? "friendly" : "default"}>
            {calculatedHit ? "Calculated hit" : "Calculated miss"}
          </Badge>
          {critical && (
            <span className="crit-roll-badge rounded-md border border-amber-400/70 bg-amber-400/20 px-3 py-1 text-sm font-black uppercase text-amber-700 dark:text-amber-100">
              Critical hit
            </span>
          )}
          {action && (
            <Button
              type="button"
              icon={Dice5}
              size="sm"
              variant="secondary"
              onClick={() => {
                const nextAttack = rerollAttack(rollMode, attackModifier, targetAC);
                const nextRolls = adjustRollsForCritical(rolls, nextAttack.critical);
                setAttack(nextAttack);
                setHit(nextAttack.hit);
                setRolls(nextRolls);
                setDamage(
                  String(adjustDamageTotal(nextRolls, vulnerabilities, resistances, immunities)),
                );
                setEditingDamage(false);
              }}
            >
              Reroll to hit
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-background p-1">
        <button
          type="button"
          className={[
            "rounded-md px-3 py-2 text-sm font-bold transition",
            hit
              ? "bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950"
              : "text-muted-foreground hover:bg-muted",
          ].join(" ")}
          onClick={() => setHit(true)}
        >
          Hit
        </button>
        <button
          type="button"
          className={[
            "rounded-md px-3 py-2 text-sm font-bold transition",
            !hit ? "bg-red-600 text-white" : "text-muted-foreground hover:bg-muted",
          ].join(" ")}
          onClick={() => setHit(false)}
        >
          Miss
        </button>
      </div>
      {hit ? (
        <ActionHitResult
          actionSpecial={actionSpecial}
          damage={damage}
          editingDamage={editingDamage}
          immunities={immunities}
          missEffect={missEffect}
          resistances={resistances}
          rollVersions={damageAnimationVersion}
          rolls={rolls}
          totalDamage={totalDamage}
          vulnerabilities={vulnerabilities}
          calculatedDamage={adjustDamageTotal(rolls, vulnerabilities, resistances, immunities)}
          onDamageChange={setDamage}
          onEditingChange={setEditingDamage}
          onRerollDamage={() => {
            const nextRolls = rerollDamageRolls(rolls, critical);
            setRolls(nextRolls);
            setDamageAnimationVersion(bumpRollVersions(nextRolls, damageAnimationVersion));
            setDamage(
              String(adjustDamageTotal(nextRolls, vulnerabilities, resistances, immunities)),
            );
            setEditingDamage(false);
          }}
          onRerollRoll={(roll, segment) => {
            const key = rollKey(roll);
            const nextRolls = rolls.map((item) =>
              rollKey(item) === key ? rerollRollSegment(item, segment, critical) : item,
            );
            setRolls(nextRolls);
            setDamageAnimationVersion((current) => ({
              ...current,
              [key]: (current[key] ?? 0) + 1,
            }));
            setDamage(
              String(adjustDamageTotal(nextRolls, vulnerabilities, resistances, immunities)),
            );
            setEditingDamage(false);
          }}
          onResolve={onResolve}
        />
      ) : (
        <div className="grid gap-3 rounded-lg border border-border bg-background p-4">
          <div>
            <div className="text-xs font-bold uppercase text-muted-foreground">Miss</div>
            <div className="text-lg font-semibold">
              {action?.name ?? "Action"} missed {target.displayName}
            </div>
            <div className="text-sm text-muted-foreground">No damage will be applied.</div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onResolve("ignore", 0)}>
              Missed
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionHitResult({
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
      <div>
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
            <div className="text-sm text-muted-foreground">
              This action has no damage roll parts.
            </div>
          )}
        </div>
      </div>
      <div className="grid gap-2 rounded-md border border-border bg-card p-3 text-sm">
        <div>
          <span className="font-semibold">On hit:</span> {actionSpecial}
        </div>
        <div>
          <span className="font-semibold">On miss:</span> {missEffect}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
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
            <div className="text-3xl font-black text-primary">{totalDamage}</div>
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
          variant="success"
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
          {Icon && <Icon className="h-4 w-4 text-accent" />}
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
            modifier={roll.fixedValue}
            total={criticalExtra + roll.fixedValue}
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
        critical ? "border-amber-400/50 bg-amber-400/10" : "border-border bg-background",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div
            className={[
              "text-xs font-bold uppercase",
              critical ? "text-amber-700 dark:text-amber-200" : "text-muted-foreground",
            ].join(" ")}
          >
            {label}
          </div>
          <div
            className={[
              "text-lg font-black",
              critical ? "text-amber-700 dark:text-amber-200" : "",
            ].join(" ")}
          >
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
  if (immunities.some((item) => item.toLowerCase() === damageType)) {
    return { label: "Immune", total: 0, tone: "text-sky-700 dark:text-sky-300" };
  }
  if (vulnerabilities.some((item) => item.toLowerCase() === damageType)) {
    return { label: "Vulnerable", total: total * 2, tone: "text-red-700 dark:text-red-300" };
  }
  if (resistances.some((item) => item.toLowerCase() === damageType)) {
    return {
      label: "Resistant",
      total: Math.floor(total / 2),
      tone: "text-amber-700 dark:text-amber-300",
    };
  }
  return { label: "Normal", total, tone: "text-muted-foreground" };
}

function attackStateFromResult(
  result: Record<string, unknown>,
  attackModifier: number,
  targetAC: number,
) {
  const d20 = Number(result.d20) || 0;
  const d20Rolls = Array.isArray(result.d20Rolls)
    ? result.d20Rolls.map((roll) => Number(roll)).filter(Boolean)
    : [d20].filter(Boolean);
  const attackTotal = Number(result.attackTotal) || d20 + attackModifier;
  const critical = result.critical === true || d20 === 20;
  const hit =
    result.hit === true ||
    String(result.hit) === "true" ||
    critical ||
    (d20 !== 1 && attackTotal >= targetAC);
  return { d20, d20Rolls: d20Rolls.length > 0 ? d20Rolls : [d20], attackTotal, critical, hit };
}

function rerollAttack(rollMode: RollMode, attackModifier: number, targetAC: number) {
  const d20Rolls = rollMode === "normal" ? [rollD20()] : [rollD20(), rollD20()];
  const d20 =
    rollMode === "advantage"
      ? Math.max(...d20Rolls)
      : rollMode === "disadvantage"
        ? Math.min(...d20Rolls)
        : d20Rolls[0];
  const attackTotal = d20 + attackModifier;
  const critical = d20 === 20;
  const hit = critical || (d20 !== 1 && attackTotal >= targetAC);
  return { d20, d20Rolls, attackTotal, critical, hit };
}

function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

function bumpRollVersions(rolls: ActionRollPart[], current: Record<string, number>) {
  return rolls.reduce<Record<string, number>>(
    (next, roll) => {
      const key = rollKey(roll);
      next[key] = (current[key] ?? 0) + 1;
      return next;
    },
    { ...current },
  );
}

function rollKey(roll: ActionRollPart) {
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

function adjustRollsForCritical(rolls: ActionRollPart[], critical: boolean) {
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

function rerollRollSegment(roll: ActionRollPart, segment: "base" | "critical", critical: boolean) {
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

function rerollDamageRolls(rolls: ActionRollPart[], critical: boolean) {
  return rolls.map((roll) => {
    const rolledValue = rollDiceTotal(roll.diceCount, roll.dieSize);
    const criticalRolledValue = critical ? rollDiceTotal(roll.diceCount, roll.dieSize) : 0;
    const total = damageRollTotal(rolledValue, criticalRolledValue, roll.fixedValue);
    return { ...roll, rolledValue, criticalRolledValue, total };
  });
}

function damageRollTotal(baseRolled: number, criticalRolled: number, fixedValue: number) {
  const base = baseRolled + fixedValue;
  const critical = criticalRolled > 0 ? criticalRolled + fixedValue : 0;
  return Math.max(0, base + critical);
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

function adjustDamageTotal(
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
