import type { Creature, Item } from "../../../types";
import type { CampaignLocation } from "./travelTypes";

export function location(overrides: Partial<CampaignLocation> = {}): CampaignLocation {
  return {
    id: "shop-1",
    campaignId: "campaign-1",
    name: "Copper Kettle",
    locationType: "shop",
    notes: "Copper pots hang from the rafters.",
    publicNotes: "Copper pots hang from the rafters.",
    dmNotes: "",
    tags: ["rumor hub"],
    sortOrder: 0,
    status: "active",
    mapAnchor: {},
    path: [
      { id: "town-1", name: "Brindleford", locationType: "settlement" },
      { id: "shop-1", name: "Copper Kettle", locationType: "shop" },
    ],
    ...overrides,
  };
}

export function creature(overrides: Partial<Creature> = {}): Creature {
  return {
    id: "npc-1",
    name: "Mara Vell",
    description: "Innkeeper and rumormonger.",
    size: "Medium",
    creatureType: "humanoid",
    alignment: "neutral",
    armorClass: 12,
    hitPoints: 9,
    hitDice: "2d8",
    challengeRating: "0",
    xp: 10,
    avatarUrl: "",
    librarySource: "user",
    readOnly: false,
    sourceKey: "",
    sourceLabel: "",
    statBlock: {},
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

export function item(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    name: "Healing Draught",
    category: "Potion",
    itemType: "Consumable",
    rarity: "common",
    attunement: false,
    valueAmount: 50,
    valueUnit: "gp",
    weight: 0,
    description: "A bitter red tonic.",
    properties: [],
    damage: {},
    armorClass: {},
    data: {},
    librarySource: "user",
    readOnly: false,
    sourceKey: "",
    sourceLabel: "",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}
