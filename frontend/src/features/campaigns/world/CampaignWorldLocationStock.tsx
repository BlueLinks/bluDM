import { Coins, PackageCheck, PackagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ActionRow, CardSection, SectionHeader } from "../../../components/layout";
import { Button, Field, Input, Modal } from "../../../components/ui";
import type { Item } from "../../../types";
import { ItemChipView } from "../../items/ItemCatalogCard";
import { buildItemDisplay } from "../../items/itemCatalogDisplay";
import { iconForItem, itemIconRegistry, ItemGlyph } from "../../items/itemIcons";
import { AddStockModal } from "./CampaignWorldLocationStockDialog";
import { AvailabilitySelect, CurrencySelect } from "./CampaignWorldStockFields";
import {
  availabilityLabel,
  itemCatalogMeta,
  stockEntryItemKey,
  stockItemKey,
  stockPriceLabel,
} from "./campaignWorldStockUtils";
import type { CampaignLocation, CampaignLocationStock } from "./travelTypes";

export function CampaignWorldLocationStock({
  dominant = false,
  items,
  loading,
  location,
  open: controlledOpen,
  pricingOpen: controlledPricingOpen,
  stock,
  onCreate,
  onCustomItemCreated,
  onDelete,
  onOpenChange,
  onPricingOpenChange,
}: {
  dominant?: boolean;
  items: Item[];
  loading: boolean;
  location: CampaignLocation;
  open?: boolean;
  pricingOpen?: boolean;
  stock: CampaignLocationStock[];
  onCreate: (input: LocationStockFormInput) => Promise<void>;
  onCustomItemCreated: (item: Item) => void;
  onDelete: (stockID: string) => Promise<void>;
  onOpenChange?: (open: boolean) => void;
  onPricingOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [uncontrolledPricingOpen, setUncontrolledPricingOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<CampaignLocationStock | null>(null);
  const open = controlledOpen ?? uncontrolledOpen;
  const pricingOpen = controlledPricingOpen ?? uncontrolledPricingOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const setPricingOpen = onPricingOpenChange ?? setUncontrolledPricingOpen;
  const itemByKey = useMemo(
    () => new Map(items.map((item) => [stockItemKey(item), item])),
    [items],
  );

  const pricedCount = stock.filter((entry) => entry.priceAmount > 0).length;
  const marketPriceCount = stock.length - pricedCount;
  const limitedCount = stock.filter((entry) =>
    ["limited", "special-order", "hidden"].includes(entry.availability),
  ).length;
  const soldOutCount = stock.filter((entry) => entry.availability === "sold-out").length;

  return (
    <CardSection className={dominant ? "border-primary/40 bg-primary/5 p-4" : undefined}>
      <SectionHeader
        action={
          <ActionRow justify="end">
            <Button
              type="button"
              icon={Plus}
              size="sm"
              variant="secondary"
              onClick={() => setOpen(true)}
            >
              Add stock
            </Button>
            {stock.length ? (
              <Button
                type="button"
                icon={Coins}
                size="sm"
                variant="secondary"
                onClick={() => setPricingOpen(true)}
              >
                Pricing
              </Button>
            ) : null}
          </ActionRow>
        }
        icon={PackagePlus}
        meta={loading ? "Loading" : stock.length ? `${stock.length} items for sale` : undefined}
        title="Shop stock"
      />

      {dominant && stock.length ? (
        <StockSummaryStrip
          inventoryTotal={stockInventoryTotal(stock)}
          limitedCount={limitedCount}
          marketPriceCount={marketPriceCount}
          pricedCount={pricedCount}
          soldOutCount={soldOutCount}
          stockedCount={stock.length}
        />
      ) : null}

      {stock.length ? (
        <div className={dominant ? "mt-4 grid gap-2" : "mt-3 grid gap-2"}>
          {stock.map((entry) => (
            <StockRow
              entry={entry}
              item={itemByKey.get(stockEntryItemKey(entry))}
              key={entry.id}
              onDelete={onDelete}
              onEdit={setEditingStock}
            />
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          No stock attached to this shop yet.
        </p>
      )}

      <AddStockModal
        items={items}
        location={location}
        open={open}
        onCreate={onCreate}
        onCustomItemCreated={onCustomItemCreated}
        onOpenChange={setOpen}
      />

      <Modal open={pricingOpen} onOpenChange={setPricingOpen} title="Shop pricing">
        <StockPricingList itemByKey={itemByKey} stock={stock} onEdit={setEditingStock} />
      </Modal>

      <AdjustStockModal
        entry={editingStock}
        item={editingStock ? itemByKey.get(stockEntryItemKey(editingStock)) : undefined}
        onCreate={onCreate}
        onOpenChange={(open) => !open && setEditingStock(null)}
      />
    </CardSection>
  );
}

function StockSummaryStrip({
  inventoryTotal,
  limitedCount,
  marketPriceCount,
  pricedCount,
  soldOutCount,
  stockedCount,
}: {
  inventoryTotal: number;
  limitedCount: number;
  marketPriceCount: number;
  pricedCount: number;
  soldOutCount: number;
  stockedCount: number;
}) {
  const stats = [
    { label: "Stocked", value: stockedCount, tone: "strong" as const },
    { label: "Inventory", value: inventoryTotal, tone: "strong" as const },
    ...(pricedCount ? [{ label: "Priced", value: pricedCount }] : []),
    ...(marketPriceCount ? [{ label: "Market price", value: marketPriceCount }] : []),
    ...(limitedCount
      ? [{ label: "Limited/hidden", value: limitedCount, tone: "warn" as const }]
      : []),
    ...(soldOutCount ? [{ label: "Sold out", value: soldOutCount, tone: "warn" as const }] : []),
  ];

  return (
    <div className="mt-3 flex flex-wrap gap-2 rounded-md border border-border bg-background/70 p-2">
      {stats.map((stat) => (
        <StockSummaryPill key={stat.label} {...stat} />
      ))}
    </div>
  );
}

function StockSummaryPill({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "default" | "strong" | "warn";
  value: number;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-bold uppercase leading-none",
        tone === "strong"
          ? "border-primary/25 bg-primary/10 text-primary"
          : tone === "warn"
            ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200"
            : "border-border bg-card text-muted-foreground",
      ].join(" ")}
    >
      <strong className="text-sm leading-none text-foreground">{value}</strong>
      {label}
    </span>
  );
}

function StockRow({
  entry,
  item,
  onDelete,
  onEdit,
}: {
  entry: CampaignLocationStock;
  item?: Item;
  onDelete: (stockID: string) => Promise<void>;
  onEdit: (entry: CampaignLocationStock) => void;
}) {
  const display = item ? buildItemDisplay(item) : undefined;
  const chips = display?.chips.slice(0, 2) ?? [];

  return (
    <article className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <ItemGlyph
          className="h-8 w-8 rounded-md [&_img]:h-4 [&_img]:w-4 [&_svg]:h-4 [&_svg]:w-4"
          entry={item ? iconForItem(item) : itemIconRegistry.unknown}
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <h4 className="font-semibold leading-tight [overflow-wrap:anywhere]">
              {item?.name ?? "Unknown item"}
            </h4>
            <AvailabilityChip availability={entry.availability} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-bold uppercase tracking-wide [overflow-wrap:anywhere]">
              {display?.subtitle ?? itemCatalogMeta(item)}
            </span>
            <StockMetric label="Price" value={stockPriceLabel(entry)} tone="price" />
            <StockMetric label="Qty" value={String(entry.quantity)} />
            {display && display.value !== "n/a" ? (
              <StockMetric label="Catalog" value={display.value} />
            ) : null}
            {chips.map((chip) => (
              <ItemChipView chip={chip} key={chip.label} />
            ))}
          </div>
          {entry.notes ? (
            <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
              {entry.notes}
            </p>
          ) : null}
        </div>
      </div>
      <ActionRow justify="end" className="w-full sm:w-auto">
        <Button type="button" icon={Pencil} size="sm" variant="ghost" onClick={() => onEdit(entry)}>
          Adjust
        </Button>
        <Button
          type="button"
          icon={Trash2}
          size="sm"
          variant="ghost"
          onClick={() => onDelete(entry.id)}
        >
          Remove
        </Button>
      </ActionRow>
    </article>
  );
}

function AvailabilityChip({ availability }: { availability: string }) {
  const normalized = availability || "in-stock";
  return (
    <span
      className={[
        "shrink-0 rounded-full border px-2 py-0.5 text-[0.68rem] font-bold uppercase",
        normalized === "sold-out"
          ? "border-destructive/25 bg-destructive/10 text-destructive"
          : ["limited", "special-order", "hidden"].includes(normalized)
            ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200"
            : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
      ].join(" ")}
    >
      {availabilityLabel(normalized)}
    </span>
  );
}

function StockMetric({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "default" | "price";
  value: string;
}) {
  const isPrice = tone === "price";
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 leading-tight",
        isPrice
          ? "border-amber-500/35 bg-amber-500/15 text-xs shadow-sm shadow-amber-500/10"
          : "border-border bg-card text-[0.7rem]",
      ].join(" ")}
    >
      <span
        className={[
          "font-extrabold uppercase tracking-wide",
          isPrice ? "text-amber-700 dark:text-amber-200" : "text-muted-foreground",
        ].join(" ")}
      >
        {label}
      </span>
      <strong className={isPrice ? "text-sm text-amber-800 dark:text-amber-100" : undefined}>
        {value}
      </strong>
    </span>
  );
}

