import { Plus, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ActionRow, FieldGrid, ResponsiveGrid, SidebarDetailLayout } from "../../components/layout";
import { ContentSourceFilter } from "../../components/shared/ContentSourceFilter";
import { InfoHelpButton } from "../../components/shared/InfoHelpButton";
import { StandardSourceToggles } from "../../components/shared/StandardSourceToggles";
import {
  Button,
  Callout,
  FloatingInput,
  MutedPanel,
  Page,
  PageHeader,
  Select,
} from "../../components/ui";
import { api } from "../../lib/api";
import type { Item } from "../../types";
import { ItemFormModal } from "./ItemFormModal";
import { ItemCatalogCard } from "./ItemCatalogCard";
import { itemSearchText } from "./itemCatalogDisplay";
import { itemCategoryOptions } from "./itemFormOptions";
import { ItemPreviewModal } from "./ItemPreviewModal";

export function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [showUser, setShowUser] = useState(true);
  const [showStandard, setShowStandard] = useState(true);
  const [sources, setSources] = useState(["srd-2014", "srd-5-2-1"]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<Item | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadItems = () => {
    setLoading(true);
    setError("");
    api
      .items({
        includeUser: showUser,
        includeStandard: showStandard,
        source: showStandard ? sources : [],
        q: search.trim(),
      })
      .then((payload) => setItems(payload.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load items"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
  }, [search, showStandard, showUser, sources]);

  const categoryOptions = useMemo(() => {
    const categories = Array.from(
      new Set([
        ...itemCategoryOptions.map((option) => option.value),
        ...items.map((item) => item.category).filter(Boolean),
      ]),
    );
    return [
      { value: "", label: "All categories" },
      ...categories.sort().map((value) => ({ value, label: value })),
    ];
  }, [items]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const key = item.category || "Equipment";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const categories = new Set([
      ...itemCategoryOptions.map((option) => option.value),
      ...Array.from(counts.keys()),
    ]);
    return Array.from(categories)
      .sort((left, right) => left.localeCompare(right))
      .map((label) => [label, counts.get(label) ?? 0] as const);
  }, [items]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (category && item.category !== category) return false;
      if (!query) return true;
      return itemSearchText(item).includes(query);
    });
  }, [category, items, search]);

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const saveItem = async (form: Parameters<typeof api.createItem>[0]) => {
    if (editing) {
      await api.updateItem(editing.id, form);
    } else {
      await api.createItem(form);
    }
    closeForm();
    loadItems();
  };

  const cloneItem = async (item: Item) => {
    try {
      const payload = await api.cloneItem(item.id, item.librarySource);
      setPreview(payload.item);
      loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clone item");
    }
  };

  const deleteItem = async (item: Item) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    try {
      await api.deleteItem(item.id);
      if (preview?.id === item.id) setPreview(null);
      loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete item");
    }
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Items"
        title="Items and equipment"
        copy="Browse SRD equipment alongside custom table items. Standard items stay read-only; clone one when your campaign needs its own version."
        action={
          <ActionRow>
            <InfoHelpButton title="Catalog foundation">
              <p>
                This catalog is the base layer for player inventories, encounter rewards, material
                components, ration tracking, and shops.
              </p>
            </InfoHelpButton>
            <Button icon={Plus} onClick={() => setCreating(true)}>
              New item
            </Button>
          </ActionRow>
        }
      />
      {error && <Callout tone="danger">{error}</Callout>}
      <ContentSourceFilter
        showStandard={showStandard}
        showUser={showUser}
        standardCopy="Read-only SRD equipment"
        userCopy="Custom items and cloned equipment"
        onShowStandardChange={setShowStandard}
        onShowUserChange={setShowUser}
      />
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <FieldGrid className="border-b border-border bg-background p-3" variant="itemSearch">
          <FloatingInput icon={Search} label="Search items" value={search} onChange={setSearch} />
          <Select
            value={category}
            placeholder="Category"
            options={categoryOptions}
            onValueChange={setCategory}
          />
        </FieldGrid>
        {showStandard && (
          <div className="border-b border-border bg-background px-3 py-2">
            <StandardSourceToggles selected={sources} onChange={setSources} />
          </div>
        )}
        <SidebarDetailLayout variant="catalog">
          <aside className="grid content-start gap-4 border-b border-border bg-muted/35 p-3 lg:border-b-0 lg:border-r">
            <FilterGroup title="Category">
              <FilterButton
                active={category === ""}
                count={items.length}
                label="All categories"
                onClick={() => setCategory("")}
              />
              {categoryCounts.map(([label, count]) => (
                <FilterButton
                  key={label}
                  active={category === label}
                  count={count}
                  label={label}
                  onClick={() => setCategory(label)}
                />
              ))}
            </FilterGroup>
          </aside>
          <div className="grid min-w-0 gap-3 p-3">
            {loading && <MutedPanel>Loading item catalog...</MutedPanel>}
            {!loading && visibleItems.length === 0 && (
              <MutedPanel>No items match the current filters.</MutedPanel>
            )}
            {!loading && visibleItems.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"} across
                  SRD and custom catalog entries
                </span>
                <span className="font-medium">
                  {category || "All categories"} · {showStandard ? "SRD on" : "SRD off"} ·{" "}
                  {showUser ? "Custom on" : "Custom off"}
                </span>
              </div>
            )}
            <ResponsiveGrid variant="cards3">
              {visibleItems.map((item) => (
                <ItemCatalogCard
                  key={`${item.librarySource}-${item.id}`}
                  item={item}
                  onPreview={setPreview}
                  onEdit={setEditing}
                  onClone={cloneItem}
                  onDelete={deleteItem}
                />
              ))}
            </ResponsiveGrid>
          </div>
        </SidebarDetailLayout>
      </section>
      <ItemPreviewModal
        item={preview}
        onClose={() => setPreview(null)}
        onClone={cloneItem}
        onEdit={setEditing}
        onDelete={deleteItem}
      />
      <ItemFormModal
        open={creating || Boolean(editing)}
        item={editing}
        onClose={closeForm}
        onSave={saveItem}
      />
    </Page>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid content-start gap-2">
      <h3 className="text-[0.72rem] font-extrabold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="grid auto-rows-min gap-1.5">{children}</div>
    </div>
  );
}

function FilterButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={[
        "flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left text-sm font-semibold transition",
        active
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-transparent text-muted-foreground hover:border-border hover:bg-card",
      ].join(" ")}
      type="button"
      onClick={onClick}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span className="rounded-full bg-card px-2 py-0.5 text-[0.68rem]">{count}</span>
    </button>
  );
}
