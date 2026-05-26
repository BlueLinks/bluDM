import { BookOpen, Copy, Eye, ListChecks, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ContentSourceFilter } from "../../components/shared/ContentSourceFilter";
import { StandardSourceToggles } from "../../components/shared/StandardSourceToggles";
import {
  Badge,
  Button,
  Callout,
  FloatingInput,
  Modal,
  MutedPanel,
  Page,
  PageHeader,
  StatPill,
} from "../../components/ui";
import { api } from "../../lib/api";
import { friendlyMechanicKey, friendlyMechanicValue } from "../../lib/domain/spellMessaging";
import type { Spell, SpellFormState } from "../../types";
import { SpellDialog } from "./SpellDialog";
import { formatRollPart } from "./spellPreviewFormat";
import { displaySpellDuration, displaySpellRange, generateSpellDescription } from "./spellText";

export function SpellsPage() {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [showUserSpells, setShowUserSpells] = useState(true);
  const [showStandardSpells, setShowStandardSpells] = useState(true);
  const [selectedSources, setSelectedSources] = useState(["srd-2014", "srd-5-2-1"]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSpell, setEditingSpell] = useState<Spell | null>(null);
  const [draftSpell, setDraftSpell] = useState<Spell | null>(null);
  const [previewSpell, setPreviewSpell] = useState<Spell | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .spells({ includeStandard: true, q: search.trim(), source: selectedSources })
      .then((payload) => setSpells(payload.spells))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load spells"))
      .finally(() => setLoading(false));
  }, [search, selectedSources]);

  const visibleSpells = spells.filter((spell) =>
    spellVisible(spell, {
      query: search,
      showStandard: showStandardSpells,
      showUser: showUserSpells,
    }),
  );

  return (
    <Page>
      <PageHeader
        eyebrow="Spells"
        title="Spell library"
        copy="Create app-native spell entries from your own books or original content, and browse read-only SRD spells separately."
        action={
          <Button
            icon={Plus}
            onClick={() => {
              setEditingSpell(null);
              setDraftSpell(null);
              setDialogOpen(true);
            }}
          >
            Add spell
          </Button>
        }
      />
      {error && <Callout tone="danger">{error}</Callout>}
      <div className="grid gap-4">
        <ContentSourceFilter
          showStandard={showStandardSpells}
          showUser={showUserSpells}
          standardCopy="Open SRD spells, read-only"
          userCopy="Spells you create and edit"
          onShowStandardChange={setShowStandardSpells}
          onShowUserChange={setShowUserSpells}
        />
        {showStandardSpells && (
          <StandardSourceToggles selected={selectedSources} onChange={setSelectedSources} />
        )}
        <FloatingInput icon={Search} label="Search spells" value={search} onChange={setSearch} />
      </div>
      {loading && <MutedPanel>Loading spells...</MutedPanel>}
      <SpellGrid
        spells={visibleSpells}
        onDelete={handleDelete}
        onEdit={(spell) => {
          setEditingSpell(spell);
          setDraftSpell(null);
          setDialogOpen(true);
        }}
        onCopy={handleCopy}
        onPreview={setPreviewSpell}
      />
      <SpellPreviewModal
        spell={previewSpell}
        onClose={() => setPreviewSpell(null)}
        onCopy={handleCopy}
      />
      <SpellDialog
        open={dialogOpen}
        spell={editingSpell ?? draftSpell}
        mode={editingSpell ? "edit" : "create"}
        onOpenChange={setDialogOpen}
        onSubmit={editingSpell ? handleUpdate : handleCreate}
      />
    </Page>
  );

  async function handleCreate(form: SpellFormState) {
    const payload = await api.createSpell(form);
    setSpells((current) => sortSpells([...current, payload.spell]));
    setDraftSpell(null);
  }

  async function handleUpdate(form: SpellFormState) {
    if (!editingSpell) return;
    const payload = await api.updateSpell(editingSpell.id, form);
    setSpells((current) =>
      sortSpells(current.map((spell) => (spell.id === payload.spell.id ? payload.spell : spell))),
    );
    setEditingSpell(null);
  }

  async function handleDelete(spell: Spell) {
    if (!window.confirm(`Delete ${spell.name}?`)) return;
    await api.deleteSpell(spell.id);
    setSpells((current) => current.filter((item) => item.id !== spell.id));
  }

  function handleCopy(spell: Spell) {
    setEditingSpell(null);
    setDraftSpell(spellCopyDraft(spell));
    setPreviewSpell(null);
    setDialogOpen(true);
  }
}