function StockPricingList({
  itemByKey,
  stock,
  onEdit,
}: {
  itemByKey: Map<string, Item>;
  stock: CampaignLocationStock[];
  onEdit: (entry: CampaignLocationStock) => void;
}) {
  return (
    <div className="grid gap-4">
      {stock.length ? (
        stock.map((entry) => {
          const item = itemByKey.get(stockEntryItemKey(entry));
          return (
            <div className="rounded-md border border-border bg-background px-3 py-2" key={entry.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{item?.name ?? "Unknown item"}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Qty {entry.quantity} - {availabilityLabel(entry.availability)}
                  </p>
                </div>
                <ActionRow justify="end">
                  <span className="rounded-full border border-border px-2 py-1 text-sm font-extrabold uppercase text-foreground">
                    {stockPriceLabel(entry)}
                  </span>
                  <Button
                    type="button"
                    icon={Pencil}
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(entry)}
                  >
                    Adjust
                  </Button>
                </ActionRow>
              </div>
              {entry.notes ? (
                <p className="mt-2 text-sm text-muted-foreground">{entry.notes}</p>
              ) : null}
            </div>
          );
        })
      ) : (
        <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          No stock attached to this shop yet.
        </p>
      )}
    </div>
  );
}

function AdjustStockModal({
  entry,
  item,
  onCreate,
  onOpenChange,
}: {
  entry: CampaignLocationStock | null;
  item?: Item;
  onCreate: (input: LocationStockFormInput) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const [priceAmount, setPriceAmount] = useState("0");
  const [priceUnit, setPriceUnit] = useState("gp");
  const [availability, setAvailability] = useState("in-stock");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!entry) return;
    setQuantity(String(entry.quantity || 1));
    setPriceAmount(String(entry.priceAmount || 0));
    setPriceUnit(entry.priceUnit || "gp");
    setAvailability(entry.availability || "in-stock");
    setNotes(entry.notes || "");
    setError("");
  }, [entry]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!entry) return;
    setSaving(true);
    setError("");
    try {
      await onCreate({
        locationId: entry.locationId,
        itemId: entry.itemId,
        librarySource: entry.librarySource,
        quantity: Math.max(Number.parseInt(quantity, 10) || 1, 1),
        priceAmount: Math.max(Number.parseInt(priceAmount, 10) || 0, 0),
        priceUnit,
        availability,
        notes: notes.trim(),
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update shop stock");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={Boolean(entry)} onOpenChange={onOpenChange} title="Adjust shop stock">
      {entry ? (
        <form className="grid gap-4" onSubmit={submit}>
          <div className="rounded-md border border-border bg-card px-3 py-2">
            <h4 className="font-semibold">{item?.name ?? "Unknown item"}</h4>
            <p className="text-sm text-muted-foreground">{itemCatalogMeta(item)}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Qty">
              <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </Field>
            <Field label="Price">
              <Input value={priceAmount} onChange={(event) => setPriceAmount(event.target.value)} />
            </Field>
            <CurrencySelect value={priceUnit} onChange={setPriceUnit} />
            <AvailabilitySelect value={availability} onChange={setAvailability} />
          </div>
          <Field label="Stock notes">
            <Input
              placeholder="Behind the counter, illegal, restocks weekly..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
          {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
          <ActionRow justify="end">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" icon={PackageCheck} disabled={saving}>
              Update stock
            </Button>
          </ActionRow>
        </form>
      ) : null}
    </Modal>
  );
}

function stockInventoryTotal(stock: CampaignLocationStock[]) {
  return stock.reduce((sum, entry) => sum + Math.max(entry.quantity || 0, 0), 0);
}

export type LocationStockFormInput = {
  locationId: string;
  itemId: string;
  librarySource: "user" | "standard";
  quantity: number;
  priceAmount: number;
  priceUnit: string;
  availability: string;
  notes: string;
};
