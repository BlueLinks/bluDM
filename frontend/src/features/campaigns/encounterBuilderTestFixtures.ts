import type { Creature, Encounter } from "../../types";

export function creature(overrides: Partial<Creature> = {}): Creature {
  return {
    id: "goblin",
    name: "Goblin",
    description: "A small monster.",
    size: "Small",
    creatureType: "goblinoid",
    alignment: "neutral evil",
    armorClass: 15,
    hitPoints: 7,
    hitDice: "2d6",
    challengeRating: "1/4",
    xp: 50,
    avatarUrl: "",
    librarySource: "standard",
    readOnly: true,
    sourceKey: "srd-2014",
    sourceLabel: "SRD 2014",
    statBlock: {},
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

export function encounter(overrides: Partial<Encounter> = {}): Encounter {
  return {
    id: "encounter-1",
    campaignId: "campaign-1",
    name: "Encounter at Copper Kettle",
    description: "",
    status: "planned",
    location: "Brindleford / Copper Kettle",
    locationId: "shop-1",
    roomNumber: "",
    lootNotes: "",
    combatantCount: 0,
    enemyCount: 0,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}
