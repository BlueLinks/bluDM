import type { CampaignLocation } from "./travelTypes";

export type LocationProfile = "container" | "shop" | "room";
export type ContainerVariant = "region" | "town" | "dungeon" | "floor";

export type LocationProfileInfo = {
  profile: LocationProfile;
  variant?: ContainerVariant;
  label: string;
  badge: string;
  primaryActions: Array<
    | "add-town"
    | "add-landmark"
    | "add-building"
    | "add-shop"
    | "add-floor"
    | "add-room"
    | "add-stock"
    | "add-encounter"
    | "link-exit"
    | "open-map"
  >;
  showMapCard: boolean;
  compactMap: boolean;
  travel: "always" | "relevant" | "hidden";
  childTitle: string;
  childEmpty: string;
  notesTitle: string;
};

const regionTypes = new Set([
  "world",
  "continent",
  "kingdom",
  "empire",
  "nation",
  "province",
  "region",
  "territory",
  "wilderness",
  "biome",
  "plane",
  "landmark",
]);

const townTypes = new Set([
  "settlement",
  "city",
  "town",
  "village",
  "hamlet",
  "district",
  "neighborhood",
  "ward",
  "camp",
  "outpost",
]);

const dungeonTypes = new Set([
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

const floorTypes = new Set([
  "floor",
  "level",
  "dungeon-level",
  "basement",
  "upper-floor",
  "sublevel",
]);

const shopTypes = new Set([
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

const roomTypes = new Set([
  "room",
  "chamber",
  "corridor",
  "hall",
  "cave-room",
  "dungeon-area",
  "zone",
]);

export function locationProfile(location: CampaignLocation): LocationProfileInfo {
  const type = normalizedType(location);
  if (shopTypes.has(type)) {
    return {
      profile: "shop",
      label: "Shop",
      badge: "Shop profile",
      primaryActions: ["add-stock"],
      showMapCard: false,
      compactMap: true,
      travel: "hidden",
      childTitle: "Child areas",
      childEmpty: "No child areas attached to this shop.",
      notesTitle: "Merchant notes",
    };
  }
  if (roomTypes.has(type)) {
    return {
      profile: "room",
      label: "Room",
      badge: "Room profile",
      primaryActions: ["add-encounter", "link-exit"],
      showMapCard: false,
      compactMap: true,
      travel: "hidden",
      childTitle: "Child areas",
      childEmpty: "No child areas attached to this room.",
      notesTitle: "Room notes",
    };
  }
  if (floorTypes.has(type)) {
    return containerProfile("floor");
  }
  if (dungeonTypes.has(type)) {
    return containerProfile("dungeon");
  }
  if (townTypes.has(type)) {
    return containerProfile("town");
  }
  if (regionTypes.has(type) || !type || type === "custom") {
    return containerProfile("region");
  }
  return containerProfile("region");
}

function containerProfile(variant: ContainerVariant): LocationProfileInfo {
  if (variant === "town") {
    return {
      profile: "container",
      variant,
      label: "Town",
      badge: "Town container",
      primaryActions: ["add-building", "add-shop"],
      showMapCard: true,
      compactMap: false,
      travel: "always",
      childTitle: "Buildings, shops, and important places",
      childEmpty: "No buildings, shops, or important places yet.",
      notesTitle: "Notes",
    };
  }
  if (variant === "dungeon") {
    return {
      profile: "container",
      variant,
      label: "Dungeon",
      badge: "Dungeon container",
      primaryActions: ["add-floor", "add-room"],
      showMapCard: true,
      compactMap: false,
      travel: "relevant",
      childTitle: "Floors and rooms",
      childEmpty: "No floors or rooms yet.",
      notesTitle: "Notes",
    };
  }
  if (variant === "floor") {
    return {
      profile: "container",
      variant,
      label: "Floor",
      badge: "Floor container",
      primaryActions: ["add-room", "open-map"],
      showMapCard: true,
      compactMap: false,
      travel: "hidden",
      childTitle: "Rooms",
      childEmpty: "No rooms on this floor yet.",
      notesTitle: "Notes",
    };
  }
  return {
    profile: "container",
    variant,
    label: "Region",
    badge: "Region container",
    primaryActions: ["add-town", "add-landmark"],
    showMapCard: true,
    compactMap: false,
    travel: "always",
    childTitle: "Child settlements and landmarks",
    childEmpty: "No settlements or landmarks yet.",
    notesTitle: "Notes",
  };
}

function normalizedType(location: CampaignLocation) {
  return (location.locationType || location.customTypeLabel || "custom")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "-");
}

export function defaultTypeForProfileAction(action: LocationProfileInfo["primaryActions"][number]) {
  switch (action) {
    case "add-town":
      return "settlement";
    case "add-landmark":
      return "landmark";
    case "add-building":
      return "building";
    case "add-shop":
      return "shop";
    case "add-floor":
      return "floor";
    case "add-room":
      return "room";
    default:
      return "room";
  }
}

export function labelForProfileAction(action: LocationProfileInfo["primaryActions"][number]) {
  switch (action) {
    case "add-town":
      return "Add Town";
    case "add-landmark":
      return "Add Landmark";
    case "add-building":
      return "Add Building";
    case "add-shop":
      return "Add Shop";
    case "add-floor":
      return "Add Floor";
    case "add-room":
      return "Add Room";
    case "add-stock":
      return "Add Stock";
    case "add-encounter":
      return "Add Encounter";
    case "link-exit":
      return "Link Exit";
    case "open-map":
      return "Open Map";
  }
}
