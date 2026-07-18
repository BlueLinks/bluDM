import type {
  CampaignLocation,
  CampaignLocationInput,
  CampaignLocationLink,
  CampaignLocationLinkInput,
  CampaignLocationStock,
  CampaignLocationStockInput,
  CampaignMap,
  CampaignMapDistance,
  CampaignMapInput,
  CampaignMapPin,
  CampaignMapPinInput,
  CampaignNpcLocationLink,
  CampaignNpcLocationLinkInput,
  TravelCalculation,
  TravelFormState,
  TravelWeatherRollRequest,
} from "../../features/campaigns/world/travelTypes";
import { request } from "./request";

export const campaignWorldApi = {
  campaignLocations: (campaignId: string) =>
    request<{ locations: CampaignLocation[] }>(`/api/campaigns/${campaignId}/locations`),
  createCampaignLocation: (campaignId: string, payload: CampaignLocationInput) =>
    request<{ location: CampaignLocation }>(`/api/campaigns/${campaignId}/locations`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCampaignLocation: (
    campaignId: string,
    locationId: string,
    payload: CampaignLocationInput,
  ) =>
    request<{ location: CampaignLocation }>(
      `/api/campaigns/${campaignId}/locations/${locationId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    ),
  deleteCampaignLocation: (campaignId: string, locationId: string) =>
    request<void>(`/api/campaigns/${campaignId}/locations/${locationId}`, { method: "DELETE" }),
  campaignLocationLinks: (campaignId: string) =>
    request<{ links: CampaignLocationLink[] }>(`/api/campaigns/${campaignId}/location-links`),
  createCampaignLocationLink: (campaignId: string, payload: CampaignLocationLinkInput) =>
    request<{ link: CampaignLocationLink }>(`/api/campaigns/${campaignId}/location-links`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteCampaignLocationLink: (campaignId: string, linkId: string) =>
    request<void>(`/api/campaigns/${campaignId}/location-links/${linkId}`, {
      method: "DELETE",
    }),
  campaignNpcLocationLinks: (campaignId: string) =>
    request<{ links: CampaignNpcLocationLink[] }>(
      `/api/campaigns/${campaignId}/npc-location-links`,
    ),
  createCampaignNpcLocationLink: (campaignId: string, payload: CampaignNpcLocationLinkInput) =>
    request<{ link: CampaignNpcLocationLink }>(`/api/campaigns/${campaignId}/npc-location-links`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteCampaignNpcLocationLink: (campaignId: string, linkId: string) =>
    request<void>(`/api/campaigns/${campaignId}/npc-location-links/${linkId}`, {
      method: "DELETE",
    }),
  campaignLocationStock: (campaignId: string) =>
    request<{ stock: CampaignLocationStock[] }>(`/api/campaigns/${campaignId}/location-stock`),
  upsertCampaignLocationStock: (campaignId: string, payload: CampaignLocationStockInput) =>
    request<{ stock: CampaignLocationStock }>(`/api/campaigns/${campaignId}/location-stock`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteCampaignLocationStock: (campaignId: string, stockId: string) =>
    request<void>(`/api/campaigns/${campaignId}/location-stock/${stockId}`, {
      method: "DELETE",
    }),
  campaignMaps: (campaignId: string, parentLocationId?: string) => {
    const params = new URLSearchParams();
    if (parentLocationId) params.set("parentLocationId", parentLocationId);
    const query = params.toString();
    return request<{ maps: CampaignMap[] }>(
      `/api/campaigns/${campaignId}/maps${query ? `?${query}` : ""}`,
    );
  },
  createCampaignMap: (campaignId: string, payload: CampaignMapInput) =>
    request<{ map: CampaignMap }>(`/api/campaigns/${campaignId}/maps`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCampaignMap: (campaignId: string, mapId: string, payload: CampaignMapInput) =>
    request<{ map: CampaignMap }>(`/api/campaigns/${campaignId}/maps/${mapId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteCampaignMap: (campaignId: string, mapId: string) =>
    request<void>(`/api/campaigns/${campaignId}/maps/${mapId}`, { method: "DELETE" }),
  campaignMapPins: (campaignId: string, mapId: string) =>
    request<{ pins: CampaignMapPin[] }>(`/api/campaigns/${campaignId}/maps/${mapId}/pins`),
  createCampaignMapPin: (campaignId: string, mapId: string, payload: CampaignMapPinInput) =>
    request<{ pin: CampaignMapPin }>(`/api/campaigns/${campaignId}/maps/${mapId}/pins`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCampaignMapPin: (
    campaignId: string,
    mapId: string,
    pinId: string,
    payload: CampaignMapPinInput,
  ) =>
    request<{ pin: CampaignMapPin }>(`/api/campaigns/${campaignId}/maps/${mapId}/pins/${pinId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteCampaignMapPin: (campaignId: string, mapId: string, pinId: string) =>
    request<void>(`/api/campaigns/${campaignId}/maps/${mapId}/pins/${pinId}`, {
      method: "DELETE",
    }),
  campaignMapDistance: (
    campaignId: string,
    mapId: string,
    originLocationId: string,
    targetLocationId: string,
  ) => {
    const params = new URLSearchParams({ originLocationId, targetLocationId });
    return request<{ distance: CampaignMapDistance }>(
      `/api/campaigns/${campaignId}/maps/${mapId}/distance?${params.toString()}`,
    );
  },
  calculateTravel: (
    campaignId: string,
    payload: TravelFormState,
    rollWeather: TravelWeatherRollRequest = {
      temperature: false,
      wind: false,
      precipitation: false,
    },
    rollEncounterDistance = false,
  ) =>
    request<{ calculation: TravelCalculation }>(`/api/campaigns/${campaignId}/travel/calculate`, {
      method: "POST",
      body: JSON.stringify(travelPayload(payload, rollWeather, rollEncounterDistance)),
    }),
};

function travelPayload(
  payload: TravelFormState,
  rollWeather: TravelWeatherRollRequest,
  rollEncounterDistance: boolean,
) {
  const routeMode = payload.routeInputMode === "distance" ? "distance" : "route";
  return {
    ...payload,
    origin: routeMode === "route" ? payload.origin : "",
    destination: routeMode === "route" ? payload.destination : "",
    distance: Number(payload.distance) || 0,
    encounterDistanceFeet: payload.encounterDistanceFeet,
    routeInputMode: routeMode,
    rollEncounterDistance,
    rollWeather,
  };
}
