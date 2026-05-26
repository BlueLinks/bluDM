import { Plus } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "../../components/ui";
import { configText } from "../../lib/domain/effectConfig";
import { diceSizes } from "../../lib/domain/options";
import type { SpellActionFormState, SpellActionRollFormState } from "../../types";
import { updateEffectConfig } from "./SpellEffectConfigFields";
import { SpellEffectCard } from "./SpellEffectCard";

type TableRow = Record<string, unknown>;
type NestedEffect = Record<string, unknown>;

export function SpellRollTableEditor({
  roll,
  rolls,
  onChange,
}: {
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
}) {
  const tableDie = parseTableDie(configText(roll.effectConfig?.dice, "1d8"));
  const rows = generatedRows(roll.effectConfig?.rows, Number(tableDie));
  return (
    <div className="grid gap-3">
      <div className="grid items-start gap-3 md:grid-cols-[12rem_minmax(14rem,1fr)]">
        <TableDieInput
          value={tableDie}
          onChange={(dieSize) =>
            updateRollTableConfig(
              roll,
              rolls,
              {
                ...(roll.effectConfig ?? {}),
                dice: `1d${dieSize}`,
                rows: generatedRows(roll.effectConfig?.rows, Number(dieSize)),
              },
              onChange,
            )
          }
        />
        <ConfigInput
          label="Instructions"
          value={configText(roll.effectConfig?.instruction, "")}
          onChange={(value) => updateEffectConfig(rolls, roll.id, "instruction", value, onChange)}
        />
      </div>
      <div className="grid gap-2">
        {rows.map((row, index) => (
          <TableRowEditor
            key={String(row.roll)}
            face={index + 1}
            row={row}
            onChange={(next) => updateRows(roll, rolls, replaceAt(rows, index, next), onChange)}
          />
        ))}
      </div>
    </div>
  );
}

