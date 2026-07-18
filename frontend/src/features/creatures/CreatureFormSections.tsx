import type { Dispatch, SetStateAction } from "react";
import {
  AbilitySelect,
  ConditionImmunityChecklist,
  DamageDefenseGroup,
  SenseControl,
} from "../../components/shared/CharacterFormControls";
import { CompactAbilityTable, SkillsTable } from "../../components/shared/CharacterSheetTables";
import { UnsavedChangesBar } from "../../components/shared/UnsavedChangesBar";
import {
  Button,
  ConfirmDialog,
  Field,
  FormSection,
  Input,
  SlotStepper,
  Textarea,
} from "../../components/ui";
import { senseTypes } from "../../lib/domain/options";
import type {
  ActionFormState,
  Creature,
  CreatureFormState,
  CreatureSpellcastingProfile,
  Spell,
} from "../../types";
import { CreatureSpellPickerModal } from "./CreatureSpellPickerModal";
import { SelectedCreatureSpells } from "./SelectedCreatureSpells";

type SpellSlotLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type SpellSlotKey = `spellSlots${SpellSlotLevel}`;
type CreatureFormSetter = Dispatch<SetStateAction<CreatureFormState>>;
type ActionFormSetter = Dispatch<SetStateAction<ActionFormState[]>>;
type ToggleCreatureList = (
  field:
    | "savingThrowProficiencies"
    | "skillProficiencies"
    | "skillExpertise"
    | "damageVulnerabilities"
    | "damageResistances"
    | "damageImmunities"
    | "conditionImmunities",
  value: string,
  checked: boolean,
) => void;

export function CreatureTraitSections({
  form,
  setForm,
  toggleList,
}: {
  form: CreatureFormState;
  setForm: CreatureFormSetter;
  toggleList: ToggleCreatureList;
}) {
  return (
    <>
      <FormSection title="Ability Scores">
        <CompactAbilityTable
          abilityScores={form.abilityScores}
          savingThrowProficiencies={form.savingThrowProficiencies}
          onSaveProficiencyChange={(ability, checked) =>
            toggleList("savingThrowProficiencies", ability, checked)
          }
          onScoreChange={(ability, value) =>
            setForm((current) => ({
              ...current,
              abilityScores: { ...current.abilityScores, [ability]: value },
            }))
          }
        />
      </FormSection>
      <FormSection title="Skills">
        <SkillsTable
          abilityScores={form.abilityScores}
          expertise={form.skillExpertise}
          proficiencyBonus={creatureProficiency(form)}
          proficiencies={form.skillProficiencies}
          onExpertiseChange={(skill, checked) => toggleList("skillExpertise", skill, checked)}
          onProficiencyChange={(skill, checked) => toggleList("skillProficiencies", skill, checked)}
        />
      </FormSection>
      <FormSection title="Senses">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {senseTypes.map((sense) => (
            <SenseControl
              key={sense}
              label={sense}
              value={form.senses[sense]}
              onChange={(next) =>
                setForm((current) => ({ ...current, senses: { ...current.senses, [sense]: next } }))
              }
            />
          ))}
        </div>
      </FormSection>
      <FormSection title="Resistances & Vulnerabilities">
        <DamageDefenseGroup
          damageImmunities={form.damageImmunities}
          damageResistances={form.damageResistances}
          damageVulnerabilities={form.damageVulnerabilities}
          onChange={toggleList}
        />
      </FormSection>
      <FormSection title="Condition Immunities">
        <ConditionImmunityChecklist
          selected={form.conditionImmunities}
          onChange={(condition, checked) => toggleList("conditionImmunities", condition, checked)}
        />
      </FormSection>
    </>
  );
}

