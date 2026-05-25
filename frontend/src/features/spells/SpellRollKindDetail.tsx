import { damageTypeOptions } from "../../components/shared/damageTypes";
import { Field, Select, Textarea } from "../../components/ui";
import { configText } from "../../lib/domain/effectConfig";
import {
  advantageStates,
  conditionImmunities,
  damageDefenseModes,
  forcedMovementDirections,
  movementModes,
  rollModifierCategories,
  rollModifierModes,
  speedMultipliers,
  spellRollKinds,
} from "../../lib/domain/options";
import {
  advantageAppliesTo,
  baseACAbilityModifiers,
  baseACCalculationModes,
  damageDefenseRestrictions,
} from "../../lib/domain/spellEffectOptions";
import type { SpellActionFormState } from "../../types";
import {
  AdvancedEffectConfigFields,
  EffectConfigInput,
  EffectConfigMultiCheck,
  EffectConfigSegmented,
  EffectConfigSelect,
  advancedEffectKinds,
} from "./SpellEffectConfigFields";
import { FlatNumberInput } from "./SpellEffectScheduleFields";

export function RollKindDetail({
  roll,
  rolls,
  onChange,
}: {
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
}) {
  if (roll.rollKind === "condition" || roll.rollKind === "condition_immunity") {
    return (
      <div className="grid gap-2">
        <Field
          label="Condition"
          help={
            roll.rollKind === "condition_immunity"
              ? "The condition the target is temporarily immune to while this effect is active."
              : "The condition to apply to the target when this spell effect resolves."
          }
        >
          <Select
            options={conditionImmunities.map((condition) => ({
              value: condition,
              label: condition,
            }))}
            placeholder="Condition"
            value={roll.conditionName}
            onValueChange={(conditionName) =>
              onChange(
                rolls.map((item) => (item.id === roll.id ? { ...item, conditionName } : item)),
              )
            }
          />
        </Field>
      </div>
    );
  }
  if (roll.rollKind === "custom") {
    return (
      <div className="grid gap-2">
        <Field
          label="Custom effect"
          help="Use this for descriptive outcomes that the app should display or log without trying to calculate HP, damage, or conditions."
        >
          <Textarea
            rows={3}
            value={roll.conditionName}
            placeholder="On a failed save, the target follows the chosen instruction on its next turn..."
            onChange={(event) =>
              onChange(
                rolls.map((item) =>
                  item.id === roll.id ? { ...item, conditionName: event.target.value } : item,
                ),
              )
            }
          />
        </Field>
      </div>
    );
  }
  if (roll.rollKind === "damage") {
    return (
      <Field label="Damage type">
        <Select
          options={damageTypeOptions()}
          placeholder="Type"
          value={roll.damageType}
          onValueChange={(damageType) =>
            onChange(rolls.map((item) => (item.id === roll.id ? { ...item, damageType } : item)))
          }
        />
      </Field>
    );
  }
  if (roll.rollKind === "movement_mode") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="mode"
          label="Mode"
          options={movementModes}
        />
      </div>
    );
  }
  if (roll.rollKind === "speed_multiplier") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="multiplier"
          label="Multiplier"
          options={speedMultipliers}
        />
      </div>
    );
  }
  if (roll.rollKind === "roll_modifier") {
    return (
      <div className="grid gap-3 md:grid-cols-[12rem_minmax(16rem,1fr)_12rem]">
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="mode"
          label="Mode"
          options={rollModifierModes}
        />
        <EffectConfigMultiCheck
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="categories"
          label="Roll categories"
          options={rollModifierCategories}
          help="Choose every roll type this modifier applies to."
        />
        <EffectConfigInput
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="dice"
          label="Dice / fixed"
          placeholder="1d4 or +2"
        />
      </div>
    );
  }
  if (roll.rollKind === "advantage_state") {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="state"
          label="State"
          options={advantageStates}
        />
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="category"
          label="Roll type"
          options={rollModifierCategories}
        />
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="appliesTo"
          label="Applies to"
          options={advantageAppliesTo}
        />
      </div>
    );
  }
  if (roll.rollKind === "damage_defense") {
    return (
      <div className="grid gap-3 md:grid-cols-[12rem_minmax(16rem,1fr)_12rem]">
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="mode"
          label="Defense"
          options={damageDefenseModes}
          help="The defensive relationship this effect grants."
        />
        <EffectConfigMultiCheck
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="damageTypes"
          label="Damage types"
          options={[
            { value: "all", label: "All damage" },
            ...damageTypeOptions().map(({ value, label }) => ({ value, label })),
          ]}
          help="Choose all damage types covered by this defense."
        />
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="restriction"
          label="Restriction"
          options={damageDefenseRestrictions}
        />
      </div>
    );
  }
  if (roll.rollKind === "forced_movement") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="direction"
          label="Forced movement"
          options={forcedMovementDirections}
        />
      </div>
    );
  }
  if (roll.rollKind === "base_ac") {
    return <BaseACFields roll={roll} rolls={rolls} onChange={onChange} />;
  }
  if (roll.rollKind === "remove_condition") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Condition">
          <Select
            options={conditionImmunities.map((condition) => ({
              value: condition,
              label: condition,
            }))}
            placeholder="Condition"
            value={roll.conditionName}
            onValueChange={(conditionName) =>
              onChange(
                rolls.map((item) => (item.id === roll.id ? { ...item, conditionName } : item)),
              )
            }
          />
        </Field>
      </div>
    );
  }
  if (advancedEffectKinds.includes(roll.rollKind)) {
    return <AdvancedEffectConfigFields roll={roll} rolls={rolls} onChange={onChange} />;
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label="Effect target" help={effectTargetHelp(roll.rollKind)}>
        <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {rollKindLabel(roll.rollKind)}
        </div>
      </Field>
    </div>
  );
}

