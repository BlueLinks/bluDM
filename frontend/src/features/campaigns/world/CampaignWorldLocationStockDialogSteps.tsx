import { Check, Plus, Trash2 } from "lucide-react";
import { Button, Field, Input } from "../../../components/ui";
import type { Item } from "../../../types";
import { buildItemDisplay } from "../../items/itemCatalogDisplay";
import { iconForItem, ItemGlyph } from "../../items/itemIcons";
import { AvailabilitySelect, CurrencySelect } from "./CampaignWorldStockFields";
import { stockItemKey } from "./campaignWorldStockUtils";

export type StockDraft = {
  key: string;
  item?: Item;
  customName?: string;
  quantity: string;
  priceAmount: string;
  priceUnit: string;
  availability: string;
  notes: string;
};

export type StockStep = "choose" | "configure" | "review";

export function StepTabs({
  drafts,
  step,
  onStepChange,
}: {
  drafts: StockDraft[];
  step: StockStep;
  onStepChange: (step: StockStep) => void;
}) {
  const steps: Array<{ id: StockStep; label: string; disabled?: boolean }> = [
    { id: "choose", label: "Choose" },
    { id: "configure", label: "Configure", disabled: drafts.length === 0 },
    { id: "review", label: "Review", disabled: drafts.length === 0 },
  ];
  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-md border border-border bg-surface p-1">
      {steps.map((item) => (
        <button
          aria-label={`${item.label} step`}
          className={[
            "rounded px-2 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            step === item.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-surface-foreground hover:bg-card hover:text-foreground",
            item.disabled ? "cursor-not-allowed opacity-50" : "",
          ].join(" ")}
          disabled={item.disabled}
          key={item.id}
          type="button"
          onClick={() => onStepChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function ChooseStockStep({
  customName,
  draftKeys,
  filteredItems,
  itemSearch,
  onAddCustomItem,
  onAddItem,
  onCustomNameChange,
  onItemSearchChange,
}: {
  customName: string;
  draftKeys: Set<string>;
  filteredItems: Item[];
  itemSearch: string;
  onAddCustomItem: () => void;
  onAddItem: (item: Item) => void;
  onCustomNameChange: (name: string) => void;
  onItemSearchChange: (search: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <Field label="Search items">
        <Input
          placeholder="Search by item, type, rarity, or source..."
          value={itemSearch}
          onChange={(event) => onItemSearchChange(event.target.value)}
        />
      </Field>
      <div className="grid max-h-[42vh] gap-2 overflow-auto sm:grid-cols-2">
        {filteredItems.length ? (
          filteredItems.map((item) => {
            const key = stockItemKey(item);
            return (
              <StockCatalogChoice
                added={draftKeys.has(key)}
                item={item}
                key={key}
                onAdd={() => onAddItem(item)}
              />
            );
          })
        ) : (
          <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground sm:col-span-2">
            No matching catalog items.
          </p>
        )}
      </div>
      <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field label="Custom item name">
          <Input
            placeholder="Brass key, local map, suspicious tonic..."
            value={customName}
            onChange={(event) => onCustomNameChange(event.target.value)}
          />
        </Field>
        <Button type="button" icon={Plus} size="sm" variant="secondary" onClick={onAddCustomItem}>
          Add custom
        </Button>
      </div>
    </div>
  );
}

function StockCatalogChoice({
  added,
  item,
  onAdd,
}: {
  added: boolean;
  item: Item;
  onAdd: () => void;
}) {
  const display = buildItemDisplay(item);
  return (
    <button
      className={[
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border bg-surface px-2.5 py-2 text-left transition hover:border-primary/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        added
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border text-surface-foreground",
      ].join(" ")}
      disabled={added}
      type="button"
      onClick={onAdd}
    >
      <ItemGlyph
        className="h-10 w-10 rounded-md border border-tertiary/25 bg-tertiary/10 [&_img]:h-7 [&_img]:w-7 [&_svg]:h-6 [&_svg]:w-6"
        entry={iconForItem(item)}
      />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{item.name}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{display.subtitle}</div>
      </div>
      <div className="grid justify-items-end gap-1">
        <div className="text-sm font-extrabold">{display.value}</div>
        <span className="grid h-6 w-6 place-items-center rounded-md border border-border bg-card text-surface-foreground">
          {added ? (
            <Check className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </span>
      </div>
    </button>
  );
}

export function SelectedStockStrip({
  activeDraftKey,
  drafts,
  onSelect,
}: {
  activeDraftKey: string;
  drafts: StockDraft[];
  onSelect: (key: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {drafts.map((draft) => (
        <button
          className={[
            "min-w-36 rounded-md border px-2 py-1.5 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            activeDraftKey === draft.key
              ? "border-primary bg-primary text-primary-foreground shadow-sm"
              : "border-border bg-surface text-surface-foreground hover:bg-card hover:text-foreground",
          ].join(" ")}
          key={draft.key}
          type="button"
          onClick={() => onSelect(draft.key)}
        >
          <span className="block truncate font-semibold">
            {draft.item?.name ?? draft.customName}
          </span>
          <span className="text-muted-foreground">
            Qty {draft.quantity || 1} · {draft.priceAmount || 0} {draft.priceUnit || "gp"}
          </span>
        </button>
      ))}
    </div>
  );
}

export function ConfigureStockStep({
  activeDraft,
  drafts,
  onBack,
  onRemove,
  onSelectDraft,
  onUpdateDraft,
}: {
  activeDraft?: StockDraft;
  drafts: StockDraft[];
  onBack: () => void;
  onRemove: (key: string) => void;
  onSelectDraft: (key: string) => void;
  onUpdateDraft: (key: string, patch: Partial<StockDraft>) => void;
}) {
  if (!activeDraft) {
    return (
      <div className="grid gap-3 rounded-md border border-dashed border-border bg-surface px-3 py-4 text-sm text-muted-foreground">
        Choose a catalogue item or add a custom item to configure stock details.
        <Button type="button" size="sm" variant="secondary" onClick={onBack}>
          Choose items
        </Button>
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      {drafts.length > 1 ? (
        <div className="grid gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Selected items</span>
          <div className="grid gap-1.5">
            {drafts.map((draft) => (
              <button
                className={[
                  "flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                  activeDraft.key === draft.key
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-surface text-surface-foreground hover:bg-card hover:text-foreground",
                ].join(" ")}
                key={draft.key}
                type="button"
                onClick={() => onSelectDraft(draft.key)}
              >
                <span className="min-w-0 truncate font-semibold">
                  {draft.item?.name ?? draft.customName}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {draft.priceAmount || 0} {draft.priceUnit || "gp"}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <StockDraftEditor
        draft={activeDraft}
        onRemove={() => onRemove(activeDraft.key)}
        onUpdate={(patch) => onUpdateDraft(activeDraft.key, patch)}
      />
      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onBack}>
          Add another
        </Button>
      </div>
    </div>
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
    <div className="grid gap-2.5 rounded-md border border-border bg-background p-2.5">
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

export function StockReview({ drafts }: { drafts: StockDraft[] }) {
  if (!drafts.length) {
    return <p className="text-sm text-muted-foreground">No items ready to add yet.</p>;
  }
  return (
    <div className="grid gap-2">
      {drafts.map((draft) => (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2"
          key={draft.key}
        >
          <div className="min-w-0">
            <div className="font-semibold [overflow-wrap:anywhere]">
              {draft.item?.name ?? draft.customName}
            </div>
            <div className="text-xs text-muted-foreground">
              Qty {draft.quantity || 1} - {draft.availability || "in-stock"}
            </div>
          </div>
          <div className="text-right text-base font-extrabold">
            {draft.priceAmount || 0} {draft.priceUnit || "gp"}
          </div>
        </div>
      ))}
    </div>
  );
}
