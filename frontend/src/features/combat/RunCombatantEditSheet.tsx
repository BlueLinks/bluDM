import { useEffect, useState } from "react";
import { Button, Checkbox, Field, Input, Sheet } from "../../components/ui";
import {
  combatantColors,
  conditionImmunities,
  defaultCombatantColor,
} from "../../lib/domain/options";
import type { EncounterRunCombatant } from "../../types";

export function RunCombatantEditSheet({
  combatant,
  onClose,
  onSave,
}: {
  combatant: EncounterRunCombatant | null;
  onClose: () => void;
  onSave: (combatant: EncounterRunCombatant) => void;
}) {
  const [draft, setDraft] = useState<EncounterRunCombatant | null>(combatant);
  useEffect(() => setDraft(combatant), [combatant]);
  if (!draft) {
    return (
      <Sheet title="Edit combatant" open={false} onOpenChange={onClose} trigger={<span />}>
        {" "}
      </Sheet>
    );
  }
  function updateNumber(key: keyof EncounterRunCombatant, value: string) {
    setDraft((current) => (current ? { ...current, [key]: Number(value) || 0 } : current));
  }
  return (
    <Sheet
      title={`Edit ${draft.displayName}`}
      open={Boolean(combatant)}
      onOpenChange={(open) => !open && onClose()}
      trigger={<span />}
    >
      <div className="grid gap-4">
        <div className="grid gap-3">
          <Field label="Nickname / display name">
            <Input
              value={draft.displayName}
              onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
            />
          </Field>
          <Field label="Avatar URL">
            <Input
              value={draft.avatarUrl}
              onChange={(event) => setDraft({ ...draft, avatarUrl: event.target.value })}
            />
          </Field>
          <FrameColorField draft={draft} onChange={setDraft} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="Initiative"
            value={draft.initiative}
            onChange={(value) =>
              setDraft({ ...draft, initiative: Number(value) || 0, initiativeSet: true })
            }
          />
          <NumberField
            label="AC Bonus"
            value={draft.armorClassBonus}
            onChange={(value) => updateNumber("armorClassBonus", value)}
          />
          <NumberField
            label="Temp HP"
            value={draft.temporaryHitPoints}
            onChange={(value) => updateNumber("temporaryHitPoints", value)}
          />
          <NumberField
            label="Max HP Mod"
            value={draft.maxHitPointsModifier}
            onChange={(value) => updateNumber("maxHitPointsModifier", value)}
          />
          <NumberField
            label="AC Override"
            value={draft.armorClassOverride}
            onChange={(value) => updateNumber("armorClassOverride", value)}
          />
          <NumberField
            label="Max HP Override"
            value={draft.maxHitPointsOverride}
            onChange={(value) => updateNumber("maxHitPointsOverride", value)}
          />
          <NumberField
            label="Current HP Override"
            value={draft.currentHitPointsOverride}
            onChange={(value) => updateNumber("currentHitPointsOverride", value)}
          />
          <NumberField
            label="Current HP"
            value={draft.currentHitPoints}
            onChange={(value) => updateNumber("currentHitPoints", value)}
          />
        </div>
        <div className="grid gap-2">
          <span className="text-sm font-semibold text-muted-foreground">Conditions</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {conditionImmunities.map((condition) => (
              <Checkbox
                key={condition}
                label={condition}
                checked={draft.conditions.includes(condition)}
                onChange={(checked) =>
                  setDraft({
                    ...draft,
                    conditions: checked
                      ? [...draft.conditions, condition]
                      : draft.conditions.filter((item) => item !== condition),
                  })
                }
              />
            ))}
          </div>
        </div>
        <Checkbox
          label="Defeated / dead"
          checked={draft.defeated}
          onChange={(checked) => setDraft({ ...draft, defeated: checked })}
        />
        <Button onClick={() => onSave(draft)}>Save combatant</Button>
      </div>
    </Sheet>
  );
}

function FrameColorField({
  draft,
  onChange,
}: {
  draft: EncounterRunCombatant;
  onChange: (draft: EncounterRunCombatant) => void;
}) {
  return (
    <Field label="Frame colour">
      <div className="flex flex-wrap gap-2">
        {combatantColors.map((color) => (
          <button
            aria-label={color.label}
            className={[
              "h-9 rounded-md border-2 px-2 text-xs font-medium transition hover:scale-105",
              color.value === defaultCombatantColor
                ? "w-auto bg-muted text-muted-foreground"
                : "w-9",
              draft.colorLabel === color.value
                ? "border-foreground ring-2 ring-primary/30"
                : "border-border",
            ].join(" ")}
            key={color.value}
            style={
              color.value === defaultCombatantColor ? undefined : { backgroundColor: color.value }
            }
            type="button"
            onClick={() => onChange({ ...draft, colorLabel: color.value })}
          >
            {color.value === defaultCombatantColor ? "Default" : ""}
          </button>
        ))}
        <Input
          className="h-9 w-12 p-1"
          type="color"
          value={
            draft.colorLabel && /^#[0-9a-fA-F]{6}$/.test(draft.colorLabel)
              ? draft.colorLabel
              : "#64748b"
          }
          onChange={(event) => onChange({ ...draft, colorLabel: event.target.value })}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onChange({ ...draft, colorLabel: "" })}
        >
          Clear colour
        </Button>
      </div>
    </Field>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Input type="number" value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}
