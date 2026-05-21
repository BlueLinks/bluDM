import { closestCenter, DndContext, type DragEndEvent, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Search } from "lucide-react";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import {
  Button,
  Callout,
  ConfirmDialog,
  EmptyMini,
  FloatingInput,
  FormSection,
  Modal,
} from "../../components/ui";
import { api } from "../../lib/api";
import { actionPayload } from "../../lib/api/payloads";
import { blankAction, actionFormFromTemplate } from "../../lib/domain/forms";
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

type OverwriteConfirm = {
  action: ActionFormState;
  templateId: string;
  templateName: string;
  usageCount: number;
  mode: "source" | "conflict";
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
  templates,
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
  templates: ActionTemplate[];
}) {
  const [saveDraft, setSaveDraft] = useState<SaveDraft | null>(null);
  const [conflict, setConflict] = useState<TemplateConflict | null>(null);
  const [overwriteConfirm, setOverwriteConfirm] = useState<OverwriteConfirm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const templateById = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates],
  );

  function openSaveDialog(action: ActionFormState, mode: SaveDraft["mode"]) {
    setConflict(null);
    setSaveError("");
    setSaveDraft({ action, mode, name: action.name.trim() });
  }

  async function saveTemplate(overwriteTemplateId?: string) {
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
      await syncActionWithTemplate(saveDraft.action.id, payload.actionTemplate);
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
    await openOverwriteConfirm(action, action.sourceTemplateId, "source");
  }

  async function confirmOverwrite() {
    if (!overwriteConfirm) return;
    setSaving(true);
    try {
      const payload =
        overwriteConfirm.mode === "conflict"
          ? await api.updateActionTemplate(overwriteConfirm.templateId, {
              ...overwriteConfirm.action,
              name: saveDraft?.name.trim() || overwriteConfirm.action.name,
              sourceTemplateId: "",
            })
          : await api.updateActionTemplate(overwriteConfirm.templateId, overwriteConfirm.action);
      setTemplates((current) => upsertTemplate(current, payload.actionTemplate));
      if (overwriteConfirm.mode === "conflict") {
        await syncActionWithTemplate(overwriteConfirm.action.id, payload.actionTemplate);
        closeSaveDialog();
      } else {
        syncLocalActionWithTemplate(overwriteConfirm.action.id, payload.actionTemplate);
      }
      notify("Banked action overwritten");
      setOverwriteConfirm(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not overwrite banked action");
    } finally {
      setSaving(false);
    }
  }

  async function syncActionWithTemplate(actionId: string, template: ActionTemplate) {
    syncLocalActionWithTemplate(actionId, template);
    if (!creature || !persistedActionIds.has(actionId)) return;
    await api.updateCreatureActionSourceTemplate(creature.id, actionId, template.id);
  }

  function syncLocalActionWithTemplate(actionId: string, template: ActionTemplate) {
    setActions((current) =>
      current.map((action) =>
        action.id === actionId
          ? { ...actionFormFromTemplate(template), id: action.id, sourceTemplateId: template.id }
          : action,
      ),
    );
  }

  function closeSaveDialog() {
    setSaveDraft(null);
    setConflict(null);
    setOverwriteConfirm(null);
    setSaveError("");
  }

  async function openOverwriteConfirm(
    action: ActionFormState,
    templateId: string,
    mode: OverwriteConfirm["mode"],
  ) {
    setSaving(true);
    try {
      const usage = await api.actionTemplateUsage(templateId);
      const templateName = templateById.get(templateId)?.name ?? conflict?.name ?? action.name;
      setOverwriteConfirm({
        action,
        templateId,
        templateName,
        usageCount: usage.count,
        mode,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not check bank action usage");
    } finally {
      setSaving(false);
    }
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
                  bankModified={isBankModified(
                    action,
                    templateById.get(action.sourceTemplateId ?? ""),
                  )}
                  bankSaveable={isUnbankedSaveable(action)}
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
        onSubmit={() => void saveTemplate()}
        onOverwrite={() =>
          conflict && saveDraft
            ? void openOverwriteConfirm(saveDraft.action, conflict.id, "conflict")
            : undefined
        }
      />
      <ConfirmDialog
        open={Boolean(overwriteConfirm)}
        title="Update Action Bank entry?"
        confirmLabel="Update bank entry"
        onCancel={() => setOverwriteConfirm(null)}
        onConfirm={() => void confirmOverwrite()}
      >
        Update the Action Bank entry for {overwriteConfirm?.templateName}? This changes the reusable
        custom action DMs copy from the bank. Existing NPC action copies keep their current local
        values, but {overwriteConfirm?.usageCount ?? 0} creature action
        {overwriteConfirm?.usageCount === 1 ? "" : "s"} currently reference this bank entry.
      </ConfirmDialog>
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
            <EmptyMini copy="No custom actions match that search. Add reusable custom actions from the NPC library page." />
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
  onSubmit,
}: {
  conflict: TemplateConflict | null;
  draft: SaveDraft | null;
  saving: boolean;
  onCancel: () => void;
  onNameChange: (name: string) => void;
  onOverwrite: () => void;
  onSubmit: () => void;
}) {
  const nameMatchesConflict =
    Boolean(conflict && draft) &&
    normalizeBankActionName(draft?.name ?? "") === normalizeBankActionName(conflict?.name ?? "");

  return (
    <Modal
      open={Boolean(draft)}
      onOpenChange={(open) => !open && onCancel()}
      title="Save action"
      trigger={null}
    >
      {draft && (
        <div className="grid gap-4">
          <FloatingInput
            label="Bank action name"
            value={draft.name}
            onChange={onNameChange}
            required
          />
          {conflict && nameMatchesConflict && (
            <Callout>
              {conflict.name} is already in the Action Bank. Cancel to keep this NPC action local,
              or overwrite the reusable bank entry.
            </Callout>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            {conflict && nameMatchesConflict ? (
              <Button type="button" variant="danger" disabled={saving} onClick={onOverwrite}>
                Overwrite
              </Button>
            ) : (
              <Button type="button" variant="success" disabled={saving} onClick={onSubmit}>
                Save action
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function normalizeBankActionName(name: string) {
  return name.trim().toLowerCase();
}

function upsertTemplate(templates: ActionTemplate[], template: ActionTemplate) {
  const next = templates.some((item) => item.id === template.id)
    ? templates.map((item) => (item.id === template.id ? template : item))
    : [...templates, template];
  return next.sort((a, b) => a.name.localeCompare(b.name));
}

function isUnbankedSaveable(action: ActionFormState) {
  if (action.sourceTemplateId) return false;
  const payload = actionPayload(action);
  const blankPayload = actionPayload({ ...blankAction(), id: action.id });
  return action.name.trim() !== "" || JSON.stringify(payload) !== JSON.stringify(blankPayload);
}

function isBankModified(action: ActionFormState, template?: ActionTemplate) {
  if (!action.sourceTemplateId || !template) return false;
  const actionComparable = actionPayload({ ...action, sourceTemplateId: "" });
  const templateComparable = actionPayload({
    ...actionFormFromTemplate(template),
    id: action.id,
    sourceTemplateId: "",
  });
  return JSON.stringify(actionComparable) !== JSON.stringify(templateComparable);
}
