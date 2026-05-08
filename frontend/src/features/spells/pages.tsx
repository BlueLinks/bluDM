import { BookOpen, Eye, Plus, Search } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { ContentSourceFilter } from "../../components/shared/ContentSourceFilter";
import {
  Badge,
  Button,
  Callout,
  Checkbox,
  Field,
  FloatingInput,
  FormSection,
  Input,
  Modal,
  MutedPanel,
  Page,
  PageHeader,
  Sheet,
  StatPill,
  Textarea,
} from "../../components/ui";
import { api } from "../../lib/api";
import type { Spell, SpellFormState } from "../../types";

const emptySpellForm: SpellFormState = {
  name: "",
  level: "0",
  school: "",
  castingTime: "",
  range: "",
  duration: "",
  ritual: false,
  concentration: false,
  description: "",
  higherLevel: "",
  sourceNote: "",
  components: '{"verbal":false,"somatic":false,"material":""}',
  mechanics: "{}",
};

export function SpellsPage() {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [showUserSpells, setShowUserSpells] = useState(true);
  const [showStandardSpells, setShowStandardSpells] = useState(true);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [previewSpell, setPreviewSpell] = useState<Spell | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .spells({ includeStandard: true })
      .then((payload) => setSpells(payload.spells))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load spells"))
      .finally(() => setLoading(false));
  }, []);

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
          <Sheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            title="Quick add spell"
            trigger={<Button icon={Plus}>Quick add spell</Button>}
          >
            <SpellForm
              onCreated={(spell) => {
                setSpells((current) =>
                  [...current, spell].sort(
                    (a, b) => a.level - b.level || a.name.localeCompare(b.name),
                  ),
                );
                setSheetOpen(false);
              }}
            />
          </Sheet>
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
        <FloatingInput icon={Search} label="Search spells" value={search} onChange={setSearch} />
      </div>
      {loading && <MutedPanel>Loading spells...</MutedPanel>}
      <SpellGrid spells={visibleSpells} onPreview={setPreviewSpell} />
      <SpellPreviewModal spell={previewSpell} onClose={() => setPreviewSpell(null)} />
    </Page>
  );
}

function SpellGrid({ spells, onPreview }: { spells: Spell[]; onPreview: (spell: Spell) => void }) {
  if (spells.length === 0) {
    return <MutedPanel>No spells match the current filters.</MutedPanel>;
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {spells.map((spell) => (
        <SpellCard key={spell.id} spell={spell} onPreview={onPreview} />
      ))}
    </div>
  );
}

function SpellCard({ spell, onPreview }: { spell: Spell; onPreview: (spell: Spell) => void }) {
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
        <Button icon={Eye} size="sm" variant="secondary" onClick={() => onPreview(spell)}>
          View
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {spell.concentration && <Badge>Concentration</Badge>}
        {spell.ritual && <Badge>Ritual</Badge>}
        <Badge>{spell.duration || "Spell"}</Badge>
      </div>
      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
        {spell.description || "No description yet."}
      </p>
    </article>
  );
}

function SpellPreviewModal({ spell, onClose }: { spell: Spell | null; onClose: () => void }) {
  return (
    <Modal
      title={spell ? spell.name : "Spell"}
      open={Boolean(spell)}
      onOpenChange={(open) => !open && onClose()}
      trigger={<span />}
    >
      {spell && <SpellPreview spell={spell} />}
    </Modal>
  );
}

