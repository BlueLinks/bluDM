import type { Creature, Encounter, Item } from "../../../types";
import { locationPathLabel } from "./campaignWorldLocationUtils";
import type {
  CampaignLocation,
  CampaignLocationStock,
  CampaignNpcLocationLink,
} from "./travelTypes";

export type WorldRelationshipFilter = "" | "has-stock" | "has-npc" | "has-encounter";

export type WorldSearchFilters = {
  query: string;
  relationship: WorldRelationshipFilter;
  tag: string;
  type: string;
};

export function filterWorldLocations(
  locations: CampaignLocation[],
  filters: WorldSearchFilters,
  context: {
    encounters: Encounter[];
    npcs: Creature[];
    npcLinks: CampaignNpcLocationLink[];
    stock: CampaignLocationStock[];
    stockItems: Item[];
  },
) {
  const query = normalizeSearch(filters.query);
  const itemByKey = new Map(
    context.stockItems.map((item) => [`${item.librarySource}:${item.id}`, item]),
  );
  const npcByID = new Map(context.npcs.map((npc) => [npc.id, npc]));

  return locations.filter((location) => {
    const locationNpcLinks = context.npcLinks.filter((link) => link.locationId === location.id);
    const locationStock = context.stock.filter((entry) => entry.locationId === location.id);
    const locationEncounters = context.encounters.filter(
      (encounter) => encounter.locationId === location.id,
    );
    if (filters.type && location.locationType !== filters.type) return false;
    if (filters.tag && !(location.tags ?? []).includes(filters.tag)) return false;
    if (filters.relationship === "has-stock" && !locationStock.length) return false;
    if (filters.relationship === "has-npc" && !locationNpcLinks.length) return false;
    if (filters.relationship === "has-encounter" && !locationEncounters.length) return false;
    if (!query) return true;

    const haystack = [
      location.name,
      location.locationType,
      location.customTypeLabel,
      location.summary,
      location.notes,
      location.publicNotes,
      location.dmNotes,
      locationPathLabel(location),
      ...(location.tags ?? []),
      ...locationNpcLinks.flatMap((link) => [
        link.linkType,
        link.notes,
        npcByID.get(link.creatureId)?.name ?? "",
      ]),
      ...locationStock.flatMap((entry) => [
        entry.availability,
        entry.notes,
        itemByKey.get(`${entry.librarySource}:${entry.itemId}`)?.name ?? "",
      ]),
      ...locationEncounters.flatMap((encounter) => [
        encounter.name,
        encounter.status,
        encounter.location,
        encounter.roomNumber,
      ]),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function locationTypeOptions(locations: CampaignLocation[]) {
  return sortedUnique(locations.map((location) => location.locationType).filter(isPresentString));
}

export function locationTagOptions(locations: CampaignLocation[]) {
  return sortedUnique(locations.flatMap((location) => location.tags ?? []));
}

function sortedUnique(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function isPresentString(value: string | undefined): value is string {
  return Boolean(value);
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}
