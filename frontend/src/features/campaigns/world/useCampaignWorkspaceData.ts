import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import type { CampaignDetail } from "../../../types";
import type { CampaignJourney, CampaignLocation } from "./travelTypes";

export function useCampaignWorkspaceData(campaignID?: string) {
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [locations, setLocations] = useState<CampaignLocation[]>([]);
  const [journeys, setJourneys] = useState<CampaignJourney[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadCampaign() {
    if (!campaignID) return;
    setLoading(true);
    setError("");
    try {
      const [campaignDetail, locationPayload, journeyPayload] = await Promise.all([
        api.campaign(campaignID),
        api.campaignLocations(campaignID),
        api.campaignJourneys(campaignID),
      ]);
      setDetail({ ...campaignDetail, locationCount: locationPayload.locations.length });
      setLocations(locationPayload.locations);
      setJourneys(journeyPayload.journeys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load campaign");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCampaign();
  }, [campaignID]);

  return {
    detail,
    error,
    journeys,
    loading,
    locations,
    loadCampaign,
    setDetail,
    setError,
  };
}
