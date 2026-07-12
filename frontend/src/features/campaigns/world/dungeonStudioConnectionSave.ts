import { api } from "../../../lib/api";
import { planStudioRoomConnectionSync } from "./dungeonStudioConnectionSync";
import type { DungeonStudioDocument } from "./dungeonStudioDocument";

export async function syncStudioRoomConnectionLinks({
  campaignId,
  document,
  mapId,
  onChanged,
}: {
  campaignId: string;
  document: DungeonStudioDocument;
  mapId: string;
  onChanged: () => Promise<void>;
}) {
  const { links } = await api.campaignLocationLinks(campaignId);
  const plan = planStudioRoomConnectionSync({ document, links, mapId });
  for (const link of plan.deleteLinks) {
    await api.deleteCampaignLocationLink(campaignId, link.id);
  }
  for (const payload of plan.createLinks) {
    await api.createCampaignLocationLink(campaignId, payload);
  }
  if (plan.deleteLinks.length || plan.createLinks.length) await onChanged();
}
