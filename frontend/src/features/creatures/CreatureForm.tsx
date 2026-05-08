import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { BookOpen, HeartPulse, Plus, Search, Shield, Sparkles, Zap } from "lucide-react";
import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AvatarImagePicker } from "../../components/AvatarImagePicker";
import {
  AbilityInput,
  AbilitySelect,
  ConditionImmunityChecklist,
  DamageDefenseGroup,
  DiceFormulaInput,
  formatDiceFormula,
  parseDiceFormula,
  SenseControl,
  SkillsTable,
} from "../../components/shared/CharacterFormControls";
import { UnsavedChangesBar } from "../../components/shared/UnsavedChangesBar";
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyMini,
  Field,
  FloatingInput,
  FormSection,
  IconNumberField,
  Input,
  Modal,
  Select,
  SlotStepper,
  Textarea,
} from "../../components/ui";
import { api } from "../../lib/api";
import {
  actionFormFromCreatureAction,
  actionFormFromTemplate,
  blankAction,
  creatureToForm as creatureToFormState,
  formatRolls,
  spiderStaffAction,
  weaponAction,
} from "../../lib/domain/forms";
import {
  abilities,
  alignments,
  challengeRatings,
  creatureEnvironments,
  creatureSizes,
  creatureSubtypes,
  creatureTypes,
  senseTypes,
} from "../../lib/domain/options";
import type {
  ActionFormState,
  ActionTemplate,
  CommonWeapon,
  Creature,
  CreatureAction,
  CreatureFormState,
  Spell,
} from "../../types";
import { SortableActionEditor, WeaponMenu } from "./actionEditors";
import { CreatureSpellPickerModal } from "./CreatureSpellPickerModal";
const emptyCreatureForm: CreatureFormState = {
  imageAssetId: "",
  avatarUrl: "",
  name: "",
  description: "",
  size: "",
  creatureType: "",
  creatureSubtype: "",
  alignment: "",
  environment: "",
  defaultDisposition: "enemy",
  languages: "",
  walkSpeed: "30",
  swimSpeed: "",
  flySpeed: "",
  burrowSpeed: "",
  climbSpeed: "",
  armorClass: "10",
  hitPoints: "1",
  hitDice: "1d6",
  challengeRating: "",
  xp: "0",
  passivePerception: "10",
  passiveInvestigation: "10",
  passiveInsight: "10",
  abilityScores: {
    str: "10",
    dex: "10",
    con: "10",
    int: "10",
    wis: "10",
    cha: "10",
  },
  savingThrowProficiencies: [],
  skillProficiencies: [],
  skillExpertise: [],
  damageVulnerabilities: [],
  damageResistances: [],
  damageImmunities: [],
  conditionImmunities: [],
  senses: {
    Blindsight: { enabled: false, range: "" },
    Darkvision: { enabled: false, range: "" },
    Tremorsense: { enabled: false, range: "" },
    Truesight: { enabled: false, range: "" },
  },
  spellcastingAbility: "",
  innateSpellcastingAbility: "",
  casterLevel: "0",
  spellSaveDC: "10",
  spellAttackBonus: "0",
  spellSlots1: "0",
  spellSlots2: "0",
  spellSlots3: "0",
  spellSlots4: "0",
  spellSlots5: "0",
  spellSlots6: "0",
  spellSlots7: "0",
  spellSlots8: "0",
  spellSlots9: "0",
  spellIds: [],
  statBlock: "{}",
};
export function CreatureForm({
  mode,
  creature,
  existingActions = [],
  onSaved,
  notify,
}: {
  mode: "create" | "edit";
  creature?: Creature;
  existingActions?: CreatureAction[];
  onSaved: (creature: Creature) => void;
  notify: (message: string) => void;
}) {
  const initialForm = useMemo(() => creatureToFormState(creature, emptyCreatureForm), [creature]);
  const initialActions = useMemo(
    () =>
      existingActions.length > 0
        ? existingActions.map(actionFormFromCreatureAction)
        : mode === "create"
          ? [spiderStaffAction()]
          : [],
    [existingActions, mode],
  );
  const [form, setForm] = useState<CreatureFormState>(initialForm);
  const [templates, setTemplates] = useState<ActionTemplate[]>([]);
  const [spells, setSpells] = useState<Spell[]>([]);
  const [actions, setActions] = useState<ActionFormState[]>(initialActions);
  const [error, setError] = useState("");
  const [spellModalOpen, setSpellModalOpen] = useState(false);
  const [spellSearch, setSpellSearch] = useState("");
  const [spellSources, setSpellSources] = useState(["srd-2014"]);
  const [actionBankOpen, setActionBankOpen] = useState(false);
  const [actionSearch, setActionSearch] = useState("");
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [baselineSnapshot, setBaselineSnapshot] = useState(() =>
    JSON.stringify({ form: initialForm, actions: initialActions }),
  );
  const currentSnapshot = JSON.stringify({ form, actions });
  const dirty = currentSnapshot !== baselineSnapshot;
  useEffect(() => {
    setForm(initialForm);
    setActions(initialActions);
    setBaselineSnapshot(JSON.stringify({ form: initialForm, actions: initialActions }));
  }, [creature?.id, existingActions.length]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    Promise.all([
      api.actionTemplates(),
      api.spells({ includeStandard: true, source: spellSources }),
    ])
      .then(([templatePayload, spellPayload]) => {
        setTemplates(templatePayload.actionTemplates);
        setSpells(spellPayload.spells);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load action or spell libraries"),
      );
  }, [spellSources.join(",")]);

  function toggleList(
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
  ) {
    setForm((current) => ({
      ...current,
      [field]: checked
        ? [...current[field], value]
        : current[field].filter((item) => item !== value),
    }));
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const payload =
        mode === "edit" && creature
          ? await api.updateCreature(creature.id, form)
          : await api.createCreature(form);
      if (mode === "create") {
        await Promise.all([
          ...actions
            .filter((action) => action.name.trim())
            .map((action) => api.createCreatureAction(payload.creature.id, action)),
          api.saveCreatureSpellcasting(payload.creature.id, form),
        ]);
      } else {
        await Promise.all([
          api.replaceCreatureActions(payload.creature.id, actions),
          api.saveCreatureSpellcasting(payload.creature.id, form),
        ]);
      }
      notify(mode === "edit" ? "Creature saved" : "Creature created");
      setBaselineSnapshot(JSON.stringify({ form, actions }));
      onSaved(payload.creature);
      setForm(emptyCreatureForm);
      setActions([spiderStaffAction()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create creature");
    }
  }

  function handleActionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setActions((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });
  }

  function copyTemplateIntoCreature(template: ActionTemplate) {
    setActions((current) => [...current, actionFormFromTemplate(template)]);
    setActionBankOpen(false);
    notify(`${template.name} added to creature actions`);
  }

  function addWeaponAction(weapon: CommonWeapon) {
    setActions((current) => [...current, weaponAction(weapon, form)]);
    notify(`${weapon.name} action added`);
  }

  const filteredSpells = spells.filter((spell) => {
    const query = spellSearch.trim().toLowerCase();
    return (
      !query ||
      spell.name.toLowerCase().includes(query) ||
      spell.school.toLowerCase().includes(query)
    );
  });
  const filteredTemplates = templates.filter((template) => {
    const query = actionSearch.trim().toLowerCase();
    return (
      !query ||
      template.name.toLowerCase().includes(query) ||
      template.actionType.toLowerCase().includes(query)
    );
  });

  return (
    <form className="grid gap-5" data-creature-form="true" onSubmit={handleCreate}>
      <CreatureIdentitySections form={form} setForm={setForm} />
      <CreatureTraitSections form={form} setForm={setForm} toggleList={toggleList} />
      <CreatureSpellcastingSection
        form={form}
        setForm={setForm}
        spellModalOpen={spellModalOpen}
        setSpellModalOpen={setSpellModalOpen}
        spellSearch={spellSearch}
        setSpellSearch={setSpellSearch}
        spellSources={spellSources}
        setSpellSources={setSpellSources}
        filteredSpells={filteredSpells}
        spells={spells}
      />
      <CreatureActionsSection
        actions={actions}
        setActions={setActions}
        actionBankOpen={actionBankOpen}
        setActionBankOpen={setActionBankOpen}
        actionSearch={actionSearch}
        setActionSearch={setActionSearch}
        filteredTemplates={filteredTemplates}
        sensors={sensors}
        onDragEnd={handleActionDragEnd}
        onCopyTemplate={copyTemplateIntoCreature}
        onAddWeapon={addWeaponAction}
      />
      <CreatureFormFooter
        error={error}
        dirty={dirty}
        mode={mode}
        creature={creature}
        form={form}
        initialForm={initialForm}
        initialActions={initialActions}
        leaveDialogOpen={leaveDialogOpen}
        setActions={setActions}
        setForm={setForm}
        setLeaveDialogOpen={setLeaveDialogOpen}
        onSaved={onSaved}
      />
    </form>
  );
}

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

