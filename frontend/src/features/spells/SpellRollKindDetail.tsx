import { damageTypeOptions } from "../../components/shared/damageTypes";
import { Field, Select, Textarea } from "../../components/ui";
import { conditionImmunities, spellEffectTimings, spellRollKinds } from "../../lib/domain/options";
import type { SpellActionFormState } from "../../types";

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
        <TimingField roll={roll} rolls={rolls} onChange={onChange} />
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
        <TimingField
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          help="Choose when this descriptive effect should be shown in combat."
        />
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
  return (
    <Field label="Effect target" help={effectTargetHelp(roll.rollKind)}>
      <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
        {rollKindLabel(roll.rollKind)}
      </div>
    </Field>
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
  if (kind === "temp_hp") return "temporary hit points";
  if (kind === "custom") return "custom effect";
  return "damage";
}

function TimingField({
  help = "Use each-turn timing for recurring effects, or next-turn-only timing for delayed one-off effects.",
  onChange,
  roll,
  rolls,
}: {
  help?: string;
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
}) {
  return (
    <Field label="Effect timing" help={help}>
      <Select
        options={spellEffectTimings}
        placeholder="Timing"
        value={roll.timing}
        onValueChange={(timing) =>
          onChange(rolls.map((item) => (item.id === roll.id ? { ...item, timing } : item)))
        }
      />
    </Field>
  );
}

function effectTargetHelp(rollKind: string) {
  if (rollKind === "max_hp") {
    return "Changes the target's hit point maximum. If current HP should also increase, add a second healing effect with the same fixed amount.";
  }
  if (rollKind === "temp_hp") {
    return "Sets the target's temporary hit points to this amount. It replaces current temp HP instead of stacking.";
  }
  return "Restores current hit points.";
}

function rollKindLabel(kind: string) {
  return spellRollKinds.find((option) => option.value === kind)?.label ?? "Effect";
}
