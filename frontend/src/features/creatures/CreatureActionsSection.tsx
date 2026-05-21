import { closestCenter, DndContext, type DragEndEvent, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Search } from "lucide-react";
import { type Dispatch, type FormEvent, type SetStateAction, useState } from "react";
import { Button, Callout, EmptyMini, FloatingInput, FormSection, Modal } from "../../components/ui";
import { api } from "../../lib/api";
import { blankAction } from "../../lib/domain/forms";
import type { ActionFormState, ActionTemplate, CommonWeapon, Creature } from "../../types";
import { ActionSummary, SortableActionEditor, WeaponMenu } from "./actionEditors";

type SaveDraft = {
  action: ActionFormState;
  mode: "first" | "new";
  name: string;
};

type TemplateConflict = {
  id: string;
  name: string;
};

export function CreatureActionsSection({
  actionBankOpen,
  actionSearch,
  actions,
  creature,
  filteredTemplates,
  onAddWeapon,
  onCopyTemplate,
  onDragEnd,
  notify,
  persistedActionIds,
  sensors,
  setActionBankOpen,
  setActionSearch,
  setActions,
  setTemplates,
}: {
  actionBankOpen: boolean;
  actionSearch: string;
  actions: ActionFormState[];
  creature?: Creature;
  filteredTemplates: ActionTemplate[];
  onAddWeapon: (weapon: CommonWeapon) => void;
  onCopyTemplate: (template: ActionTemplate) => void;
  onDragEnd: (event: DragEndEvent) => void;
  notify: (message: string) => void;
  persistedActionIds: Set<string>;
  sensors: ReturnType<typeof useSensors>;
  setActionBankOpen: (open: boolean) => void;
  setActionSearch: (search: string) => void;
  setActions: Dispatch<SetStateAction<ActionFormState[]>>;
  setTemplates: Dispatch<SetStateAction<ActionTemplate[]>>;
}) {
  const [saveDraft, setSaveDraft] = useState<SaveDraft | null>(null);
  const [conflict, setConflict] = useState<TemplateConflict | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function openSaveDialog(action: ActionFormState, mode: SaveDraft["mode"]) {
    setConflict(null);
    setSaveError("");
    setSaveDraft({ action, mode, name: action.name.trim() });
  }

  async function saveTemplate(event?: FormEvent, overwriteTemplateId?: string) {
    event?.preventDefault();
    if (!saveDraft) return;
    const name = saveDraft.name.trim();
    if (!name) {
      setSaveError("Name is required");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      if (!overwriteTemplateId) {
        const payload = await api.actionTemplateConflict(name);
        if (payload.conflict && payload.actionTemplate) {
          setConflict(payload.actionTemplate);
          return;
        }
      }
      const action = { ...saveDraft.action, name, sourceTemplateId: "" };
      const payload = overwriteTemplateId
        ? await api.updateActionTemplate(overwriteTemplateId, action)
        : await api.createActionTemplate(action);
      setTemplates((current) => upsertTemplate(current, payload.actionTemplate));
      await updateActionSource(saveDraft.action.id, payload.actionTemplate.id);
      notify(overwriteTemplateId ? "Banked action overwritten" : "Action saved to bank");
      closeSaveDialog();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save action to bank");
    } finally {
      setSaving(false);
    }
  }

  async function overwriteSource(action: ActionFormState) {
    if (!action.sourceTemplateId) return;
    setSaving(true);
    try {
      const payload = await api.updateActionTemplate(action.sourceTemplateId, action);
      setTemplates((current) => upsertTemplate(current, payload.actionTemplate));
      notify("Banked action overwritten");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not overwrite banked action");
    } finally {
      setSaving(false);
    }
  }

  async function updateActionSource(actionId: string, sourceTemplateId: string) {
    setActions((current) =>
      current.map((action) => (action.id === actionId ? { ...action, sourceTemplateId } : action)),
    );
    if (!creature || !persistedActionIds.has(actionId)) return;
    await api.updateCreatureActionSourceTemplate(creature.id, actionId, sourceTemplateId);
  }

  function closeSaveDialog() {
    setSaveDraft(null);
    setConflict(null);
    setSaveError("");
  }

  return (
    <FormSection
      title="Actions & Abilities"
      help="Creature actions are ordered for this creature only. Banked actions are copied in, so you can customize the copy without changing the bank."
    >
      <div className="grid gap-4">
        {saveError && <Callout tone="danger">{saveError}</Callout>}
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
                  onOverwriteSource={(next) => void overwriteSource(next)}
                  onRemove={() =>
                    setActions((current) => current.filter((item) => item.id !== action.id))
                  }
                  onSaveAsNew={(next) => openSaveDialog(next, "new")}
                  onSaveToBank={(next) => openSaveDialog(next, "first")}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      <SaveActionDialog
        conflict={conflict}
        draft={saveDraft}
        saving={saving}
        onCancel={closeSaveDialog}
        onNameChange={(name) =>
          setSaveDraft((current) => (current ? { ...current, name } : current))
        }
        onSubmit={(event) => void saveTemplate(event)}
        onOverwrite={() => void saveTemplate(undefined, conflict?.id)}
        onReturnToName={() => setConflict(null)}
      />
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
              className="rounded-md border border-border bg-background p-2 text-left text-sm transition hover:bg-muted"
              key={template.id}
              type="button"
              onClick={() => onCopyTemplate(template)}
            >
              <ActionSummary action={template} />
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

function SaveActionDialog({
  conflict,
  draft,
  saving,
  onCancel,
  onNameChange,
  onOverwrite,
  onReturnToName,
  onSubmit,
}: {
  conflict: TemplateConflict | null;
  draft: SaveDraft | null;
  saving: boolean;
  onCancel: () => void;
  onNameChange: (name: string) => void;
  onOverwrite: () => void;
  onReturnToName: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <Modal
      open={Boolean(draft)}
      onOpenChange={(open) => !open && onCancel()}
      title="Save action"
      trigger={null}
    >
      {draft && (
        <form className="grid gap-4" onSubmit={onSubmit}>
          <FloatingInput
            label="Bank action name"
            value={draft.name}
            onChange={onNameChange}
            required
          />
          {conflict && (
            <Callout>
              An action named {conflict.name} already exists. Cancel to choose another name, or
              overwrite the existing bank action.
            </Callout>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={conflict ? onReturnToName : onCancel}>
              {conflict ? "Back to name" : "Cancel"}
            </Button>
            {conflict ? (
              <Button type="button" variant="danger" disabled={saving} onClick={onOverwrite}>
                Overwrite existing
              </Button>
            ) : (
              <Button type="submit" variant="success" disabled={saving}>
                Save action
              </Button>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
}

function upsertTemplate(templates: ActionTemplate[], template: ActionTemplate) {
  const next = templates.some((item) => item.id === template.id)
    ? templates.map((item) => (item.id === template.id ? template : item))
    : [...templates, template];
  return next.sort((a, b) => a.name.localeCompare(b.name));
}