function CreatureIdentitySections({
  form,
  setForm,
}: {
  form: CreatureFormState;
  setForm: CreatureFormSetter;
}) {
  const subtypeOptions = creatureSubtypes[form.creatureType] ?? [];
  const hitDice = parseDiceFormula(form.hitDice);
  function setCreatureType(creatureType: string) {
    setForm((current) => ({
      ...current,
      creatureType,
      creatureSubtype: creatureSubtypes[creatureType]?.includes(current.creatureSubtype)
        ? current.creatureSubtype
        : "",
    }));
  }
  return (
    <>
      <FormSection title="Basic Info">
        <AvatarImagePicker
          label="NPC avatar"
          name={form.name}
          assetId={form.imageAssetId}
          url={form.avatarUrl}
          uploadImage={(file) => api.uploadImage(file)}
          onChange={(avatar) =>
            setForm({ ...form, imageAssetId: avatar.assetId, avatarUrl: avatar.url })
          }
        />
        <Field label="Name">
          <Input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Size">
            <Select
              options={creatureSizes.map((size) => ({ label: size, value: size }))}
              placeholder="Select size"
              value={form.size}
              onValueChange={(value) => setForm({ ...form, size: value })}
            />
          </Field>
          <Field label="Alignment">
            <Select
              options={alignments.map((alignment) => ({ label: alignment, value: alignment }))}
              placeholder="Select alignment"
              value={form.alignment}
              onValueChange={(value) => setForm({ ...form, alignment: value })}
            />
          </Field>
          <Field label="Environment">
            <Select
              options={creatureEnvironments.map((environment) => ({
                label: environment,
                value: environment,
              }))}
              placeholder="Select environment"
              value={creatureEnvironments.includes(form.environment) ? form.environment : ""}
              onValueChange={(environment) => setForm({ ...form, environment })}
            />
          </Field>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_minmax(220px,1fr)_auto]">
          <Field label="Type">
            <Select
              options={creatureTypes.map((type) => ({ label: type, value: type }))}
              placeholder="Select type"
              value={creatureTypes.includes(form.creatureType) ? form.creatureType : ""}
              onValueChange={setCreatureType}
            />
          </Field>
          {subtypeOptions.length > 0 && (
            <Field label="Subtype">
              <div className="flex gap-2">
                <Select
                  options={subtypeOptions.map((subtype) => ({ label: subtype, value: subtype }))}
                  placeholder="Optional subtype"
                  value={form.creatureSubtype}
                  onValueChange={(creatureSubtype) => setForm({ ...form, creatureSubtype })}
                />
                {form.creatureSubtype && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setForm({ ...form, creatureSubtype: "" })}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </Field>
          )}
          <div className="self-end">
            <Checkbox
              label="Friendly by default"
              checked={form.defaultDisposition === "friendly"}
              onChange={(checked) =>
                setForm({ ...form, defaultDisposition: checked ? "friendly" : "enemy" })
              }
            />
          </div>
        </div>
        <Field label="Languages">
          <Input
            value={form.languages}
            onChange={(event) => setForm({ ...form, languages: event.target.value })}
            placeholder="Common, Deep Speech, Telepathy 120 ft."
          />
        </Field>
      </FormSection>
      <FormSection title="Movement">
        <div className="flex flex-wrap gap-3">
          {(["walkSpeed", "swimSpeed", "flySpeed", "burrowSpeed", "climbSpeed"] as const).map(
            (key) => (
              <IconNumberField
                key={key}
                icon={Zap}
                label={speedLabel(key)}
                value={form[key]}
                onChange={(value) => setForm({ ...form, [key]: value })}
              />
            ),
          )}
        </div>
      </FormSection>
      <FormSection title="Health and AC">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <IconNumberField
            className="w-full"
            icon={Shield}
            label="AC"
            value={form.armorClass}
            onChange={(value) => setForm({ ...form, armorClass: value })}
          />
          <IconNumberField
            className="w-full"
            icon={HeartPulse}
            label="HP"
            value={form.hitPoints}
            onChange={(value) => setForm({ ...form, hitPoints: value })}
          />
          <Field label="Hit Dice">
            <DiceFormulaInput
              value={hitDice}
              onChange={(next) => setForm({ ...form, hitDice: formatDiceFormula(next) })}
            />
          </Field>
          <IconNumberField
            className="w-full"
            icon={BookOpen}
            label="Passive Perception"
            value={form.passivePerception}
            onChange={(value) => setForm({ ...form, passivePerception: value })}
          />
          <IconNumberField
            className="w-full"
            icon={BookOpen}
            label="Passive Investigation"
            value={form.passiveInvestigation}
            onChange={(value) => setForm({ ...form, passiveInvestigation: value })}
          />
          <IconNumberField
            className="w-full"
            icon={BookOpen}
            label="Passive Insight"
            value={form.passiveInsight}
            onChange={(value) => setForm({ ...form, passiveInsight: value })}
          />
        </div>
      </FormSection>
      <FormSection title="Challenge">
        <div className="grid gap-4 sm:grid-cols-[180px_140px_80px]">
          <Field label="Challenge Rating">
            <Select
              options={challengeRatings.map((rating) => ({ label: rating, value: rating }))}
              placeholder="Select CR"
              value={form.challengeRating}
              onValueChange={(challengeRating) => setForm({ ...form, challengeRating })}
            />
          </Field>
          <Field
            label="XP"
            help="Used for summaries and to estimate a default proficiency bonus until CR-specific rules are modeled fully."
          >
            <Input
              type="number"
              value={form.xp}
              onChange={(event) => setForm({ ...form, xp: event.target.value })}
            />
          </Field>
          <div className="self-end rounded-md border border-border bg-muted px-3 py-2 text-center text-sm font-semibold">
            +{creatureProficiency(form)}
          </div>
        </div>
      </FormSection>
    </>
  );
}

