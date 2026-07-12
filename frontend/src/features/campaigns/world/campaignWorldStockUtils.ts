import type { Item } from "../../../types";
import type { CampaignLocationStock } from "./travelTypes";

export function availabilityLabel(value: string) {
  return (value || "in-stock").replaceAll("-", " ");
}

export function stockPriceLabel(entry: Pick<CampaignLocationStock, "priceAmount" | "priceUnit">) {
  return entry.priceAmount ? `${entry.priceAmount} ${entry.priceUnit || "gp"}` : "Market";
}

export function stockMarkupLabel(entry: CampaignLocationStock, item?: Item) {
  if (!item?.valueAmount || !entry.priceAmount || item.valueUnit !== entry.priceUnit)
    return "Rule —";
  const percent = Math.round(((entry.priceAmount - item.valueAmount) / item.valueAmount) * 100);
  if (percent === 0) return "At value";
  return percent > 0 ? `+${percent}%` : `${percent}%`;
}

export function stockItemKey(item?: Item) {
  return item ? `${item.librarySource}:${item.id}` : "";
}

export function stockEntryItemKey(entry: Pick<CampaignLocationStock, "librarySource" | "itemId">) {
  return `${entry.librarySource}:${entry.itemId}`;
}

export function itemCatalogMeta(item?: Item) {
  if (!item) return "Unknown catalog item";
  return [item.category, item.itemType, item.rarity].filter(Boolean).join(" · ") || "Catalog item";
}