function BaseACFields({
  roll,
  rolls,
  onChange,
}: {
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
}) {
  const mode = configText(roll.effectConfig?.calculationMode, "formula");
  return (
    <div className="grid gap-3">
      <Field
        label="AC calculation"
        help="Use Formula for printed rules text, or Standard AC when it is a base number plus an optional ability modifier."
      >
        <EffectConfigSegmented
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="calculationMode"
          options={baseACCalculationModes}
        />
      </Field>
      {mode === "standard_ac" ? (
        <div className="grid gap-3 sm:grid-cols-[11rem_16rem]">
          <Field label="Base AC">
            <FlatNumberInput
              value={configText(roll.effectConfig?.baseValue, roll.fixedValue || "13")}
              onChange={(baseValue) =>
                onChange(
                  rolls.map((item) =>
                    item.id === roll.id
                      ? {
                          ...item,
                          fixedValue: baseValue,
                          effectConfig: { ...item.effectConfig, baseValue },
                        }
                      : item,
                  ),
                )
              }
            />
          </Field>
          <EffectConfigSelect
            roll={roll}
            rolls={rolls}
            onChange={onChange}
            configKey="abilityModifier"
            label="Ability modifier"
            options={baseACAbilityModifiers}
          />
        </div>
      ) : (
        <EffectConfigInput
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="formula"
          label="AC formula"
          placeholder="13 + Dex modifier"
          help="Use this for exact rules wording or formulas that need a DM to interpret."
        />
      )}
    </div>
  );
}

export function effectFormula(roll: SpellActionFormState["rolls"][number]) {
  const dice = Number(roll.diceCount) || 0;
  const die = Number(roll.dieSize) || 6;
  const fixed = Number(roll.fixedValue) || 0;
  const parts: string[] = [];
  if (dice > 0) parts.push(`${dice}d${die}`);
  if (fixed > 0) parts.push(`+${fixed}`);
  if (fixed < 0) parts.push(String(fixed));
  if (roll.addPrimaryStatModifier) parts.push("+ Spellcasting Ability Modifier");
  return parts.length ? parts.join(" ") : "0";
}

export function rollKindDescription(kind: string) {
  if (kind === "healing") return "healing";
  if (kind === "max_hp") return "to the hit point maximum";
  if (kind === "max_hp_reduction") return "to reduce hit point maximum";
  if (kind === "temp_hp") return "temporary hit points";
  if (kind === "healing_block") return "healing prevention";
  if (kind === "healing_maximized") return "maximized healing";
  if (kind === "heal_to_full") return "full healing";
  if (kind === "recurring_hp_change") return "recurring HP change";
  if (kind === "speed_bonus") return "speed bonus";
  if (kind === "speed_reduction") return "speed reduction";
  if (kind === "speed_multiplier") return "speed multiplier";
  if (kind === "movement_mode") return "movement mode";
  if (kind === "ac_bonus") return "AC bonus";
  if (kind === "base_ac") return "base AC";
  if (kind === "roll_modifier") return "roll modifier";
  if (kind === "advantage_state") return "advantage state";
  if (kind === "damage_defense") return "damage defense";
  if (kind === "forced_movement") return "forced movement";
  if (kind === "attack_damage_rider") return "attack damage rider";
  if (kind === "action_restriction") return "action restriction";
  if (kind === "saving_throw_repeat") return "repeat saving throw";
  if (kind === "area_trigger") return "area trigger";
  if (kind === "visibility_effect") return "visibility effect";
  if (kind === "sense_effect") return "sense effect";
  if (kind === "terrain_effect") return "terrain effect";
  if (kind === "death_protection") return "death protection";
  if (kind === "linked_healing") return "linked healing";
  if (kind === "damage_transfer") return "damage transfer";
  if (kind === "battlefield_object") return "battlefield object";
  if (kind === "remove_condition") return "condition removal";
  if (kind === "revive") return "revival";
  if (kind === "custom") return "custom effect";
  return "damage";
}

function effectTargetHelp(rollKind: string) {
  if (rollKind === "max_hp") {
    return "Changes the target's hit point maximum. If current HP should also increase, add a second healing effect with the same fixed amount.";
  }
  if (rollKind === "temp_hp") {
    return "Sets the target's temporary hit points to this amount. It replaces current temp HP instead of stacking.";
  }
  if (rollKind === "speed_bonus") {
    return "Increases the target's speed while this effect is active.";
  }
  if (rollKind === "speed_reduction") {
    return "Reduces the target's speed by the configured amount while the effect is active.";
  }
  if (rollKind === "ac_bonus") {
    return "Adds this amount to the target's Armor Class while active.";
  }
  if (rollKind === "healing_block") {
    return "Prevents the target from regaining hit points while active.";
  }
  return "Restores or changes the target using the configured amount.";
}

function rollKindLabel(kind: string) {
  return spellRollKinds.find((option) => option.value === kind)?.label ?? "Effect";
}
