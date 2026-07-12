import { Field, Input, Select, Textarea } from "../../components/ui";
import { configText } from "../../lib/domain/effectConfig";
import {
  actionRestrictionModes,
  areaTriggerOutcomes,
  areaTriggerModes,
  battlefieldAreaShapes,
  battlefieldObjectTypes,
  effectAbilities,
  repeatSaveCheckTypes,
  repeatSaveSuccessOutcomes,
  senseEffectModes,
  terrainEffectModes,
  visibilityEffectModes,
} from "../../lib/domain/spellEffectOptions";
import type { SpellActionFormState } from "../../types";

export const advancedEffectKinds =
  "action_restriction saving_throw_repeat area_trigger visibility_effect sense_effect terrain_effect healing_maximized heal_to_full death_protection linked_healing damage_transfer battlefield_object".split(
    " ",
  );

export function AdvancedEffectConfigFields({
  roll,
  rolls,
  onChange,
}: {
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
}) {
  if (roll.rollKind === "action_restriction") {
    return (
      <div className="grid items-start gap-3 md:grid-cols-[minmax(13rem,18rem)_minmax(16rem,1fr)]">
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="mode"
          label="Restriction"
          options={actionRestrictionModes}
          help="Choose the action economy rule this effect imposes."
        />
        <EffectConfigInput
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="note"
          label="Restriction details"
          placeholder="Allowed actions, trigger, or limitation"
          help="Use this for limits that need table-facing wording."
        />
      </div>
    );
  }
  if (roll.rollKind === "saving_throw_repeat") {
    return (
      <div className="grid items-start gap-3 md:grid-cols-3">
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="checkType"
          label="Repeat check"
          options={repeatSaveCheckTypes}
          help="The kind of roll the target repeats while the effect is active."
        />
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="ability"
          label="Ability or skill"
          options={effectAbilities}
        />
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="successOutcome"
          label="On success"
          options={repeatSaveSuccessOutcomes}
        />
        <EffectConfigInput
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="details"
          label="Repeat details"
          placeholder="Uses an action, ends after three successes..."
          className="md:col-span-3"
        />
      </div>
    );
  }
  if (roll.rollKind === "area_trigger") {
    const outcome = configText(roll.effectConfig?.outcome, "");
    const needsSaveAbility = outcome === "save_for_damage" || outcome === "restrained";
    return (
      <div className="grid items-start gap-3 md:grid-cols-3">
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="trigger"
          label="Area trigger"
          options={areaTriggerModes}
          help="When a creature should be checked against this area."
        />
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="outcome"
          label="Area outcome"
          options={areaTriggerOutcomes}
        />
        {needsSaveAbility && (
          <EffectConfigSelect
            roll={roll}
            rolls={rolls}
            onChange={onChange}
            configKey="saveAbility"
            label="Save ability"
            options={effectAbilities}
          />
        )}
        <EffectConfigInput
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="details"
          label="Area details"
          placeholder="Once per turn, shapechanger reverts, per 5 feet moved..."
          className={needsSaveAbility ? "md:col-span-2" : "md:col-span-3"}
        />
      </div>
    );
  }
  if (roll.rollKind === "visibility_effect") {
    return (
      <div className="grid items-start gap-3 sm:grid-cols-[minmax(12rem,18rem)_8rem]">
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="mode"
          label="Visibility"
          options={visibilityEffectModes}
        />
        <EffectConfigInput
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="lightRadius"
          label="Light radius"
          placeholder="5"
        />
      </div>
    );
  }
  if (roll.rollKind === "sense_effect") {
    return (
      <div className="grid items-start gap-3 sm:grid-cols-[minmax(12rem,18rem)_8rem]">
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="mode"
          label="Sense"
          options={senseEffectModes}
        />
        <EffectConfigInput
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="range"
          label="Range"
          placeholder="60"
        />
      </div>
    );
  }
  if (roll.rollKind === "terrain_effect") {
    return (
      <div className="grid items-start gap-3 sm:grid-cols-[minmax(12rem,18rem)]">
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="mode"
          label="Terrain rule"
          options={terrainEffectModes}
        />
      </div>
    );
  }
  if (roll.rollKind === "battlefield_object") {
    const objectType = configText(roll.effectConfig?.kind, "manual_object");
    const isAreaObject = objectType === "spell_area";
    return (
      <div className="grid items-start gap-3 md:grid-cols-2">
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="kind"
          label="Battlefield object"
          options={battlefieldObjectTypes}
          help="Choose what the DM needs to track in the encounter. Area objects can later appear in the combat tracker as active areas."
        />
        {isAreaObject && (
          <EffectConfigSelect
            roll={roll}
            rolls={rolls}
            onChange={onChange}
            configKey="shape"
            label="Area shape"
            options={battlefieldAreaShapes}
          />
        )}
        {isAreaObject && (
          <EffectConfigInput
            roll={roll}
            rolls={rolls}
            onChange={onChange}
            configKey="radiusFeet"
            label="Radius or size (ft)"
            placeholder="5"
          />
        )}
        {isAreaObject && (
          <EffectConfigInput
            roll={roll}
            rolls={rolls}
            onChange={onChange}
            configKey="heightFeet"
            label="Height (ft)"
            placeholder="40"
          />
        )}
        {isAreaObject && (
          <EffectConfigInput
            roll={roll}
            rolls={rolls}
            onChange={onChange}
            configKey="moveDistanceFeet"
            label="Move distance (ft)"
            placeholder="60"
            help="How far the caster can move the area when the spell allows repositioning."
          />
        )}
        <EffectConfigTextarea
          className="md:col-span-2"
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey={isAreaObject ? "riderText" : "details"}
          label={isAreaObject ? "Area reminder" : "DM reminder"}
          placeholder={
            isAreaObject
              ? "Extra area rules, riders, or creatures that need special handling."
              : "What the DM should place, move, or track on the battlefield."
          }
        />
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <EffectConfigInput
        roll={roll}
        rolls={rolls}
        onChange={onChange}
        configKey="mode"
        label="Effect detail"
        placeholder="Optional effect detail"
      />
    </div>
  );
}

export function EffectConfigSelect({
  className,
  configKey,
  help,
  label,
  onChange,
  options,
  roll,
  rolls,
}: {
  className?: string;
  configKey: string;
  help?: string;
  label: string;
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
  options: Array<{ value: string; label: string }>;
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
}) {
  return (
    <Field label={label} help={help} className={className}>
      <Select
        options={options}
        placeholder={label}
        value={configText(roll.effectConfig?.[configKey], "")}
        onValueChange={(value) => updateEffectConfig(rolls, roll.id, configKey, value, onChange)}
      />
    </Field>
  );
}

export function EffectConfigInput({
  className,
  configKey,
  help,
  label,
  onChange,
  placeholder,
  roll,
  rolls,
}: {
  className?: string;
  configKey: string;
  help?: string;
  label: string;
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
  placeholder?: string;
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
}) {
  return (
    <Field label={label} help={help} className={className}>
      <Input
        value={configText(roll.effectConfig?.[configKey], "")}
        placeholder={placeholder}
        onChange={(event) =>
          updateEffectConfig(rolls, roll.id, configKey, event.target.value, onChange)
        }
      />
    </Field>
  );
}

export function EffectConfigTextarea({
  className,
  configKey,
  help,
  label,
  onChange,
  placeholder,
  roll,
  rolls,
}: {
  className?: string;
  configKey: string;
  help?: string;
  label: string;
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
  placeholder?: string;
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
}) {
  return (
    <Field label={label} help={help} className={className}>
      <Textarea
        rows={3}
        value={configText(roll.effectConfig?.[configKey], "")}
        placeholder={placeholder}
        onChange={(event) =>
          updateEffectConfig(rolls, roll.id, configKey, event.target.value, onChange)
        }
      />
    </Field>
  );
}

export function EffectConfigMultiCheck({
  className,
  configKey,
  help,
  label,
  onChange,
  options,
  roll,
  rolls,
}: {
  className?: string;
  configKey: string;
  help?: string;
  label: string;
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
  options: Array<{ value: string; label: string }>;
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
}) {
  const selected = configStringArray(roll.effectConfig?.[configKey]);
  const legacySelected =
    configKey === "categories" && selected.length === 0
      ? configText(roll.effectConfig?.category, "")
      : "";
  const effectiveSelected = selected.length ? selected : legacySelected ? [legacySelected] : [];
  const showBulkActions = configKey === "categories";
  return (
    <Field label={label} help={help} className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {showBulkActions && (
          <>
            <button
              type="button"
              className="min-h-9 rounded-md border border-primary bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/95 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              onClick={() =>
                updateEffectConfig(
                  rolls,
                  roll.id,
                  configKey,
                  options.map((option) => option.value),
                  onChange,
                )
              }
            >
              All
            </button>
            <button
              type="button"
              className="min-h-9 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              onClick={() => updateEffectConfig(rolls, roll.id, configKey, [], onChange)}
            >
              Clear
            </button>
          </>
        )}
        {options.map((option) => {
          const checked = effectiveSelected.includes(option.value);
          return (
            <label
              key={option.value}
              className={[
                "inline-flex min-h-9 items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                checked
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-surface text-surface-foreground hover:bg-card hover:text-foreground",
              ].join(" ")}
            >
              <input
                className="h-4 w-4 accent-primary"
                type="checkbox"
                checked={checked}
                onChange={(event) =>
                  updateEffectConfig(
                    rolls,
                    roll.id,
                    configKey,
                    event.target.checked
                      ? [...effectiveSelected, option.value]
                      : effectiveSelected.filter((value) => value !== option.value),
                    onChange,
                  )
                }
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </Field>
  );
}

export function updateEffectConfig(
  rolls: SpellActionFormState["rolls"],
  rollID: string,
  key: string,
  value: unknown,
  onChange: (rolls: SpellActionFormState["rolls"]) => void,
) {
  onChange(
    rolls.map((item) =>
      item.id === rollID
        ? { ...item, effectConfig: { ...(item.effectConfig ?? {}), [key]: value } }
        : item,
    ),
  );
}

export function configStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
