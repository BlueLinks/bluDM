import { Field, Input, Select } from "../../components/ui";
import { configText } from "../../lib/domain/effectConfig";
import {
  spellEffectDurations,
  spellEffectMetadata,
  spellEffectTriggers,
} from "../../lib/domain/spellEffectOptions";
import type { SpellActionFormState } from "../../types";
import { updateEffectConfig } from "./SpellEffectConfigFields";

export function FlatNumberInput({
  onChange,
  value,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const current = Number(value) || 0;
  return (
    <div className="inline-grid max-w-[11rem] grid-cols-[2.25rem_5.5rem_2.25rem] overflow-hidden rounded-md border border-border bg-surface">
      <button
        aria-label="Decrease amount"
        className="grid h-10 place-items-center border-r border-border text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        type="button"
        onClick={() => onChange(String(current - 1))}
      >
        -
      </button>
      <Input
        className="h-10 min-h-0 rounded-none border-0 text-center font-semibold focus:ring-0"
        inputMode="numeric"
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        aria-label="Increase amount"
        className="grid h-10 place-items-center border-l border-border text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        type="button"
        onClick={() => onChange(String(current + 1))}
      >
        +
      </button>
    </div>
  );
}

export function EffectScheduleFields({
  metadata,
  onChange,
  roll,
  rolls,
  updateRoll,
}: {
  metadata: ReturnType<typeof spellEffectMetadata>;
  roll: SpellActionFormState["rolls"][number];
  rolls: SpellActionFormState["rolls"];
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
  updateRoll: (roll: Partial<SpellActionFormState["rolls"][number]>) => void;
}) {
  if (!metadata.trigger && !metadata.duration) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {metadata.trigger && (
        <Field
          label="When it applies"
          help="Use recurring triggers for effects that happen each turn. Immediate effects resolve when the spell is cast."
        >
          <Select
            options={spellEffectTriggers}
            placeholder="Trigger"
            value={triggerValue(roll)}
            onValueChange={(timing) => updateRoll({ timing })}
          />
        </Field>
      )}
      {metadata.duration && (
        <Field
          label="How long it lasts"
          help="This is stored as effect metadata for combat reminders. Existing next-turn timings remain compatible with combat automation."
        >
          <Select
            options={spellEffectDurations}
            placeholder="Duration"
            value={durationValue(roll)}
            onValueChange={(durationMode) => {
              const timing = !metadata.trigger ? legacyTimingForDuration(durationMode) : "";
              onChange(
                rolls.map((item) =>
                  item.id === roll.id
                    ? {
                        ...item,
                        ...(timing ? { timing } : {}),
                        effectConfig: { ...(item.effectConfig ?? {}), durationMode },
                      }
                    : item,
                ),
              );
            }}
          />
          {durationUsesCount(durationValue(roll)) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <FlatNumberInput
                value={configText(roll.effectConfig?.durationValue, "1")}
                onChange={(durationValue) =>
                  updateEffectConfig(rolls, roll.id, "durationValue", durationValue, onChange)
                }
              />
              <div className="rounded-md border border-tertiary/25 bg-tertiary/10 px-3 py-2 text-sm font-medium text-tertiary">
                {durationUnitLabel(durationValue(roll))}
              </div>
            </div>
          )}
        </Field>
      )}
    </div>
  );
}

function triggerValue(roll: SpellActionFormState["rolls"][number]) {
  if (spellEffectTriggers.some((option) => option.value === roll.timing)) return roll.timing;
  return "immediate";
}

function durationValue(roll: SpellActionFormState["rolls"][number]) {
  const configured = configText(roll.effectConfig?.durationMode, "");
  if (configured) return configured;
  if (roll.timing === "start_caster_turn_once") return "start_caster_next";
  if (roll.timing === "end_caster_turn_once") return "end_caster_next";
  if (roll.timing === "start_target_turn_once") return "start_target_next";
  if (roll.timing === "end_target_turn_once") return "end_target_next";
  if (roll.timing === "end_spell") return "spell_duration";
  return "spell_duration";
}

function legacyTimingForDuration(durationMode: string) {
  if (durationMode === "instant") return "immediate";
  if (durationMode === "spell_duration") return "end_spell";
  if (durationMode === "start_caster_next") return "start_caster_turn_once";
  if (durationMode === "end_caster_next") return "end_caster_turn_once";
  if (durationMode === "start_target_next") return "start_target_turn_once";
  if (durationMode === "end_target_next") return "end_target_turn_once";
  return "";
}

function durationUsesCount(durationMode: string) {
  return ["rounds", "turns", "minutes", "hours"].includes(durationMode);
}

function durationUnitLabel(durationMode: string) {
  if (durationMode === "rounds") return "rounds";
  if (durationMode === "turns") return "turns";
  if (durationMode === "minutes") return "minutes";
  if (durationMode === "hours") return "hours";
  return "";
}