export function CreatureSpellcastingSection({
  filteredSpells,
  form,
  notify,
  setForm,
  spellcasting,
  setSpellModalOpen,
  setSpellSearch,
  setSpellSources,
  spellModalOpen,
  spellSearch,
  spellSources,
  spells,
}: {
  filteredSpells: Spell[];
  form: CreatureFormState;
  notify: (message: string) => void;
  setForm: CreatureFormSetter;
  spellcasting?: CreatureSpellcastingProfile;
  setSpellModalOpen: (open: boolean) => void;
  setSpellSearch: (search: string) => void;
  setSpellSources: (sources: string[]) => void;
  spellModalOpen: boolean;
  spellSearch: string;
  spellSources: string[];
  spells: Spell[];
}) {
  function setSpellSlotCount(level: number, value: string) {
    const selectedCount = form.spellRefs.filter((spell) => spell.spellLevel === level).length;
    const nextCount = Math.max(0, Number(value) || 0);
    if (nextCount < selectedCount) {
      notify(`Remove a spell from ${spellLevelName(level)} before reducing those slots.`);
      return;
    }
    setForm({ ...form, [`spellSlots${level}`]: String(nextCount) });
  }

  return (
    <FormSection
      title="Spellcasting"
      help="Set the creature's spellcasting numbers, then attach spells from the spell library. Slots determine what leveled spells can be spent in combat."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Field label="Spellcasting Ability">
          <AbilitySelect
            value={form.spellcastingAbility}
            onChange={(value) => setForm({ ...form, spellcastingAbility: value })}
          />
        </Field>
        <Field label="Innate Spellcasting Ability">
          <AbilitySelect
            value={form.innateSpellcastingAbility}
            onChange={(value) => setForm({ ...form, innateSpellcastingAbility: value })}
          />
        </Field>
        <CompactNumberStepper
          label="Caster Level"
          value={form.casterLevel}
          min={0}
          max={30}
          onChange={(value) => setForm({ ...form, casterLevel: value })}
        />
        <CompactNumberStepper
          label="Spell Save DC"
          value={form.spellSaveDC}
          min={0}
          max={40}
          onChange={(value) => setForm({ ...form, spellSaveDC: value })}
        />
        <CompactNumberStepper
          label="Spell Attack"
          value={form.spellAttackBonus}
          min={-20}
          max={40}
          onChange={(value) => setForm({ ...form, spellAttackBonus: value })}
        />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(5.75rem,6.75rem))] gap-3">
        {([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((level) => (
          <SlotStepper
            key={level}
            level={level}
            value={form[`spellSlots${level}`]}
            onChange={(value) => setSpellSlotCount(level, value)}
          />
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold">Known spells</h4>
            <p className="text-sm text-muted-foreground">
              {form.spellRefs.length} selected. Slot counts above control what this creature can
              spend.
            </p>
          </div>
          <CreatureSpellPickerModal
            open={spellModalOpen}
            search={spellSearch}
            spells={filteredSpells}
            selectedRefs={form.spellRefs}
            slotCounts={spellSlotCounts(form)}
            spellSources={spellSources}
            onSaveSelection={(spellRefs) => setForm({ ...form, spellRefs })}
            setSpellSources={setSpellSources}
            onOpenChange={setSpellModalOpen}
            onSearch={setSpellSearch}
          />
        </div>
        <SelectedCreatureSpells
          form={form}
          setForm={setForm}
          spells={spells}
          spellcasting={spellcasting}
        />
      </div>
    </FormSection>
  );
}

export function CreatureFormFooter({
  creature,
  dirty,
  error,
  form,
  initialActions,
  initialForm,
  leaveDialogOpen,
  mode,
  onSaved,
  setActions,
  setForm,
  setLeaveDialogOpen,
}: {
  creature?: Creature;
  dirty: boolean;
  error: string;
  form: CreatureFormState;
  initialActions: ActionFormState[];
  initialForm: CreatureFormState;
  leaveDialogOpen: boolean;
  mode: "create" | "edit";
  onSaved: (creature: Creature) => void;
  setActions: ActionFormSetter;
  setForm: CreatureFormSetter;
  setLeaveDialogOpen: (open: boolean) => void;
}) {
  return (
    <>
      <FormSection title="Notes and JSON">
        <Field label="Description">
          <Textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            rows={4}
          />
        </Field>
        <Field label="Stat block JSON">
          <Textarea
            value={form.statBlock}
            onChange={(event) => setForm({ ...form, statBlock: event.target.value })}
            rows={5}
          />
        </Field>
      </FormSection>
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      <Button type="submit">{mode === "edit" ? "Save NPC" : "Create NPC"}</Button>
      {dirty && (
        <UnsavedChangesBar
          onRevert={() => {
            setForm(initialForm);
            setActions(initialActions);
          }}
          onCancel={() => setLeaveDialogOpen(true)}
          onSave={() => {
            document
              .querySelector<HTMLFormElement>("form[data-creature-form='true']")
              ?.requestSubmit();
          }}
          saveLabel="Save"
        />
      )}
      <ConfirmDialog
        open={leaveDialogOpen}
        title="Leave without saving?"
        confirmLabel="Leave page"
        onCancel={() => setLeaveDialogOpen(false)}
        onConfirm={() => {
          setLeaveDialogOpen(false);
          onSaved(creature ?? { ...({} as Creature), id: "" });
        }}
      >
        Changes have been made but have not been saved.
      </ConfirmDialog>
    </>
  );
}

export function spellSlotCount(form: CreatureFormState, level: number) {
  if (level < 1 || level > 9) return 0;
  const key = `spellSlots${level}` as SpellSlotKey;
  return Number(form[key]) || 0;
}

function spellSlotCounts(form: CreatureFormState) {
  return Object.fromEntries(
    ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((level) => [level, spellSlotCount(form, level)]),
  );
}

function spellLevelName(level: number) {
  if (level === 1) return "1st level";
  if (level === 2) return "2nd level";
  if (level === 3) return "3rd level";
  return `${level}th level`;
}

function CompactNumberStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  onChange: (value: string) => void;
}) {
  const current = Number(value) || 0;
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase text-muted-foreground">
      {label}
      <div className="grid max-w-[136px] grid-cols-[2.25rem_4rem_2.25rem] overflow-hidden rounded-md border border-border bg-background">
        <button
          className="grid h-10 place-items-center border-r border-border text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          type="button"
          onClick={() => onChange(String(clamp(current - 1)))}
          aria-label={`Decrease ${label}`}
        >
          -
        </button>
        <Input
          className="h-10 min-h-0 w-16 rounded-none border-0 text-center font-semibold focus:ring-0"
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(String(clamp(Number(event.target.value) || 0)))}
        />
        <button
          className="grid h-10 place-items-center border-l border-border text-surface-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          type="button"
          onClick={() => onChange(String(clamp(current + 1)))}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </label>
  );
}

function creatureProficiency(form: CreatureFormState) {
  const cr = Number(form.challengeRating.includes("/") ? 0 : form.challengeRating) || 0;
  return Math.max(2, Math.min(9, Math.ceil((cr + 3) / 4) + 1));
}
