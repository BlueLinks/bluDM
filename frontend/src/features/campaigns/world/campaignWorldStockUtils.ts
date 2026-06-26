import type { Item } from "../../../types";
import type { CampaignLocationStock } from "./travelTypes";

export function availabilityLabel(value: string) {
  return (value || "in-stock").replaceAll("-", " ");
}

export function stockPriceLabel(entry: Pick<CampaignLocationStock, "priceAmount" | "priceUnit">) {
  return entry.priceAmount ? `${entry.priceAmount} ${entry.priceUnit || "gp"}` : "Market";
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
