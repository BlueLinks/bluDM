import { PackagePlus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Button, Field, Input, Modal } from "../../../components/ui";
import { api } from "../../../lib/api";
import type { Item } from "../../../types";
import { ItemCatalogCompactCard } from "../../items/ItemCatalogCard";
import { blankItemForm } from "../../items/itemFormState";
import { AvailabilitySelect, CurrencySelect } from "./CampaignWorldStockFields";
import { stockItemKey } from "./campaignWorldStockUtils";
import type { CampaignLocation } from "./travelTypes";

type LocationStockFormInput = {
  locationId: string;
  itemId: string;
  librarySource: "user" | "standard";
  quantity: number;
  priceAmount: number;
  priceUnit: string;
  availability: string;
  notes: string;
};

type StockDraft = {
  key: string;
  item?: Item;
  customName?: string;
  quantity: string;
  priceAmount: string;
  priceUnit: string;
  availability: string;
  notes: string;
};

export function AddStockModal({
  items,
  location,
  open,
  onCreate,
  onCustomItemCreated,
  onOpenChange,
}: {
  items: Item[];
  location: CampaignLocation;
  open: boolean;
  onCreate: (input: LocationStockFormInput) => Promise<void>;
  onCustomItemCreated: (item: Item) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [itemSearch, setItemSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [drafts, setDrafts] = useState<StockDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const filteredItems = useMemo(() => filterStockItems(items, itemSearch), [itemSearch, items]);
  const draftKeys = useMemo(() => new Set(drafts.map((draft) => draft.key)), [drafts]);

  function addCatalogItem(item: Item) {
    const key = stockItemKey(item);
    if (draftKeys.has(key)) return;
    setDrafts((current) => [...current, draftFromItem(item)]);
  }

  function addCustomItem() {
    const name = customName.trim();
    if (!name) return;
    setDrafts((current) => [...current, draftFromCustomName(name)]);
    setCustomName("");
  }

  function updateDraft(key: string, patch: Partial<StockDraft>) {
    setDrafts((current) =>
      current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)),
    );
  }

  async function submitStock(event: FormEvent) {
    event.preventDefault();
    if (!drafts.length) return;
    setSaving(true);
    setError("");
    try {
      for (const draft of drafts) {
        const item = draft.item ?? (await createCustomStockItem(draft));
        if (!draft.item) onCustomItemCreated(item);
        await onCreate({
          locationId: location.id,
          itemId: item.id,
          librarySource: item.librarySource,
          quantity: Math.max(Number.parseInt(draft.quantity, 10) || 1, 1),
          priceAmount: Math.max(Number.parseInt(draft.priceAmount, 10) || 0, 0),
          priceUnit: draft.priceUnit,
          availability: draft.availability,
          notes: draft.notes.trim(),
        });
      }
      setDrafts([]);
      setItemSearch("");
      setCustomName("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save shop stock");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Add shop stock">
      <form className="grid gap-4" onSubmit={submitStock}>
        <div className="grid gap-3 rounded-md border border-border bg-card p-3">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Search items" className="min-w-0 flex-1">
              <Input
                placeholder="Search by item, type, rarity, or source..."
                value={itemSearch}
                onChange={(event) => setItemSearch(event.target.value)}
              />
            </Field>
          </div>
          <div className="grid max-h-72 gap-2 overflow-auto pr-1">
            {filteredItems.length ? (
              filteredItems.map((item) => {
                const key = stockItemKey(item);
                const added = draftKeys.has(key);
                return (
                  <ItemCatalogCompactCard
                    item={item}
                    key={key}
                    action={
                      <Button
                        type="button"
                        icon={Plus}
                        size="sm"
                        variant={added ? "ghost" : "secondary"}
                        disabled={added}
                        onClick={() => addCatalogItem(item)}
                      >
                        {added ? "Added" : "Add"}
                      </Button>
                    }
                  />
                );
              })
            ) : (
              <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                No matching catalog items.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-3 rounded-md border border-border bg-card p-3">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Custom item name" className="min-w-0 flex-1">
              <Input
                placeholder="e.g. Brass key, local map, suspicious tonic..."
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
              />
            </Field>
            <Button type="button" icon={Plus} variant="secondary" onClick={addCustomItem}>
              Add custom item
            </Button>
          </div>
        </div>

        <div className="grid gap-3">
          <div>
            <h4 className="font-semibold">Stock to add</h4>
            <p className="text-sm text-muted-foreground">
              Add one or more items, then adjust quantity, price, and availability before saving.
            </p>
          </div>
          {drafts.length ? (
            drafts.map((draft) => (
              <StockDraftEditor
                draft={draft}
                key={draft.key}
                onRemove={() =>
                  setDrafts((current) => current.filter((entry) => entry.key !== draft.key))
                }
                onUpdate={(patch) => updateDraft(draft.key, patch)}
              />
            ))
          ) : (
            <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
              No items selected yet. Use Add beside a catalog item, or create a custom item above.
            </p>
          )}
        </div>

        {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" icon={PackagePlus} disabled={saving || !drafts.length}>
            Add {drafts.length || ""} stock {drafts.length === 1 ? "item" : "items"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function StockDraftEditor({
  draft,
  onRemove,
  onUpdate,
}: {
  draft: StockDraft;
  onRemove: () => void;
  onUpdate: (patch: Partial<StockDraft>) => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h5 className="font-semibold">{draft.item?.name ?? draft.customName}</h5>
          <p className="text-xs text-muted-foreground">
            {draft.item ? "Catalog item" : "Custom shop item"}
          </p>
        </div>
        <Button type="button" icon={Trash2} size="sm" variant="ghost" onClick={onRemove}>
          Remove
        </Button>
      </div>
      {!draft.item ? (
        <Field label="Name">
          <Input
            value={draft.customName ?? ""}
            onChange={(event) => onUpdate({ customName: event.target.value })}
          />
        </Field>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[5rem_7rem_7rem_1fr]">
        <Field label="Qty">
          <Input
            value={draft.quantity}
            onChange={(event) => onUpdate({ quantity: event.target.value })}
          />
        </Field>
        <Field label="Price">
          <Input
            value={draft.priceAmount}
            onChange={(event) => onUpdate({ priceAmount: event.target.value })}
          />
        </Field>
        <CurrencySelect value={draft.priceUnit} onChange={(priceUnit) => onUpdate({ priceUnit })} />
        <AvailabilitySelect
          value={draft.availability}
          onChange={(availability) => onUpdate({ availability })}
        />
      </div>
      <Field label="Stock notes">
        <Input
          placeholder="Behind the counter, illegal, restocks weekly..."
          value={draft.notes}
          onChange={(event) => onUpdate({ notes: event.target.value })}
        />
      </Field>
    </div>
  );
}

function filterStockItems(items: Item[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return items.slice(0, 8);
  return items
    .filter((item) =>
      [item.name, item.category, item.itemType, item.rarity, item.librarySource]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
    .slice(0, 8);
}

function draftFromItem(item: Item): StockDraft {
  return {
    key: stockItemKey(item),
    item,
    quantity: "1",
    priceAmount: String(item.valueAmount || 0),
    priceUnit: item.valueUnit || "gp",
    availability: "in-stock",
    notes: "",
  };
}

function draftFromCustomName(name: string): StockDraft {
  return {
    key: stockDraftKey(),
    customName: name,
    quantity: "1",
    priceAmount: "0",
    priceUnit: "gp",
    availability: "in-stock",
    notes: "",
  };
}

function stockDraftKey() {
  return `custom:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

async function createCustomStockItem(draft: StockDraft) {
  const { item } = await api.createItem({
    ...blankItemForm,
    name: draft.customName?.trim() || "Custom shop item",
    valueAmount: draft.priceAmount,
    valueUnit: draft.priceUnit,
    description: draft.notes.trim(),
  });
  return item;
}
