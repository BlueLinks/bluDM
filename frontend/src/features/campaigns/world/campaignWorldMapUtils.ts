import type { CampaignLocation, CampaignMap, CampaignMapPin } from "./travelTypes";

export type MapPinSummary = {
  placedLocationIds: string[];
  totalPins: number;
};

export function candidateLocationsForMap(map: CampaignMap, locations: CampaignLocation[]) {
  if (!map.parentLocationId) return locations.filter((location) => !location.parentLocationId);
  return locations.filter((location) => location.parentLocationId === map.parentLocationId);
}

export function summarizePins(pins: CampaignMapPin[]): MapPinSummary {
  return {
    placedLocationIds: pins.map((pin) => pin.locationId),
    totalPins: pins.length,
  };
}
