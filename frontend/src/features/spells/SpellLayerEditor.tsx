import { Plus, Trash2 } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "../../components/ui";
import { damageTypeOptions } from "../../components/shared/damageTypes";
import { configText } from "../../lib/domain/effectConfig";
import { effectAbilities } from "../../lib/domain/spellEffectOptions";
import type { SpellActionFormState } from "../../types";
import { updateEffectConfig } from "./SpellEffectConfigFields";

type Layer = Record<string, unknown>;

const saveEffects = [
  { value: "", label: "No save effect" },
  { value: "half", label: "Half damage" },
  { value: "negates", label: "Negates effect" },
  { value: "manual", label: "Manual outcome" },
];

export function SpellLayerEditor({
  roll,
  rolls,
  onChange,
}: {
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
}) {
  const layers = layerRows(roll.effectConfig?.layers);
  return (
    <div className="grid gap-3">
      <div className="grid items-start gap-3 md:grid-cols-[minmax(12rem,1fr)_minmax(16rem,2fr)]">
        <ConfigInput
          label="Layer set"
          value={configText(roll.effectConfig?.name, "Prismatic Layers")}
          onChange={(value) => updateEffectConfig(rolls, roll.id, "name", value, onChange)}
        />
        <ConfigInput
          label="Wall reminder"
          value={configText(roll.effectConfig?.riderText, "")}
          onChange={(value) => updateEffectConfig(rolls, roll.id, "riderText", value, onChange)}
        />
      </div>
      <div className="grid gap-2">
        {layers.map((layer, index) => (
          <LayerRowEditor
            key={index}
            layer={layer}
            onChange={(next) => updateLayers(roll, rolls, replaceAt(layers, index, next), onChange)}
            onRemove={() =>
              updateLayers(
                roll,
                rolls,
                layers.filter((_, layerIndex) => layerIndex !== index),
                onChange,
              )
            }
          />
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        icon={Plus}
        onClick={() =>
          updateLayers(
            roll,
            rolls,
            [...layers, { order: layers.length + 1, color: "", effectText: "" }],
            onChange,
          )
        }
      >
        Add layer
      </Button>
    </div>
  );
}

function LayerRowEditor({
  layer,
  onChange,
  onRemove,
}: {
  layer: Layer;
  onChange: (layer: Layer) => void;
  onRemove: () => void;
}) {
  return (
    <article className="grid gap-3 rounded-md border border-border bg-card p-3">
      <div className="grid items-start gap-3 md:grid-cols-[5rem_minmax(8rem,1fr)_minmax(10rem,1fr)_auto]">
        <ConfigInput
          label="Order"
          value={configText(layer.order)}
          onChange={(value) => onChange({ ...layer, order: numericOrText(value) })}
        />
        <ConfigInput
          label="Color"
          value={configText(layer.color)}
          onChange={(value) => onChange({ ...layer, color: value })}
        />
        <ConfigInput
          label="Condition"
          value={configText(layer.condition)}
          onChange={(value) => onChange({ ...layer, condition: value })}
        />
        <Button type="button" icon={Trash2} variant="danger" size="sm" onClick={onRemove} />
      </div>
      <div className="grid items-start gap-3 md:grid-cols-4">
        <ConfigInput
          label="Dice count"
          value={configText(layer.diceCount)}
          onChange={(value) => onChange({ ...layer, diceCount: numericOrText(value) })}
        />
        <ConfigInput
          label="Die size"
          value={configText(layer.dieSize)}
          onChange={(value) => onChange({ ...layer, dieSize: numericOrText(value) })}
        />
        <Field label="Damage type">
          <Select
            options={[{ value: "", label: "No damage" }, ...damageTypeOptions()]}
            placeholder="Damage"
            value={configText(layer.damageType)}
            onValueChange={(damageType) => onChange({ ...layer, damageType })}
          />
        </Field>
        <Field label="Save">
          <Select
            options={[{ value: "", label: "No save" }, ...effectAbilities]}
            placeholder="Save"
            value={configText(layer.saveAbility)}
            onValueChange={(saveAbility) => onChange({ ...layer, saveAbility })}
          />
        </Field>
        <Field label="Save result">
          <Select
            options={saveEffects}
            placeholder="Save result"
            value={configText(layer.saveEffect)}
            onValueChange={(saveEffect) => onChange({ ...layer, saveEffect })}
          />
        </Field>
        <ConfigInput
          label="Repeat save"
          value={configText(layer.repeatSave)}
          onChange={(value) => onChange({ ...layer, repeatSave: value })}
        />
      </div>
      <Field label="Layer effect">
        <Textarea
          rows={2}
          value={configText(layer.effectText || layer.effect)}
          onChange={(event) =>
            onChange({ ...layer, effectText: event.target.value, effect: event.target.value })
          }
        />
      </Field>
      <Field label="Removal rule">
        <Textarea
          rows={2}
          value={configText(layer.removal)}
          onChange={(event) => onChange({ ...layer, removal: event.target.value })}
        />
      </Field>
    </article>
  );
}

function ConfigInput({
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

function updateLayers(
  roll: SpellActionFormState["rolls"][number],
  rolls: SpellActionFormState["rolls"],
  layers: Layer[],
  onChange: (rolls: SpellActionFormState["rolls"]) => void,
) {
  updateEffectConfig(rolls, roll.id, "layers", layers, onChange);
}

function layerRows(value: unknown): Layer[] {
  return Array.isArray(value)
    ? value.filter((layer): layer is Layer => Boolean(layer) && typeof layer === "object")
    : [];
}

function replaceAt<T>(values: T[], index: number, value: T) {
  return values.map((item, itemIndex) => (itemIndex === index ? value : item));
}

function numericOrText(value: string) {
  const parsed = Number(value);
  return value.trim() !== "" && Number.isFinite(parsed) ? parsed : value;
}
