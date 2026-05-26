import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DiceFormulaInput } from "../../components/shared/CharacterFormControls";
import { Button, Checkbox, Field, Select } from "../../components/ui";
import { displayACFormula } from "../../lib/domain/acFormula";
import { configText } from "../../lib/domain/effectConfig";
import { spellRollKinds } from "../../lib/domain/options";
import {
  baseACAbilityModifiers,
  type SpellEffectCategory,
  type SpellEffectAmountControl,
  spellEffectCategories,
  spellEffectCategoryForKind,
  spellEffectMetadata,
  spellEffectOptionsForCategory,
} from "../../lib/domain/spellEffectOptions";
import {
  friendlyAdvantageEffect,
  friendlyAreaTriggerSummary,
  friendlyLayeredEffect,
  friendlyOption,
  friendlyRepeatSave,
  friendlyRerollEffect,
  friendlyRollCategories,
  friendlyRollTable,
  stringArray,
} from "../../lib/domain/spellMessaging";
import type { SpellActionFormState } from "../../types";
import { effectFormula, rollKindDescription, RollKindDetail } from "./SpellRollKindDetail";
import { SpellSubsection } from "./SpellFormLayout";
import { scalingPhrase, SpellScalingFields } from "./SpellScalingFields";
import { CantripBreakpointFields } from "./SpellWeaponAndCantripFields";
import { EffectScheduleFields, FlatNumberInput } from "./SpellEffectScheduleFields";
import { categoryAccent } from "./spellEffectAccent";
import {
  OutcomeEffectResolutionFields,
  SpellEffectCategoryPicker,
  defaultsForRollKind,
  outcomeEffectKinds,
} from "./SpellEffectCardControls";

