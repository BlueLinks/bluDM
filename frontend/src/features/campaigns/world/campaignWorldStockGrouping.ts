import type { Item } from "../../../types";
import { stockEntryItemKey } from "./campaignWorldStockUtils";
import type { CampaignLocationStock } from "./travelTypes";

export function groupStockByCategory(stock: CampaignLocationStock[], itemByKey: Map<string, Item>) {
  const groups = new Map<string, CampaignLocationStock[]>();
  for (const entry of stock) {
    const item = itemByKey.get(stockEntryItemKey(entry));
    const label = item?.category || "Uncategorized";
    groups.set(label, [...(groups.get(label) ?? []), entry]);
  }
  return [...groups.entries()].map(([label, entries]) => ({ label, entries }));
}
