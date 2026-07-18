import { Plus, Trash2 } from "lucide-react";
import { Button, Callout, Field, FormSection, Input, Select } from "../../components/ui";
import { abilities, hitSpecialEvents, successfulSaveEffects } from "../../lib/domain/options";
import type { SpellActionFormState, SpellFormState } from "../../types";
import { blankSpellAction, blankSpellRoll } from "./spellFormState";
import { SpellEffectCard } from "./SpellEffectCard";
import { WeaponAttackFields } from "./SpellWeaponAndCantripFields";

export function SpellActionsSection({
  form,
  setForm,
}: {
  form: SpellFormState;
  setForm: (form: SpellFormState) => void;
}) {
  function updateAction(action: SpellActionFormState) {
    setForm({
      ...form,
      actions: form.actions.map((item) => (item.id === action.id ? action : item)),
    });
  }
  return (
    <FormSection
      title="Spell Actions"
      help="Actions describe what the spell rolls or asks the target to save against. Combat casting will use this later."
    >
      <div className="grid gap-3">
        {form.actions.map((action) => (
          <SpellActionCard
            action={action}
            key={action.id}
            onChange={updateAction}
            onRemove={() =>
              setForm({ ...form, actions: form.actions.filter((item) => item.id !== action.id) })
            }
          />
        ))}
        <Button
          type="button"
          icon={Plus}
          onClick={() => setForm({ ...form, actions: [...form.actions, blankSpellAction()] })}
        >
          Add spell action
        </Button>
      </div>
    </FormSection>
  );
}

function SpellActionCard({
  action,
  onChange,
  onRemove,
}: {
  action: SpellActionFormState;
  onChange: (action: SpellActionFormState) => void;
  onRemove: () => void;
}) {
  return (
    <article className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(10rem,1fr)_16rem_9rem_auto]">
        <Field label="Name">
          <Input
            value={action.name}
            placeholder="Damage, healing, condition..."
            onChange={(event) => onChange({ ...action, name: event.target.value })}
          />
        </Field>
        <Field
          label="Resolution"
          help="Choose Spell attack roll when the caster makes a spell attack. Choose Saving throw when the target rolls a save."
        >
          <Select
            options={spellActionResolutionOptions}
            placeholder="Resolution"
            value={action.actionType}
            onValueChange={(actionType) => onChange(normalizeActionResolution(action, actionType))}
          />
        </Field>
        <Field
          label="Extra attack mod"
          help="Use this only for a spell-specific bonus or penalty. The caster's spell attack bonus comes from their spellcasting profile in combat."
        >
          <Input
            type="number"
            placeholder="0"
            disabled={!usesAttackRoll(action)}
            value={action.attackModifier}
            onChange={(event) => onChange({ ...action, attackModifier: event.target.value })}
          />
        </Field>
        <Button
          type="button"
          icon={Trash2}
          variant="danger"
          className="self-end"
          onClick={onRemove}
        />
      </div>
      {action.actionType === "spell_attack" && (
        <Callout tone="info">
          Spell attack roll selected. Add one or more effects below for what happens on a hit. If
          this spell creates multiple attacks, resolve each attack separately in combat.
        </Callout>
      )}
      {action.actionType === "weapon_attack" && (
        <WeaponAttackFields action={action} onChange={onChange} />
      )}
      {action.actionType === "save" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Save ability">
            <Select
              options={abilities.map(({ key, label }) => ({ value: key, label }))}
              placeholder="Ability"
              value={action.saveAbility}
              onValueChange={(saveAbility) => onChange({ ...action, saveAbility })}
            />
          </Field>
          <Field label="Successful save">
            <Select
              options={successfulSaveEffects}
              placeholder="Effect"
              value={action.successfulSaveEffect}
              onValueChange={(successfulSaveEffect) =>
                onChange({ ...action, successfulSaveEffect })
              }
            />
          </Field>
        </div>
      )}
      <SpellRollEditor rolls={action.rolls} onChange={(rolls) => onChange({ ...action, rolls })} />
      <Field
        label={action.actionType === "save" ? "On a failed save" : "On a successful hit"}
        help={
          action.actionType === "save"
            ? "Optional extra event after the target fails the saving throw. Model ordinary damage, healing, and conditions as effects above."
            : "Optional extra event after the attack hits. Model ordinary damage, healing, and conditions as effects above."
        }
      >
        <Select
          options={hitSpecialEvents}
          placeholder="Outcome"
          value={action.hitSpecialEvent}
          onValueChange={(hitSpecialEvent) => onChange({ ...action, hitSpecialEvent })}
        />
      </Field>
    </article>
  );
}

const spellActionResolutionOptions = [
  { value: "damage", label: "Automatic effect" },
  { value: "spell_attack", label: "Spell attack roll" },
  { value: "save", label: "Saving throw" },
  { value: "weapon_attack", label: "Weapon attack" },
];

function normalizeActionResolution(action: SpellActionFormState, actionType: string) {
  return {
    ...action,
    actionType,
    saveAbility: actionType === "save" ? action.saveAbility : "",
    successfulSaveEffect: actionType === "save" ? action.successfulSaveEffect : "none",
    attackModifier: usesActionTypeAttackRoll(actionType) ? action.attackModifier : "0",
  };
}

function usesAttackRoll(action: SpellActionFormState) {
  return usesActionTypeAttackRoll(action.actionType);
}

function usesActionTypeAttackRoll(actionType: string) {
  return actionType === "spell_attack" || actionType === "weapon_attack";
}

function SpellRollEditor({
  rolls,
  onChange,
}: {
  rolls: SpellActionFormState["rolls"];
  onChange: (rolls: SpellActionFormState["rolls"]) => void;
}) {
  return (
    <div className="grid gap-3">
      {rolls.map((roll, index) => (
        <SpellEffectCard
          index={index}
          key={roll.id}
          roll={roll}
          rolls={rolls}
          onChange={onChange}
          onRemove={() => onChange(rolls.filter((item) => item.id !== roll.id))}
        />
      ))}
      <Button
        type="button"
        icon={Plus}
        size="sm"
        variant="secondary"
        onClick={() => onChange([...rolls, blankSpellRoll()])}
      >
        Add effect
      </Button>
    </div>
  );
}
