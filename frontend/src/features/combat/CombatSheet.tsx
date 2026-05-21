import { HeartPulse, ScrollText, Shield, Zap } from "lucide-react";
import React from "react";
import { SectionPanel } from "../../components/ui";
import { api } from "../../lib/api";
import {
  abilityScoresFromSheet,
  combatantSheet,
  effectiveAC,
  effectiveMaxHP,
  proficiencyBonusFromCombatSheet,
  rollDiceDetail,
  rollModeLabel,
  sheetRecord,
  speedFromSheet,
  stringArrayFromSheet,
} from "../../lib/domain/combat";
import { abilityModifier, modifierTone } from "../../lib/domain/forms";
import { abilities, skillDefinitions } from "../../lib/domain/options";
import type { EncounterRunCombatant, RollMode } from "../../types";

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
  const abilityPairs = [
    [abilities[0], abilities[3]],
    [abilities[1], abilities[4]],
    [abilities[2], abilities[5]],
  ];

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
    <SectionPanel
      title={compact ? "Target Sheet" : "Active Sheet"}
      icon={ScrollText}
      className="max-h-[calc(100svh-15.5rem)] min-h-0 overflow-hidden p-3"
      bodyClassName="max-h-[calc(100svh-20rem)] min-h-0 overflow-y-auto pr-1"
    >
      <div className="grid gap-2">
        <div className="grid grid-cols-3 gap-1.5">
          <IconStat icon={Shield} label="AC" value={effectiveAC(combatant)} tone="shield" />
          <IconStat
            icon={HeartPulse}
            label="HP"
            value={`${combatant.currentHitPoints}/${effectiveMaxHP(combatant)}`}
            tone="heart"
          />
          <IconStat icon={Zap} label="Speed" value={speedFromSheet(sheet)} tone="speed" />
        </div>
        <div className="overflow-hidden rounded-md border border-border bg-background text-xs">
          <div className="grid grid-cols-[2.1rem_2rem_2.25rem_2.25rem_2.1rem_2rem_2.25rem_2.25rem] border-b border-border bg-muted/60 px-1 py-1 text-center font-black uppercase text-muted-foreground">
            <span />
            <span />
            <span>Mod</span>
            <span>Save</span>
            <span />
            <span />
            <span>Mod</span>
            <span>Save</span>
          </div>
          {abilityPairs.map((pair) => (
            <div
              key={pair.map((ability) => ability.key).join("-")}
              className="grid grid-cols-[2.1rem_2rem_2.25rem_2.25rem_2.1rem_2rem_2.25rem_2.25rem] items-center border-b border-border px-1 py-1 last:border-b-0"
            >
              {pair.map((ability) => {
                const score = Number(scores[ability.key]) || 10;
                const bonus = abilityModifier(score);
                const saveBonus = bonus + (savingThrows.includes(ability.key) ? profBonus : 0);
                return (
                  <React.Fragment key={ability.key}>
                    <span className="font-black uppercase text-muted-foreground">
                      {ability.key}
                    </span>
                    <span className="text-center font-semibold">{score}</span>
                    <AbilityRollButton
                      label={`${ability.label} check`}
                      value={bonus}
                      onClick={(event) =>
                        void roll(event, ability.label, ability.key, bonus, "Check")
                      }
                    />
                    <AbilityRollButton
                      label={`${ability.label} saving throw`}
                      value={saveBonus}
                      onClick={(event) =>
                        void roll(event, ability.label, ability.key, saveBonus, "Saving Throw")
                      }
                    />
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {skillDefinitions.map((skill) => {
            const fallback = abilityModifier(Number(scores[skill.ability]) || 10);
            const bonus = Number(skills[skill.name]) || fallback;
            return (
              <button
                key={skill.name}
                type="button"
                className="flex min-w-0 justify-between gap-1 rounded-md px-1.5 py-1 text-left text-xs hover:bg-muted"
                title="Shift-click for advantage, Control-click for disadvantage."
                onClick={(event) => void roll(event, skill.name, skill.ability, bonus, "Check")}
              >
                <span className="min-w-0 truncate">{skill.name}</span>
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
        "grid justify-items-center gap-0.5 rounded-md border px-1.5 py-1.5 text-center",
        tones[tone],
      ].join(" ")}
    >
      <div className="relative grid h-8 w-10 place-items-center">
        <Icon className="absolute h-8 w-8 opacity-20" />
        <div className="text-sm font-black">{value}</div>
      </div>
      <div className="text-[0.6rem] font-bold uppercase">{label}</div>
    </div>
  );
}

function AbilityRollButton({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick: (event: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      className={[
        "rounded px-1 py-0.5 text-center font-black hover:bg-primary hover:text-primary-foreground",
        modifierTone(value),
      ].join(" ")}
      title={`${label}. Shift-click for advantage, Control-click for disadvantage.`}
      onClick={onClick}
    >
      {value >= 0 ? `+${value}` : value}
    </button>
  );
}

function rollModeFromEvent(event?: React.MouseEvent): RollMode {
  if (event?.shiftKey) return "advantage";
  if (event?.ctrlKey) return "disadvantage";
  return "normal";
}
