import type { CampaignLocation, CampaignMapDistanceUnit, CampaignMapType } from "./travelTypes";

export type CampaignMapDefaultConfig = {
  width: number;
  height: number;
  scaleDistancePerPixel: number;
  scaleDistanceUnit: CampaignMapDistanceUnit;
  gridMajorEvery: number;
  scaleDescription: string;
};

const mapDefaults: Record<CampaignMapType, CampaignMapDefaultConfig> = {
  world: {
    width: 1200,
    height: 800,
    scaleDistancePerPixel: 5,
    scaleDistanceUnit: "miles",
    gridMajorEvery: 100,
    scaleDescription: "Large overland map: 100 px is about 500 miles.",
  },
  region: {
    width: 1000,
    height: 700,
    scaleDistancePerPixel: 0.5,
    scaleDistanceUnit: "miles",
    gridMajorEvery: 100,
    scaleDescription: "Regional travel map: 100 px is about 50 miles.",
  },
  settlement: {
    width: 900,
    height: 650,
    scaleDistancePerPixel: 5,
    scaleDistanceUnit: "feet",
    gridMajorEvery: 50,
    scaleDescription: "Town map: 50 px is about 250 feet, useful for streets and buildings.",
  },
  dungeon: {
    width: 800,
    height: 600,
    scaleDistancePerPixel: 5,
    scaleDistanceUnit: "feet",
    gridMajorEvery: 50,
    scaleDescription: "Dungeon overview: 10 px is about one 5-foot square.",
  },
  floor: {
    width: 700,
    height: 500,
    scaleDistancePerPixel: 5,
    scaleDistanceUnit: "feet",
    gridMajorEvery: 50,
    scaleDescription: "Dungeon floor: 10 px is about one 5-foot square.",
  },
  custom: {
    width: 800,
    height: 600,
    scaleDistancePerPixel: 5,
    scaleDistanceUnit: "feet",
    gridMajorEvery: 50,
    scaleDescription: "Custom local map: starts at a small tactical scale.",
  },
};

export function mapTypeForLocation(
  location: Pick<CampaignLocation, "locationType">,
): CampaignMapType {
  const type = location.locationType;
  if (type === "region") return "region";
  if (type === "settlement" || type === "town" || type === "city") return "settlement";
  if (type === "dungeon") return "dungeon";
  if (type === "floor" || type === "room") return "floor";
  if (type === "landmark") return "region";
  return "custom";
}

export function mapDefaultsForType(mapType: CampaignMapType) {
  return mapDefaults[mapType] ?? mapDefaults.custom;
}

export function mapDefaultsForLocation(location: Pick<CampaignLocation, "locationType">) {
  return mapDefaultsForType(mapTypeForLocation(location));
}
