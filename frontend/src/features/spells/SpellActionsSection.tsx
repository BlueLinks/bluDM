import { Plus, Trash2 } from "lucide-react";
import { DiceFormulaInput } from "../../components/shared/CharacterFormControls";
import { Button, Checkbox, Field, FormSection, Input, Select } from "../../components/ui";
import {
  abilities,
  hitSpecialEvents,
  spellEffectTimings,
  spellRollKinds,
  successfulSaveEffects,
} from "../../lib/domain/options";
import type { SpellActionFormState, SpellFormState } from "../../types";
import { SpellSubsection } from "./SpellFormLayout";
import { blankSpellAction, blankSpellRoll } from "./spellFormState";
import { effectFormula, rollKindDescription, RollKindDetail } from "./SpellRollKindDetail";
import { scalingPhrase, SpellScalingFields } from "./SpellScalingFields";
import { CantripBreakpointFields, WeaponAttackFields } from "./SpellWeaponAndCantripFields";

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
          variant="success"
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
        <div className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-900 dark:text-sky-100">
          Spell attack roll selected. Add one or more effects below for what happens on a hit. If
          this spell creates multiple attacks, resolve each attack separately in combat.
        </div>
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
      {rolls.map((roll) => (
        <div className="grid gap-3 rounded-md border border-border bg-background p-3" key={roll.id}>
          <div className="grid items-start gap-3 lg:grid-cols-[10rem_minmax(9rem,1fr)_auto_auto]">
            <Field
              label="Effect on target"
              help="Choose what this effect changes on the target. Effects can be damage, healing, HP changes, conditions, or temporary immunities."
            >
              <Select
                options={spellRollKinds}
                placeholder="Effect"
                value={roll.rollKind}
                onValueChange={(rollKind) =>
                  onChange(
                    rolls.map((item) => (item.id === roll.id ? { ...item, rollKind } : item)),
                  )
                }
              />
            </Field>
            {isFullWidthRollDetail(roll.rollKind) ? (
              <div className="hidden lg:block" />
            ) : (
              <RollKindDetail roll={roll} rolls={rolls} onChange={onChange} />
            )}
            {roll.rollKind !== "condition" &&
              roll.rollKind !== "condition_immunity" &&
              roll.rollKind !== "custom" && (
                <Checkbox
                  label="Magical"
                  checked={roll.magical}
                  onChange={(magical) =>
                    onChange(
                      rolls.map((item) => (item.id === roll.id ? { ...item, magical } : item)),
                    )
                  }
                />
              )}
            <Button
              type="button"
              icon={Trash2}
              variant="danger"
              className="self-start"
              onClick={() => onChange(rolls.filter((item) => item.id !== roll.id))}
            />
          </div>
          {isFullWidthRollDetail(roll.rollKind) && (
            <RollKindDetail roll={roll} rolls={rolls} onChange={onChange} />
          )}
          {roll.rollKind !== "condition" &&
            roll.rollKind !== "condition_immunity" &&
            roll.rollKind !== "custom" && (
              <>
                <Field label="Amount" help="Set Dice to 0 and use Modifier for a fixed flat value.">
                  <DiceFormulaInput
                    allowEmpty
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
                  <Checkbox
                    label="Add Spellcasting Ability Modifier"
                    checked={roll.addPrimaryStatModifier}
                    onChange={(addPrimaryStatModifier) =>
                      onChange(
                        rolls.map((item) =>
                          item.id === roll.id ? { ...item, addPrimaryStatModifier } : item,
                        ),
                      )
                    }
                  />
                  <p className="mt-2 rounded-md border border-border bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">
                    Result: {effectFormula(roll)}
                  </p>
                </Field>
                <Field
                  label="Effect timing"
                  help="Immediate effects apply when cast. Use each-turn timing for recurring effects, or next-turn-only timing for delayed one-off effects."
                >
                  <Select
                    options={spellEffectTimings}
                    placeholder="Timing"
                    value={roll.timing}
                    onValueChange={(timing) =>
                      onChange(
                        rolls.map((item) => (item.id === roll.id ? { ...item, timing } : item)),
                      )
                    }
                  />
                </Field>
                <RollScalingFields
                  roll={roll}
                  onChange={(next) =>
                    onChange(rolls.map((item) => (item.id === roll.id ? next : item)))
                  }
                />
                <CantripBreakpointFields
                  roll={roll}
                  onChange={(next) =>
                    onChange(rolls.map((item) => (item.id === roll.id ? next : item)))
                  }
                />
              </>
            )}
        </div>
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

function isFullWidthRollDetail(rollKind: string) {
  return rollKind === "custom";
}

function RollScalingFields({
  roll,
  onChange,
}: {
  roll: SpellActionFormState["rolls"][number];
  onChange: (roll: SpellActionFormState["rolls"][number]) => void;
}) {
  return (
    <SpellSubsection
      title="Roll Scaling"
      description="Configure extra dice or fixed value added by spell scaling."
    >
      <SpellScalingFields
        value={{
          scalingType: roll.scalingType,
          scaleFromLevel: roll.scalingFromLevel,
          stepSize: roll.scalingStepSize,
        }}
        onChange={(next) =>
          onChange({
            ...roll,
            scalingType: next.scalingType,
            scalingFromLevel: next.scaleFromLevel,
            scalingStepSize: next.stepSize,
          })
        }
        amount={
          <Field
            label="Additional roll"
            help="The extra dice and fixed value added each scaling step."
          >
            <DiceFormulaInput
              allowEmpty
              value={{
                diceCount: roll.scalingDiceCount,
                dieSize: roll.scalingDieSize,
                fixedValue: roll.scalingFixedValue,
              }}
              onChange={(next) =>
                onChange({
                  ...roll,
                  scalingDiceCount: next.diceCount,
                  scalingDieSize: next.dieSize,
                  scalingFixedValue: next.fixedValue,
                })
              }
            />
          </Field>
        }
        generated={rollScalingDescription(roll)}
        label="Roll scaling"
        help="Use this when this roll gains extra dice or a fixed bonus at higher slot, character, or spell scale values."
      />
    </SpellSubsection>
  );
}

function rollScalingDescription(roll: SpellActionFormState["rolls"][number]) {
  const from = Number(roll.scalingFromLevel) || 1;
  const step = Math.max(1, Number(roll.scalingStepSize) || 1);
  const dice = Number(roll.scalingDiceCount) || 0;
  const die = Number(roll.scalingDieSize) || 6;
  const fixed = Number(roll.scalingFixedValue) || 0;
  const formula =
    `${dice > 0 ? `${dice}d${die}` : ""}${fixed > 0 ? `+${fixed}` : fixed < 0 ? fixed : ""}` ||
    "the configured amount";
  const kind = rollKindDescription(roll.rollKind);
  if (roll.scalingType === "none") {
    return "This effect does not scale.";
  }
  return scalingPhrase({
    scalingType: roll.scalingType,
    from,
    step,
    effect: `this effect adds ${formula} ${kind}`,
  });
}
