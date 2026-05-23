import { Button, Checkbox, Field, FormSection, Input, Select, Textarea } from "../../components/ui";
import {
  spellCastTypes,
  spellCastingTriggers,
  spellClasses,
  spellDurationTypes,
  spellLevels,
  spellRangeTypes,
  spellSchools,
  spellTargetAnchors,
  spellTargetPatterns,
  spellTimeScales,
} from "../../lib/domain/options";
import type { SpellFormState } from "../../types";
import { SpellAreaSection } from "./SpellAreaSection";
import { SpellNotice, SpellSubsection } from "./SpellFormLayout";
import { generateSpellDescription } from "./spellText";

type SpellFormProps = {
  form: SpellFormState;
  setForm: (form: SpellFormState) => void;
};

export function SpellCoreFields(props: SpellFormProps) {
  return (
    <>
      <BasicInfoSection {...props} />
      <CastingSection {...props} />
      <RangeDurationSection {...props} />
      <SpellAreaSection {...props} />
      <DescriptionSection {...props} />
    </>
  );
}

function BasicInfoSection({ form, setForm }: SpellFormProps) {
  return (
    <FormSection title="Basic Info">
      <div className="grid gap-3 md:grid-cols-[minmax(16rem,1fr)_9rem_12rem]">
        <Field label="Name">
          <Input
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </Field>
        <Field label="Level">
          <Select
            options={spellLevels}
            placeholder="Level"
            value={form.level}
            onValueChange={(level) => setForm({ ...form, level })}
          />
        </Field>
        <Field label="School">
          <Select
            options={spellSchools.map(option)}
            placeholder="School"
            value={form.school}
            onValueChange={(school) => setForm({ ...form, school })}
          />
        </Field>
      </div>
      <Field label="Classes">
        <MultiCheck
          options={spellClasses}
          selected={form.classes}
          onChange={(classes) => setForm({ ...form, classes })}
        />
      </Field>
    </FormSection>
  );
}

function CastingSection({ form, setForm }: SpellFormProps) {
  const showCastingTimeDetail = needsCastingTimeDetail(form.castType);
  return (
    <FormSection title="Casting & Components">
      <div className="grid gap-3 md:grid-cols-3">
        <Field
          label="Casting action"
          help="Choose the action economy first. Ritual is handled below as a spell tag."
        >
          <Select
            options={spellCastTypes.map(option)}
            placeholder="Casting action"
            value={form.castType}
            onValueChange={(castType) =>
              setForm({
                ...form,
                castType,
                castingTime: needsCastingTimeDetail(castType) ? form.castingTime : "",
              })
            }
          />
        </Field>
        {showCastingTimeDetail && (
          <Field
            label={form.castType === "Longer Time" ? "Casting time" : "Casting detail"}
            help={
              form.castType === "Reaction"
                ? "Describe the trigger for the reaction."
                : "Enter the exact printed casting time or special requirement."
            }
          >
            <Input
              value={form.castingTime}
              placeholder={form.castType === "Longer Time" ? "1 minute" : "When..."}
              onChange={(event) => setForm({ ...form, castingTime: event.target.value })}
            />
          </Field>
        )}
        <Field label="Source Material">
          <Input
            value={form.sourceMaterial}
            onChange={(event) => setForm({ ...form, sourceMaterial: event.target.value })}
          />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-[15rem_minmax(14rem,1fr)]">
        <Field
          label="Casting trigger"
          help="Use this for spells that are cast after a weapon hit or another specific event."
        >
          <Select
            options={spellCastingTriggers}
            placeholder="Trigger"
            value={form.castingTrigger}
            onValueChange={(castingTrigger) => setForm({ ...form, castingTrigger })}
          />
        </Field>
        <Field label="Trigger detail">
          <Input
            value={form.triggerDetail}
            placeholder="Immediately after hitting with a ranged weapon..."
            onChange={(event) => setForm({ ...form, triggerDetail: event.target.value })}
          />
        </Field>
      </div>
      <SpellSubsection
        title="Spell Tags"
        description="Tags describe special casting rules that are not part of the action cost."
      >
        <Checkbox
          label="Ritual spell"
          checked={form.ritual}
          onChange={(ritual) => setForm({ ...form, ritual })}
        />
      </SpellSubsection>
      <SpellSubsection
        title="Components"
        description="Mark the printed verbal, somatic, and material components."
      >
        <ComponentToggles form={form} setForm={setForm} />
      </SpellSubsection>
      {form.components.material && (
        <Field label="Material components">
          <Input
            value={form.materialComponents}
            onChange={(event) => setForm({ ...form, materialComponents: event.target.value })}
          />
        </Field>
      )}
    </FormSection>
  );
}

function needsCastingTimeDetail(castType: string) {
  return castType === "Reaction" || castType === "Longer Time" || castType === "Special";
}

function ComponentToggles({ form, setForm }: SpellFormProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {(["verbal", "somatic", "material"] as const).map((key) => (
        <Checkbox
          key={key}
          label={key[0].toUpperCase() + key.slice(1)}
          checked={form.components[key]}
          onChange={(checked) =>
            setForm({ ...form, components: { ...form.components, [key]: checked } })
          }
        />
      ))}
    </div>
  );
}

