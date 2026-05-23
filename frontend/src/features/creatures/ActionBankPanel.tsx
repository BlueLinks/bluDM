import { Archive, Plus } from "lucide-react";
import type { FormEvent } from "react";
import { Button, Callout, EmptyMini, Modal, SectionPanel } from "../../components/ui";
import type { ActionFormState, ActionTemplate } from "../../types";
import { ActionMiniFields, ActionSummary } from "./actionEditors";

export function ActionBankPanel({
  editingTemplate,
  loading,
  onDelete,
  onDuplicate,
  onFormChange,
  onModalChange,
  onOpenTemplate,
  onOverwrite,
  onSubmit,
  templateConflict,
  templateConflictMatches,
  templateForm,
  templateModalOpen,
  templates,
}: {
  editingTemplate: ActionTemplate | null;
  loading: boolean;
  onDelete: (template: ActionTemplate) => void;
  onDuplicate: (template: ActionTemplate) => void;
  onFormChange: (next: ActionFormState) => void;
  onModalChange: (open: boolean) => void;
  onOpenTemplate: (template?: ActionTemplate) => void;
  onOverwrite: () => void;
  onSubmit: (event: FormEvent) => void;
  templateConflict: { id: string; name: string } | null;
  templateConflictMatches: boolean;
  templateForm: ActionFormState;
  templateModalOpen: boolean;
  templates: ActionTemplate[];
}) {
  return (
    <SectionPanel title="Action Bank" icon={Archive}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Reusable attacks and abilities live here. Adding one to a creature creates an editable
          copy in that creature's own action list.
        </p>
        <Modal
          open={templateModalOpen}
          onOpenChange={onModalChange}
          title={editingTemplate ? "Edit custom action" : "Add custom action"}
          trigger={
            <Button type="button" icon={Plus} variant="success" onClick={() => onOpenTemplate()}>
              Add action
            </Button>
          }
        >
          <form className="grid gap-4" onSubmit={onSubmit}>
            <ActionMiniFields value={templateForm} onChange={onFormChange} />
            {templateConflict && templateConflictMatches && (
              <Callout>
                {templateConflict.name} is already in the Action Bank. Cancel to keep your changes
                unsaved, choose a different name to create a new custom action, or overwrite the
                existing custom action.
              </Callout>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onModalChange(false)}>
                Cancel
              </Button>
              {templateConflict && templateConflictMatches ? (
                <Button type="button" variant="danger" onClick={onOverwrite}>
                  Overwrite
                </Button>
              ) : (
                <Button type="submit" icon={Plus} variant="success">
                  {editingTemplate ? "Update custom action" : "Save custom action"}
                </Button>
              )}
            </div>
          </form>
        </Modal>
      </div>
      <div className="grid gap-2">
        {templates.map((template) => (
          <ActionSummary
            key={template.id}
            action={template}
            onEdit={() => onOpenTemplate(template)}
            onDuplicate={() => onDuplicate(template)}
            onDelete={() => onDelete(template)}
          />
        ))}
        {!loading && templates.length === 0 && (
          <EmptyMini copy="No custom actions yet. Create reusable attacks here, then copy them into specific NPCs or monsters." />
        )}
      </div>
    </SectionPanel>
  );
}
