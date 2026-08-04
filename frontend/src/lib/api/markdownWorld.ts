import type { CampaignLocation, CampaignMap } from "../../features/campaigns/world/travelTypes";
import type { Creature } from "../../types";
import { request } from "./request";

export type MarkdownAssetPayload = {
  path: string;
  filename: string;
  contentType: string;
  dataBase64: string;
};

export type MarkdownWorldNPCChange = {
  blockId: string;
  line: number;
  name: string;
  operation: "create" | "update";
  existingCreatureId?: string;
  location?: string;
  locationId?: string;
  avatarPath?: string;
  warnings: string[];
  errors: string[];
};

export type MarkdownDungeonMapChange = {
  name: string;
  kind: "dungeon-studio" | "image";
  roomCount: number;
  imagePath?: string;
};

export type MarkdownDungeonChange = {
  blockId: string;
  line: number;
  name: string;
  operation: "create" | "update";
  existingLocationId?: string;
  parentLocation?: string;
  parentLocationId?: string;
  floorCount: number;
  maps: MarkdownDungeonMapChange[];
  warnings: string[];
  errors: string[];
};

export type MarkdownWorldPreview = {
  sourcePath: string;
  canImport: boolean;
  npcs: MarkdownWorldNPCChange[];
  dungeons: MarkdownDungeonChange[];
};

export type MarkdownWorldImport = {
  npcs: Array<{ creature: Creature; operation: "create" | "update" }>;
  dungeons: Array<{
    location: CampaignLocation;
    mapIds: CampaignMap["id"][];
    operation: "create" | "update";
  }>;
};

export type MarkdownWorldPayload = {
  markdown: string;
  sourcePath: string;
  assets?: MarkdownAssetPayload[];
};

export const markdownWorldApi = {
  previewMarkdownWorld: (campaignId: string, payload: MarkdownWorldPayload) =>
    request<{ preview: MarkdownWorldPreview }>(
      `/api/campaigns/${campaignId}/content/markdown/preview`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),
  importMarkdownWorld: (campaignId: string, payload: MarkdownWorldPayload) =>
    request<{ import: MarkdownWorldImport; preview: MarkdownWorldPreview }>(
      `/api/campaigns/${campaignId}/content/markdown/import`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),
};
