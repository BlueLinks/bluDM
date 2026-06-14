import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import {
  actionFormFromCreatureAction,
  actionFormFromTemplate,
  creatureToForm as creatureToFormState,
  spiderStaffAction,
  weaponAction,
} from "../../lib/domain/forms";
import type {
  ActionFormState,
  ActionTemplate,
  CommonWeapon,
  Creature,
  CreatureAction,
  CreatureFormState,
  CreatureSpellcastingProfile,
  Spell,
} from "../../types";
import { CreatureActionsSection } from "./CreatureActionsSection";
import {
  CreatureFormFooter,
  CreatureSpellcastingSection,
  CreatureTraitSections,
  spellSlotCount,
} from "./CreatureFormSections";
import { CreatureIdentitySections } from "./CreatureIdentitySections";

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
  spellRefs: [],
  statBlock: "{}",
};

function applySpellcastingToForm(
  form: CreatureFormState,
  spellcasting?: CreatureSpellcastingProfile,
): CreatureFormState {
  if (!spellcasting) return form;
  const slotValue = (level: number) => String(Number(spellcasting.slots[String(level)]) || 0);
  return {
    ...form,
    spellcastingAbility: spellcasting.spellcastingAbility,
    innateSpellcastingAbility: spellcasting.innateSpellcastingAbility,
    casterLevel: String(spellcasting.casterLevel),
    spellSaveDC: String(spellcasting.spellSaveDC),
    spellAttackBonus: String(spellcasting.spellAttackBonus),
    spellSlots1: slotValue(1),
    spellSlots2: slotValue(2),
    spellSlots3: slotValue(3),
    spellSlots4: slotValue(4),
    spellSlots5: slotValue(5),
    spellSlots6: slotValue(6),
    spellSlots7: slotValue(7),
    spellSlots8: slotValue(8),
    spellSlots9: slotValue(9),
    spellRefs: spellcasting.spells.map((spell) => ({
      spellId: spell.spellId,
      librarySource: spell.librarySource === "standard" ? "standard" : "user",
      spellLevel: spell.spellLevel,
    })),
  };
}

export function CreatureForm({
  mode,
  creature,
  existingActions = [],
  spellcasting,
  onSaved,
  notify,
}: {
  mode: "create" | "edit";
  creature?: Creature;
  existingActions?: CreatureAction[];
  spellcasting?: CreatureSpellcastingProfile;
  onSaved: (creature: Creature) => void;
  notify: (message: string) => void;
}) {
  const initialForm = useMemo(
    () => applySpellcastingToForm(creatureToFormState(creature, emptyCreatureForm), spellcasting),
    [creature, spellcasting],
  );
  const initialActions = useMemo(
    () =>
      existingActions.length > 0
        ? existingActions.map(actionFormFromCreatureAction)
        : mode === "create"
          ? [spiderStaffAction()]
          : [],
    [existingActions, mode],
  );
  const persistedActionIds = useMemo(
    () => new Set(existingActions.map((action) => action.id)),
    [existingActions],
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
  }, [creature?.id, existingActions.length, spellcasting]);

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
    const selectedStandardSources =
      spellcasting?.spells
        .filter((spell) => spell.librarySource === "standard" && spell.sourceKey)
        .map((spell) => spell.sourceKey) ?? [];
    if (selectedStandardSources.length === 0) return;
    setSpellSources((current) => Array.from(new Set([...current, ...selectedStandardSources])));
  }, [spellcasting]);

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
    const hasAvailableSlot = spell.level === 0 || spellSlotCount(form, spell.level) > 0;
    const matchesQuery =
      !query ||
      spell.name.toLowerCase().includes(query) ||
      spell.school.toLowerCase().includes(query);
    return hasAvailableSlot && matchesQuery;
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
        notify={notify}
        spellcasting={spellcasting}
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
        creature={creature}
        notify={notify}
        persistedActionIds={persistedActionIds}
        sensors={sensors}
        setTemplates={setTemplates}
        templates={templates}
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
