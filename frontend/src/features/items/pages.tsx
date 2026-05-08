import { Eye, Package, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ContentSourceFilter } from "../../components/shared/ContentSourceFilter";
import { InfoHelpButton } from "../../components/shared/InfoHelpButton";
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
  Select,
} from "../../components/ui";
import { api } from "../../lib/api";
import type { StandardLibraryEntry } from "../../types";

const itemCategories = [
  { value: "", label: "All item-like content" },
  { value: "equipment", label: "Equipment" },
  { value: "weapon-properties", label: "Weapon properties" },
  { value: "damage-types", label: "Damage types" },
  { value: "magic-schools", label: "Magic schools" },
];
const itemCategoryKeys = new Set(itemCategories.slice(1).map((option) => option.value));

export function ItemsPage() {
  const [entries, setEntries] = useState<StandardLibraryEntry[]>([]);
  const [showUser, setShowUser] = useState(true);
  const [showStandard, setShowStandard] = useState(true);
  const [sources, setSources] = useState(["srd-2014", "srd-5-2-1"]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<StandardLibraryEntry | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .standardLibraryEntries({ source: sources })
      .then((payload) => setEntries(payload.entries))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load items"))
      .finally(() => setLoading(false));
  }, [sources]);

  const visibleEntries = useMemo(
    () =>
      entries.filter((entry) => {
        if (!showStandard) return false;
        if (category ? entry.category !== category : !itemCategoryKeys.has(entry.category)) {
          return false;
        }
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return [entry.name, entry.summary, entry.description]
          .join(" ")
          .toLowerCase()
          .includes(query);
      }),
    [category, entries, search, showStandard],
  );

  return (
    <Page>
      <PageHeader
        eyebrow="Items"
        title="Items and equipment"
        copy="Browse read-only SRD equipment, weapon properties, and related reference entries. User-created item management can build on this library later."
        action={
          <InfoHelpButton title="Why is SRD content read-only?">
            <p>
              Standard entries are shared across every user and campaign. Keeping them read-only
              prevents accidental changes to the reference copy.
            </p>
            <p>Create private items later when your table needs custom gear or loot.</p>
          </InfoHelpButton>
        }
      />
      {error && <Callout tone="danger">{error}</Callout>}
      <ContentSourceFilter
        showStandard={showStandard}
        showUser={showUser}
        standardCopy="SRD equipment and rules references"
        userCopy="Custom items are planned next"
        onShowStandardChange={setShowStandard}
        onShowUserChange={setShowUser}
      />
      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <FloatingInput icon={Search} label="Search items" value={search} onChange={setSearch} />
        <Select
          value={category}
          placeholder="Category"
          options={itemCategories}
          onValueChange={setCategory}
        />
      </div>
      {showStandard && <StandardSourceToggles selected={sources} onChange={setSources} />}
      {showUser && (
        <MutedPanel>
          User-created items are not implemented yet. This page is ready for them.
        </MutedPanel>
      )}
      {loading && <MutedPanel>Loading item library...</MutedPanel>}
      {!loading && visibleEntries.length === 0 && (
        <MutedPanel>No standard entries match the current filters.</MutedPanel>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleEntries.map((entry) => (
          <article
            key={entry.id}
            className="rounded-lg border border-sky-300/80 bg-card p-4 dark:border-sky-800"
          >
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
              {entry.summary || entry.description || "SRD item reference."}
            </p>
          </article>
        ))}
      </div>
      <EntryPreviewModal entry={preview} onClose={() => setPreview(null)} />
    </Page>
  );
}

function EntryPreviewModal({
  entry,
  onClose,
}: {
  entry: StandardLibraryEntry | null;
  onClose: () => void;
}) {
  return (
    <Modal
      title={entry ? entry.name : "Library entry"}
      open={Boolean(entry)}
      onOpenChange={(open) => !open && onClose()}
      trigger={<span />}
    >
      {entry && (
        <div className="grid gap-4">
          <div className="rounded-lg border border-sky-300 bg-sky-50 p-4 text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{entry.sourceLabel}</Badge>
              <Badge>{entry.category.replaceAll("-", " ")}</Badge>
            </div>
            <p className="mt-2 text-sm opacity-90">Read-only standard library content.</p>
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-2xl font-bold">
              <Package className="h-6 w-6" />
              {entry.name}
            </h3>
            {entry.summary && <p className="mt-2 text-muted-foreground">{entry.summary}</p>}
          </div>
          {entry.description && (
            <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
              {entry.description}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