function TableRowEditor({
  face,
  row,
  onChange,
}: {
  face: number;
  row: TableRow;
  onChange: (row: TableRow) => void;
}) {
  const effects = nestedEffects(row, face);
  return (
    <article className="grid gap-3 rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">
            Outcome {face}: {configText(row.name, "Unnamed")}
          </div>
          <div className="text-xs text-muted-foreground">
            {effects.length} structured {effects.length === 1 ? "effect" : "effects"}
          </div>
        </div>
        <div className="rounded-full border border-border bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">
          d{face}
        </div>
      </div>
      <div className="grid items-start gap-3 md:grid-cols-[minmax(10rem,1fr)_minmax(14rem,2fr)]">
        <ConfigInput
          label="Outcome name"
          value={configText(row.name)}
          onChange={(value) => onChange({ ...row, roll: face, name: value })}
        />
        <Field label="DM reminder">
          <Textarea
            rows={2}
            value={configText(row.effectText || row.effect)}
            onChange={(event) =>
              onChange({
                ...row,
                roll: face,
                effectText: event.target.value,
                effect: event.target.value,
              })
            }
          />
        </Field>
      </div>
      <div className="grid gap-2 rounded-md border border-dashed border-border bg-background p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold uppercase text-muted-foreground">Outcome effects</div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={Plus}
            onClick={() =>
              onChange({
                ...row,
                roll: face,
                effects: [...effects, blankOutcomeEffect(face, effects.length)],
              })
            }
          >
            Add effect
          </Button>
        </div>
        {effects.length === 0 ? (
          <div className="rounded-md border border-border bg-muted/40 px-2 py-2 text-xs text-muted-foreground">
            No structured effects yet. Add damage, conditions, repeat saves, or a manual reminder.
          </div>
        ) : (
          effects.map((effect, effectIndex) => (
            <SpellEffectCard
              key={effect.id}
              index={effectIndex}
              mode="outcome"
              roll={effect}
              rolls={effects}
              onChange={(nextEffects) =>
                onChange({ ...row, roll: face, effects: nextEffects.map(effectPayload) })
              }
              onRemove={() =>
                onChange({
                  ...row,
                  roll: face,
                  effects: effects.filter((_, index) => index !== effectIndex).map(effectPayload),
                })
              }
            />
          ))
        )}
      </div>
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

function updateRollTableConfig(
  roll: SpellActionFormState["rolls"][number],
  rolls: SpellActionFormState["rolls"],
  effectConfig: Record<string, unknown>,
  onChange: (rolls: SpellActionFormState["rolls"]) => void,
) {
  onChange(rolls.map((item) => (item.id === roll.id ? { ...item, effectConfig } : item)));
}

function updateRows(
  roll: SpellActionFormState["rolls"][number],
  rolls: SpellActionFormState["rolls"],
  rows: TableRow[],
  onChange: (rolls: SpellActionFormState["rolls"]) => void,
) {
  updateEffectConfig(rolls, roll.id, "rows", rows, onChange);
}

function generatedRows(value: unknown, dieSize: number): TableRow[] {
  const sourceRows = tableRows(value);
  const rowByRoll = new Map(
    sourceRows.map((row, index) => [numericValue(row.roll, index + 1), row]),
  );
  return Array.from({ length: Math.max(2, dieSize) }, (_, index) =>
    normalizeRow(rowByRoll.get(index + 1), index + 1),
  );
}

function normalizeRow(row: TableRow | undefined, face: number): TableRow {
  const base = row ?? {};
  return {
    ...base,
    roll: face,
    effects: nestedEffects(base, face).map(effectPayload),
  };
}

function tableRows(value: unknown): TableRow[] {
  return Array.isArray(value)
    ? value.filter((row): row is TableRow => Boolean(row) && typeof row === "object")
    : [];
}

function nestedEffects(row: TableRow, face: number): SpellActionRollFormState[] {
  const configured = Array.isArray(row.effects)
    ? row.effects.filter(
        (effect): effect is NestedEffect => Boolean(effect) && typeof effect === "object",
      )
    : [];
  const effects = configured.length ? configured : legacyEffects(row);
  return effects.map((effect, index) => effectToRoll(effect, face, index));
}

function legacyEffects(row: TableRow): NestedEffect[] {
  const effects: NestedEffect[] = [];
  const damageType = configText(row.damageType);
  const diceCount = numericValue(row.diceCount, 0);
  if (damageType && diceCount > 0) {
    effects.push({
      rollKind: "damage",
      damageType,
      diceCount,
      dieSize: numericValue(row.dieSize, 6),
      effectConfig: { saveEffect: configText(row.saveEffect) },
    });
  }
  const condition = configText(row.condition);
  if (condition) {
    effects.push({
      rollKind: "condition",
      conditionName: condition,
      effectConfig: { applyOn: configText(row.saveEffect) === "negates" ? "failed_save" : "" },
    });
  }
  const repeatSave = configText(row.repeatSave);
  if (repeatSave) {
    effects.push({
      rollKind: "saving_throw_repeat",
      effectConfig: {
        ability: repeatSave,
        applyOn: configText(row.saveEffect) === "negates" ? "failed_save" : "",
        checkType: "saving_throw",
        details: configText(row.effectText || row.effect),
      },
    });
  }
  if (effects.length === 0 && configText(row.rerollRule || row.effectText || row.effect)) {
    effects.push({
      rollKind: "custom",
      conditionName: configText(row.rerollRule || row.effectText || row.effect),
    });
  }
  return effects;
}

function effectToRoll(effect: NestedEffect, face: number, index: number): SpellActionRollFormState {
  const effectConfig = nestedConfig(effect);
  if (effect.applyOn && !effectConfig.applyOn) effectConfig.applyOn = effect.applyOn;
  if (effect.saveEffect && !effectConfig.saveEffect) effectConfig.saveEffect = effect.saveEffect;
  return {
    id: configText(effect.id, `table-${face}-effect-${index + 1}`),
    rollKind: configText(effect.rollKind, "custom"),
    damageType: configText(effect.damageType, "force"),
    magical: typeof effect.magical === "boolean" ? effect.magical : true,
    diceCount: String(numericValue(effect.diceCount, 1)),
    dieSize: String(numericValue(effect.dieSize, 6)),
    fixedValue: String(numericValue(effect.fixedValue, 0)),
    addPrimaryStatModifier: Boolean(effect.addPrimaryStatModifier),
    conditionName: configText(effect.conditionName),
    effectConfig,
    timing: configText(effect.timing, "immediate"),
    scalingType: configText(effect.scalingType, "none"),
    scalingFromLevel: String(numericValue(effect.scalingFromLevel, 0)),
    scalingDiceCount: String(numericValue(effect.scalingDiceCount, 0)),
    scalingDieSize: String(numericValue(effect.scalingDieSize, 6)),
    scalingFixedValue: String(numericValue(effect.scalingFixedValue, 0)),
    scalingStepSize: String(numericValue(effect.scalingStepSize, 1)),
    cantrip5DiceCount: String(numericValue(effect.cantrip5DiceCount, 0)),
    cantrip5DieSize: String(numericValue(effect.cantrip5DieSize, 6)),
    cantrip11DiceCount: String(numericValue(effect.cantrip11DiceCount, 0)),
    cantrip11DieSize: String(numericValue(effect.cantrip11DieSize, 6)),
    cantrip17DiceCount: String(numericValue(effect.cantrip17DiceCount, 0)),
    cantrip17DieSize: String(numericValue(effect.cantrip17DieSize, 6)),
  };
}

function blankOutcomeEffect(face: number, index: number): SpellActionRollFormState {
  return effectToRoll({ id: `table-${face}-effect-${index + 1}`, rollKind: "custom" }, face, index);
}

function effectPayload(effect: SpellActionRollFormState): Record<string, unknown> {
  return {
    id: effect.id,
    rollKind: effect.rollKind,
    damageType: effect.damageType,
    magical: effect.magical,
    diceCount: Number(effect.diceCount) || 0,
    dieSize: Number(effect.dieSize) || 6,
    fixedValue: Number(effect.fixedValue) || 0,
    addPrimaryStatModifier: effect.addPrimaryStatModifier,
    conditionName: effect.conditionName,
    effectConfig: effect.effectConfig ?? {},
    timing: effect.timing,
  };
}

function nestedConfig(effect: NestedEffect): Record<string, unknown> {
  return effect.effectConfig && typeof effect.effectConfig === "object"
    ? { ...(effect.effectConfig as Record<string, unknown>) }
    : {};
}

function numericValue(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function replaceAt<T>(values: T[], index: number, value: T) {
  return values.map((item, itemIndex) => (itemIndex === index ? value : item));
}

function TableDieInput({
  onChange,
  value,
}: {
  onChange: (dieSize: string) => void;
  value: string;
}) {
  const standard = diceSizes.map(String);
  const isCustom = !standard.includes(value);
  return (
    <div className="grid gap-2">
      <Field label="Table die">
        <Select
          options={[
            ...standard.map((die) => ({ value: die, label: `d${die}` })),
            { value: "custom", label: "Custom die" },
          ]}
          placeholder="Die"
          value={isCustom ? "custom" : value}
          onValueChange={(next) => onChange(next === "custom" ? (isCustom ? value : "100") : next)}
        />
      </Field>
      {isCustom && (
        <Field label="Custom die value">
          <Input
            inputMode="numeric"
            min={2}
            max={100}
            type="number"
            value={value}
            onChange={(event) => onChange(sanitizePositiveDie(event.target.value))}
          />
        </Field>
      )}
    </div>
  );
}

function parseTableDie(value: string) {
  const match = value
    .trim()
    .toLowerCase()
    .match(/^1d(\d+)$/);
  if (!match) return "8";
  return sanitizePositiveDie(match[1]);
}

function sanitizePositiveDie(value: string) {
  const parsed = Number(value.replace(/\D/g, ""));
  return String(Math.min(100, Math.max(2, Number.isFinite(parsed) ? parsed : 8)));
}
