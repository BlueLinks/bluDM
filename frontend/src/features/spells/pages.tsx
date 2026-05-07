import { Plus } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Checkbox,
  Field,
  FormSection,
  Input,
  MutedPanel,
  Page,
  PageHeader,
  Sheet,
  Textarea
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
  components: "{\"verbal\":false,\"somatic\":false,\"material\":\"\"}",
  mechanics: "{}"
};

export function SpellsPage() {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .spells()
      .then((payload) => setSpells(payload.spells))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load spells"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Page>
      <PageHeader
        eyebrow="Spells"
        title="Spell library"
        copy="Create app-native spell entries from your own books or original content."
        action={
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title="Quick add spell" trigger={<Button icon={Plus}>Quick add spell</Button>}>
            <SpellForm
              onCreated={(spell) => {
                setSpells((current) => [...current, spell].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)));
                setSheetOpen(false);
              }}
            />
          </Sheet>
        }
      />
      {error && <Callout tone="danger">{error}</Callout>}
      {loading && <MutedPanel>Loading spells...</MutedPanel>}
      <div className="grid gap-3 lg:grid-cols-2">
        {spells.map((spell) => (
          <div className="rounded-lg border border-border bg-card p-4" key={spell.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">{spell.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`} {spell.school && `· ${spell.school}`}
                </p>
              </div>
              <Badge>{spell.concentration ? "Concentration" : spell.duration || "Spell"}</Badge>
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{spell.description || "No description yet."}</p>
          </div>
        ))}
      </div>
    </Page>
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
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Level">
            <Input type="number" min={0} max={9} value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })} />
          </Field>
          <Field label="School">
            <Input value={form.school} onChange={(event) => setForm({ ...form, school: event.target.value })} />
          </Field>
        </div>
      </FormSection>
      <FormSection title="Casting">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Casting Time">
            <Input value={form.castingTime} onChange={(event) => setForm({ ...form, castingTime: event.target.value })} />
          </Field>
          <Field label="Range">
            <Input value={form.range} onChange={(event) => setForm({ ...form, range: event.target.value })} />
          </Field>
        </div>
        <Field label="Duration">
          <Input value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} />
        </Field>
        <div className="flex flex-wrap gap-3">
          <Checkbox label="Ritual" checked={form.ritual} onChange={(checked) => setForm({ ...form, ritual: checked })} />
          <Checkbox label="Concentration" checked={form.concentration} onChange={(checked) => setForm({ ...form, concentration: checked })} />
        </div>
      </FormSection>
      <FormSection title="Description">
        <Field label="Description">
          <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={5} />
        </Field>
        <Field label="Higher Levels">
          <Textarea value={form.higherLevel} onChange={(event) => setForm({ ...form, higherLevel: event.target.value })} rows={3} />
        </Field>
      </FormSection>
      <FormSection title="Components and Mechanics">
        <Field label="Source Note">
          <Input value={form.sourceNote} onChange={(event) => setForm({ ...form, sourceNote: event.target.value })} />
        </Field>
        <Field label="Components JSON">
          <Textarea value={form.components} onChange={(event) => setForm({ ...form, components: event.target.value })} rows={4} />
        </Field>
        <Field label="Mechanics JSON">
          <Textarea value={form.mechanics} onChange={(event) => setForm({ ...form, mechanics: event.target.value })} rows={4} />
        </Field>
      </FormSection>
      {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
      <Button type="submit">Create spell</Button>
    </form>
  );
}
