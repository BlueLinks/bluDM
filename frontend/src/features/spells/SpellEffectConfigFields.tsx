import { Field, Input, Select } from "../../components/ui";
import { configText } from "../../lib/domain/effectConfig";
import { spellEffectTimings } from "../../lib/domain/options";
import {
  actionRestrictionModes,
  areaTriggerModes,
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
      <div className="grid gap-2 sm:grid-cols-3">
        <EffectSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="mode"
          label="Restriction"
          options={actionRestrictionModes}
        />
        <EffectInput
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="note"
          label="Details"
          placeholder="Allowed actions, trigger, or limitation"
        />
        <TimingField roll={roll} rolls={rolls} onChange={onChange} />
      </div>
    );
  }
  if (roll.rollKind === "saving_throw_repeat") {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        <EffectInput
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="ability"
          label="Save / check"
          placeholder="con, wis, str_athletics"
        />
        <EffectInput
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="success"
          label="On success"
          placeholder="end_effect"
        />
        <TimingField roll={roll} rolls={rolls} onChange={onChange} />
      </div>
    );
  }
  if (roll.rollKind === "area_trigger") {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        <EffectSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="trigger"
          label="Trigger"
          options={areaTriggerModes}
        />
        <EffectInput
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="effect"
          label="Effect"
          placeholder="Save for damage, restrained, prone..."
        />
        <TimingField roll={roll} rolls={rolls} onChange={onChange} />
      </div>
    );
  }
  if (roll.rollKind === "visibility_effect") {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        <EffectSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="mode"
          label="Visibility"
          options={visibilityEffectModes}
        />
        <EffectInput
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="lightRadius"
          label="Light radius"
          placeholder="5"
        />
        <TimingField roll={roll} rolls={rolls} onChange={onChange} />
      </div>
    );
  }
  if (roll.rollKind === "sense_effect") {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        <EffectSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="mode"
          label="Sense"
          options={senseEffectModes}
        />
        <EffectInput
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="range"
          label="Range"
          placeholder="60"
        />
        <TimingField roll={roll} rolls={rolls} onChange={onChange} />
      </div>
    );
  }
  if (roll.rollKind === "terrain_effect") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <EffectSelect
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="mode"
          label="Terrain rule"
          options={terrainEffectModes}
        />
        <TimingField roll={roll} rolls={rolls} onChange={onChange} />
      </div>
    );
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <EffectInput
        roll={roll}
        rolls={rolls}
        onChange={onChange}
        configKey="mode"
        label="Mode / details"
        placeholder="Optional effect detail"
      />
      <TimingField roll={roll} rolls={rolls} onChange={onChange} />
    </div>
  );
}

export function EffectSelect({
  configKey,
  label,
  onChange,
  options,
  roll,
  rolls,
}: {
  configKey: string;
  label: string;
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
  options: Array<{ value: string; label: string }>;
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
}) {
  return (
    <Field label={label}>
      <Select
        options={options}
        placeholder={label}
        value={configText(roll.effectConfig?.[configKey], "")}
        onValueChange={(value) => updateEffectConfig(rolls, roll.id, configKey, value, onChange)}
      />
    </Field>
  );
}

export function EffectInput({
  configKey,
  label,
  onChange,
  placeholder,
  roll,
  rolls,
}: {
  configKey: string;
  label: string;
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
  placeholder?: string;
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
}) {
  return (
    <Field label={label}>
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

export function TimingField({
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

function updateEffectConfig(
  rolls: SpellActionFormState["rolls"],
  rollID: string,
  key: string,
  value: string,
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
