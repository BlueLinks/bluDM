import type {
  RollTable,
  RollTableFormState,
  RollTableRollResult,
} from "../../features/campaigns/rollTableTypes";
import { request } from "./request";

function rollTablePayload(payload: RollTableFormState) {
  return {
    name: payload.name,
    description: payload.description,
    category: payload.category,
    tags: payload.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    dieExpression: payload.dieExpression,
    rows: payload.rows.map((row) => ({
      minRoll: Number(row.minRoll) || 0,
      maxRoll: Number(row.maxRoll) || 0,
      label: row.label,
      resultText: row.resultText,
      notes: row.notes,
    })),
  };
}

export const rollTableApi = {
  campaignRollTables: (campaignId: string) =>
    request<{ tables: RollTable[] }>(`/api/campaigns/${campaignId}/roll-tables`),
  createCampaignRollTable: (campaignId: string, payload: RollTableFormState) =>
    request<{ table: RollTable }>(`/api/campaigns/${campaignId}/roll-tables`, {
      method: "POST",
      body: JSON.stringify(rollTablePayload(payload)),
    }),
  updateCampaignRollTable: (campaignId: string, tableId: string, payload: RollTableFormState) =>
    request<{ table: RollTable }>(`/api/campaigns/${campaignId}/roll-tables/${tableId}`, {
      method: "PUT",
      body: JSON.stringify(rollTablePayload(payload)),
    }),
  deleteCampaignRollTable: (campaignId: string, tableId: string) =>
    request<void>(`/api/campaigns/${campaignId}/roll-tables/${tableId}`, { method: "DELETE" }),
  cloneCampaignRollTable: (campaignId: string, tableId: string) =>
    request<{ table: RollTable }>(`/api/campaigns/${campaignId}/roll-tables/${tableId}/clone`, {
      method: "POST",
    }),
  rollCampaignRollTable: (campaignId: string, tableId: string) =>
    request<{ roll: RollTableRollResult }>(
      `/api/campaigns/${campaignId}/roll-tables/${tableId}/roll`,
      { method: "POST" },
    ),
};
