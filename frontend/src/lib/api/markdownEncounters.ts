import type { Encounter } from "../../types";
import { request } from "./request";

export type MarkdownCombatantResolution = {
  name: string;
  side: "player" | "friendly" | "enemy";
  quantity: number;
  source: string;
  resolvedId?: string;
  armorClass: number;
  hitPoints: number;
  rolledHp: boolean;
};

export type MarkdownEncounterChange = {
  blockId: string;
  line: number;
  name: string;
  description: string;
  status: string;
  location: string;
  locationId?: string;
  room: string;
  loot: string;
  operation: "create" | "update";
  existingEncounterId?: string;
  combatants: MarkdownCombatantResolution[];
  warnings: string[];
  errors: string[];
};

export type MarkdownEncounterPreview = {
  sourcePath: string;
  canImport: boolean;
  encounters: MarkdownEncounterChange[];
};

export type MarkdownEncounterImport = {
  encounters: Encounter[];
  operations: Array<"create" | "update">;
};

type MarkdownEncounterPayload = {
  markdown: string;
  sourcePath: string;
};

export const markdownEncounterApi = {
  previewMarkdownEncounters: (campaignId: string, payload: MarkdownEncounterPayload) =>
    request<{ preview: MarkdownEncounterPreview }>(
      `/api/campaigns/${campaignId}/encounters/markdown/preview`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),
  importMarkdownEncounters: (campaignId: string, payload: MarkdownEncounterPayload) =>
    request<{ import: MarkdownEncounterImport; preview: MarkdownEncounterPreview }>(
      `/api/campaigns/${campaignId}/encounters/markdown/import`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),
  encounterMarkdownUrl: (encounterId: string) =>
    `/api/encounters/${encodeURIComponent(encounterId)}/markdown`,
};
