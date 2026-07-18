import { DiceFormulaInput } from "../../components/shared/CharacterFormControls";
import { Field } from "../../components/ui";
import { validateACFormula } from "../../lib/domain/acFormula";
import { configText } from "../../lib/domain/effectConfig";
import {
  baseACAbilityModifiers,
  baseACCalculationModes,
} from "../../lib/domain/spellEffectOptions";
import type { SpellActionFormState } from "../../types";
import { EffectConfigSelect, updateEffectConfig } from "./SpellEffectConfigFields";

export function BaseACFields({
  roll,
  rolls,
  onChange,
}: {
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
}) {
  const mode = configText(roll.effectConfig?.calculationMode, "formula");
  const formula = configText(roll.effectConfig?.formula, "");
  const formulaValidation = mode === "formula" ? validateACFormula(formula) : { ok: true };
  return (
    <div className="grid gap-3">
      <Field
        label="AC calculation"
        help="Use Formula for typed rules expressions, or Dice when the base AC is rolled."
      >
        <BaseACSegmented
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          configKey="calculationMode"
          options={baseACCalculationModes}
        />
      </Field>
      {mode === "dice" ? (
        <div className="grid gap-3 sm:grid-cols-[minmax(18rem,1fr)_16rem]">
          <div className="grid min-w-0 gap-2 text-sm font-medium">
            <div>
              <p className="text-[0.82rem] font-semibold text-muted-foreground">AC dice</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use this when the spell rolls to set the target's AC.
              </p>
            </div>
            <DiceFormulaInput
              value={{
                diceCount: roll.diceCount || "1",
                dieSize: roll.dieSize || "12",
                fixedValue: roll.fixedValue || "0",
              }}
              onChange={(next) =>
                onChange(
                  rolls.map((item) =>
                    item.id === roll.id
                      ? {
                          ...item,
                          diceCount: next.diceCount,
                          dieSize: next.dieSize,
                          fixedValue: next.fixedValue,
                          effectConfig: {
                            ...item.effectConfig,
                            dice: baseACEffectFormula({ ...item, ...next }),
                          },
                        }
                      : item,
                  ),
                )
              }
            />
          </div>
          <EffectConfigSelect
            roll={roll}
            rolls={rolls}
            onChange={onChange}
            configKey="abilityModifier"
            label="Ability modifier"
            options={baseACAbilityModifiers}
          />
        </div>
      ) : (
        <Field
          label="AC formula"
          help="Accepted examples: 13 + Dex modifier, 13 + Dexterity Score, d12 + Dex."
        >
          <input
            className={[
              "h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring",
              formulaValidation.ok ? "border-border" : "border-destructive",
            ].join(" ")}
            value={formula}
            placeholder="13 + Dex modifier"
            onChange={(event) =>
              onChange(
                rolls.map((item) =>
                  item.id === roll.id
                    ? {
                        ...item,
                        effectConfig: { ...item.effectConfig, formula: event.target.value },
                      }
                    : item,
                ),
              )
            }
          />
          {!formulaValidation.ok && (
            <p className="text-xs font-semibold text-destructive">{formulaValidation.error}</p>
          )}
          {formulaValidation.ok && formulaValidation.normalized && (
            <p className="text-xs text-muted-foreground">
              Saves as: {formulaValidation.normalized}
            </p>
          )}
        </Field>
      )}
    </div>
  );
}

function BaseACSegmented({
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
    <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-surface">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={[
            "min-h-10 px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            selected === option.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-surface text-surface-foreground hover:bg-card hover:text-foreground",
          ].join(" ")}
          onClick={() => updateEffectConfig(rolls, roll.id, configKey, option.value, onChange)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function baseACEffectFormula(roll: SpellActionFormState["rolls"][number]) {
  const dice = Number(roll.diceCount) || 0;
  const die = Number(roll.dieSize) || 6;
  const fixed = Number(roll.fixedValue) || 0;
  const parts: string[] = [];
  if (dice > 0) parts.push(`${dice}d${die}`);
  if (fixed > 0) parts.push(`+${fixed}`);
  if (fixed < 0) parts.push(String(fixed));
  return parts.length ? parts.join(" ") : "0";
}
