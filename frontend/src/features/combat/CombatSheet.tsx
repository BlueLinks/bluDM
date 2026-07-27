import {
  ChevronDown,
  Crosshair,
  HeartPulse,
  MoreHorizontal,
  Shield,
  UsersRound,
  Zap,
} from "lucide-react";
import React from "react";
import { useRollLog } from "../../components/RollLogProvider";
import { AbilityScoreCard, VitalStatCard } from "../../components/shared/displayPrimitives";
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
import { abilityModifier, modifierTone } from "../../lib/domain/forms";
import { abilities, skillDefinitions } from "../../lib/domain/options";
import { friendlyEffectLabel } from "../../lib/domain/spellMessaging";
import type { EncounterRunCombatant, EncounterRunEffect, RollMode } from "../../types";
import { CombatSheetTabs } from "./CombatSheetTabs";

export function CombatSheet({
  activeEffects = [],
  combatant,
  footer,
  runID,
  compact = false,
  onEdit,
  onRoll,
}: {
  activeEffects?: EncounterRunEffect[];
  combatant: EncounterRunCombatant;
  footer?: React.ReactNode;
  runID: string;
  compact?: boolean;
  onEdit?: () => void;
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
  const descriptor = combatantDescriptor(combatant, sheet);
  const { addRollLogEntry } = useRollLog();
  const [showAllSkills, setShowAllSkills] = React.useState(false);
  const features = stringArrayFromSheet(sheet.actions ?? sheet.features ?? sheet.traits);
  const notes = textValue(sheet.notes) || textValue(sheet.description);

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
      title={compact ? "Target" : "Active combatant"}
      icon={compact ? Crosshair : UsersRound}
      action={
        onEdit ? (
          <button
            aria-label={`Edit ${combatant.displayName}`}
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            type="button"
            onClick={onEdit}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        ) : null
      }
      className="combat-panel combat-section-panel combat-sheet-panel max-h-[calc(100svh-20.5625rem)] min-h-0 overflow-hidden p-2"
      bodyClassName="max-h-[calc(100svh-24.5625rem)] min-h-0 overflow-hidden px-0.5 pb-1"
    >
      <div className="grid gap-2">
        <div className="rounded-md border border-border bg-background px-2 py-1.5 xl:px-3 xl:py-[0.5625rem]">
          <div className="truncate text-sm font-black">{combatant.displayName}</div>
          {descriptor && (
            <div className="mt-0.5 text-xs italic text-muted-foreground">{descriptor}</div>
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
            value={`${combatant.currentHitPoints} / ${effectiveMaxHP(combatant)}`}
            tone="heart"
          />
          <IconStat
            icon={Zap}
            label="Speed"
            value={speedValue(speedFromSheet(sheet), activeEffects)}
            tone="speed"
          />
        </div>
        <div className="grid min-w-0 gap-0.5 border-y border-border px-1 py-1">
          <span className="text-xs font-semibold text-muted-foreground">
            Conditions &amp; Effects
          </span>
          {combatant.conditions.length === 0 && activeEffects.length === 0 ? (
            <span className="text-xs text-muted-foreground">None</span>
          ) : null}
          {combatant.conditions.map((condition) => (
            <Badge key={condition} tone="warning">
              {condition}
            </Badge>
          ))}
          {activeEffects.map((effect) => (
            <Badge key={effect.id} tone="info">
              {sheetEffectLabel(effect)}
            </Badge>
          ))}
        </div>
        <div className="-mt-[0.4375rem] grid gap-1">
          <div className="border-b border-border px-1 pb-1 text-xs font-semibold">Abilities</div>
          <AbilityCards
            scores={scores}
            savingThrows={savingThrows}
            proficiencyBonus={profBonus}
            onRoll={roll}
          />
        </div>
        <div className="mt-2">
          <CombatSheetTabs
            sheet={sheet}
            overview={
              <CombatSheetOverview
                compact={compact}
                expanded={showAllSkills}
                footer={footer}
                scores={scores}
                skills={skills}
                onRoll={roll}
                onToggleExpanded={() => setShowAllSkills((current) => !current)}
              />
            }
            actions={
              <div className="grid gap-3 text-sm">
                <p className="text-muted-foreground">
                  Use the turn action picker above to resolve modeled attacks and spells.
                </p>
                {features.length > 0 ? (
                  <div>
                    <div className="font-semibold">Features and actions</div>
                    <div className="mt-1 text-muted-foreground">{features.join(", ")}</div>
                  </div>
                ) : null}
                <div>
                  <div className="font-semibold">Combat notes</div>
                  <div className="mt-1 whitespace-pre-wrap text-muted-foreground">
                    {notes || "No combat notes recorded."}
                  </div>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </SectionPanel>
  );
}

function CombatSheetOverview({
  compact,
  expanded,
  footer,
  scores,
  skills,
  onRoll,
  onToggleExpanded,
}: {
  compact: boolean;
  expanded: boolean;
  footer?: React.ReactNode;
  scores: Record<string, unknown>;
  skills: Record<string, unknown>;
  onRoll: (
    event: React.MouseEvent,
    label: string,
    ability: string,
    bonus: number,
    rollType: "Check" | "Saving Throw",
  ) => Promise<void>;
  onToggleExpanded: () => void;
}) {
  return (
    <div className="grid gap-2">
      <SkillRollList expanded={expanded} scores={scores} skills={skills} onRoll={onRoll} />
      <div
        className={[
          "mt-[0.3125rem] flex min-w-0 flex-wrap items-center justify-start",
          footer ? "gap-[2.625rem]" : "gap-2",
        ].join(" ")}
      >
        <button
          type="button"
          aria-expanded={expanded}
          className={[
            "inline-flex min-h-[2.1875rem] flex-none items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-1 text-sm font-medium hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            compact ? "w-[10.8125rem]" : "ml-0.5 w-[12.125rem]",
          ].join(" ")}
          onClick={onToggleExpanded}
        >
          {expanded ? "Show fewer skills" : "Show all skills"}
          <ChevronDown className={["h-4 w-4 transition", expanded ? "rotate-180" : ""].join(" ")} />
        </button>
        {footer}
      </div>
    </div>
  );
}

function SkillRollList({
  expanded,
  scores,
  skills,
  onRoll,
}: {
  expanded: boolean;
  scores: Record<string, unknown>;
  skills: Record<string, unknown>;
  onRoll: (
    event: React.MouseEvent,
    label: string,
    ability: string,
    bonus: number,
    rollType: "Check" | "Saving Throw",
  ) => Promise<void>;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
      {(expanded ? skillDefinitions : skillDefinitions.slice(0, 12)).map((skill) => {
        const fallback = abilityModifier(Number(scores[skill.ability]) || 10);
        const bonus = Number(skills[skill.name]) || fallback;
        return (
          <button
            key={skill.name}
            type="button"
            className="flex min-w-0 justify-between gap-1 rounded-md px-1.5 py-0.5 text-left text-xs hover:bg-muted"
            title="Shift-click for advantage, Control-click for disadvantage."
            onClick={(event) => void onRoll(event, skill.name, skill.ability, bonus, "Check")}
          >
            <span className="min-w-0 truncate">{skill.name}</span>
            <span className={["font-bold", modifierTone(bonus)].join(" ")}>
              {bonus >= 0 ? `+${bonus}` : bonus}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function sheetEffectLabel(effect: EncounterRunEffect) {
  return friendlyEffectLabel(effect);
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
  if (speed === baseSpeed && !note) return `${baseSpeed} ft.`;
  return `${speed} ft.${note ? ` (${note})` : ""}`;
}

function effectiveACWithEffects(combatant: EncounterRunCombatant, effects: EncounterRunEffect[]) {
  const base = combatant.armorClassOverride || combatant.armorClass + combatant.armorClassBonus;
  return effects.reduce((total, effect) => {
    if (effect.effectKind === "ac_bonus") return total + (Number(effect.amount) || 0);
    if (effect.effectKind === "base_ac") return Math.max(total, Number(effect.amount) || total);
    return total;
  }, base);
}

function AbilityCards({
  scores,
  savingThrows,
  proficiencyBonus,
  onRoll,
}: {
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
    <div className="combat-ability-grid grid grid-cols-3 gap-1.5 sm:grid-cols-6">
      {abilities.map((ability) => {
        const score = Number(scores[ability.key]) || 10;
        const bonus = abilityModifier(score);
        const saveBonus = bonus + (savingThrows.includes(ability.key) ? proficiencyBonus : 0);
        return (
          <div key={ability.key} className="grid min-w-0 text-center">
            <button
              type="button"
              title={`${ability.label} check. Shift-click for advantage, Control-click for disadvantage.`}
              onClick={(event) => void onRoll(event, ability.label, ability.key, bonus, "Check")}
            >
              <AbilityScoreCard
                label={ability.key}
                layout="stacked"
                modifier={bonus >= 0 ? `+${bonus}` : bonus}
                score={score}
              />
            </button>
            <button
              type="button"
              className="sr-only"
              title={`${ability.label} saving throw. Shift-click for advantage, Control-click for disadvantage.`}
              onClick={(event) =>
                void onRoll(event, ability.label, ability.key, saveBonus, "Saving Throw")
              }
            >
              Save {saveBonus >= 0 ? `+${saveBonus}` : saveBonus}
            </button>
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
    shield: "primary",
    heart: "tertiary",
    speed: "secondary",
  } as const;
  return (
    <VitalStatCard
      className="combat-sheet-vital"
      icon={Icon}
      label={label}
      size="sm"
      tone={tones[tone]}
      value={value}
    />
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
    return compactJoin([
      textValue(sheet.species),
      textValue(sheet.className ?? sheet.class_name ?? sheet.class),
      levelLabel(sheet.level),
    ]);
  }
  const statBlock = sheetRecord(source.statBlock ?? source.stat_block ?? sheet);
  const size = textValue(source.size ?? statBlock.size);
  const alignment = textValue(source.alignment ?? statBlock.alignment);
  return compactJoin([size, alignment], ", ");
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
