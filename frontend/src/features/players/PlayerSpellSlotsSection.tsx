import type { Dispatch, SetStateAction } from "react";
import { SlotStepper } from "../../components/ui";
import type { PlayerFormState } from "../../types";

type SpellSlotLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type PlayerSpellSlotKey = `spellSlots${SpellSlotLevel}`;
type PlayerSpellSlotRemainingKey = `spellSlotsRemaining${SpellSlotLevel}`;
type PlayerFormSetter = Dispatch<SetStateAction<PlayerFormState>>;

const spellSlotLevels: SpellSlotLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function PlayerSpellSlotsSection({
  form,
  setForm,
}: {
  form: PlayerFormState;
  setForm: PlayerFormSetter;
}) {
  function updateSpellSlots(level: SpellSlotLevel, value: string) {
    const slotKey: PlayerSpellSlotKey = `spellSlots${level}`;
    const remainingKey: PlayerSpellSlotRemainingKey = `spellSlotsRemaining${level}`;
    const nextMax = Math.max(0, Number(value) || 0);
    setForm((current) => {
      const previousMax = Math.max(0, Number(current[slotKey]) || 0);
      const previousRemaining = Math.max(0, Number(current[remainingKey]) || 0);
      const nextRemaining =
        previousRemaining === previousMax ? nextMax : Math.min(previousRemaining, nextMax);
      return {
        ...current,
        [slotKey]: String(nextMax),
        [remainingKey]: String(nextRemaining),
      };
    });
  }

  return (
    <div>
      <div className="mb-3">
        <h4 className="text-sm font-semibold">Spell Slots</h4>
        <p className="text-xs text-muted-foreground">
          Set the character's maximum spell slots. Combat tracks remaining slots and long rest
          restores them.
        </p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(76px,1fr))] gap-2">
        {spellSlotLevels.map((level) => (
          <SlotStepper
            key={level}
            level={level}
            value={form[`spellSlots${level}`]}
            onChange={(value) => updateSpellSlots(level, value)}
          />
        ))}
      </div>
    </div>
  );
}
