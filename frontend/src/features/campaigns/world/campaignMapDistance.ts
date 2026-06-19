import type { CampaignMap, CampaignMapDistanceUnit, CampaignMapPin } from "./travelTypes";

export function pixelDistance(a: CampaignMapPin, b: CampaignMapPin) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function realMapDistance(map: CampaignMap, a: CampaignMapPin, b: CampaignMapPin) {
  return pixelDistance(a, b) * map.scaleDistancePerPixel;
}

export function travelCompatibleDistance(distance: number, unit: CampaignMapDistanceUnit) {
  if (unit === "feet") return { distance: distance / 5280, unit: "miles" as const };
  if (unit === "kilometres") return { distance, unit: "kilometers" as const };
  if (unit === "kilometers") return { distance, unit: "kilometers" as const };
  return { distance, unit: "miles" as const };
}

export function formatMapDistance(distance: number, unit: CampaignMapDistanceUnit) {
  const rounded =
    distance >= 10 ? Math.round(distance * 10) / 10 : Math.round(distance * 100) / 100;
  return `${rounded.toLocaleString()} ${unit}`;
}