function SpellGrid({
  spells,
  onDelete,
  onEdit,
  onCopy,
  onPreview,
}: {
  spells: Spell[];
  onDelete: (spell: Spell) => void;
  onEdit: (spell: Spell) => void;
  onCopy: (spell: Spell) => void;
  onPreview: (spell: Spell) => void;
}) {
  if (spells.length === 0) {
    return <MutedPanel>No spells match the current filters.</MutedPanel>;
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {spells.map((spell) => (
        <SpellCard
          key={spell.id}
          spell={spell}
          onDelete={onDelete}
          onEdit={onEdit}
          onCopy={onCopy}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
}

function SpellCard({
  spell,
  onDelete,
  onEdit,
  onCopy,
  onPreview,
}: {
  spell: Spell;
  onDelete: (spell: Spell) => void;
  onEdit: (spell: Spell) => void;
  onCopy: (spell: Spell) => void;
  onPreview: (spell: Spell) => void;
}) {
  return (
    <article
      className={[
        "rounded-lg border bg-card p-4",
        spell.readOnly ? "border-sky-300/80 dark:border-sky-800" : "border-border",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{spell.name}</h3>
            {spell.readOnly && <SrdBadge label={spell.sourceLabel} />}
          </div>
          <p className="text-sm text-muted-foreground">
            {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`}{" "}
            {spell.school && `· ${spell.school}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button icon={Eye} size="sm" variant="secondary" onClick={() => onPreview(spell)}>
            View
          </Button>
          <Button icon={Copy} size="sm" variant="secondary" onClick={() => onCopy(spell)}>
            Copy
          </Button>
          {!spell.readOnly && (
            <>
              <Button icon={Pencil} size="sm" variant="secondary" onClick={() => onEdit(spell)} />
              <Button icon={Trash2} size="sm" variant="danger" onClick={() => onDelete(spell)} />
            </>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {spell.concentration && <Badge>Concentration</Badge>}
        {spell.ritual && <Badge>Ritual</Badge>}
        <Badge>{displaySpellDuration(spell) || "Spell"}</Badge>
      </div>
      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
        {spell.description || generateSpellDescription(spell)}
      </p>
    </article>
  );
}

function SpellPreviewModal({
  spell,
  onClose,
  onCopy,
}: {
  spell: Spell | null;
  onClose: () => void;
  onCopy: (spell: Spell) => void;
}) {
  return (
    <Modal
      title={spell ? spell.name : "Spell"}
      open={Boolean(spell)}
      onOpenChange={(open) => !open && onClose()}
      trigger={<span />}
    >
      {spell && <SpellPreview spell={spell} onCopy={onCopy} />}
    </Modal>
  );
}

function SpellPreview({ spell, onCopy }: { spell: Spell; onCopy: (spell: Spell) => void }) {
  const [showDetails, setShowDetails] = useState(false);
  const actions = spell.actions ?? [];
  const mechanics = spell.mechanics ?? {};
  const hasDetails = actions.length > 0 || detailMechanicEntries(mechanics).length > 0;
  return (
    <div className="grid gap-5">
      {spell.readOnly && (
        <div className="rounded-lg border border-sky-300 bg-sky-50 p-4 text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <SrdBadge label={spell.sourceLabel} />
            <span className="text-sm font-semibold">Read-only standard spell</span>
          </div>
          <p className="text-sm leading-6 opacity-90">
            This spell is provided as shared SRD content. Create a private copy if you want to use
            it as a template for homebrew or table-specific changes.
          </p>
          <Button
            className="mt-3"
            icon={Copy}
            size="sm"
            type="button"
            variant="secondary"
            onClick={() => onCopy(spell)}
          >
            Create copy
          </Button>
        </div>
      )}
      <div>
        <h3 className="text-2xl font-bold">{spell.name}</h3>
        <p className="mt-1 italic text-muted-foreground">
          {spell.level === 0 ? `${spell.school} cantrip` : `Level ${spell.level} ${spell.school}`}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <StatPill label="Casting Time" value={spell.castingTime || "-"} />
        <StatPill label="Range" value={displaySpellRange(spell)} />
        <StatPill label="Duration" value={displaySpellDuration(spell)} />
        <StatPill label="Components" value={componentSummary(spell.components ?? {})} />
      </div>
      <ClassList classes={spell.classes ?? []} />
      <TextBlock title="Description" value={spell.description || generateSpellDescription(spell)} />
      <TextBlock title="At Higher Levels" value={spell.higherLevel} />
      {hasDetails && (
        <div>
          <Button
            icon={ListChecks}
            type="button"
            variant="secondary"
            onClick={() => setShowDetails((current) => !current)}
          >
            {showDetails ? "Hide structured details" : "Show structured details"}
          </Button>
          {showDetails && <MechanicsBlock mechanics={mechanics} actions={actions} />}
        </div>
      )}
    </div>
  );
}

function ClassList({ classes }: { classes: string[] }) {
  if (classes.length === 0) return null;
  return (
    <section className="rounded-md border border-border bg-background p-3">
      <h4 className="font-semibold">Classes</h4>
      <div className="mt-2 flex flex-wrap gap-2">
        {classes.map((className) => (
          <Badge key={className}>{className}</Badge>
        ))}
      </div>
    </section>
  );
}

function TextBlock({ title, value }: { title: string; value: string }) {
  if (!value) return null;
  return (
    <section className="rounded-md border border-border bg-background p-3">
      <h4 className="font-semibold">{title}</h4>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{value}</p>
    </section>
  );
}

function MechanicsBlock({
  mechanics,
  actions = [],
}: {
  mechanics: Record<string, unknown>;
  actions?: Spell["actions"];
}) {
  const entries = detailMechanicEntries(mechanics);
  if (entries.length === 0 && actions.length === 0) return null;
  return (
    <section className="rounded-md border border-border bg-background p-3">
      <h4 className="font-semibold">Structured details</h4>
      {actions.length > 0 && (
        <div className="mt-2 grid gap-2 text-sm">
          {actions.map((action) => (
            <div className="rounded-md bg-muted px-3 py-2" key={action.id}>
              <span className="font-semibold">{action.name || action.actionType}</span>
              <span className="ml-2 text-muted-foreground">
                {action.rolls.map(formatRollPart).join(", ") || "No rolls"}
              </span>
            </div>
          ))}
        </div>
      )}
      <dl className="mt-2 grid gap-1 text-sm">
        {entries.map(([key, value]) => (
          <div className="flex justify-between gap-3" key={key}>
            <dt className="text-muted-foreground">{friendlyMechanicKey(key)}</dt>
            <dd className="text-right font-medium">{friendlyMechanicValue(key, value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function detailMechanicEntries(mechanics: Record<string, unknown>) {
  return Object.entries(mechanics).filter(
    ([key, value]) =>
      !["source", "rawText"].includes(key) &&
      value !== null &&
      value !== "" &&
      !(Array.isArray(value) && value.length === 0),
  );
}

function spellVisible(
  spell: Spell,
  options: { query: string; showStandard: boolean; showUser: boolean },
) {
  if (spell.librarySource === "standard" && !options.showStandard) return false;
  if (spell.librarySource !== "standard" && !options.showUser) return false;
  const query = options.query.trim().toLowerCase();
  if (!query) return true;
  return [spell.name, spell.school, spell.level === 0 ? "cantrip" : `level ${spell.level}`]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function componentSummary(components: Record<string, unknown>) {
  const parts = [];
  if (components.verbal) parts.push("V");
  if (components.somatic) parts.push("S");
  if (components.material) parts.push("M");
  return parts.length > 0 ? parts.join(", ") : "-";
}

function sortSpells(spells: Spell[]) {
  return [...spells].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

function spellCopyDraft(spell: Spell): Spell {
  const sourceParts = [spell.name, spell.sourceLabel].filter(Boolean).join(" · ");
  return {
    ...spell,
    id: "",
    name: `Copy of ${spell.name}`,
    librarySource: "user",
    readOnly: false,
    sourceNote: sourceParts ? `Copied from ${sourceParts}` : spell.sourceNote,
    sourceKey: "",
    sourceLabel: "",
  };
}

function SrdBadge({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200">
      <BookOpen className="h-3 w-3" />
      {label || "SRD"}
    </span>
  );
}
