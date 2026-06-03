import type { CampaignJourney, TravelFormState } from "../../features/campaigns/travelTypes";
import { request } from "./request";

export const journeyApi = {
  campaignJourneys: (campaignId: string) =>
    request<{ journeys: CampaignJourney[] }>(`/api/campaigns/${campaignId}/journeys`),
  createCampaignJourney: (campaignId: string, payload: TravelFormState, name: string) =>
    request<{ journey: CampaignJourney }>(`/api/campaigns/${campaignId}/journeys`, {
      method: "POST",
      body: JSON.stringify(journeyPayload(payload, name)),
    }),
  updateCampaignJourney: (
    campaignId: string,
    journeyId: string,
    payload: TravelFormState,
    name: string,
  ) =>
    request<{ journey: CampaignJourney }>(`/api/campaigns/${campaignId}/journeys/${journeyId}`, {
      method: "PUT",
      body: JSON.stringify(journeyPayload(payload, name)),
    }),
  deleteCampaignJourney: (campaignId: string, journeyId: string) =>
    request<void>(`/api/campaigns/${campaignId}/journeys/${journeyId}`, { method: "DELETE" }),
  cloneCampaignJourney: (campaignId: string, journeyId: string) =>
    request<{ journey: CampaignJourney }>(
      `/api/campaigns/${campaignId}/journeys/${journeyId}/clone`,
      { method: "POST" },
    ),
};

function journeyPayload(payload: TravelFormState, name: string) {
  return {
    name,
    origin: payload.origin,
    destination: payload.destination,
    distance: Number(payload.distance) || 0,
    distanceUnit: payload.distanceUnit,
    terrain: payload.terrain,
    pace: payload.pace,
    goodRoads: payload.goodRoads,
    encounterDistanceFeet: payload.encounterDistanceFeet,
    weather: {
      temperature: payload.weather.temperature,
      temperatureDeltaF: payload.weather.temperatureDeltaF,
      wind: payload.weather.wind,
      precipitation: payload.weather.precipitation,
    },
    routeInputMode: payload.routeInputMode,
  };
}
