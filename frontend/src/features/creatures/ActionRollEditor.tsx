import { Plus, Trash2 } from "lucide-react";
import { DiceFormulaInput } from "../../components/shared/CharacterFormControls";
import { damageTypes } from "../../components/shared/damageTypes";
import { Button, Checkbox, Field, Select } from "../../components/ui";
import { blankRoll } from "../../lib/domain/forms";
import type { ActionRollFormState } from "../../types";

export function ActionRollEditor({
  rolls,
  onChange,
  compact = false,
}: {
  rolls: ActionRollFormState[];
  onChange: (rolls: ActionRollFormState[]) => void;
  compact?: boolean;
}) {
  return (
    <div className="grid gap-2">
      {rolls.map((roll) => (
        <div
          className="grid items-start gap-3 rounded-md border border-border bg-card p-3 lg:grid-cols-[minmax(150px,1fr)_minmax(280px,1.4fr)_6rem_2.75rem]"
          key={roll.id}
        >
          <Field label="Damage type">
            <Select
              options={damageTypes.map((type) => ({ value: type.id, label: type.label }))}
              placeholder="Damage"
              value={roll.damageType}
              onValueChange={(damageType) =>
                onChange(
                  rolls.map((item) => (item.id === roll.id ? { ...item, damageType } : item)),
                )
              }
            />
          </Field>
          <Field label="Roll">
            <DiceFormulaInput
              value={roll}
              onChange={(next) =>
                onChange(
                  rolls.map((item) =>
                    item.id === roll.id
                      ? {
                          ...item,
                          diceCount: next.diceCount,
                          dieSize: next.dieSize,
                          fixedValue: next.fixedValue,
                        }
                      : item,
                  ),
                )
              }
            />
          </Field>
          <div className="[&>label]:h-10 [&>label]:justify-center [&>label]:px-2">
            <Checkbox
              label="Magical"
              checked={roll.magical}
              onChange={(magical) =>
                onChange(rolls.map((item) => (item.id === roll.id ? { ...item, magical } : item)))
              }
            />
          </div>
          <Button
            type="button"
            icon={Trash2}
            variant="danger"
            size="sm"
            className="h-10 w-11 px-0"
            onClick={() => onChange(rolls.filter((item) => item.id !== roll.id))}
          />
        </div>
      ))}
      {!compact && (
        <Button
          type="button"
          icon={Plus}
          variant="success"
          size="sm"
          onClick={() => onChange([...rolls, blankRoll()])}
        >
          Add roll part
        </Button>
      )}
    </div>
  );
}
