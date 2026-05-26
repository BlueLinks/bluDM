import { damageTypeOptions } from "../../components/shared/damageTypes";
import { Field, Select, Textarea } from "../../components/ui";
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
import { advantageAppliesTo, damageDefenseRestrictions } from "../../lib/domain/spellEffectOptions";
import type { SpellActionFormState } from "../../types";
import { BaseACFields } from "./SpellBaseACFields";
import {
  AdvancedEffectConfigFields,
  EffectConfigMultiCheck,
  EffectConfigSelect,
  advancedEffectKinds,
} from "./SpellEffectConfigFields";
import { SpellLayerEditor } from "./SpellLayerEditor";
import { EffectConfigDiceFormula, RollConfigLayout } from "./SpellRollConfigLayout";
import { SpellRollTableEditor } from "./SpellRollTableEditor";

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
      <RollConfigLayout
        top={
          <>
            <EffectConfigSelect
              className="md:max-w-48"
              roll={roll}
              rolls={rolls}
              onChange={onChange}
              configKey="mode"
              label="Mode"
              options={rollModifierModes}
            />
            <EffectConfigDiceFormula roll={roll} rolls={rolls} onChange={onChange} />
          </>
        }
        bottom={
          <EffectConfigMultiCheck
            roll={roll}
            rolls={rolls}
            onChange={onChange}
            configKey="categories"
            label="Roll categories"
            options={rollModifierCategories}
            help="Choose every roll type this modifier applies to."
          />
        }
      />
    );
  }
  if (roll.rollKind === "advantage_state") {
    return (
      <RollConfigLayout
        top={
          <>
            <EffectConfigSelect
              className="md:max-w-56"
              roll={roll}
              rolls={rolls}
              onChange={onChange}
              configKey="state"
              label="State"
              options={advantageStates}
            />
            <EffectConfigSelect
              className="md:max-w-64"
              roll={roll}
              rolls={rolls}
              onChange={onChange}
              configKey="appliesTo"
              label="Applies to"
              options={advantageAppliesTo}
            />
          </>
        }
        bottom={
          <EffectConfigMultiCheck
            roll={roll}
            rolls={rolls}
            onChange={onChange}
            configKey="categories"
            label="Roll categories"
            options={rollModifierCategories}
            help="Choose every roll type this advantage or disadvantage applies to."
          />
        }
      />
    );
  }
  if (roll.rollKind === "roll_reroll") {
    return (
      <RollConfigLayout
        top={
          <>
            <EffectConfigSelect
              className="md:max-w-64"
              roll={roll}
              rolls={rolls}
              onChange={onChange}
              configKey="mode"
              label="Reroll result"
              options={[
                { value: "reroll_use_lower", label: "Reroll and use lower" },
                { value: "reroll_use_higher", label: "Reroll and use higher" },
                { value: "reroll_choose", label: "DM chooses roll" },
              ]}
              help="Use this for effects that force a d20 to be rerolled, such as using the lower result."
            />
            <EffectConfigSelect
              className="md:max-w-64"
              roll={roll}
              rolls={rolls}
              onChange={onChange}
              configKey="appliesTo"
              label="Applies to"
              options={[
                { value: "triggering_creature", label: "Triggering creature" },
                ...advantageAppliesTo,
              ]}
            />
          </>
        }
        bottom={
          <EffectConfigMultiCheck
            roll={roll}
            rolls={rolls}
            onChange={onChange}
            configKey="categories"
            label="Roll categories"
            options={rollModifierCategories}
            help="Choose every d20 roll type this reroll can affect."
          />
        }
      />
    );
  }
  if (roll.rollKind === "roll_table") {
    return <SpellRollTableEditor roll={roll} rolls={rolls} onChange={onChange} />;
  }
  if (roll.rollKind === "layered_effect") {
    return <SpellLayerEditor roll={roll} rolls={rolls} onChange={onChange} />;
  }
  if (roll.rollKind === "damage_defense") {
    return (
      <RollConfigLayout
        top={
          <>
            <EffectConfigSelect
              className="md:max-w-48"
              roll={roll}
              rolls={rolls}
              onChange={onChange}
              configKey="mode"
              label="Defense"
              options={damageDefenseModes}
              help="The defensive relationship this effect grants."
            />
            <EffectConfigSelect
              className="md:max-w-56"
              roll={roll}
              rolls={rolls}
              onChange={onChange}
              configKey="restriction"
              label="Restriction"
              options={damageDefenseRestrictions}
            />
          </>
        }
        bottom={
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
        }
      />
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
          {spellRollKinds.find((option) => option.value === roll.rollKind)?.label ?? "Effect"}
        </div>
      </Field>
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
  if (kind === "roll_table") return "roll table";
  if (kind === "layered_effect") return "layered battlefield effect";
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
  const help: Record<string, string> = {
    ac_bonus: "Adds this amount to the target's Armor Class while active.",
    healing_block: "Prevents the target from regaining hit points while active.",
    max_hp:
      "Changes the target's hit point maximum. If current HP should also increase, add a second healing effect with the same fixed amount.",
    speed_bonus: "Increases the target's speed while this effect is active.",
    speed_reduction:
      "Reduces the target's speed by the configured amount while the effect is active.",
    temp_hp:
      "Sets the target's temporary hit points to this amount. It replaces current temp HP instead of stacking.",
  };
  return help[rollKind] ?? "Restores or changes the target using the configured amount.";
}
