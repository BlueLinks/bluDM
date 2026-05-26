import { DiceFormulaInput } from "../../components/shared/CharacterFormControls";
import { Field } from "../../components/ui";
import { configText } from "../../lib/domain/effectConfig";
import type { SpellActionFormState } from "../../types";
import type { ReactNode } from "react";

export function RollConfigLayout({ bottom, top }: { bottom: ReactNode; top: ReactNode }) {
  return (
    <div className="grid gap-3">
      <div className="grid items-start gap-3 md:grid-cols-[repeat(auto-fit,minmax(12rem,max-content))]">
        {top}
      </div>
      {bottom}
    </div>
  );
}

export function EffectConfigDiceFormula({
  onChange,
  roll,
  rolls,
}: {
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
}) {
  return (
    <Field label="Amount" help="Use 0 dice plus a modifier for a fixed bonus or penalty.">
      <div className="max-w-[28rem]">
        <DiceFormulaInput
          allowEmpty
          value={parseEffectDiceConfig(roll)}
          onChange={(next) =>
            onChange(
              rolls.map((item) =>
                item.id === roll.id
                  ? {
                      ...item,
                      effectConfig: { ...item.effectConfig, dice: diceConfigText(next) },
                    }
                  : item,
              ),
            )
          }
        />
      </div>
    </Field>
  );
}

function parseEffectDiceConfig(roll: SpellActionFormState["rolls"][number]) {
  const text = configText(roll.effectConfig?.dice, "");
  const match = text.trim().match(/^(\d+)d(4|6|8|10|12|20)([+-]\d+)?$/i);
  if (match) return { diceCount: match[1], dieSize: match[2], fixedValue: match[3] ?? "0" };
  const fixed = text.trim().match(/^[+-]?\d+$/) ? text.trim() : roll.fixedValue || "0";
  return { diceCount: "0", dieSize: "4", fixedValue: fixed };
}

function diceConfigText(value: { diceCount: string; dieSize: string; fixedValue: string }) {
  const dice = Math.max(0, Number(value.diceCount) || 0);
  const die = Number(value.dieSize) || 4;
  const fixed = Number(value.fixedValue) || 0;
  const diceText = dice > 0 ? `${dice}d${die}` : "";
  const fixedText = fixed > 0 ? `+${fixed}` : fixed < 0 ? String(fixed) : "";
  return `${diceText}${fixedText}` || "0";
}
