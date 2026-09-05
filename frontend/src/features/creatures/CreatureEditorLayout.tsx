import { BookOpen, Eye, FileText, Shield, Sparkles, Swords, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ActionRow, SidebarDetailLayout } from "../../components/layout";
import {
  Button,
  Callout,
  ConfirmDialog,
  Field,
  FormSection,
  Modal,
  Textarea,
} from "../../components/ui";
import { CreatureProfile } from "./CreatureProfile";
import type {
  Creature,
  CreatureAction,
  CreatureFormState,
  CreatureSpellcastingProfile,
} from "../../types";

export const editorSections = [
  { id: "essentials", title: "Essentials", hint: "Identity, health & movement", icon: UserRound },
  {
    id: "abilities",
    title: "Abilities & skills",
    hint: "Scores, saves & proficiencies",
    icon: BookOpen,
  },
  { id: "defenses", title: "Senses & defenses", hint: "Awareness & immunities", icon: Shield },
  { id: "actions", title: "Traits & actions", hint: "Features, attacks & reactions", icon: Swords },
  { id: "spells", title: "Spellcasting", hint: "Abilities, slots & spells", icon: Sparkles },
  { id: "notes", title: "Notes & advanced", hint: "Description & stat block JSON", icon: FileText },
] as const;
export type EditorSection = (typeof editorSections)[number]["id"];
export function CreatureEditorLayout({
  active,
  onSection,
  children,
  preview,
}: {
  active: EditorSection;
  onSection: (section: EditorSection) => void;
  children: ReactNode;
  preview: ReactNode;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  return (
    <SidebarDetailLayout variant="compact" className="creature-editor items-start">
      <nav
        aria-label="Creature editor sections"
        className="flex min-w-0 flex-wrap content-start gap-1 self-start border-b border-border pb-3 xl:sticky xl:top-4 xl:grid xl:auto-rows-max xl:border-b-0 xl:pb-0"
      >
        {editorSections.map((section) => (
          <button
            key={section.id}
            type="button"
            aria-current={active === section.id ? "step" : undefined}
            aria-controls={`creature-section-${section.id}`}
            onClick={() => onSection(section.id)}
            className={`flex min-w-0 items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active === section.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface hover:text-foreground"}`}
          >
            <section.icon className="h-4 w-4 shrink-0" />
            <span>
              <span className="font-semibold">{section.title}</span>
              <span className="mt-0.5 hidden text-xs text-muted-foreground xl:block">
                {section.hint}
              </span>
            </span>
          </button>
        ))}
      </nav>
      <SidebarDetailLayout variant="creatureEditor" className="min-w-0 items-start">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">
              {editorSections.find((section) => section.id === active)?.title}
            </h3>
            <Button
              type="button"
              size="sm"
              variant="outline"
              icon={Eye}
              className="2xl:hidden"
              onClick={() => setPreviewOpen(true)}
            >
              Preview
            </Button>
          </div>
          <div className="creature-editor-fields @container min-w-0 rounded-lg border border-border bg-card p-3 sm:p-5">
            {children}
          </div>
        </div>
        <aside
          aria-label="Live creature preview"
          className="hidden min-w-0 rounded-lg border border-border bg-card p-4 2xl:sticky 2xl:top-4 2xl:block"
        >
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Live preview
            </span>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </div>
          {preview}
        </aside>
        <Modal
          title="Live creature preview"
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          className="max-w-4xl"
        >
          {preview}
        </Modal>
      </SidebarDetailLayout>
    </SidebarDetailLayout>
  );
}
export function EditorPreview({
  creature,
  actions,
  spellcasting,
}: {
  creature: Creature;
  actions: CreatureAction[];
  spellcasting: CreatureSpellcastingProfile;
}) {
  return <CreatureProfile creature={creature} actions={actions} spellcasting={spellcasting} />;
}
export function CreatureEditorFooter({
  dirty,
  saving,
  error,
  mode,
  onRevert,
}: {
  dirty: boolean;
  saving: boolean;
  error: string;
  mode: "create" | "edit";
  onRevert: () => void;
}) {
  const [discard, setDiscard] = useState(false);
  return (
    <div className="sticky bottom-0 z-20 mt-5 border-t border-border bg-card p-3 shadow-sm">
      {error && (
        <div role="alert" className="mb-3">
          <Callout tone="danger">{error}</Callout>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {saving
            ? "Saving creature…"
            : dirty
              ? "Unsaved changes"
              : mode === "create"
                ? "Ready to create"
                : "All changes saved"}
        </p>
        <ActionRow>
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || saving}
            onClick={() => setDiscard(true)}
          >
            Discard changes
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : mode === "create" ? "Create creature" : "Save changes"}
          </Button>
        </ActionRow>
      </div>
      <ConfirmDialog
        open={discard}
        title="Discard changes?"
        confirmLabel="Discard changes"
        onCancel={() => setDiscard(false)}
        onConfirm={() => {
          onRevert();
          setDiscard(false);
        }}
      >
        Reset this form to its last saved values?
      </ConfirmDialog>
    </div>
  );
}
export function CreatureNotesSection({
  form,
  setForm,
}: {
  form: CreatureFormState;
  setForm: (form: CreatureFormState) => void;
}) {
  return (
    <FormSection title="Notes & advanced">
      <Field label="Description">
        <Textarea
          rows={6}
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
      </Field>
      <details>
        <summary className="cursor-pointer text-sm font-semibold">Advanced stat block JSON</summary>
        <p className="my-3 text-xs text-muted-foreground">
          Extra imported fields are preserved here. Fields available in the editor take precedence
          when saving.
        </p>
        <Field label="Stat block JSON">
          <Textarea
            rows={12}
            className="font-mono text-xs"
            value={form.statBlock}
            onChange={(event) => setForm({ ...form, statBlock: event.target.value })}
          />
        </Field>
      </details>
    </FormSection>
  );
}
