import { Copy, Dice5, Pencil, Plus, Search, Sparkles, TableProperties, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Callout,
  ConfirmDialog,
  EmptyMini,
  Field,
  Input,
  Modal,
  Select,
} from "../../components/ui";
import { api } from "../../lib/api";
import { RollTableEditor } from "./RollTableEditor";
import {
  blankRollTableForm,
  formFromRollTable,
  normalizeRollTableTags,
  rollTableCategoryLabel,
  rollTableCategoryOptions,
  validateRollTableForm,
} from "./rollTableOptions";
import type { RollTable, RollTableFormState, RollTableRollResult } from "./rollTableTypes";
import { TagChipList, TagFilterBar } from "./RollTableTags";

type EditorState = { mode: "create" | "edit"; tableId?: string; form: RollTableFormState };

export function CampaignRollTableTool({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false);
  const [tables, setTables] = useState<RollTable[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RollTableRollResult | null>(null);
  const [recent, setRecent] = useState<RollTableRollResult[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RollTable | null>(null);

  useEffect(() => {
    if (open) void loadTables();
  }, [open, campaignId]);

  async function loadTables(nextSelectedId = selectedId) {
    setLoading(true);
    setError("");
    try {
      const payload = await api.campaignRollTables(campaignId);
      setTables(payload.tables);
      setSelectedId(nextSelectedId || payload.tables[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load roll tables");
    } finally {
      setLoading(false);
    }
  }

  const availableTags = useMemo(
    () => normalizeRollTableTags(tables.flatMap((table) => table.tags)),
    [tables],
  );

  useEffect(() => {
    setSelectedTags((current) => current.filter((tag) => availableTags.includes(tag)));
  }, [availableTags]);

  const filteredTables = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tables.filter((table) => {
      const categoryMatch = category === "" || table.category === category;
      if (!categoryMatch) return false;
      const tableTags = normalizeRollTableTags(table.tags);
      const tagMatch = selectedTags.every((tag) => tableTags.includes(tag));
      if (!tagMatch) return false;
      if (!term) return true;
      return [table.name, table.description, table.category, ...table.tags]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [category, search, selectedTags, tables]);
  const selected =
    filteredTables.find((table) => table.id === selectedId) ?? filteredTables[0] ?? null;
  const tagSuggestions = useMemo(() => {
    const loadedTags = tables.flatMap((table) =>
      editor?.mode === "edit" && editor.tableId === table.id ? [] : table.tags,
    );
    return normalizeRollTableTags([
      ...loadedTags,
      ...(editor ? normalizeRollTableTags(editor.form.tags) : []),
    ]);
  }, [editor, tables]);

  async function rollSelected() {
    if (!selected) return;
    setError("");
    try {
      const payload = await api.rollCampaignRollTable(campaignId, selected.id);
      setResult(payload.roll);
      setRecent((current) => [payload.roll, ...current].slice(0, 8));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not roll table");
    }
  }

  async function saveEditor() {
    if (!editor || validateRollTableForm(editor.form).length > 0) return;
    setError("");
    try {
      const payload =
        editor.mode === "edit" && editor.tableId
          ? await api.updateCampaignRollTable(campaignId, editor.tableId, editor.form)
          : await api.createCampaignRollTable(campaignId, editor.form);
      setSearch("");
      setCategory("");
      setSelectedTags([]);
      setEditor(null);
      await loadTables(payload.table.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save roll table");
    }
  }

  async function cloneTable(table: RollTable) {
    setError("");
    try {
      const payload = await api.cloneCampaignRollTable(campaignId, table.id);
      await loadTables(payload.table.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not duplicate roll table");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setError("");
    try {
      await api.deleteCampaignRollTable(campaignId, deleteTarget.id);
      setDeleteTarget(null);
      await loadTables(selectedId === deleteTarget.id ? "" : selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete roll table");
    }
  }

  return (
    <>
      <Modal
        title="Roll tables"
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setEditor(null);
            setDeleteTarget(null);
          }
        }}
        className="max-w-6xl"
        trigger={
          <Button type="button" icon={TableProperties} variant="secondary">
            Tables
          </Button>
        }
      >
        <div className="grid gap-4">
          {error && <Callout tone="danger">{error}</Callout>}
          {editor ? (
            <RollTableEditorPane
              editor={editor}
              tagSuggestions={tagSuggestions}
              onChange={setEditor}
              onCancel={() => setEditor(null)}
              onSave={() => void saveEditor()}
            />
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
                <Field label="Search">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                </Field>
                <Field label="Category">
                  <Select
                    placeholder="All categories"
                    value={category}
                    options={[{ value: "", label: "All categories" }, ...rollTableCategoryOptions]}
                    onValueChange={setCategory}
                  />
                </Field>
                <div className="flex items-end">
                  <Button
                    type="button"
                    icon={Plus}
                    onClick={() => setEditor({ mode: "create", form: { ...blankRollTableForm } })}
                  >
                    New table
                  </Button>
                </div>
              </div>
              <TagFilterBar
                availableTags={availableTags}
                selectedTags={selectedTags}
                onClear={() => setSelectedTags([])}
                onToggle={(tag) =>
                  setSelectedTags((current) =>
                    current.includes(tag)
                      ? current.filter((selectedTag) => selectedTag !== tag)
                      : [...current, tag],
                  )
                }
              />

              <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                <TableList
                  loading={loading}
                  selectedId={selected?.id ?? ""}
                  tables={filteredTables}
                  onSelect={setSelectedId}
                />
                <div className="grid gap-4">
                  {selected ? (
                    <>
                      <SelectedTableCard
                        table={selected}
                        result={result?.tableId === selected.id ? result : null}
                        onClone={() => void cloneTable(selected)}
                        onDelete={() => setDeleteTarget(selected)}
                        onEdit={() =>
                          setEditor({
                            mode: "edit",
                            tableId: selected.id,
                            form: formFromRollTable(selected),
                          })
                        }
                        onRoll={() => void rollSelected()}
                      />
                      <RecentRolls rolls={recent} />
                    </>
                  ) : (
                    <EmptyMini copy="No roll tables match those filters." />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete roll table"
        confirmLabel="Delete table"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      >
        Delete {deleteTarget?.name}? This removes the campaign table and its rows.
      </ConfirmDialog>
    </>
  );
}

function RollTableEditorPane({
  editor,
  tagSuggestions,
  onCancel,
  onChange,
  onSave,
}: {
  editor: EditorState;
  tagSuggestions: string[];
  onCancel: () => void;
  onChange: (editor: EditorState) => void;
  onSave: () => void;
}) {
  const invalid = validateRollTableForm(editor.form).length > 0;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            {editor.mode === "edit" ? "Edit roll table" : "Create roll table"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Build one outcome for each face of the selected die.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" disabled={invalid} onClick={onSave}>
            Save table
          </Button>
        </div>
      </div>
      <RollTableEditor
        form={editor.form}
        tagSuggestions={tagSuggestions}
        onChange={(form) => onChange({ ...editor, form })}
      />
    </div>
  );
}

function TableList({
  loading,
  selectedId,
  tables,
  onSelect,
}: {
  loading: boolean;
  selectedId: string;
  tables: RollTable[];
  onSelect: (id: string) => void;
}) {
  if (loading) return <EmptyMini copy="Loading roll tables..." />;
  if (tables.length === 0) return <EmptyMini copy="No roll tables yet." />;
  return (
    <div className="grid max-h-[62vh] gap-2 overflow-y-auto pr-1">
      {tables.map((table) => (
        <button
          type="button"
          className={[
            "rounded-lg border p-3 text-left transition",
            table.id === selectedId
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50",
          ].join(" ")}
          key={table.id}
          onClick={() => onSelect(table.id)}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{table.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {rollTableCategoryLabel(table.category)} · {table.dieExpression}
              </div>
            </div>
            <Badge tone={table.source === "provided" ? "official" : "shared"}>
              {table.source === "provided" ? "Provided" : "Campaign"}
            </Badge>
          </div>
          {table.description && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{table.description}</p>
          )}
          {table.tags.length > 0 && <TagChipList className="mt-2" tags={table.tags} />}
        </button>
      ))}
    </div>
  );
}

function SelectedTableCard({
  table,
  result,
  onClone,
  onDelete,
  onEdit,
  onRoll,
}: {
  table: RollTable;
  result: RollTableRollResult | null;
  onClone: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onRoll: () => void;
}) {
  return (
    <section className="grid gap-4 rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{table.name}</h3>
            <Badge tone="warning">{table.dieExpression}</Badge>
            <Badge tone="metadata">{rollTableCategoryLabel(table.category)}</Badge>
          </div>
          {table.description && (
            <p className="mt-2 text-sm text-muted-foreground">{table.description}</p>
          )}
          {table.tags.length > 0 && <TagChipList className="mt-3" tags={table.tags} />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" icon={Dice5} onClick={onRoll}>
            Roll table
          </Button>
          <Button type="button" icon={Copy} variant="secondary" onClick={onClone}>
            {table.source === "provided" ? "Clone" : "Duplicate"}
          </Button>
          {table.source === "campaign" && (
            <>
              <Button type="button" icon={Pencil} variant="secondary" onClick={onEdit}>
                Edit
              </Button>
              <Button type="button" icon={Trash2} variant="danger" onClick={onDelete}>
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {result && (
        <div
          key={`${result.tableId}-${result.rolledAt}`}
          className="damage-roll-line rounded-lg border border-primary/25 bg-primary/5 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase text-muted-foreground">
                {result.dieExpression} · range {result.matchedRange}
              </div>
              <div className="mt-1 text-xl font-semibold">{result.label}</div>
            </div>
            <div className="text-5xl font-black text-primary">{result.rolledValue}</div>
          </div>
          <p className="mt-3 text-sm leading-6">{result.resultText}</p>
          {result.notes && <p className="mt-2 text-xs text-muted-foreground">{result.notes}</p>}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <div className="grid min-w-[600px] grid-cols-[90px_160px_1fr] gap-3 bg-muted px-3 py-2 text-xs font-bold uppercase text-muted-foreground">
          <span>Roll</span>
          <span>Label</span>
          <span>Result</span>
        </div>
        <div className="divide-y divide-border">
          {table.rows.map((row) => (
            <div
              className="grid min-w-[600px] grid-cols-[90px_160px_1fr] gap-3 px-3 py-2 text-sm"
              key={row.id || `${row.minRoll}-${row.maxRoll}`}
            >
              <span className="font-semibold">
                {row.minRoll === row.maxRoll ? row.minRoll : `${row.minRoll}-${row.maxRoll}`}
              </span>
              <span>{row.label}</span>
              <span className="text-muted-foreground">{row.resultText}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RecentRolls({ rolls }: { rolls: RollTableRollResult[] }) {
  return (
    <section className="grid gap-2 rounded-lg border border-border bg-background p-4">
      <div className="flex items-center gap-2 font-semibold">
        <Sparkles className="h-4 w-4 text-accent" />
        Recent table rolls
      </div>
      {rolls.length === 0 && <EmptyMini copy="No table rolls in this session yet." />}
      {rolls.map((roll) => (
        <div
          className="flex items-start justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm"
          key={`${roll.tableId}-${roll.rolledAt}`}
        >
          <div>
            <div className="font-semibold">{roll.tableName}</div>
            <div className="text-xs text-muted-foreground">
              {roll.matchedRange} · {roll.label}
            </div>
          </div>
          <div className="text-2xl font-bold text-primary">{roll.rolledValue}</div>
        </div>
      ))}
    </section>
  );
}