function RangeDurationSection({ form, setForm }: SpellFormProps) {
  const isSelfRange = form.rangeType === "Self";
  const showDurationAmount = form.durationType === "Time" || form.durationType === "Concentration";
  const showDurationText =
    form.durationType === "Special" ||
    form.durationType === "Until Dispelled" ||
    form.durationType === "Until Dispelled Or Triggered";
  return (
    <FormSection title="Range & Duration">
      <div className="grid gap-3 md:grid-cols-[11rem_8rem_minmax(12rem,1fr)]">
        <SelectField
          label="Range Type"
          options={spellRangeTypes}
          value={form.rangeType}
          onChange={(rangeType) => setForm({ ...form, rangeType })}
        />
        {!isSelfRange && (
          <>
            <NumberField
              label="Range ft"
              value={form.rangeFeet}
              onChange={(rangeFeet) => setForm({ ...form, rangeFeet })}
            />
            <TextField
              label="Range Text"
              value={form.range}
              onChange={(range) => setForm({ ...form, range })}
            />
          </>
        )}
      </div>
      <TargetingFields form={form} setForm={setForm} selfRange={isSelfRange} />
      {isSelfRange && (
        <SpellNotice>
          Self-range spells do not need a distance. Choose Area around self if the spell affects
          creatures around the caster.
        </SpellNotice>
      )}
      <div className="grid gap-3 md:grid-cols-[13rem_8rem_10rem_minmax(12rem,1fr)]">
        <SelectField
          label="Duration Type"
          options={spellDurationTypes}
          value={form.durationType}
          onChange={(durationType) =>
            setForm({ ...form, durationType, concentration: durationType === "Concentration" })
          }
        />
        {showDurationAmount && (
          <>
            <NumberField
              label="Duration"
              value={form.durationValue}
              onChange={(durationValue) => setForm({ ...form, durationValue })}
            />
            <SelectField
              label="Scale"
              options={spellTimeScales}
              value={form.durationScale}
              onChange={(durationScale) => setForm({ ...form, durationScale })}
            />
          </>
        )}
        {showDurationText && (
          <TextField
            label="Duration Text"
            value={form.duration}
            onChange={(duration) => setForm({ ...form, duration })}
          />
        )}
      </div>
      {form.durationType === "Instantaneous" && (
        <p className="-mt-1 text-xs font-medium text-muted-foreground">
          The spell resolves immediately, so no duration amount is needed.
        </p>
      )}
    </FormSection>
  );
}

function TargetingFields({
  form,
  setForm,
  selfRange = false,
}: SpellFormProps & { selfRange?: boolean }) {
  const targetPattern = form.targetPattern === "area_around_target" ? "area" : form.targetPattern;
  const showMeasuredFrom = targetPattern === "area" || !selfRange;
  const targetGrid = showMeasuredFrom
    ? "grid gap-3 md:grid-cols-[14rem_18rem_minmax(14rem,1fr)]"
    : "grid gap-3 md:grid-cols-[16rem_minmax(14rem,1fr)]";
  return (
    <div className={targetGrid}>
      <Field
        label={selfRange ? "Targets / Area" : "Targets"}
        help={
          selfRange
            ? "Range can be Self while the spell still affects a target or an area measured from the caster, a triggering target, or another anchor."
            : "Use Target for ordinary spells, or Area plus Measured from for bursts around a point, caster, or triggering target."
        }
      >
        <Select
          options={spellTargetPatterns}
          placeholder="Pattern"
          value={targetPattern}
          onValueChange={(targetPattern) =>
            setForm({
              ...form,
              targetPattern,
              targetAnchor:
                targetPattern === "area" && !form.targetAnchor ? "caster" : form.targetAnchor,
            })
          }
        />
      </Field>
      {showMeasuredFrom && (
        <Field
          label="Measured from"
          help="For triggered area spells, use the target hit by the triggering attack."
        >
          <Select
            options={spellTargetAnchors}
            placeholder="Anchor"
            value={form.targetAnchor}
            onValueChange={(targetAnchor) => setForm({ ...form, targetAnchor })}
          />
        </Field>
      )}
      {isAreaTarget(targetPattern) && (
        <SpellNotice>
          Set the area shape and size below. Range and area can be different, so Self range can
          still be measured from a triggering target.
        </SpellNotice>
      )}
    </div>
  );
}

function isAreaTarget(targetPattern: string) {
  return targetPattern === "area" || targetPattern === "area_around_target";
}

function DescriptionSection({ form, setForm }: SpellFormProps) {
  function generateDescription() {
    if (
      form.description.trim() &&
      !window.confirm("Replace the existing description with generated text?")
    ) {
      return;
    }
    setForm({ ...form, description: generateSpellDescription(form) });
  }

  return (
    <FormSection title="Description">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
        <span>
          Generate a starting description from range, duration, targets, area, and spell effects.
        </span>
        <Button type="button" size="sm" variant="secondary" onClick={generateDescription}>
          Generate description
        </Button>
      </div>
      <Field label="Description">
        <Textarea
          rows={5}
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
      </Field>
      <Field label="At Higher Levels">
        <Textarea
          rows={3}
          value={form.higherLevel}
          onChange={(event) => setForm({ ...form, higherLevel: event.target.value })}
        />
      </Field>
    </FormSection>
  );
}

function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Select
        options={options.map(option)}
        placeholder={label}
        value={value}
        onValueChange={onChange}
      />
    </Field>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

function NumberField(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={props.label}>
      <Input
        inputMode="numeric"
        type="number"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </Field>
  );
}

function MultiCheck({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((item) => (
        <Checkbox
          key={item}
          label={item}
          checked={selected.includes(item)}
          onChange={(checked) =>
            onChange(checked ? [...selected, item] : selected.filter((value) => value !== item))
          }
        />
      ))}
    </div>
  );
}

function option(value: string) {
  return { value, label: value };
}
