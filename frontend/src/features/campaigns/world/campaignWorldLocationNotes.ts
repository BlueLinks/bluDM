import { api } from "../../../lib/api";
import type { CampaignLocation, CampaignLocationInput } from "./travelTypes";

export async function clearCampaignLocationNotes(
  campaignId: string,
  location: CampaignLocation,
  onChanged: () => Promise<void>,
) {
  const payload = locationInputFromLocation(location, {
    notes: "",
    publicNotes: "",
    dmNotes: "",
  });
  await api.updateCampaignLocation(campaignId, location.id, payload);
  await onChanged();
}

function locationInputFromLocation(
  location: CampaignLocation,
  overrides: Partial<CampaignLocationInput>,
): CampaignLocationInput {
  return {
    parentLocationId: location.parentLocationId,
    name: location.name,
    locationType: location.locationType,
    customTypeLabel: location.customTypeLabel,
    summary: location.summary,
    notes: location.notes,
    publicNotes: location.publicNotes,
    dmNotes: location.dmNotes,
    tags: location.tags,
    sortOrder: location.sortOrder,
    status: location.status,
    mapAnchor: location.mapAnchor,
    ...overrides,
  };
}
