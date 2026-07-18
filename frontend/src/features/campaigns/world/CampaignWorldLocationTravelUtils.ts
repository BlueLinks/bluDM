import { locationPathLabel } from "./campaignWorldLocationUtils";
import type { CampaignJourney, CampaignLocation, CampaignLocationLink } from "./travelTypes";

export function journeyInvolvesLocation(
  journey: CampaignJourney,
  location: CampaignLocation,
  childLocations: CampaignLocation[],
) {
  const labels = [
    location.name,
    locationPathLabel(location),
    ...childLocations.flatMap((child) => [child.name, locationPathLabel(child)]),
  ]
    .filter(Boolean)
    .map((label) => label.toLowerCase());
  const route = `${journey.origin} ${journey.destination} ${journey.name}`.toLowerCase();
  return labels.some((label) => label && route.includes(label));
}

export function travelLikeLinks(links: CampaignLocationLink[]) {
  return links.some((link) => ["road", "route", "trail", "path", "gate"].includes(link.linkType));
}
