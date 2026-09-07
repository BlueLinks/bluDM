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
import { CreatureFeatureSections } from "./CreatureFeatureSections";
import {
  CreatureSpellcastingSection,
  CreatureAbilitySections,
  CreatureDefenseSections,
  spellSlotCount,
} from "./CreatureFormSections";
import { CreatureIdentitySections } from "./CreatureIdentitySections";

import { parseJSONField } from "../../lib/api/payloads";
import {
  CreatureEditorFooter,
  CreatureEditorLayout,
  CreatureNotesSection,
  EditorPreview,
  type EditorSection,
} from "./CreatureEditorLayout";
import { useCreatureNavigationGuard } from "./useCreatureNavigationGuard";
import { makeEditorPreview } from "./creatureEditorPreview";
import { emptyCreatureForm, applySpellcastingToForm } from "./creatureEditorModel";

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
    () => (existingActions.length > 0 ? existingActions.map(actionFormFromCreatureAction) : []),
    [existingActions],
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
  const [section, setSection] = useState<EditorSection>("essentials");
  const [saving, setSaving] = useState(false);
  const [savedID, setSavedID] = useState(mode === "edit" ? creature?.id : undefined);
  const [baselineSnapshot, setBaselineSnapshot] = useState(() =>
    JSON.stringify({ form: initialForm, actions: initialActions }),
  );
  const currentSnapshot = JSON.stringify({ form, actions });
  const dirty = currentSnapshot !== baselineSnapshot;
  const guard = useCreatureNavigationGuard(dirty);
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
    setForm((current) => {
      const next = {
        ...current,
        [field]: checked
          ? [...new Set([...current[field], value])]
          : current[field].filter((item) => item !== value),
      };
      if (field === "skillExpertise" && checked)
        next.skillProficiencies = [...new Set([...next.skillProficiencies, value])];
      if (field === "skillProficiencies" && !checked)
        next.skillExpertise = next.skillExpertise.filter((item) => item !== value);
      return next;
    });
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    const invalid = Array.from(event.currentTarget.elements).find(
      (element) => element instanceof HTMLInputElement && !element.validity.valid,
    ) as HTMLInputElement | undefined;
    if (invalid) {
      const panel = invalid.closest<HTMLElement>("[data-editor-section]");
      setSection((panel?.dataset.editorSection as EditorSection) || "essentials");
      invalid.closest("details")?.setAttribute("open", "");
      requestAnimationFrame(() => {
        invalid.focus();
        invalid.reportValidity();
      });
      return;
    }
    try {
      parseJSONField(form.statBlock);
    } catch {
      setSection("notes");
      setError("Stat block JSON must be a valid JSON object.");
      return;
    }
    setSaving(true);
    try {
      const payload = savedID
        ? await api.updateCreature(savedID, form)
        : await api.createCreature(form);
      // Keep the created ID so retrying a failed action/spell save updates the same creature.
      setSavedID(payload.creature.id);
      const results = await Promise.allSettled([
        api.replaceCreatureActions(payload.creature.id, actions),
        api.saveCreatureSpellcasting(payload.creature.id, form),
      ]);
      const failure = results.find((result) => result.status === "rejected");
      if (failure?.status === "rejected")
        throw new Error(
          `The creature was saved, but some actions or spells could not be saved. Retry Save to finish. ${failure.reason instanceof Error ? failure.reason.message : ""}`,
        );
      notify(mode === "edit" ? "Creature saved" : "Creature created");
      setBaselineSnapshot(JSON.stringify({ form, actions }));
      guard.allowNavigation();
      onSaved(payload.creature);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save creature");
    } finally {
      setSaving(false);
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
    <form className="min-w-0" data-creature-form="true" noValidate onSubmit={handleCreate}>
      <fieldset disabled={saving} className="min-w-0">
        <CreatureEditorLayout
          active={section}
          onSection={setSection}
          preview={
            <EditorPreview {...makeEditorPreview(form, actions, spells, spellcasting, creature)} />
          }
        >
          <div
            id="creature-section-essentials"
            data-editor-section="essentials"
            hidden={section !== "essentials"}
          >
            <CreatureIdentitySections form={form} setForm={setForm} />
          </div>
          <div
            id="creature-section-abilities"
            data-editor-section="abilities"
            hidden={section !== "abilities"}
          >
            <CreatureAbilitySections form={form} setForm={setForm} toggleList={toggleList} />
          </div>
          <div
            id="creature-section-defenses"
            data-editor-section="defenses"
            hidden={section !== "defenses"}
          >
            <CreatureDefenseSections form={form} setForm={setForm} toggleList={toggleList} />
          </div>
          <div
            id="creature-section-spells"
            data-editor-section="spells"
            hidden={section !== "spells"}
          >
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
          </div>
          <div
            id="creature-section-actions"
            data-editor-section="actions"
            hidden={section !== "actions"}
          >
            <CreatureFeatureSections form={form} setForm={setForm} />
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
          </div>
          <div id="creature-section-notes" data-editor-section="notes" hidden={section !== "notes"}>
            <CreatureNotesSection form={form} setForm={setForm} />
          </div>
        </CreatureEditorLayout>
      </fieldset>
      <CreatureEditorFooter
        error={error}
        dirty={dirty}
        saving={saving}
        mode={mode}
        onRevert={() => {
          setForm(initialForm);
          setActions(initialActions);
          setError("");
        }}
      />
      {guard.dialog}
    </form>
  );
}
