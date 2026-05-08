import { BookOpen, Eye, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
} from "../../components/ui";
import { api } from "../../lib/api";
import type { StandardLibraryEntry } from "../../types";

const ruleCategories = new Set(["rules", "rule-sections", "glossary", "conditions", "skills"]);

export function RulesPage() {
  const [entries, setEntries] = useState<StandardLibraryEntry[]>([]);
  const [sources, setSources] = useState(["srd-2014", "srd-5-2-1"]);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<StandardLibraryEntry | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .standardLibraryEntries({ source: sources })
      .then((payload) => setEntries(payload.entries))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load rules"))
      .finally(() => setLoading(false));
  }, [sources]);

  const visibleEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (!ruleCategories.has(entry.category)) return false;
      if (!query) return true;
      return [entry.name, entry.summary, entry.description].join(" ").toLowerCase().includes(query);
    });
  }, [entries, search]);

  return (
    <Page>
      <PageHeader
        eyebrow="Rules"
        title="SRD rules reference"
        copy="Search conditions, skills, rule sections, and short help entries from the selected standard sources."
      />
      {error && <Callout tone="danger">{error}</Callout>}
      <StandardSourceToggles selected={sources} onChange={setSources} />
      <FloatingInput icon={Search} label="Search rules" value={search} onChange={setSearch} />
      {loading && <MutedPanel>Loading rules reference...</MutedPanel>}
      {!loading && visibleEntries.length === 0 && (
        <MutedPanel>No rule entries match the current filters.</MutedPanel>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {visibleEntries.map((entry) => (
          <article key={entry.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{entry.name}</h3>
                  <Badge>{entry.sourceLabel}</Badge>
                </div>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                  {entry.category.replaceAll("-", " ")}
                </p>
              </div>
              <Button icon={Eye} size="sm" variant="secondary" onClick={() => setPreview(entry)}>
                View
              </Button>
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
              {entry.summary || entry.description || "SRD rule reference."}
            </p>
          </article>
        ))}
      </div>
      <RulePreview entry={preview} onClose={() => setPreview(null)} />
    </Page>
  );
}

function RulePreview({
  entry,
  onClose,
}: {
  entry: StandardLibraryEntry | null;
  onClose: () => void;
}) {
  return (
    <Modal
      title={entry ? entry.name : "Rule"}
      open={Boolean(entry)}
      onOpenChange={(open) => !open && onClose()}
      trigger={<span />}
    >
      {entry && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{entry.sourceLabel}</Badge>
            <Badge>{entry.category.replaceAll("-", " ")}</Badge>
          </div>
          <h3 className="flex items-center gap-2 text-2xl font-bold">
            <BookOpen className="h-6 w-6" />
            {entry.name}
          </h3>
          <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
            {entry.description || entry.summary || "No description provided."}
          </p>
        </div>
      )}
    </Modal>
  );
}
