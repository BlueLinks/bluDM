import { Coins, PackagePlus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ActionRow, CardSection, SectionHeader } from "../../../components/layout";
import { Button, Modal } from "../../../components/ui";
import type { Item } from "../../../types";
import { AddStockModal } from "./CampaignWorldLocationStockDialog";
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
  const open = controlledOpen ?? uncontrolledOpen;
  const pricingOpen = controlledPricingOpen ?? uncontrolledPricingOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const setPricingOpen = onPricingOpenChange ?? setUncontrolledPricingOpen;
  const itemByKey = useMemo(
    () => new Map(items.map((item) => [stockItemKey(item), item])),
    [items],
  );

  const pricedCount = stock.filter((entry) => entry.priceAmount > 0).length;
  const limitedCount = stock.filter((entry) => entry.availability !== "common").length;

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
        meta={loading ? "Loading" : `${stock.length} stocked`}
        title="Shop stock"
      />

      {dominant ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <StockStat label="Stocked" value={stock.length} />
          <StockStat label="Priced" value={pricedCount} />
          <StockStat label="Limited/rare" value={limitedCount} />
        </div>
      ) : null}

      {stock.length ? (
        <div className={dominant ? "mt-4 grid gap-2" : "mt-3 grid gap-2"}>
          {stock.map((entry) => (
            <StockRow
              entry={entry}
              item={itemByKey.get(`${entry.librarySource}:${entry.itemId}`)}
              key={entry.id}
              onDelete={onDelete}
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
        <StockPricingList itemByKey={itemByKey} stock={stock} />
      </Modal>
    </CardSection>
  );
}

function StockStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-xs font-bold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function StockRow({
  entry,
  item,
  onDelete,
}: {
  entry: CampaignLocationStock;
  item?: Item;
  onDelete: (stockID: string) => Promise<void>;
}) {
  const price = entry.priceAmount ? `${entry.priceAmount} ${entry.priceUnit || "gp"}` : "Market";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold">{item?.name ?? "Unknown item"}</span>
          <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[0.68rem] font-bold uppercase text-muted-foreground">
            {entry.availability.replaceAll("-", " ")}
          </span>
        </div>
        <div className="mt-1 text-base font-bold text-foreground">{price}</div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          Qty {entry.quantity}
          {entry.notes ? ` - ${entry.notes}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          icon={Trash2}
          size="sm"
          variant="ghost"
          onClick={() => onDelete(entry.id)}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

function StockPricingList({
  itemByKey,
  stock,
}: {
  itemByKey: Map<string, Item>;
  stock: CampaignLocationStock[];
}) {
  return (
    <div className="grid gap-4">
      {stock.length ? (
        stock.map((entry) => {
          const item = itemByKey.get(`${entry.librarySource}:${entry.itemId}`);
          const price = entry.priceAmount
            ? `${entry.priceAmount} ${entry.priceUnit || "gp"}`
            : "Market";
          return (
            <div className="rounded-md border border-border bg-background px-3 py-2" key={entry.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{item?.name ?? "Unknown item"}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Qty {entry.quantity} - {entry.availability.replaceAll("-", " ")}
                  </p>
                </div>
                <span className="rounded-full border border-border px-2 py-1 text-sm font-extrabold uppercase text-foreground">
                  {price}
                </span>
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

function stockItemKey(item?: Item) {
  return item ? `${item.librarySource}:${item.id}` : "";
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
