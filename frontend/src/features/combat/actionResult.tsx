import { Dice5 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRollLog } from "../../components/RollLogProvider";
import { Badge, Button } from "../../components/ui";
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
import {
  ActionHitResult,
  adjustDamageTotal,
  adjustRollsForCritical,
  bumpRollVersions,
  logDamageRoll,
  rerollDamageRolls,
  rerollRollSegment,
  rollKey,
  type AddRollLogEntry,
} from "./actionHitResult";
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
  const loggedResult = useRef<Record<string, unknown> | null>(null);
  const { addRollLogEntry } = useRollLog();

  useEffect(() => {
    const nextAttack = attackStateFromResult(result, attackModifier, targetAC);
    setAttack(nextAttack);
    setHit(nextAttack.hit);
    setDamage(String(adjustedDamage));
    setRolls(resultRolls);
    setDamageAnimationVersion({});
    setEditingDamage(false);
  }, [adjustedDamage, attackModifier, result, targetAC]);

  useEffect(() => {
    if (loggedResult.current === result) return;
    loggedResult.current = result;
    logAttackRoll(addRollLogEntry, action?.name ?? "Action", target.displayName, initialAttack, {
      attackModifier,
      rollMode,
      targetAC,
    });
    if (resultRolls.length > 0) {
      logDamageRoll(
        addRollLogEntry,
        `${action?.name ?? "Action"} damage`,
        target.displayName,
        resultRolls,
      );
    }
  }, [
    action?.name,
    addRollLogEntry,
    attackModifier,
    initialAttack,
    result,
    resultRolls,
    rollMode,
    target.displayName,
    targetAC,
  ]);
  const totalDamage = Math.max(0, Number(damage) || 0);
  const sheet = combatantSheet(target);
  const vulnerabilities = stringArrayFromSheet(sheet.damageVulnerabilities);
  const resistances = stringArrayFromSheet(sheet.damageResistances);
  const immunities = stringArrayFromSheet(sheet.damageImmunities);
  const actionSpecial =
    hitSpecialEvents.find((event) => event.value === action?.hitSpecialEvent)?.label ?? "No effect";
  const missEffect =
    missEffects.find((effect) => effect.value === action?.missEffect)?.label ?? "No effect";
  const calculatedDamage = adjustDamageTotal(rolls, vulnerabilities, resistances, immunities);

  function rerollToHit() {
    if (!action) return;
    const nextAttack = rerollAttack(rollMode, attackModifier, targetAC);
    const nextRolls = adjustRollsForCritical(rolls, nextAttack.critical);
    logAttackRoll(addRollLogEntry, `${action.name} attack reroll`, target.displayName, nextAttack, {
      attackModifier,
      rollMode,
      targetAC,
    });
    setAttack(nextAttack);
    setHit(nextAttack.hit);
    setRolls(nextRolls);
    setDamage(String(adjustDamageTotal(nextRolls, vulnerabilities, resistances, immunities)));
    setEditingDamage(false);
  }

  function rerollAllDamage() {
    const nextRolls = rerollDamageRolls(rolls, critical);
    logDamageRoll(
      addRollLogEntry,
      `${action?.name ?? "Action"} damage reroll`,
      target.displayName,
      nextRolls,
    );
    setRolls(nextRolls);
    setDamageAnimationVersion(bumpRollVersions(nextRolls, damageAnimationVersion));
    setDamage(String(adjustDamageTotal(nextRolls, vulnerabilities, resistances, immunities)));
    setEditingDamage(false);
  }

  function rerollDamageSegment(roll: ActionRollPart, segment: "base" | "critical") {
    const key = rollKey(roll);
    const nextRolls = rolls.map((item) =>
      rollKey(item) === key ? rerollRollSegment(item, segment, critical) : item,
    );
    const nextRoll = nextRolls.find((item) => rollKey(item) === key);
    if (nextRoll) {
      logDamageRoll(
        addRollLogEntry,
        `${action?.name ?? "Action"} ${segment} damage reroll`,
        target.displayName,
        [nextRoll],
      );
    }
    setRolls(nextRolls);
    setDamageAnimationVersion((current) => ({
      ...current,
      [key]: (current[key] ?? 0) + 1,
    }));
    setDamage(String(adjustDamageTotal(nextRolls, vulnerabilities, resistances, immunities)));
    setEditingDamage(false);
  }

  function changeHit(nextHit: boolean) {
    if (nextHit && !hit) {
      setDamage(String(calculatedDamage));
    }
    setHit(nextHit);
  }

  function resolveDamage(override: string, damage: number) {
    addRollLogEntry({
      title: `${action?.name ?? "Action"} ${override}`,
      notation: "damage resolution",
      detail: `${damage} damage · ${override}`,
      total: damage,
      target: target.displayName,
      rollType: "Resolved Damage",
    });
    onResolve(override, damage);
  }

  return (
    <div className="grid gap-4">
      <ActionContextCard
        actionName={action?.name ?? "Action"}
        actorName={typeof result.actorName === "string" ? result.actorName : "Acting combatant"}
        target={target}
      />
      <AttackRollCard
        action={action}
        attack={attack}
        calculatedHit={calculatedHit}
        critical={critical}
        detail={currentAttackDetail || attackDetail}
        rollAnimationKey={rollAnimationKey}
        onReroll={rerollToHit}
      />
      <HitToggle hit={hit} onChange={changeHit} />
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
          calculatedDamage={calculatedDamage}
          onDamageChange={setDamage}
          onEditingChange={setEditingDamage}
          onRerollDamage={rerollAllDamage}
          onRerollRoll={rerollDamageSegment}
          onResolve={resolveDamage}
        />
      ) : (
        <MissResult
          actionName={action?.name ?? "Action"}
          targetName={target.displayName}
          onCancel={onCancel}
          onMiss={() => onResolve("ignore", 0)}
        />
      )}
    </div>
  );
}

