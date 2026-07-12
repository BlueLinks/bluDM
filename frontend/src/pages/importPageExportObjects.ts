import { api } from "../lib/api";
import type { ImportExportBundleType } from "../lib/api/importExport";
import type { ExportObjectChoice } from "./ImportPageSupport";

export async function exportObjectChoices(
  bundleType: ImportExportBundleType,
  campaignIDs: string[],
): Promise<ExportObjectChoice[]> {
  switch (bundleType) {
    case "npc":
      return npcChoices();
    case "player":
      return playerChoices();
    case "item":
      return itemChoices();
    case "spell":
      return spellChoices();
    case "encounter":
      return encounterChoices(campaignIDs);
    case "map":
      return mapChoices(campaignIDs);
    case "journey":
      return journeyChoices(campaignIDs);
    case "roll-table":
      return rollTableChoices(campaignIDs);
    case "shop":
    case "dungeon":
      return locationKindChoices(bundleType, campaignIDs);
    default:
      return [];
  }
}

async function npcChoices(): Promise<ExportObjectChoice[]> {
  const { creatures } = await api.creatures({ includeUser: true, includeStandard: false });
  return creatures
    .filter((creature) => creature.librarySource === "user")
    .map((creature) => ({
      id: creature.id,
      label: creature.name,
      detail: [creature.creatureType, creature.challengeRating && `CR ${creature.challengeRating}`]
        .filter(Boolean)
        .join(" · "),
    }));
}

async function playerChoices(): Promise<ExportObjectChoice[]> {
  const { players } = await api.players();
  return players.map((player) => ({
    id: player.id,
    label: player.characterName,
    detail: player.campaignName ? `Campaign: ${player.campaignName}` : player.playerName,
  }));
}

async function itemChoices(): Promise<ExportObjectChoice[]> {
  const { items } = await api.items({ includeUser: true, includeStandard: false });
  return items.map((item) => ({
    id: item.id,
    label: item.name,
    detail: [item.category, item.rarity].filter(Boolean).join(" · "),
  }));
}

async function spellChoices(): Promise<ExportObjectChoice[]> {
  const { spells } = await api.spells({ includeUser: true, includeStandard: false });
  return spells.map((spell) => ({
    id: spell.id,
    label: spell.name,
    detail: [spell.level === 0 ? "Cantrip" : `Level ${spell.level}`, spell.school]
      .filter(Boolean)
      .join(" · "),
  }));
}

async function encounterChoices(campaignIDs: string[]): Promise<ExportObjectChoice[]> {
  const details = await Promise.all(campaignIDs.map((campaignID) => api.campaign(campaignID)));
  return details.flatMap(({ campaign, encounters }) =>
    encounters.map((encounter) => ({
      id: encounter.id,
      label: encounter.name,
      detail: `Campaign: ${campaign.name}`,
    })),
  );
}

async function mapChoices(campaignIDs: string[]): Promise<ExportObjectChoice[]> {
  const details = await Promise.all(
    campaignIDs.map(async (campaignID) => {
      const [campaignPayload, mapsPayload] = await Promise.all([
        api.campaign(campaignID),
        api.campaignMaps(campaignID),
      ]);
      return { campaign: campaignPayload.campaign, maps: mapsPayload.maps };
    }),
  );
  return details.flatMap(({ campaign, maps }) =>
    maps.map((map) => ({
      id: map.id,
      label: map.name,
      detail: `Campaign: ${campaign.name}`,
    })),
  );
}

async function journeyChoices(campaignIDs: string[]): Promise<ExportObjectChoice[]> {
  const details = await Promise.all(
    campaignIDs.map(async (campaignID) => {
      const [campaignPayload, journeysPayload] = await Promise.all([
        api.campaign(campaignID),
        api.campaignJourneys(campaignID),
      ]);
      return { campaign: campaignPayload.campaign, journeys: journeysPayload.journeys };
    }),
  );
  return details.flatMap(({ campaign, journeys }) =>
    journeys.map((journey) => ({
      id: journey.id,
      label: journey.name,
      detail: `${journey.origin} to ${journey.destination} · ${campaign.name}`,
    })),
  );
}

async function rollTableChoices(campaignIDs: string[]): Promise<ExportObjectChoice[]> {
  const details = await Promise.all(
    campaignIDs.map(async (campaignID) => {
      const [campaignPayload, tablesPayload] = await Promise.all([
        api.campaign(campaignID),
        api.campaignRollTables(campaignID),
      ]);
      return { campaign: campaignPayload.campaign, tables: tablesPayload.tables };
    }),
  );
  return details.flatMap(({ campaign, tables }) =>
    tables
      .filter((table) => table.source === "campaign")
      .map((table) => ({
        id: table.id,
        label: table.name,
        detail: `${table.dieExpression} · ${campaign.name}`,
      })),
  );
}

async function locationKindChoices(
  bundleType: "shop" | "dungeon",
  campaignIDs: string[],
): Promise<ExportObjectChoice[]> {
  const details = await Promise.all(
    campaignIDs.map(async (campaignID) => {
      const [campaignPayload, locationsPayload] = await Promise.all([
        api.campaign(campaignID),
        api.campaignLocations(campaignID),
      ]);
      return { campaign: campaignPayload.campaign, locations: locationsPayload.locations };
    }),
  );
  const allowed = bundleType === "shop" ? shopLocationTypes : dungeonLocationTypes;
  return details.flatMap(({ campaign, locations }) =>
    locations
      .filter((location) => allowed.has((location.locationType ?? "").trim().toLowerCase()))
      .map((location) => ({
        id: location.id,
        label: location.name,
        detail: `Campaign: ${campaign.name}`,
      })),
  );
}

const shopLocationTypes = new Set([
  "shop",
  "market",
  "vendor",
  "merchant",
  "blacksmith",
  "apothecary",
  "general-store",
  "armoury",
  "armory",
  "potion-store",
  "tavern",
  "inn",
  "magic-shop",
  "black-market",
  "stable",
]);

const dungeonLocationTypes = new Set([
  "dungeon",
  "lair",
  "cave",
  "mine",
  "tomb",
  "crypt",
  "ruin-interior",
  "fortress-interior",
  "stronghold-dungeon",
]);