function SpellPreview({ spell }: { spell: Spell }) {
  return (
    <div className="grid gap-5">
      {spell.readOnly && (
        <div className="rounded-lg border border-sky-300 bg-sky-50 p-4 text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <SrdBadge label={spell.sourceLabel} />
            <span className="text-sm font-semibold">Read-only standard spell</span>
          </div>
          <p className="text-sm leading-6 opacity-90">
            This spell is provided as shared SRD content. Create a private spell if you need to
            adjust text or mechanics for your table.
          </p>
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
        <StatPill label="Range" value={spell.range || "-"} />
        <StatPill label="Duration" value={spell.duration || "-"} />
        <StatPill label="Components" value={componentSummary(spell.components)} />
      </div>
      <TextBlock title="Description" value={spell.description} />
      <TextBlock title="At Higher Levels" value={spell.higherLevel} />
      <MechanicsBlock mechanics={spell.mechanics} />
    </div>
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

function MechanicsBlock({ mechanics }: { mechanics: Record<string, unknown> }) {
  const entries = Object.entries(mechanics).filter(([key, value]) => key !== "source" && value);
  if (entries.length === 0) return null;
  return (
    <section className="rounded-md border border-border bg-background p-3">
      <h4 className="font-semibold">Mechanics</h4>
      <dl className="mt-2 grid gap-1 text-sm">
        {entries.map(([key, value]) => (
          <div className="flex justify-between gap-3" key={key}>
            <dt className="capitalize text-muted-foreground">{key}</dt>
            <dd className="text-right font-medium">{formatMechanic(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SpellForm({ onCreated }: { onCreated: (spell: Spell) => void }) {
  const [form, setForm] = useState<SpellFormState>(emptySpellForm);
  const [error, setError] = useState("");

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const payload = await api.createSpell(form);
      onCreated(payload.spell);
      setForm(emptySpellForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create spell");
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleCreate}>
      <FormSection title="Basic Info">
        <Field label="Name">
          <Input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Level">
            <Input
              type="number"
              min={0}
              max={9}
              value={form.level}
              onChange={(event) => setForm({ ...form, level: event.target.value })}
            />
          </Field>
          <Field label="School">
            <Input
              value={form.school}
              onChange={(event) => setForm({ ...form, school: event.target.value })}
            />
          </Field>
        </div>
      </FormSection>
      <FormSection title="Casting">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Casting Time">
            <Input
              value={form.castingTime}
              onChange={(event) => setForm({ ...form, castingTime: event.target.value })}
            />
          </Field>
          <Field label="Range">
            <Input
              value={form.range}
              onChange={(event) => setForm({ ...form, range: event.target.value })}
            />
          </Field>
        </div>
        <Field label="Duration">
          <Input
            value={form.duration}
            onChange={(event) => setForm({ ...form, duration: event.target.value })}
          />
        </Field>
        <div className="flex flex-wrap gap-3">
          <Checkbox
            label="Ritual"
            checked={form.ritual}
            onChange={(checked) => setForm({ ...form, ritual: checked })}
          />
          <Checkbox
            label="Concentration"
            checked={form.concentration}
            onChange={(checked) => setForm({ ...form, concentration: checked })}
          />
        </div>
      </FormSection>
      <FormSection title="Description">
        <Field label="Description">
          <Textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            rows={5}
          />
        </Field>
        <Field label="Higher Levels">
          <Textarea
            value={form.higherLevel}
            onChange={(event) => setForm({ ...form, higherLevel: event.target.value })}
            rows={3}
          />
        </Field>
      </FormSection>
      <FormSection title="Components and Mechanics">
        <Field label="Source Note">
          <Input
            value={form.sourceNote}
            onChange={(event) => setForm({ ...form, sourceNote: event.target.value })}
          />
        </Field>
        <Field label="Components JSON">
          <Textarea
            value={form.components}
            onChange={(event) => setForm({ ...form, components: event.target.value })}
            rows={4}
          />
        </Field>
        <Field label="Mechanics JSON">
          <Textarea
            value={form.mechanics}
            onChange={(event) => setForm({ ...form, mechanics: event.target.value })}
            rows={4}
          />
        </Field>
      </FormSection>
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      <Button type="submit">Create spell</Button>
    </form>
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

function formatMechanic(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && value) {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== null && item !== "")
      .map(([key, item]) => `${key}: ${formatMechanic(item)}`)
      .join("; ");
  }
  return String(value);
}

function SrdBadge({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200">
      <BookOpen className="h-3 w-3" />
      {label || "SRD"}
    </span>
  );
}