export function SpellEffectCard({
  index,
  mode = "normal",
  onChange,
  onRemove,
  roll,
  rolls,
}: {
  index: number;
  mode?: "normal" | "outcome";
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
  onRemove: () => void;
}) {
  const rollCategory = spellEffectCategoryForKind(roll.rollKind);
  const [selectedCategory, setSelectedCategory] = useState<SpellEffectCategory>(rollCategory);
  const allowedRollKinds = mode === "outcome" ? outcomeEffectKinds : null;
  const categoryOptions = spellEffectOptionsForCategory(selectedCategory).filter(
    (option) => !allowedRollKinds || allowedRollKinds.includes(option.value),
  );
  const categoryChoices = useMemo(
    () =>
      spellEffectCategories.filter((category) =>
        spellEffectOptionsForCategory(category.value).some(
          (option) => !allowedRollKinds || allowedRollKinds.includes(option.value),
        ),
      ),
    [allowedRollKinds],
  );
  const selectedLabel = rollKindLabel(roll.rollKind);
  const selectedEffectInCategory = categoryOptions.some((option) => option.value === roll.rollKind);
  const displayCategory = selectedEffectInCategory ? rollCategory : selectedCategory;
  const accent = categoryAccent(displayCategory);
  const metadata = spellEffectMetadata(roll.rollKind);
  const amountControl = effectAmountControl(roll, metadata.amountControl);
  const fullWidthRollDetail = ["custom", "roll_table", "layered_effect"].includes(roll.rollKind);

  useEffect(() => {
    const nextCategory =
      categoryChoices.find((category) => category.value === rollCategory)?.value ??
      categoryChoices[0]?.value ??
      rollCategory;
    setSelectedCategory(nextCategory);
  }, [categoryChoices, rollCategory]);

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
              {mode === "outcome" ? "Outcome effect" : "Effect"} {index + 1}
            </span>
            <h5 className="text-sm font-semibold">{selectedLabel}</h5>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{effectSummary(roll)}</p>
        </div>
        <Button type="button" icon={Trash2} variant="danger" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>

      <SpellEffectCategoryPicker
        categories={categoryChoices}
        value={selectedCategory}
        onChange={setSelectedCategory}
      />

      <div className="grid items-start gap-3 lg:grid-cols-[13rem_minmax(12rem,1fr)_auto]">
        <Field
          label="Effect"
          help="Choose the structured outcome this spell applies. Categories keep the list short without changing the stored spell data."
        >
          <Select
            options={categoryOptions}
            placeholder="Effect"
            value={selectedEffectInCategory ? roll.rollKind : ""}
            onValueChange={(rollKind) => updateRoll(defaultsForRollKind(rollKind))}
          />
        </Field>
        {!selectedEffectInCategory ? (
          <div className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm font-medium text-muted-foreground">
            Choose a {selectedCategoryLabel(selectedCategory)} effect to edit its details.
          </div>
        ) : fullWidthRollDetail ? (
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

      {selectedEffectInCategory && mode === "outcome" && (
        <OutcomeEffectResolutionFields roll={roll} updateRoll={updateRoll} />
      )}

      {selectedEffectInCategory && fullWidthRollDetail && (
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
    return configText(roll.effectConfig?.calculationMode, "formula") === "dice"
      ? `Base AC ${baseACDiceSummary(roll)}`
      : displayACFormula(roll.effectConfig?.formula, "Base AC formula");
  }
  if (roll.rollKind === "roll_modifier") {
    return `${friendlyOption(roll.effectConfig?.mode, "Modify")} ${configText(roll.effectConfig?.dice, roll.fixedValue)} · ${friendlyRollCategories(roll.effectConfig)}`;
  }
  if (roll.rollKind === "advantage_state") {
    return friendlyAdvantageEffect(roll.effectConfig).replace(/\.$/, "");
  }
  if (roll.rollKind === "roll_reroll") {
    return friendlyRerollEffect(roll.effectConfig).replace(/\.$/, "");
  }
  if (roll.rollKind === "roll_table") {
    return friendlyRollTable(roll.effectConfig);
  }
  if (roll.rollKind === "layered_effect") {
    return friendlyLayeredEffect(roll.effectConfig);
  }
  if (roll.rollKind === "damage_defense") {
    const damageTypes = stringArray(roll.effectConfig?.damageTypes)
      .map((type) => friendlyOption(type))
      .join(", ");
    return `${friendlyOption(roll.effectConfig?.mode, "Defense")}${damageTypes ? ` · ${damageTypes}` : ""}`;
  }
  if (roll.rollKind === "saving_throw_repeat") {
    return friendlyRepeatSave(roll.effectConfig);
  }
  if (roll.rollKind === "area_trigger") {
    return friendlyAreaTriggerSummary(roll.effectConfig);
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
  if (roll.rollKind === "area_trigger") return areaTriggerDescription(roll);
  if (roll.rollKind === "battlefield_object") return "Logged prominently for DM handling.";
  if (roll.rollKind === "layered_effect")
    return "Shows each layer with its save, effect, and removal rule for DM handling.";
  if (roll.rollKind === "roll_table")
    return "Roll once for each applicable target and apply the matching outcome.";
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

function areaTriggerDescription(roll: SpellActionFormState["rolls"][number]) {
  const trigger = friendlyOption(roll.effectConfig?.trigger, "the area trigger").toLowerCase();
  const outcome = configText(roll.effectConfig?.outcome, "");
  const save = configText(roll.effectConfig?.saveAbility, "");
  const saveLabel = save ? `${friendlyOption(save)} save` : "the configured save";
  if (outcome === "dex_save_or_prone") {
    return `When ${trigger || "the area trigger"} occurs, affected creatures make a Dexterity save; on failure, they fall prone.`;
  }
  if (outcome === "save_for_damage") {
    return `When ${trigger || "the area trigger"} occurs, affected creatures make ${saveLabel} against the area effect.`;
  }
  if (outcome === "restrained") {
    return `Creatures that fail the configured save are restrained by the area.`;
  }
  if (outcome === "fire_damage") {
    return `The area deals fire damage when the trigger occurs.`;
  }
  return "Shown as a clear DM-facing area reminder in combat.";
}

function baseACDiceSummary(roll: SpellActionFormState["rolls"][number]) {
  const ability = labelFor(baseACAbilityModifiers, configText(roll.effectConfig?.abilityModifier));
  const formula = effectFormula(roll);
  return `${formula}${ability ? ` + ${ability}` : ""}`;
}

function rollKindLabel(kind: string) {
  return spellRollKinds.find((option) => option.value === kind)?.label ?? "Effect";
}

function selectedCategoryLabel(category: SpellEffectCategory) {
  return spellEffectCategories.find((option) => option.value === category)?.label ?? "selected";
}

function labelFor(options: Array<{ value: string; label: string }>, value: string) {
  return options.find((option) => option.value === value)?.label ?? "";
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
