import { Plus, Rows3, SortAsc, Wand2, X } from "lucide-react";
import { Button, Callout, Field, Input, Select, Textarea } from "../../components/ui";
import type { RollTableCategory, RollTableFormState, RollTableRow } from "./rollTableTypes";
import {
  dieSize,
  oneRowPerFace,
  rollTableCategoryOptions,
  rollTableDieOptions,
  sortRollTableRows,
  validateRollTableForm,
} from "./rollTableOptions";

export function RollTableEditor({
  form,
  onChange,
}: {
  form: RollTableFormState;
  onChange: (form: RollTableFormState) => void;
}) {
  const validation = validateRollTableForm(form);

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
            onValueChange={(dieExpression) => onChange({ ...form, dieExpression })}
          />
        </Field>
        <Field label="Tags">
          <Input
            placeholder="travel, rumor"
            value={form.tags}
            onChange={(event) => onChange({ ...form, tags: event.target.value })}
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
          One row per face
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={Wand2}
          onClick={() => onChange({ ...form, rows: fillGaps(form.rows, form.dieExpression) })}
        >
          Fill gaps
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={SortAsc}
          onClick={() => onChange({ ...form, rows: sortRollTableRows(form.rows) })}
        >
          Sort rows
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={Plus}
          onClick={() => onChange({ ...form, rows: [...form.rows, nextBlankRow(form.rows)] })}
        >
          Add row
        </Button>
      </div>

      <RollTableRowsEditor rows={form.rows} onChange={(rows) => onChange({ ...form, rows })} />
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
      <div className="grid min-w-[760px] grid-cols-[70px_70px_150px_1fr_170px_48px] gap-2 bg-muted px-3 py-2 text-xs font-bold uppercase text-muted-foreground">
        <span>Min</span>
        <span>Max</span>
        <span>Label</span>
        <span>Result</span>
        <span>Notes</span>
        <span />
      </div>
      <div className="divide-y divide-border">
        {rows.map((row, index) => (
          <div
            className="grid min-w-[760px] grid-cols-[70px_70px_150px_1fr_170px_48px] items-start gap-2 px-3 py-2"
            key={`${index}-${row.minRoll}-${row.maxRoll}`}
          >
            <Input
              aria-label={`Row ${index + 1} min`}
              className="text-center"
              min={1}
              type="number"
              value={row.minRoll}
              onChange={(event) => setRow(index, { minRoll: Number(event.target.value) || 0 })}
            />
            <Input
              aria-label={`Row ${index + 1} max`}
              className="text-center"
              min={1}
              type="number"
              value={row.maxRoll}
              onChange={(event) => setRow(index, { maxRoll: Number(event.target.value) || 0 })}
            />
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
            <Button
              type="button"
              aria-label={`Remove row ${index + 1}`}
              icon={X}
              size="sm"
              variant="ghost"
              onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function nextBlankRow(rows: RollTableRow[]) {
  const max = rows.reduce((current, row) => Math.max(current, row.maxRoll), 0) + 1;
  return { minRoll: max, maxRoll: max, label: `Result ${max}`, resultText: "", notes: "" };
}

function fillGaps(rows: RollTableRow[], dieExpression: string) {
  const size = dieSize(dieExpression);
  const sorted = sortRollTableRows(rows).filter((row) => row.minRoll <= row.maxRoll);
  const filled: RollTableRow[] = [];
  let cursor = 1;
  for (const row of sorted) {
    if (row.minRoll > cursor) {
      filled.push({
        minRoll: cursor,
        maxRoll: row.minRoll - 1,
        label: `Result ${cursor}`,
        resultText: "",
        notes: "",
      });
    }
    filled.push(row);
    cursor = Math.max(cursor, row.maxRoll + 1);
  }
  if (size && cursor <= size) {
    filled.push({
      minRoll: cursor,
      maxRoll: size,
      label: `Result ${cursor}`,
      resultText: "",
      notes: "",
    });
  }
  return filled;
}
