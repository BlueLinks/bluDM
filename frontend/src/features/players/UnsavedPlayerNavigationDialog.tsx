import { Button, Modal } from "../../components/ui";

export function UnsavedPlayerNavigationDialog({
  open,
  onStay,
  onDiscard,
  onSave,
}: {
  open: boolean;
  onStay: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onStay();
      }}
      title="Unsaved player changes"
      trigger={<span className="hidden" />}
    >
      <p className="text-sm leading-6 text-muted-foreground">
        This character sheet has unsaved changes. Save before leaving, or stay on this page to keep
        editing.
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onStay}>
          Stay here
        </Button>
        <Button type="button" variant="danger" onClick={onDiscard}>
          Leave without saving
        </Button>
        <Button type="button" onClick={onSave}>
          Save and leave
        </Button>
      </div>
    </Modal>
  );
}
