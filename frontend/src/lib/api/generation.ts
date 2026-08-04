import type {
  EncounterBuilderPreview,
  EncounterBuilderRandomOptions,
} from "../../features/campaigns/encounterBuilderGenerator";
import type { DungeonStudioDocument } from "../../features/campaigns/world/dungeonStudioDocument";
import type { DungeonStudioGeneratorSettings } from "../../features/campaigns/world/dungeonStudioGenerator";
import { request } from "./request";

export const generationApi = {
  previewGeneratedEncounter: (
    campaignId: string,
    payload: {
      options: EncounterBuilderRandomOptions;
      playerIds: string[];
      locationId: string;
      roll: number;
    },
  ) =>
    request<{ preview: EncounterBuilderPreview; previewFingerprint: string }>(
      `/api/campaigns/${campaignId}/generation/encounter-preview`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),
  previewGeneratedDungeon: (campaignId: string, settings: DungeonStudioGeneratorSettings) =>
    request<{ document: DungeonStudioDocument }>(
      `/api/campaigns/${campaignId}/generation/dungeon-preview`,
      {
        method: "POST",
        body: JSON.stringify({ settings }),
      },
    ),
};
