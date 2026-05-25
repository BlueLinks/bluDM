import { Checkbox, Field, Input, Select, Textarea } from "../../components/ui";
import { configText } from "../../lib/domain/effectConfig";
import {
  actionRestrictionModes,
  areaTriggerOutcomes,
  areaTriggerModes,
  effectAbilities,
  repeatSaveCheckTypes,
  repeatSaveSuccessOutcomes,
  senseEffectModes,
  terrainEffectModes,
  visibilityEffectModes,
} from "../../lib/domain/spellEffectOptions";
import type { SpellActionFormState } from "../../types";

export const advancedEffectKinds = [
  "action_restriction",
  "saving_throw_repeat",
  "area_trigger",
  "visibility_effect",
  "sense_effect",
  "terrain_effect",
  "healing_maximized",
  "heal_to_full",
  "death_protection",
  "linked_healing",
  "damage_transfer",
  "battlefield_object",
];

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
      <div className="grid gap-3 md:grid-cols-[16rem_minmax(16rem,1fr)]">
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
      <div className="grid gap-3 md:grid-cols-[13rem_14rem_15rem_minmax(16rem,1fr)]">
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
        />
      </div>
    );
  }
  if (roll.rollKind === "area_trigger") {
    return (
      <div className="grid gap-3 md:grid-cols-[18rem_15rem_13rem_minmax(16rem,1fr)]">
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
        <EffectConfigSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="saveAbility"
          label="Save ability"
          options={effectAbilities}
        />
        <EffectConfigInput
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="details"
          label="Area details"
          placeholder="Once per turn, shapechanger reverts, per 5 feet moved..."
        />
      </div>
    );
  }
  if (roll.rollKind === "visibility_effect") {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
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
      <div className="grid gap-3 sm:grid-cols-3">
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
      <div className="grid gap-3 sm:grid-cols-2">
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
    return (
      <div className="grid gap-3 md:grid-cols-[16rem_minmax(18rem,1fr)]">
        <EffectConfigInput
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="kind"
          label="Object type"
          placeholder="Wall, sphere, hand, summoned object..."
        />
        <EffectConfigTextarea
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="details"
          label="Battlefield details"
          placeholder="What the DM should place, move, or track on the battlefield."
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
  configKey,
  help,
  label,
  onChange,
  options,
  roll,
  rolls,
}: {
  configKey: string;
  help?: string;
  label: string;
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
  options: Array<{ value: string; label: string }>;
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
}) {
  return (
    <Field label={label} help={help}>
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
  configKey,
  help,
  label,
  onChange,
  placeholder,
  roll,
  rolls,
}: {
  configKey: string;
  help?: string;
  label: string;
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
  placeholder?: string;
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
}) {
  return (
    <Field label={label} help={help}>
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
  configKey,
  help,
  label,
  onChange,
  placeholder,
  roll,
  rolls,
}: {
  configKey: string;
  help?: string;
  label: string;
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
  placeholder?: string;
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
}) {
  return (
    <Field label={label} help={help}>
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
  configKey,
  help,
  label,
  onChange,
  options,
  roll,
  rolls,
}: {
  configKey: string;
  help?: string;
  label: string;
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
  options: Array<{ value: string; label: string }>;
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
}) {
  const selected = configStringArray(roll.effectConfig?.[configKey]);
  return (
    <Field label={label} help={help}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            checked={selected.includes(option.value)}
            onChange={(checked) =>
              updateEffectConfig(
                rolls,
                roll.id,
                configKey,
                checked
                  ? [...selected, option.value]
                  : selected.filter((value) => value !== option.value),
                onChange,
              )
            }
          />
        ))}
      </div>
    </Field>
  );
}

export function EffectConfigSegmented({
  configKey,
  onChange,
  options,
  roll,
  rolls,
}: {
  configKey: string;
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
  options: Array<{ value: string; label: string }>;
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
}) {
  const selected = configText(roll.effectConfig?.[configKey], options[0]?.value ?? "");
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-card">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={[
            "min-h-10 px-3 text-sm font-semibold transition",
            selected === option.value
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
          ].join(" ")}
          onClick={() => updateEffectConfig(rolls, roll.id, configKey, option.value, onChange)}
        >
          {option.label}
        </button>
      ))}
    </div>
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
