import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DiceFormulaInput } from "../../components/shared/CharacterFormControls";
import { Button, Checkbox, Field, Select } from "../../components/ui";
import { configText } from "../../lib/domain/effectConfig";
import { spellRollKinds } from "../../lib/domain/options";
import {
  type SpellEffectCategory,
  type SpellEffectAmountControl,
  spellEffectCategories,
  spellEffectCategoryForKind,
  spellEffectMetadata,
  spellEffectOptionsForCategory,
} from "../../lib/domain/spellEffectOptions";
import type { SpellActionFormState } from "../../types";
import { effectFormula, rollKindDescription, RollKindDetail } from "./SpellRollKindDetail";
import { SpellSubsection } from "./SpellFormLayout";
import { scalingPhrase, SpellScalingFields } from "./SpellScalingFields";
import { CantripBreakpointFields } from "./SpellWeaponAndCantripFields";
import { EffectScheduleFields, FlatNumberInput } from "./SpellEffectScheduleFields";

export function SpellEffectCard({
  index,
  onChange,
  onRemove,
  roll,
  rolls,
}: {
  index: number;
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
  onRemove: () => void;
}) {
  const rollCategory = spellEffectCategoryForKind(roll.rollKind);
  const [selectedCategory, setSelectedCategory] = useState<SpellEffectCategory>(rollCategory);
  const categoryOptions = spellEffectOptionsForCategory(selectedCategory);
  const selectedLabel = rollKindLabel(roll.rollKind);
  const accent = categoryAccent(rollCategory);
  const metadata = spellEffectMetadata(roll.rollKind);
  const amountControl = effectAmountControl(roll, metadata.amountControl);
  const selectedEffectInCategory = categoryOptions.some((option) => option.value === roll.rollKind);

  useEffect(() => {
    setSelectedCategory(rollCategory);
  }, [rollCategory]);

  function updateRoll(next: Partial<SpellActionFormState["rolls"][number]>) {
    onChange(rolls.map((item) => (item.id === roll.id ? { ...item, ...next } : item)));
  }

  return (
    <article
      className={[
        "grid gap-3 rounded-lg border border-border bg-background p-3 shadow-sm",
        "border-l-4",
        accent.border,
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={["rounded-full px-2 py-0.5 text-xs font-bold", accent.badge].join(" ")}
            >
              Effect {index + 1}
            </span>
            <h5 className="text-sm font-semibold">{selectedLabel}</h5>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{effectSummary(roll)}</p>
        </div>
        <Button type="button" icon={Trash2} variant="danger" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>

      <SpellEffectCategoryPicker value={selectedCategory} onChange={setSelectedCategory} />

      <div className="grid items-start gap-3 lg:grid-cols-[13rem_minmax(12rem,1fr)_auto]">
        <Field
          label="Effect"
          help="Choose the structured outcome this spell applies. Categories keep the list short without changing the stored spell data."
        >
          <Select
            options={categoryOptions}
            placeholder="Effect"
            value={selectedEffectInCategory ? roll.rollKind : ""}
            onValueChange={(rollKind) => updateRoll({ rollKind })}
          />
        </Field>
        {!selectedEffectInCategory ? (
          <div className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm font-medium text-muted-foreground">
            Choose a {selectedCategoryLabel(selectedCategory)} effect to edit its details.
          </div>
        ) : isFullWidthRollDetail(roll.rollKind) ? (
          <div className="hidden lg:block" />
        ) : (
          <RollKindDetail roll={roll} rolls={rolls} onChange={onChange} />
        )}
        {selectedEffectInCategory && usesMagicalToggle(roll.rollKind) && (
          <Checkbox
            label="Magical"
            checked={roll.magical}
            onChange={(magical) => updateRoll({ magical })}
          />
        )}
      </div>

      {selectedEffectInCategory && isFullWidthRollDetail(roll.rollKind) && (
        <RollKindDetail roll={roll} rolls={rolls} onChange={onChange} />
      )}

      {selectedEffectInCategory && amountControl !== "none" ? (
        <>
          <EffectAmountFields
            amountControl={amountControl}
            label={metadata.flatAmountLabel}
            onChange={updateRoll}
            roll={roll}
          />
          <SpellEffectResult roll={roll} />
          <EffectScheduleFields
            metadata={metadata}
            onChange={onChange}
            roll={roll}
            rolls={rolls}
            updateRoll={updateRoll}
          />
          {metadata.scaling && <RollScalingFields roll={roll} onChange={updateRoll} />}
          {metadata.scaling && (
            <CantripBreakpointFields roll={roll} onChange={(next) => updateRoll(next)} />
          )}
        </>
      ) : selectedEffectInCategory ? (
        <>
          <SpellEffectResult roll={roll} />
          <EffectScheduleFields
            metadata={metadata}
            onChange={onChange}
            roll={roll}
            rolls={rolls}
            updateRoll={updateRoll}
          />
        </>
      ) : (
        <div className="rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
          The existing effect is still {selectedLabel}. Selecting a new effect above will update
          this card.
        </div>
      )}
    </article>
  );
}

function EffectAmountFields({
  amountControl,
  label = "Amount",
  onChange,
  roll,
}: {
  amountControl: SpellEffectAmountControl;
  label?: string;
  onChange: (roll: Partial<SpellActionFormState["rolls"][number]>) => void;
  roll: SpellActionFormState["rolls"][number];
}) {
  if (amountControl === "flat") {
    return (
      <Field
        label={label}
        help="Use this for fixed numeric effects such as movement distance, speed, Armor Class, or revive HP."
      >
        <FlatNumberInput
          value={roll.fixedValue}
          onChange={(fixedValue) => onChange({ fixedValue })}
        />
      </Field>
    );
  }
  return (
    <Field label="Amount" help="Set Dice to 0 and use Modifier for a fixed flat value.">
      <DiceFormulaInput
        allowEmpty
        value={roll}
        onChange={(next) =>
          onChange({
            diceCount: next.diceCount,
            dieSize: next.dieSize,
            fixedValue: next.fixedValue,
          })
        }
      />
      <Checkbox
        label="Add Spellcasting Ability Modifier"
        checked={roll.addPrimaryStatModifier}
        onChange={(addPrimaryStatModifier) => onChange({ addPrimaryStatModifier })}
      />
    </Field>
  );
}

function SpellEffectCategoryPicker({
  onChange,
  value,
}: {
  value: SpellEffectCategory;
  onChange: (value: SpellEffectCategory) => void;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Effect category
      </p>
      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-5">
        {spellEffectCategories.map((category) => {
          const active = category.value === value;
          return (
            <button
              key={category.value}
              type="button"
              className={[
                "rounded-md border px-2 py-2 text-left text-xs font-semibold transition",
                active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
              onClick={() => onChange(category.value)}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SpellEffectResult({ roll }: { roll: SpellActionFormState["rolls"][number] }) {
  const amountControl = effectAmountControl(roll, spellEffectMetadata(roll.rollKind).amountControl);
  const headline =
    amountControl !== "none" ? amountHeadline(roll, amountControl) : effectSummary(roll);
  return (
    <div className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">Result</p>
      <p className="mt-1 text-2xl font-bold tracking-normal text-foreground">{headline}</p>
      <p className="mt-1 text-sm text-muted-foreground">{resultDescription(roll)}</p>
    </div>
  );
}

function RollScalingFields({
  roll,
  onChange,
}: {
  roll: SpellActionFormState["rolls"][number];
  onChange: (roll: Partial<SpellActionFormState["rolls"][number]>) => void;
}) {
  return (
    <SpellSubsection
      title="Roll Scaling"
      description="Configure extra dice or fixed value added by spell scaling."
    >
      <SpellScalingFields
        value={{
          scalingType: roll.scalingType,
          scaleFromLevel: roll.scalingFromLevel,
          stepSize: roll.scalingStepSize,
        }}
        onChange={(next) =>
          onChange({
            scalingType: next.scalingType,
            scalingFromLevel: next.scaleFromLevel,
            scalingStepSize: next.stepSize,
          })
        }
        amount={
          <Field
            label="Additional roll"
            help="The extra dice and fixed value added each scaling step."
          >
            <DiceFormulaInput
              allowEmpty
              value={{
                diceCount: roll.scalingDiceCount,
                dieSize: roll.scalingDieSize,
                fixedValue: roll.scalingFixedValue,
              }}
              onChange={(next) =>
                onChange({
                  scalingDiceCount: next.diceCount,
                  scalingDieSize: next.dieSize,
                  scalingFixedValue: next.fixedValue,
                })
              }
            />
          </Field>
        }
        generated={rollScalingDescription(roll)}
        label="Roll scaling"
        help="Use this when this roll gains extra dice or a fixed bonus at higher slot, character, or spell scale values."
      />
    </SpellSubsection>
  );
}

function isFullWidthRollDetail(rollKind: string) {
  return rollKind === "custom";
}

function usesMagicalToggle(rollKind: string) {
  const amountControl = spellEffectMetadata(rollKind).amountControl;
  return amountControl === "dice" || rollKind === "damage_defense";
}

function effectAmountControl(
  roll: SpellActionFormState["rolls"][number],
  configured: SpellEffectAmountControl,
) {
  if (roll.rollKind === "forced_movement") {
    const direction = configText(roll.effectConfig?.direction, "");
    if (direction === "prone" || direction === "manual_map") return "none";
  }
  return configured;
}

function rollScalingDescription(roll: SpellActionFormState["rolls"][number]) {
  const from = Number(roll.scalingFromLevel) || 1;
  const step = Math.max(1, Number(roll.scalingStepSize) || 1);
  const dice = Number(roll.scalingDiceCount) || 0;
  const die = Number(roll.scalingDieSize) || 6;
  const fixed = Number(roll.scalingFixedValue) || 0;
  const formula =
    `${dice > 0 ? `${dice}d${die}` : ""}${fixed > 0 ? `+${fixed}` : fixed < 0 ? fixed : ""}` ||
    "the configured amount";
  if (roll.scalingType === "none") {
    return "This effect does not scale.";
  }
  return scalingPhrase({
    scalingType: roll.scalingType,
    from,
    step,
    effect: `this effect adds ${formula} ${rollKindDescription(roll.rollKind)}`,
  });
}

function amountHeadline(
  roll: SpellActionFormState["rolls"][number],
  amountControl = effectAmountControl(roll, spellEffectMetadata(roll.rollKind).amountControl),
) {
  const formula =
    amountControl === "flat" ? String(Number(roll.fixedValue) || 0) : effectFormula(roll);
  if (roll.rollKind === "damage") {
    return `${formula} ${titleCase(roll.damageType || "damage")}`;
  }
  if (roll.rollKind === "healing") return `${formula} HP`;
  if (roll.rollKind === "temp_hp") return `${formula} Temp HP`;
  if (roll.rollKind === "max_hp") return `${formula} Max HP`;
  if (roll.rollKind === "max_hp_reduction") return `-${formula} Max HP`;
  if (roll.rollKind === "speed_bonus") return `+${formula} ft. speed`;
  if (roll.rollKind === "speed_reduction") return `-${formula} ft. speed`;
  if (roll.rollKind === "ac_bonus") return `${formula} AC`;
  if (roll.rollKind === "movement_mode") return `${formula} ft. movement`;
  if (roll.rollKind === "forced_movement")
    return `${forcedMovementLabel(roll)}${formula !== "0" ? ` ${formula} ft.` : ""}`;
  if (roll.rollKind === "revive") return `${formula} HP on revive`;
  return formula;
}

function effectSummary(roll: SpellActionFormState["rolls"][number]) {
  const amountControl = effectAmountControl(roll, spellEffectMetadata(roll.rollKind).amountControl);
  if (amountControl !== "none") {
    return `${amountHeadline(roll, amountControl)} · ${rollKindDescription(roll.rollKind)}`;
  }
  if (roll.rollKind === "condition") return `Apply ${roll.conditionName || "condition"}`;
  if (roll.rollKind === "remove_condition") return `Remove ${roll.conditionName || "condition"}`;
  if (roll.rollKind === "condition_immunity") {
    return `Grant immunity to ${roll.conditionName || "a condition"}`;
  }
  if (roll.rollKind === "custom") return roll.conditionName || "Custom DM-facing effect";
  if (roll.rollKind === "forced_movement") return forcedMovementLabel(roll);
  if (roll.rollKind === "base_ac") {
    return configText(roll.effectConfig?.calculationMode, "formula") === "standard_ac"
      ? `Base AC ${configText(roll.effectConfig?.baseValue, roll.fixedValue)}`
      : configText(roll.effectConfig?.formula, "Base AC formula");
  }
  if (roll.rollKind === "roll_modifier") {
    const categories = configStringArray(roll.effectConfig?.categories).join(", ");
    return `${configText(roll.effectConfig?.mode, "Modify")} ${configText(roll.effectConfig?.dice, roll.fixedValue)}${categories ? ` · ${categories}` : ""}`;
  }
  if (roll.rollKind === "damage_defense") {
    const damageTypes = configStringArray(roll.effectConfig?.damageTypes).join(", ");
    return `${configText(roll.effectConfig?.mode, "Defense")}${damageTypes ? ` · ${damageTypes}` : ""}`;
  }
  if (roll.rollKind === "saving_throw_repeat") {
    return `Repeat ${configText(roll.effectConfig?.ability, "save")} · ${configText(roll.effectConfig?.successOutcome, "outcome")}`;
  }
  if (roll.rollKind === "area_trigger") {
    return `${configText(roll.effectConfig?.trigger, "Area trigger")} · ${configText(roll.effectConfig?.outcome, "outcome")}`;
  }
  return rollKindLabel(roll.rollKind);
}

function resultDescription(roll: SpellActionFormState["rolls"][number]) {
  if (roll.rollKind === "damage") return "Damage dealt by this effect.";
  if (roll.rollKind === "healing") return "Healing applied to current hit points.";
  if (roll.rollKind === "temp_hp")
    return "Temporary hit points replace the target's current temp HP.";
  if (roll.rollKind === "max_hp") return "Increases the target's effective hit point maximum.";
  if (roll.rollKind === "healing_block") return "Prevents the target from regaining hit points.";
  if (roll.rollKind === "healing_maximized")
    return "Healing rolls against the target use their maximum value.";
  if (roll.rollKind === "area_trigger") return "Shown as a manual area reminder in combat.";
  if (roll.rollKind === "battlefield_object") return "Logged prominently for DM handling.";
  if (roll.rollKind === "forced_movement") return "Movement or prone state for the target.";
  return rollKindDescription(roll.rollKind);
}

function forcedMovementLabel(roll: SpellActionFormState["rolls"][number]) {
  const direction = configText(roll.effectConfig?.direction, "");
  if (direction === "push") return "Push away";
  if (direction === "pull") return "Pull toward";
  if (direction === "move_away") return "Move away using reaction";
  if (direction === "prone") return "Knock prone";
  if (direction === "manual_map") return "Manual map movement";
  return "Forced movement";
}

function rollKindLabel(kind: string) {
  return spellRollKinds.find((option) => option.value === kind)?.label ?? "Effect";
}

function selectedCategoryLabel(category: SpellEffectCategory) {
  return spellEffectCategories.find((option) => option.value === category)?.label ?? "selected";
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function configStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function categoryAccent(category: SpellEffectCategory) {
  const accents: Record<SpellEffectCategory, { border: string; badge: string }> = {
    hp: { border: "border-l-rose-400", badge: "bg-rose-500/15 text-rose-700 dark:text-rose-200" },
    damage: { border: "border-l-red-400", badge: "bg-red-500/15 text-red-700 dark:text-red-200" },
    movement: {
      border: "border-l-emerald-400",
      badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
    },
    defense: {
      border: "border-l-sky-400",
      badge: "bg-sky-500/15 text-sky-700 dark:text-sky-200",
    },
    rolls: {
      border: "border-l-violet-400",
      badge: "bg-violet-500/15 text-violet-700 dark:text-violet-200",
    },
    conditions: {
      border: "border-l-amber-400",
      badge: "bg-amber-500/15 text-amber-700 dark:text-amber-200",
    },
    action: {
      border: "border-l-orange-400",
      badge: "bg-orange-500/15 text-orange-700 dark:text-orange-200",
    },
    senses: {
      border: "border-l-cyan-400",
      badge: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-200",
    },
    area: {
      border: "border-l-lime-400",
      badge: "bg-lime-500/15 text-lime-700 dark:text-lime-200",
    },
    utility: {
      border: "border-l-slate-400",
      badge: "bg-slate-500/15 text-slate-700 dark:text-slate-200",
    },
  };
  return accents[category];
}
