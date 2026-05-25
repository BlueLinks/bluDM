import { type FormEvent, useEffect, useState } from "react";
import { Button, Modal } from "../../components/ui";
import type { Spell, SpellFormState } from "../../types";
import { SpellActionsSection } from "./SpellActionsSection";
import { SpellCoreFields } from "./SpellCoreFields";
import { ProjectileSection } from "./SpellProjectileSection";
import { emptySpellForm, spellToForm } from "./spellFormState";

export function SpellDialog({
  open,
  spell,
  mode = spell ? "edit" : "create",
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  spell?: Spell | null;
  mode?: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: SpellFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<SpellFormState>(emptySpellForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(spell ? spellToForm(spell) : emptySpellForm);
      setError("");
    }
  }, [open, spell]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save spell");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      className="max-w-5xl"
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "edit" ? "Edit spell" : "Add spell"}
      trigger={<span />}
    >
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <SpellCoreFields form={form} setForm={setForm} />
        <ProjectileSection form={form} setForm={setForm} />
        <SpellActionsSection form={form} setForm={setForm} />
        {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : mode === "edit" ? "Save spell" : "Create spell"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
