import { Plus, Rows3, Tag, X } from "lucide-react";
import { useState } from "react";
import { Button, Callout, Field, Input, Select, Textarea } from "../../components/ui";
import type { RollTableCategory, RollTableFormState, RollTableRow } from "./rollTableTypes";
import {
  normalizeRollTableTags,
  oneRowPerFace,
  resizeRowsForDie,
  rollTableCategoryOptions,
  rollTableDieOptions,
  validateRollTableForm,
} from "./rollTableOptions";

export function RollTableEditor({
  form,
  tagSuggestions = [],
  onChange,
}: {
  form: RollTableFormState;
  tagSuggestions?: string[];
  onChange: (form: RollTableFormState) => void;
}) {
  const validation = validateRollTableForm(form);
  const selectedTags = normalizeRollTableTags(form.tags);

  return (
    <div className="grid gap-4">
      {validation.length > 0 && (
        <Callout tone="danger">
          <div className="grid gap-1">
            {validation.map((message) => (
              <span key={message}>{message}</span>
            ))}
          </div>
        </Callout>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Name">
          <Input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
          />
        </Field>
        <Field label="Category">
          <Select
            placeholder="Category"
            value={form.category}
            options={rollTableCategoryOptions}
            onValueChange={(category) =>
              onChange({ ...form, category: category as RollTableCategory })
            }
          />
        </Field>
        <Field label="Die expression">
          <Select
            placeholder="Die"
            value={form.dieExpression}
            options={rollTableDieOptions}
            onValueChange={(dieExpression) =>
              onChange({
                ...form,
                dieExpression,
                rows: resizeRowsForDie(form.rows, dieExpression),
              })
            }
          />
        </Field>
        <Field
          label={
            <span className="inline-flex items-center gap-1">
              <Tag className="h-4 w-4" />
              Tags
            </span>
          }
          className="md:col-span-2"
        >
          <RollTableTagPicker
            selectedTags={selectedTags}
            suggestions={tagSuggestions}
            onChange={(tags) => onChange({ ...form, tags: tags.join(", ") })}
          />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <Textarea
            rows={2}
            value={form.description}
            onChange={(event) => onChange({ ...form, description: event.target.value })}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={Rows3}
          onClick={() => onChange({ ...form, rows: oneRowPerFace(form.dieExpression) })}
        >
          Reset rows
        </Button>
      </div>

      <RollTableRowsEditor rows={form.rows} onChange={(rows) => onChange({ ...form, rows })} />
    </div>
  );
}

function RollTableTagPicker({
  selectedTags,
  suggestions,
  onChange,
}: {
  selectedTags: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const normalizedSuggestions = normalizeRollTableTags(suggestions).filter(
    (tag) => !selectedTags.includes(tag),
  );
  const draftTags = normalizeRollTableTags(draft);
  const canAddDraft = draftTags.some((tag) => !selectedTags.includes(tag));

  function addTags(tags: string[]) {
    onChange(normalizeRollTableTags([...selectedTags, ...tags]));
    setDraft("");
  }

  return (
    <div className="grid gap-2 rounded-md border border-border bg-background p-2">
      <div className="flex min-h-9 flex-wrap gap-2">
        {selectedTags.length === 0 && (
          <span className="px-1 py-1 text-sm text-muted-foreground">No tags selected.</span>
        )}
        {selectedTags.map((tag) => (
          <button
            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
            key={tag}
            type="button"
            aria-label={`Remove tag ${tag}`}
            title={`Remove ${tag}`}
            onClick={() => onChange(selectedTags.filter((item) => item !== tag))}
          >
            <Tag className="h-3 w-3" />
            {tag}
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          aria-label="New tag"
          className="min-h-9"
          placeholder="Add a tag"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || !canAddDraft) return;
            event.preventDefault();
            addTags(draftTags);
          }}
        />
        <Button
          type="button"
          icon={Plus}
          size="sm"
          variant="secondary"
          disabled={!canAddDraft}
          onClick={() => addTags(draftTags)}
        >
          Add tag
        </Button>
      </div>
      {normalizedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {normalizedSuggestions.map((tag) => (
            <button
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground"
              key={tag}
              type="button"
              onClick={() => addTags([tag])}
            >
              <Tag className="h-3 w-3" />
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RollTableRowsEditor({
  rows,
  onChange,
}: {
  rows: RollTableRow[];
  onChange: (rows: RollTableRow[]) => void;
}) {
  function setRow(index: number, patch: Partial<RollTableRow>) {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div className="grid min-w-[640px] grid-cols-[70px_150px_1fr_170px] gap-2 bg-muted px-3 py-2 text-xs font-bold uppercase text-muted-foreground">
        <span>Roll</span>
        <span>Label</span>
        <span>Result</span>
        <span>Notes</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map((row, index) => (
          <div
            className="grid min-w-[640px] grid-cols-[70px_150px_1fr_170px] items-start gap-2 px-3 py-2"
            key={`${index}-${row.minRoll}-${row.maxRoll}`}
          >
            <span className="grid min-h-10 place-items-center rounded-md border border-border bg-card text-sm font-semibold">
              {index + 1}
            </span>
            <Input
              aria-label={`Row ${index + 1} label`}
              value={row.label}
              onChange={(event) => setRow(index, { label: event.target.value })}
            />
            <Input
              aria-label={`Row ${index + 1} result`}
              value={row.resultText}
              onChange={(event) => setRow(index, { resultText: event.target.value })}
            />
            <Input
              aria-label={`Row ${index + 1} notes`}
              value={row.notes}
              onChange={(event) => setRow(index, { notes: event.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
