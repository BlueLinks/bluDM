import { Plus } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Callout,
  ConfirmDialog,
  Page,
  PageHeader,
  ToastViewport,
  useToasts,
} from "../../components/ui";
import { api } from "../../lib/api";
import { actionFormFromTemplate, blankAction, spiderStaffAction } from "../../lib/domain/forms";
import type { ActionFormState, ActionTemplate, ActionTemplateUsage, Creature } from "../../types";
import { ActionBankPanel } from "./ActionBankPanel";
import { CreatureLibraryList } from "./CreatureLibraryList";

export function NpcsPage() {
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [templates, setTemplates] = useState<ActionTemplate[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [templateForm, setTemplateForm] = useState<ActionFormState>(() => spiderStaffAction());
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ActionTemplate | null>(null);
  const [templateConflict, setTemplateConflict] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [deleteCreature, setDeleteCreature] = useState<Creature | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<ActionTemplate | null>(null);
  const [templateUsage, setTemplateUsage] = useState<ActionTemplateUsage[]>([]);
  const toast = useToasts();

  useEffect(() => {
    Promise.all([
      api.creatures({ includeStandard: true, source: ["srd-2014", "srd-5-2-1"] }),
      api.actionTemplates(),
    ])
      .then(([creaturePayload, templatePayload]) => {
        setCreatures(creaturePayload.creatures);
        setTemplates(templatePayload.actionTemplates);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load NPCs"))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreateTemplate(event: FormEvent) {
    event.preventDefault();
    setError("");
    const name = templateForm.name.trim();
    if (!name) {
      setError("Custom action name is required");
      return;
    }
    try {
      const conflictPayload = await api.actionTemplateConflict(name);
      const conflictingAction = conflictPayload.actionTemplate ?? null;
      if (
        conflictPayload.conflict &&
        conflictingAction &&
        conflictingAction.id !== editingTemplate?.id
      ) {
        setTemplateConflict(conflictingAction);
        return;
      }
      const payload = editingTemplate
        ? await api.updateActionTemplate(editingTemplate.id, templateForm)
        : await api.createActionTemplate(templateForm);
      saveTemplateResult(payload.actionTemplate);
      toast.push(editingTemplate ? "Custom action updated" : "Custom action saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create custom action");
    }
  }

  async function overwriteConflictingTemplate() {
    if (!templateConflict) return;
    setError("");
    try {
      const payload = await api.updateActionTemplate(templateConflict.id, {
        ...templateForm,
        name: templateConflict.name,
        sourceTemplateId: "",
      });
      saveTemplateResult(payload.actionTemplate);
      toast.push(`${payload.actionTemplate.name} overwritten`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not overwrite custom action");
    }
  }

  function saveTemplateResult(template: ActionTemplate) {
    setTemplates((current) =>
      current.some((item) => item.id === template.id)
        ? current
            .map((item) => (item.id === template.id ? template : item))
            .sort((a, b) => a.name.localeCompare(b.name))
        : [...current, template].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setTemplateForm(blankAction());
    setEditingTemplate(null);
    setTemplateConflict(null);
    setTemplateModalOpen(false);
  }

  async function confirmDeleteCreature() {
    if (!deleteCreature) return;
    try {
      await api.deleteCreature(deleteCreature.id);
      setCreatures((current) => current.filter((creature) => creature.id !== deleteCreature.id));
      toast.push(`${deleteCreature.name} removed`);
      setDeleteCreature(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not remove creature");
    }
  }

  async function openDeleteTemplate(template: ActionTemplate) {
    setDeleteTemplate(template);
    setTemplateUsage([]);
    try {
      const payload = await api.actionTemplateUsage(template.id);
      setTemplateUsage(payload.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load custom action usage");
    }
  }

  async function confirmDeleteTemplate() {
    if (!deleteTemplate) return;
    const payload = await api.deleteActionTemplate(deleteTemplate.id);
    setTemplates((current) => current.filter((template) => template.id !== deleteTemplate.id));
    toast.push(
      `Custom action removed from bank and ${payload.removedCreatureActions} creature action${payload.removedCreatureActions === 1 ? "" : "s"}`,
    );
    setDeleteTemplate(null);
    setTemplateUsage([]);
  }

  async function duplicateTemplate(template: ActionTemplate) {
    setError("");
    try {
      const duplicate = {
        ...actionFormFromTemplate(template),
        name: nextActionCopyName(template.name, templates),
        sourceTemplateId: "",
      };
      const payload = await api.createActionTemplate(duplicate);
      setTemplates((current) =>
        [...current, payload.actionTemplate].sort((a, b) => a.name.localeCompare(b.name)),
      );
      toast.push(`${payload.actionTemplate.name} added to custom actions`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not duplicate custom action");
    }
  }

  function openTemplateModal(template?: ActionTemplate) {
    setEditingTemplate(template ?? null);
    setTemplateForm(template ? actionFormFromTemplate(template) : blankAction());
    setTemplateConflict(null);
    setTemplateModalOpen(true);
  }

  function closeTemplateModal() {
    setTemplateModalOpen(false);
    setEditingTemplate(null);
    setTemplateConflict(null);
    setTemplateForm(blankAction());
  }

  const templateConflictMatches =
    Boolean(templateConflict) &&
    normalizeActionName(templateForm.name) === normalizeActionName(templateConflict?.name ?? "");

  return (
    <Page>
      <ToastViewport toasts={toast.toasts} onDismiss={toast.dismiss} />
      <PageHeader
        eyebrow="NPCs & Monsters"
        title="Creature library"
        copy="Your NPCs, monsters, and the SRD. Ready when you need them."
        action={
          <Link to="/npcs/new">
            <Button icon={Plus}>Create creature</Button>
          </Link>
        }
      />
      {error && <Callout tone="danger">{error}</Callout>}
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading creatures…
        </p>
      ) : (
        <CreatureLibraryList creatures={creatures} onRemove={setDeleteCreature} />
      )}
      <details className="mt-6 border-t border-border pt-4">
        <summary className="cursor-pointer font-semibold">
          Action bank{" "}
          <span className="text-sm font-normal text-muted-foreground">
            · {templates.length} reusable actions
          </span>
        </summary>
        <div className="mt-4">
          <ActionBankPanel
            editingTemplate={editingTemplate}
            loading={loading}
            templateConflict={templateConflict}
            templateConflictMatches={templateConflictMatches}
            templateForm={templateForm}
            templateModalOpen={templateModalOpen}
            templates={templates}
            onDelete={(template) => void openDeleteTemplate(template)}
            onDuplicate={(template) => void duplicateTemplate(template)}
            onFormChange={setTemplateForm}
            onModalChange={(open) => (open ? setTemplateModalOpen(true) : closeTemplateModal())}
            onOpenTemplate={openTemplateModal}
            onOverwrite={() => void overwriteConflictingTemplate()}
            onSubmit={handleCreateTemplate}
          />
        </div>
      </details>
      <ConfirmDialog
        open={Boolean(deleteCreature)}
        title="Remove creature?"
        confirmLabel="Remove creature"
        onCancel={() => setDeleteCreature(null)}
        onConfirm={() => void confirmDeleteCreature()}
      >
        This will remove {deleteCreature?.name} and its creature-specific actions. This cannot be
        undone.
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(deleteTemplate)}
        title="Remove banked action?"
        confirmLabel="Remove action"
        onCancel={() => {
          setDeleteTemplate(null);
          setTemplateUsage([]);
        }}
        onConfirm={() => void confirmDeleteTemplate()}
      >
        Removing {deleteTemplate?.name} will also remove copied actions that still reference this
        custom action.
        {templateUsage.length > 0 && (
          <div className="mt-3 rounded-md border border-border bg-background p-3 text-sm">
            <div className="font-semibold">Affected creatures</div>
            <ul className="mt-2 grid gap-1 text-muted-foreground">
              {templateUsage.map((usage) => (
                <li key={usage.actionId}>
                  {usage.creatureName}: {usage.actionName}
                </li>
              ))}
            </ul>
          </div>
        )}
      </ConfirmDialog>
    </Page>
  );
}

function nextActionCopyName(name: string, templates: ActionTemplate[]) {
  const baseName = `${name} Copy`;
  const existingNames = new Set(templates.map((template) => template.name.toLowerCase()));
  if (!existingNames.has(baseName.toLowerCase())) return baseName;
  let index = 2;
  while (existingNames.has(`${baseName} ${index}`.toLowerCase())) {
    index += 1;
  }
  return `${baseName} ${index}`;
}

function normalizeActionName(name: string) {
  return name.trim().toLowerCase();
}

export { NpcCreatePage, NpcEditPage } from "./CreatureEditorPages";