function CreatureTraitSections({
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {abilities.map((ability) => (
            <AbilityInput
              key={ability.key}
              label={ability.label}
              value={Number(form.abilityScores[ability.key])}
              saveProficient={form.savingThrowProficiencies.includes(ability.key)}
              onSaveProficiencyChange={(checked) =>
                toggleList("savingThrowProficiencies", ability.key, checked)
              }
              onChange={(next) =>
                setForm((current) => ({
                  ...current,
                  abilityScores: { ...current.abilityScores, [ability.key]: String(next) },
                }))
              }
            />
          ))}
        </div>
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

function CreatureSpellcastingSection({
  filteredSpells,
  form,
  setForm,
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
  setForm: CreatureFormSetter;
  setSpellModalOpen: (open: boolean) => void;
  setSpellSearch: (search: string) => void;
  setSpellSources: (sources: string[]) => void;
  spellModalOpen: boolean;
  spellSearch: string;
  spellSources: string[];
  spells: Spell[];
}) {
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
        <IconNumberField
          className="w-full"
          icon={Sparkles}
          label="Caster Level"
          value={form.casterLevel}
          onChange={(value) => setForm({ ...form, casterLevel: value })}
        />
        <IconNumberField
          className="w-full"
          icon={Sparkles}
          label="Spell Save DC"
          value={form.spellSaveDC}
          onChange={(value) => setForm({ ...form, spellSaveDC: value })}
        />
        <IconNumberField
          className="w-full"
          icon={Sparkles}
          label="Spell Attack"
          value={form.spellAttackBonus}
          onChange={(value) => setForm({ ...form, spellAttackBonus: value })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-9">
        {([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((level) => {
          const key = `spellSlots${level}` as const;
          return (
            <SlotStepper
              key={level}
              level={level}
              value={form[key]}
              onChange={(value) => setForm({ ...form, [key]: value })}
            />
          );
        })}
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold">Known spells</h4>
            <p className="text-sm text-muted-foreground">
              {form.spellIds.length} selected. Slot counts above control what this creature can
              spend.
            </p>
          </div>
          <CreatureSpellPickerModal
            open={spellModalOpen}
            search={spellSearch}
            spells={filteredSpells}
            selectedIds={form.spellIds}
            spellSources={spellSources}
            setForm={setForm}
            setSpellSources={setSpellSources}
            onOpenChange={setSpellModalOpen}
            onSearch={setSpellSearch}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {spells
            .filter((spell) => form.spellIds.includes(spell.id))
            .map((spell) => (
              <Badge key={spell.id}>{spell.name}</Badge>
            ))}
        </div>
      </div>
    </FormSection>
  );
}

function CreatureActionsSection({
  actionBankOpen,
  actionSearch,
  actions,
  filteredTemplates,
  onAddWeapon,
  onCopyTemplate,
  onDragEnd,
  sensors,
  setActionBankOpen,
  setActionSearch,
  setActions,
}: {
  actionBankOpen: boolean;
  actionSearch: string;
  actions: ActionFormState[];
  filteredTemplates: ActionTemplate[];
  onAddWeapon: (weapon: CommonWeapon) => void;
  onCopyTemplate: (template: ActionTemplate) => void;
  onDragEnd: (event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
  setActionBankOpen: (open: boolean) => void;
  setActionSearch: (search: string) => void;
  setActions: ActionFormSetter;
}) {
  return (
    <FormSection
      title="Actions & Abilities"
      help="Creature actions are ordered for this creature only. Banked actions are copied in, so you can customize the copy without changing the bank."
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            icon={Plus}
            variant="success"
            onClick={() => setActions((current) => [...current, blankAction()])}
          >
            Add custom action
          </Button>
          <ActionBankModal
            open={actionBankOpen}
            search={actionSearch}
            templates={filteredTemplates}
            onCopyTemplate={onCopyTemplate}
            onOpenChange={setActionBankOpen}
            onSearch={setActionSearch}
          />
          <WeaponMenu onAdd={onAddWeapon} />
        </div>
        <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={onDragEnd}>
          <SortableContext
            items={actions.map((action) => action.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-3">
              {actions.map((action, index) => (
                <SortableActionEditor
                  key={action.id}
                  action={action}
                  index={index}
                  onChange={(next) =>
                    setActions((current) =>
                      current.map((item) => (item.id === action.id ? next : item)),
                    )
                  }
                  onRemove={() =>
                    setActions((current) => current.filter((item) => item.id !== action.id))
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </FormSection>
  );
}

function ActionBankModal({
  onCopyTemplate,
  onOpenChange,
  onSearch,
  open,
  search,
  templates,
}: {
  onCopyTemplate: (template: ActionTemplate) => void;
  onOpenChange: (open: boolean) => void;
  onSearch: (search: string) => void;
  open: boolean;
  search: string;
  templates: ActionTemplate[];
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Copy from action bank"
      trigger={
        <Button type="button" icon={Search} variant="secondary">
          Search action bank
        </Button>
      }
    >
      <div className="grid gap-4">
        <FloatingInput icon={Search} label="Search actions" value={search} onChange={onSearch} />
        <div className="grid max-h-[55vh] gap-2 overflow-y-auto pr-1">
          {templates.map((template) => (
            <button
              className="rounded-md border border-border bg-background p-3 text-left text-sm transition hover:bg-muted"
              key={template.id}
              type="button"
              onClick={() => onCopyTemplate(template)}
            >
              <span className="font-semibold">{template.name}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {formatRolls(template.rolls)}
              </span>
            </button>
          ))}
          {templates.length === 0 && (
            <EmptyMini copy="No action templates match that search. Add bank templates from the NPC library page." />
          )}
        </div>
      </div>
    </Modal>
  );
}

function CreatureFormFooter({
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

function creatureProficiency(form: CreatureFormState) {
  return Math.max(2, Math.ceil((Number(form.xp) || 0) / 2900));
}

function speedLabel(key: "walkSpeed" | "swimSpeed" | "flySpeed" | "burrowSpeed" | "climbSpeed") {
  return key.replace("Speed", " speed").replace(/^\w/, (char) => char.toUpperCase());
}
