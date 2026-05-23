import { Checkbox, Field, FormSection, Input, Select } from "../../components/ui";
import { spellAOETypes } from "../../lib/domain/options";
import type { SpellFormState } from "../../types";
import { SpellSubsection } from "./SpellFormLayout";
import { blankAreaScaling } from "./spellFormState";
import { scalingPhrase, SpellScalingFields } from "./SpellScalingFields";

type SpellFormProps = {
  form: SpellFormState;
  setForm: (form: SpellFormState) => void;
};

export function SpellAreaSection({ form, setForm }: SpellFormProps) {
  const hasArea = form.aoeType !== "None";
  const areaScaling = form.areaScaling ?? blankAreaScaling();
  const areaScalingEnabled =
    hasArea && !!form.areaScaling && form.areaScaling.scalingType !== "none";
  return (
    <FormSection title="Area & Scaling">
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Area shape">
          <Select
            options={spellAOETypes.map((value) => ({ value, label: value }))}
            placeholder="Area shape"
            value={form.aoeType}
            onValueChange={(aoeType) =>
              setForm({
                ...form,
                aoeType,
                aoeSize: aoeType === "None" ? "0" : form.aoeSize,
                areaScaling: aoeType === "None" ? undefined : form.areaScaling,
              })
            }
          />
        </Field>
        {hasArea && (
          <Field label="Area size ft">
            <Input
              type="number"
              value={form.aoeSize}
              onChange={(event) => setForm({ ...form, aoeSize: event.target.value })}
            />
          </Field>
        )}
        <Field label="Source Note">
          <Input
            value={form.sourceNote}
            onChange={(event) => setForm({ ...form, sourceNote: event.target.value })}
          />
        </Field>
      </div>
      {hasArea && (
        <SpellSubsection
          title="Area Scaling"
          description="Enable only when the spell's area grows at higher scaling values."
        >
          <Checkbox
            label="Area size scales"
            checked={areaScalingEnabled}
            onChange={(checked) =>
              setForm({
                ...form,
                areaScaling: checked ? { ...areaScaling, scalingType: "spell_level" } : undefined,
              })
            }
          />
          {areaScalingEnabled ? (
            <SpellScalingFields
              value={areaScaling}
              onChange={(next) => setForm({ ...form, areaScaling: { ...areaScaling, ...next } })}
              amount={
                <Field
                  label="Additional size ft"
                  help="How many feet are added to the area size each scaling step."
                >
                  <Input
                    type="number"
                    value={areaScaling.additionalSize}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        areaScaling: { ...areaScaling, additionalSize: event.target.value },
                      })
                    }
                  />
                </Field>
              }
              generated={areaScalingDescription(areaScaling)}
              label="Area scaling"
            />
          ) : (
            <p className="text-xs font-medium text-muted-foreground">
              Enable only for spells whose area grows at higher slot, character, or spell scale
              values.
            </p>
          )}
        </SpellSubsection>
      )}
    </FormSection>
  );
}

function areaScalingDescription(value: NonNullable<SpellFormState["areaScaling"]>) {
  const scalingType = value.scalingType || "none";
  const from = Number(value.scaleFromLevel) || 1;
  const step = Math.max(1, Number(value.stepSize) || 1);
  const additionalSize = Number(value.additionalSize) || 0;
  if (scalingType === "none" || additionalSize <= 0) {
    return "The spell's area size does not scale.";
  }
  return scalingPhrase({
    scalingType,
    from,
    step,
    effect: `the area size increases by ${additionalSize} ft.`,
  });
}