function ActionContextCard({
  actionName,
  actorName,
  target,
}: {
  actionName: string;
  actorName: string;
  target: EncounterRunCombatant;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="text-xs font-bold uppercase text-muted-foreground">Action context</div>
        <div className="truncate font-semibold">
          {actorName} · {actionName}
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar combatant={target} />
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase text-muted-foreground">Target</div>
          <div className="truncate font-semibold">{target.displayName}</div>
          <div className="text-sm text-muted-foreground">
            AC {effectiveAC(target)} · HP {target.currentHitPoints}/{effectiveMaxHP(target)}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttackRollCard({
  action,
  attack,
  calculatedHit,
  critical,
  detail,
  rollAnimationKey,
  onReroll,
}: {
  action?: CreatureAction;
  attack: ReturnType<typeof attackStateFromResult>;
  calculatedHit: boolean;
  critical: boolean;
  detail: string;
  rollAnimationKey: string;
  onReroll: () => void;
}) {
  return (
    <div
      key={rollAnimationKey}
      className={[
        "action-roll-card rounded-lg border bg-background p-4 transition",
        critical
          ? "crit-roll-card border-warning/70 bg-warning/10 shadow-lg shadow-warning/20"
          : "border-border",
      ].join(" ")}
    >
      <div
        className={[
          "text-xs font-bold uppercase",
          critical ? "text-warning" : "text-muted-foreground",
        ].join(" ")}
      >
        Roll To Hit
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <div
          className={
            critical
              ? "crit-roll-value text-5xl font-black leading-none text-warning drop-shadow-sm"
              : "action-roll-value text-2xl font-black"
          }
        >
          {attack.attackTotal}
        </div>
        <div className="text-sm text-muted-foreground">{detail}</div>
        <Badge tone={calculatedHit ? "success" : "default"}>
          {calculatedHit ? "Calculated hit" : "Calculated miss"}
        </Badge>
        {critical && (
          <span className="crit-roll-badge rounded-md border border-warning/70 bg-warning/20 px-3 py-1 text-sm font-black uppercase text-warning">
            Critical hit
          </span>
        )}
        {action && (
          <Button type="button" icon={Dice5} size="sm" variant="secondary" onClick={onReroll}>
            Reroll to hit
          </Button>
        )}
      </div>
    </div>
  );
}

function HitToggle({ hit, onChange }: { hit: boolean; onChange: (hit: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-background p-1">
      <button
        type="button"
        className={[
          "rounded-md px-3 py-2 text-sm font-bold transition",
          hit ? "bg-success text-success-foreground" : "text-muted-foreground hover:bg-muted",
        ].join(" ")}
        onClick={() => onChange(true)}
      >
        Hit
      </button>
      <button
        type="button"
        className={[
          "rounded-md px-3 py-2 text-sm font-bold transition",
          !hit
            ? "bg-destructive text-destructive-foreground"
            : "text-muted-foreground hover:bg-muted",
        ].join(" ")}
        onClick={() => onChange(false)}
      >
        Miss
      </button>
    </div>
  );
}

function MissResult({
  actionName,
  targetName,
  onCancel,
  onMiss,
}: {
  actionName: string;
  targetName: string;
  onCancel: () => void;
  onMiss: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-background p-4">
      <div>
        <div className="text-xs font-bold uppercase text-muted-foreground">Miss</div>
        <div className="text-lg font-semibold">
          {actionName} missed {targetName}
        </div>
        <div className="text-sm text-muted-foreground">No damage will be applied.</div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onMiss}>
          Missed
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
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

function logAttackRoll(
  addRollLogEntry: AddRollLogEntry,
  actionName: string,
  targetName: string,
  attack: ReturnType<typeof attackStateFromResult>,
  context: { attackModifier: number; rollMode: RollMode; targetAC: number },
) {
  addRollLogEntry({
    title: actionName,
    notation: `${rollModeLabel(context.rollMode)} d20`,
    detail: `${attack.d20Rolls.join(" / ")}${context.attackModifier === 0 ? "" : ` ${context.attackModifier > 0 ? "+" : ""}${context.attackModifier}`} vs AC ${context.targetAC}`,
    total: attack.attackTotal,
    target: targetName,
    rollType: attack.critical ? "Critical Attack" : "Attack",
  });
}
