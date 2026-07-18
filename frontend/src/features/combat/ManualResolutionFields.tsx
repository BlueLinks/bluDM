import { Checkbox, Field, Input, Select } from "../../components/ui";
import type { EncounterRunSpellSlot, RollMode } from "../../types";
import type { ResolutionKind, ResolutionOutcome } from "./resolutionModel";

export function ManualResolutionFields({
  actorSlots,
  attributeActor,
  consumeSlot,
  directHP,
  healing,
  kind,
  outcome,
  rollMode,
  rollTotal,
  sourceName,
  spellLevel,
  temporaryHP,
  temporaryHPMode,
  onAttributeActorChange,
  onConsumeSlotChange,
  onDirectHPChange,
  onHealingChange,
  onKindChange,
  onOutcomeChange,
  onRollModeChange,
  onRollTotalChange,
  onSourceNameChange,
  onSpellLevelChange,
  onTemporaryHPChange,
  onTemporaryHPModeChange,
}: ManualResolutionFieldsProps) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Workflow">
          <Select
            value={kind}
            placeholder="Resolution type"
            options={[
              { value: "attack", label: "Manual attack" },
              { value: "spell", label: "Manual spell" },
              { value: "healing", label: "Healing or temporary HP" },
              { value: "manual", label: "Other resolution" },
            ]}
            onValueChange={(value) => onKindChange(value as ResolutionKind)}
          />
        </Field>
        <Field label="Action, spell, or effect">
          <Input value={sourceName} onChange={(event) => onSourceNameChange(event.target.value)} />
        </Field>
        <Field label="Reported outcome">
          <Select
            value={outcome}
            placeholder="Outcome"
            options={outcomeOptions(kind)}
            onValueChange={(value) => onOutcomeChange(value as ResolutionOutcome)}
          />
        </Field>
        <Checkbox
          checked={attributeActor}
          label="Attribute to acting combatant"
          onChange={onAttributeActorChange}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Reported attack total">
          <Input
            inputMode="numeric"
            placeholder="Optional"
            type="number"
            value={rollTotal}
            onChange={(event) => onRollTotalChange(event.target.value)}
          />
        </Field>
        <Field label="Roll mode">
          <Select
            value={rollMode}
            placeholder="Roll mode"
            options={["normal", "advantage", "disadvantage"].map((value) => ({
              value,
              label: value.charAt(0).toUpperCase() + value.slice(1),
            }))}
            onValueChange={(value) => onRollModeChange(value as RollMode)}
          />
        </Field>
        <Field label="Healing">
          <Input
            inputMode="numeric"
            min={0}
            type="number"
            value={healing}
            onChange={(event) => onHealingChange(event.target.value)}
          />
        </Field>
        <Field label="Direct HP set">
          <Input
            inputMode="numeric"
            min={0}
            placeholder="No change"
            type="number"
            value={directHP}
            onChange={(event) => onDirectHPChange(event.target.value)}
          />
        </Field>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Temporary HP">
          <Input
            inputMode="numeric"
            min={0}
            placeholder="No change"
            type="number"
            value={temporaryHP}
            onChange={(event) => onTemporaryHPChange(event.target.value)}
          />
        </Field>
        <Field label="Temporary HP rule">
          <Select
            value={temporaryHPMode}
            placeholder="Temporary HP rule"
            options={[
              { value: "max", label: "Keep higher value" },
              { value: "replace", label: "Replace current value" },
            ]}
            onValueChange={(value) => onTemporaryHPModeChange(value as "max" | "replace")}
          />
        </Field>
        {kind === "spell" && actorSlots.length > 0 && (
          <>
            <Checkbox
              checked={consumeSlot}
              label="Consume spell slot on apply"
              onChange={onConsumeSlotChange}
            />
            <Field label="Slot level">
              <Select
                value={spellLevel}
                placeholder="Slot level"
                options={actorSlots.map((slot) => ({
                  value: String(slot.spellLevel),
                  label: `Level ${slot.spellLevel} · ${slot.remainingSlots} left`,
                }))}
                onValueChange={onSpellLevelChange}
              />
            </Field>
          </>
        )}
      </div>
    </div>
  );
}

export function ConditionFields({
  duration,
  expiry,
  name,
  onDurationChange,
  onExpiryChange,
  onNameChange,
}: {
  duration: string;
  expiry: string;
  name: string;
  onDurationChange: (value: string) => void;
  onExpiryChange: (value: string) => void;
  onNameChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-3">
      <Field label="Condition or effect">
        <Input
          placeholder="Optional"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </Field>
      <Field label="Duration">
        <Input
          placeholder="For example, 1 minute"
          value={duration}
          onChange={(event) => onDurationChange(event.target.value)}
        />
      </Field>
      <Field label="Expiry">
        <Select
          value={expiry}
          placeholder="Expiry"
          options={[
            { value: "manual", label: "Manual removal" },
            { value: "start_turn", label: "Start of turn" },
            { value: "end_turn", label: "End of turn" },
            { value: "save_ends", label: "Save ends" },
          ]}
          onValueChange={onExpiryChange}
        />
      </Field>
    </div>
  );
}

type ManualResolutionFieldsProps = {
  actorSlots: EncounterRunSpellSlot[];
  attributeActor: boolean;
  consumeSlot: boolean;
  directHP: string;
  healing: string;
  kind: ResolutionKind;
  outcome: ResolutionOutcome;
  rollMode: RollMode;
  rollTotal: string;
  sourceName: string;
  spellLevel: string;
  temporaryHP: string;
  temporaryHPMode: "max" | "replace";
  onAttributeActorChange: (value: boolean) => void;
  onConsumeSlotChange: (value: boolean) => void;
  onDirectHPChange: (value: string) => void;
  onHealingChange: (value: string) => void;
  onKindChange: (value: ResolutionKind) => void;
  onOutcomeChange: (value: ResolutionOutcome) => void;
  onRollModeChange: (value: RollMode) => void;
  onRollTotalChange: (value: string) => void;
  onSourceNameChange: (value: string) => void;
  onSpellLevelChange: (value: string) => void;
  onTemporaryHPChange: (value: string) => void;
  onTemporaryHPModeChange: (value: "max" | "replace") => void;
};

function outcomeOptions(kind: ResolutionKind) {
  if (kind === "attack") {
    return [
      { value: "hit", label: "Hit" },
      { value: "miss", label: "Miss" },
      { value: "critical", label: "Critical hit" },
    ];
  }
  return [{ value: "applied", label: "Applied manually" }];
}
