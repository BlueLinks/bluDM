import type { LocationProfileInfo } from "./locationProfiles";
import type { CampaignLocation } from "./travelTypes";

export function studioPathForLocation(
  campaignId: string,
  location: CampaignLocation,
  parentLocation: CampaignLocation | undefined,
  profile: LocationProfileInfo,
) {
  if (profile.variant === "dungeon" || profile.variant === "floor") {
    return `/campaigns/${campaignId}/world/location/${location.id}/studio`;
  }
  if (
    profile.profile === "room" &&
    parentLocation &&
    ["dungeon", "floor"].includes(parentLocation.locationType ?? "")
  ) {
    return `/campaigns/${campaignId}/world/location/${parentLocation.id}/studio`;
  }
  return undefined;
}

export function explorationProfile(profile: LocationProfileInfo) {
  return profile.profile === "room" || profile.variant === "dungeon" || profile.variant === "floor";
}
