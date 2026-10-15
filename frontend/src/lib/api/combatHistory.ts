import type { EncounterRun } from "../../types";
import { request } from "./request";

export type EncounterRunTurn = {
  combatantId: string;
  round: number;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  completed: boolean;
};

export type CombatHistoryEntry = {
  id: string;
  encounterId: string;
  encounterName: string;
  status: string;
  isTest: boolean;
  startedAt: string;
  endedAt?: string;
  rounds: number;
  damageDone: number;
  healingDone: number;
  activeTimeMs: number | null;
};

export type CombatReport = {
  run: EncounterRun;
  campaignId: string;
  encounterName: string;
};

export const combatHistoryApi = {
  combatHistory: (
    campaignId: string,
    options: { q: string; includeTests: boolean; page: number; status?: string },
  ) => {
    const params = new URLSearchParams({
      q: options.q,
      includeTests: String(options.includeTests),
      page: String(options.page),
    });
    if (options.status) params.set("status", options.status);
    return request<{ runs: CombatHistoryEntry[]; total: number }>(
      `/api/campaigns/${campaignId}/combat-history?${params}`,
    );
  },
  combatReport: (runId: string) => request<CombatReport>(`/api/encounter-runs/${runId}/report`),
};
