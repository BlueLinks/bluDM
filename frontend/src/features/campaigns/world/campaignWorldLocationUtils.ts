import type { CampaignLocation } from "./travelTypes";

export function locationPathLabel(location: CampaignLocation) {
  if (!location.path?.length) return location.name;
  return location.path.map((segment) => segment.name).join(" / ");
}
