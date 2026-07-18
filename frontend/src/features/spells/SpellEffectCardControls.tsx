import { Field, Select } from "../../components/ui";
import { configText } from "../../lib/domain/effectConfig";
import { spellRollKinds } from "../../lib/domain/options";
import {
  type SpellEffectCategory,
  spellEffectCategories,
} from "../../lib/domain/spellEffectOptions";
import type { SpellActionFormState } from "../../types";

export const outcomeEffectKinds = spellRollKinds
  .map((option) => option.value)
  .filter((kind) => !["roll_table", "layered_effect"].includes(kind));

const outcomeApplyOptions = [
  { value: "", label: "Always" },
  { value: "failed_save", label: "Failed save" },
];

const outcomeSaveEffects = [
  { value: "", label: "No save adjustment" },
  { value: "half", label: "Half on successful save" },
  { value: "negates", label: "Negated by successful save" },
  { value: "manual", label: "Resolve manually" },
];

export function OutcomeEffectResolutionFields({
  roll,
  updateRoll,
}: {
  roll: SpellActionFormState["rolls"][number];
  updateRoll: (roll: Partial<SpellActionFormState["rolls"][number]>) => void;
}) {
  function updateConfig(key: string, value: string) {
    updateRoll({ effectConfig: { ...(roll.effectConfig ?? {}), [key]: value } });
  }
  return (
    <div className="grid items-start gap-3 sm:grid-cols-2">
      <Field label="Apply when">
        <Select
          options={outcomeApplyOptions}
          placeholder="Apply when"
          value={configText(roll.effectConfig?.applyOn, "")}
          onValueChange={(applyOn) => updateConfig("applyOn", applyOn)}
        />
      </Field>
      {roll.rollKind === "damage" && (
        <Field label="Save result">
          <Select
            options={outcomeSaveEffects}
            placeholder="Save result"
            value={configText(roll.effectConfig?.saveEffect, "")}
            onValueChange={(saveEffect) => updateConfig("saveEffect", saveEffect)}
          />
        </Field>
      )}
    </div>
  );
}

export function SpellEffectCategoryPicker({
  categories = spellEffectCategories,
  onChange,
  value,
}: {
  categories?: typeof spellEffectCategories;
  value: SpellEffectCategory;
  onChange: (value: SpellEffectCategory) => void;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Effect category
      </p>
      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-5">
        {categories.map((category) => {
          const active = category.value === value;
          return (
            <button
              key={category.value}
              type="button"
              className={[
                "rounded-md border px-2 py-2 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-surface text-surface-foreground hover:border-primary/40 hover:bg-card hover:text-foreground",
              ].join(" ")}
              onClick={() => onChange(category.value)}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function defaultsForRollKind(
  rollKind: string,
): Partial<SpellActionFormState["rolls"][number]> {
  if (rollKind === "damage") {
    return { rollKind, damageType: "force", diceCount: "1", dieSize: "6", fixedValue: "0" };
  }
  if (rollKind === "condition" || rollKind === "remove_condition" || rollKind === "custom") {
    return { rollKind, conditionName: "" };
  }
  return { rollKind };
}
