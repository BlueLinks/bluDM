import type { ReactNode } from "react";
import { Field, Input, Select } from "../../components/ui";
import { spellScalingTypes } from "../../lib/domain/options";

export type SpellScalingValue = {
  scalingType: string;
  scaleFromLevel: string;
  stepSize: string;
};

export function SpellScalingFields({
  value,
  onChange,
  amount,
  generated,
  label = "Scaling type",
  help = "Spell level uses spell slots. Character level is for cantrip-like scaling. Spell scale is a generic app value for homebrew.",
}: {
  value: SpellScalingValue;
  onChange: (value: SpellScalingValue) => void;
  amount: ReactNode;
  generated: string;
  label?: string;
  help?: string;
}) {
  const enabled = value.scalingType !== "none";
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={label} help={help}>
          <Select
            options={spellScalingTypes}
            placeholder="Scaling"
            value={value.scalingType}
            onValueChange={(scalingType) => onChange({ ...value, scalingType })}
          />
        </Field>
        {enabled && (
          <>
            <Field
              label="Scale from"
              help="The spell slot level, character level, or spell scale where this increase begins."
            >
              <Input
                type="number"
                value={value.scaleFromLevel}
                onChange={(event) => onChange({ ...value, scaleFromLevel: event.target.value })}
              />
            </Field>
            {amount}
            <Field label="Steps" help="How often this increase repeats after scaling starts.">
              <Input
                type="number"
                value={value.stepSize}
                onChange={(event) => onChange({ ...value, stepSize: event.target.value })}
              />
            </Field>
          </>
        )}
      </div>
      <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
        {generated}
      </p>
    </div>
  );
}

export function scalingPhrase({
  scalingType,
  from,
  step,
  effect,
}: {
  scalingType: string;
  from: number;
  step: number;
  effect: string;
}) {
  if (scalingType === "character_level") {
    return `At character level ${from}, ${effect} for ${step === 1 ? "every level" : `every ${step} character levels`} after that.`;
  }
  if (scalingType === "spell_scale") {
    return `At spell scale ${from}, ${effect} for ${step === 1 ? "every scale step" : `every ${step} scale steps`} after that.`;
  }
  return `When cast using a spell slot above ${ordinal(from)}, ${effect} for ${step === 1 ? "every level" : `every ${step} slot levels`} above ${ordinal(from)}.`;
}

export function ordinal(value: number) {
  const suffix = value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th";
  return `${value}${suffix} level`;
}
