import { Check } from "lucide-react";
import { Button } from "../ui";

export function UnsavedChangesBar({
  title = "Unsaved changes",
  copy,
  saving = false,
  saveLabel = "Save changes",
  savingLabel = "Saving...",
  onCancel,
  onRevert,
  onSave
}: {
  title?: string;
  copy?: string;
  saving?: boolean;
  saveLabel?: string;
  savingLabel?: string;
  onCancel?: () => void;
  onRevert: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-2xl">
      <div>
        <div className="font-semibold">{title}</div>
        {copy && <div className="text-xs text-muted-foreground">{copy}</div>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={saving} onClick={onRevert}>Revert changes</Button>
        {onCancel && <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>Cancel</Button>}
        <Button type="button" icon={Check} variant="success" disabled={saving} onClick={onSave}>{saving ? savingLabel : saveLabel}</Button>
      </div>
    </div>
  );
}
