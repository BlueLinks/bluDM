import { HeartPulse, ScrollText, Shield, Zap } from "lucide-react";
import React from "react";
import { useRollLog } from "../../components/RollLogProvider";
import { Badge, SectionPanel } from "../../components/ui";
import { api } from "../../lib/api";
import {
  abilityScoresFromSheet,
  combatantSheet,
  effectiveMaxHP,
  proficiencyBonusFromCombatSheet,
  rollDiceDetail,
  rollModeLabel,
  sheetRecord,
  speedFromSheet,
  stringArrayFromSheet,
} from "../../lib/domain/combat";
import { configText } from "../../lib/domain/effectConfig";
import { abilityModifier, modifierTone } from "../../lib/domain/forms";
import { abilities, skillDefinitions } from "../../lib/domain/options";
import type { EncounterRunCombatant, EncounterRunEffect, RollMode } from "../../types";

type AbilityOption = (typeof abilities)[number];

export function CombatSheet({
  activeEffects = [],
  combatant,
  runID,
  compact = false,
  onRoll,
}: {
  activeEffects?: EncounterRunEffect[];
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
  const leftAbilities = abilities.slice(0, 3);
  const rightAbilities = abilities.slice(3, 6);
  const descriptor = combatantDescriptor(combatant, sheet);
  const { addRollLogEntry } = useRollLog();

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
    const detail = `${rollDiceDetail(payload.result)} ${bonus >= 0 ? "+" : ""}${bonus}`;
    addRollLogEntry({
      title,
      notation: `${rollModeLabel(rollMode)} d20`,
      detail,
      total,
      actor: combatant.displayName,
      rollType,
    });
    onRoll(
      `${title}: ${total} (${rollModeLabel(rollMode)} ${d20} ${bonus >= 0 ? "+" : ""}${bonus})`,
      {
        title,
        subtitle: `${combatant.displayName} · ${rollType} · ${rollModeLabel(rollMode)}`,
        total,
        detail,
      },
    );
  }

  return (
    <SectionPanel
      title={compact ? "Target Sheet" : "Active Sheet"}
      icon={ScrollText}
      className="combat-panel combat-section-panel max-h-[calc(100svh-15.5rem)] min-h-0 overflow-hidden p-2 xl:p-3"
      bodyClassName="max-h-[calc(100svh-20rem)] min-h-0 overflow-y-auto px-0.5 pb-1 xl:px-1"
    >
      <div className="grid gap-2 xl:gap-3">
        <div className="rounded-md border border-border bg-background px-2 py-1.5 xl:px-3 xl:py-2">
          <div className="truncate text-sm font-black">{combatant.displayName}</div>
          {descriptor && (
            <div className="mt-0.5 text-xs italic text-muted-foreground">{descriptor}</div>
          )}
          {activeEffects.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {activeEffects.map((effect) => (
                <Badge key={effect.id}>{sheetEffectLabel(effect)}</Badge>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1">
          <IconStat
            icon={Shield}
            label="AC"
            value={effectiveACWithEffects(combatant, activeEffects)}
            tone="shield"
          />
          <IconStat
            icon={HeartPulse}
            label="HP"
            value={`${combatant.currentHitPoints}/${effectiveMaxHP(combatant)}`}
            tone="heart"
          />
          <IconStat
            icon={Zap}
            label="Speed"
            value={speedValue(speedFromSheet(sheet), activeEffects)}
            tone="speed"
          />
        </div>
        <div className="combat-ability-grid grid grid-cols-2 gap-1.5 overflow-hidden xl:gap-2">
          {[leftAbilities, rightAbilities].map((group) => (
            <AbilityTable
              key={group.map((ability) => ability.key).join("-")}
              abilities={group}
              scores={scores}
              savingThrows={savingThrows}
              proficiencyBonus={profBonus}
              onRoll={roll}
            />
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

function sheetEffectLabel(effect: EncounterRunEffect) {
  if (effect.effectKind === "speed_bonus") {
    return `Speed +${effect.amount} ft.`;
  }
  if (effect.effectKind === "speed_reduction") {
    return `Speed -${effect.amount} ft.`;
  }
  if (effect.effectKind === "speed_multiplier") {
    return configText(effect.payload?.multiplier) === "2" ? "Speed doubled" : "Speed halved";
  }
  if (effect.effectKind === "movement_mode") {
    return `${configText(effect.payload?.mode, "Movement")} ${effect.amount ? `${effect.amount} ft.` : ""}`;
  }
  if (effect.effectKind === "ac_bonus") {
    return `AC ${effect.amount >= 0 ? "+" : ""}${effect.amount}`;
  }
  if (effect.effectKind === "base_ac") {
    return `Base AC ${configText(effect.payload?.formula, String(effect.amount))}`;
  }
  if (effect.effectKind === "damage_defense") {
    return `${configText(effect.payload?.mode, "Resistance")} ${configText(effect.payload?.damageTypes, "")}`.trim();
  }
  if (effect.effectKind === "healing_block") return "Healing blocked";
  if (effect.effectKind === "healing_maximized") return "Healing maximized";
  if (effect.effectKind === "heal_to_full") return "Heal to full";
  if (effect.effectKind === "recurring_hp_change") return `${effect.spellName}: recurring HP`;
  if (effect.effectKind === "roll_modifier")
    return `${configText(effect.payload?.mode, "Add")} ${configText(effect.payload?.dice, String(effect.amount))} to ${configText(effect.payload?.category, "rolls")}`;
  if (effect.effectKind === "advantage_state")
    return `${configText(effect.payload?.state, "Advantage")} on ${configText(effect.payload?.category, "rolls")}`;
  if (effect.effectKind === "attack_damage_rider")
    return `Damage rider ${effect.amount || configText(effect.payload?.dice, "")}`;
  if (effect.effectKind === "action_restriction")
    return `Restriction: ${configText(effect.payload?.mode, "manual")}`;
  if (effect.effectKind === "saving_throw_repeat")
    return `Repeat save: ${configText(effect.payload?.ability, "")}`;
  if (effect.effectKind === "area_trigger")
    return `Area: ${configText(effect.payload?.trigger, "trigger")}`;
  if (effect.effectKind === "visibility_effect")
    return `Visibility: ${configText(effect.payload?.mode, "effect")}`;
  if (effect.effectKind === "sense_effect")
    return `Sense: ${configText(effect.payload?.mode, "effect")}`;
  if (effect.effectKind === "terrain_effect")
    return `Terrain: ${configText(effect.payload?.mode, "effect")}`;
  if (effect.effectKind === "death_protection") return "Death protection";
  if (effect.effectKind === "linked_healing") return "Linked healing";
  if (effect.effectKind === "damage_transfer") return "Damage transfer";
  if (effect.effectKind === "battlefield_object")
    return `Object: ${configText(effect.payload?.kind, effect.spellName)}`;
  if (effect.effectKind === "condition_immunity" && effect.conditionName) {
    return `Immune to ${effect.conditionName}`;
  }
  if (effect.effectKind === "concentration") {
    return `Concentration: ${effect.spellName}`;
  }
  if (effect.timing === "start_target_turn") {
    return `${effect.spellName} at turn start`;
  }
  return effect.spellName;
}

function speedValue(baseSpeed: number, effects: EncounterRunEffect[]) {
  let speed = baseSpeed;
  let note = "";
  for (const effect of effects) {
    if (effect.effectKind === "speed_bonus") speed += Math.max(0, Number(effect.amount) || 0);
    if (effect.effectKind === "speed_reduction") speed -= Math.max(0, Number(effect.amount) || 0);
    if (effect.effectKind === "speed_multiplier") {
      const multiplier = Number(effect.payload?.multiplier) || 1;
      speed = Math.round(speed * multiplier);
      note = multiplier === 2 ? "doubled" : "halved";
    }
  }
  speed = Math.max(0, speed);
  if (speed === baseSpeed && !note) return baseSpeed;
  return `${speed}${note ? ` (${note})` : ""}`;
}

function effectiveACWithEffects(combatant: EncounterRunCombatant, effects: EncounterRunEffect[]) {
  const base = combatant.armorClassOverride || combatant.armorClass + combatant.armorClassBonus;
  return effects.reduce((total, effect) => {
    if (effect.effectKind === "ac_bonus") return total + (Number(effect.amount) || 0);
    if (effect.effectKind === "base_ac") return Math.max(total, Number(effect.amount) || total);
    return total;
  }, base);
}

function AbilityTable({
  abilities,
  scores,
  savingThrows,
  proficiencyBonus,
  onRoll,
}: {
  abilities: AbilityOption[];
  scores: Record<string, unknown>;
  savingThrows: string[];
  proficiencyBonus: number;
  onRoll: (
    event: React.MouseEvent,
    label: string,
    ability: string,
    bonus: number,
    rollType: "Check" | "Saving Throw",
  ) => Promise<void>;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-border bg-background text-xs">
      <div className="grid grid-cols-4 border-b border-border bg-muted/60 text-center text-[0.58rem] font-black uppercase leading-none text-muted-foreground">
        <span className="border-r border-border bg-muted/80 px-0.5 py-1">Stat</span>
        <span className="border-r border-border bg-primary/10 px-0.5 py-1 text-primary">Score</span>
        <span className="py-1">Mod</span>
        <span className="py-1">Save</span>
      </div>
      {abilities.map((ability) => {
        const score = Number(scores[ability.key]) || 10;
        const bonus = abilityModifier(score);
        const saveBonus = bonus + (savingThrows.includes(ability.key) ? proficiencyBonus : 0);
        return (
          <div
            key={ability.key}
            className="grid grid-cols-4 items-stretch border-b border-border last:border-b-0"
          >
            <span className="grid place-items-center border-r border-border bg-muted/40 px-1 font-black uppercase text-muted-foreground">
              {ability.key}
            </span>
            <span className="grid place-items-center border-r border-border bg-primary/5 px-1 text-center font-semibold tabular-nums text-primary">
              {score}
            </span>
            <AbilityRollButton
              label={`${ability.label} check`}
              value={bonus}
              onClick={(event) => void onRoll(event, ability.label, ability.key, bonus, "Check")}
            />
            <AbilityRollButton
              label={`${ability.label} saving throw`}
              value={saveBonus}
              onClick={(event) =>
                void onRoll(event, ability.label, ability.key, saveBonus, "Saving Throw")
              }
            />
          </div>
        );
      })}
    </div>
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
        "grid justify-items-center gap-0.5 rounded-md border px-1 py-1 text-center xl:px-1.5 xl:py-1.5",
        tones[tone],
      ].join(" ")}
    >
      <div className="relative grid h-7 min-w-10 place-items-center px-0.5 xl:h-8 xl:min-w-12">
        <Icon className="absolute h-7 w-7 opacity-20 xl:h-8 xl:w-8" />
        <div className="min-w-0 text-center text-xs font-black leading-none tabular-nums sm:text-sm">
          {value}
        </div>
      </div>
      <div className="text-[0.56rem] font-bold uppercase xl:text-[0.6rem]">{label}</div>
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
        "rounded px-0.5 py-0.5 text-center font-black tabular-nums hover:bg-primary hover:text-primary-foreground",
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

function combatantDescriptor(combatant: EncounterRunCombatant, sheet: Record<string, unknown>) {
  const source = (combatant.snapshot.player ??
    combatant.snapshot.creature ??
    combatant.snapshot) as Record<string, unknown>;
  if (combatant.sourceType === "player") {
    return compactJoin([textValue(sheet.species), textValue(sheet.class), levelLabel(sheet.level)]);
  }
  const statBlock = sheetRecord(source.statBlock ?? sheet);
  const size = textValue(source.size ?? statBlock.size);
  const type = compactJoin([
    textValue(source.creatureType ?? statBlock.creatureType),
    textValue(statBlock.creatureSubtype),
  ]);
  const alignment = textValue(source.alignment ?? statBlock.alignment);
  return compactJoin([compactJoin([size, type], " "), alignment], ", ");
}

function levelLabel(value: unknown) {
  const level = Number(value);
  return level > 0 ? `Level ${level}` : "";
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function compactJoin(values: string[], separator = " ") {
  return values.filter(Boolean).join(separator);
}
