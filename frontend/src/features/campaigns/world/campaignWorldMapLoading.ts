import { api } from "../../../lib/api";
import type { CampaignMap } from "./travelTypes";

export async function loadCampaignWorldMaps(
  campaignId: string,
  setMaps: (maps: CampaignMap[]) => void,
  setMapsError: (error: string) => void,
  setMapsLoading: (loading: boolean) => void,
) {
  setMapsLoading(true);
  setMapsError("");
  try {
    const { maps } = await api.campaignMaps(campaignId);
    setMaps(maps);
  } catch (err) {
    setMapsError(err instanceof Error ? err.message : "Could not load campaign maps");
  } finally {
    setMapsLoading(false);
  }
}
