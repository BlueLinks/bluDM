import type {
  ActionFormState,
  ActionTemplate,
  ActionTemplateUsage,
  CreatureAction,
} from "../../types";
import { actionPayload } from "./payloads";
import { request } from "./request";

export const actionTemplateApi = {
  actionTemplates: () => request<{ actionTemplates: ActionTemplate[] }>("/api/action-templates"),
  actionTemplateConflict: (name: string) => {
    const params = new URLSearchParams({ name });
    return request<{
      conflict: boolean;
      actionTemplate?: { id: string; name: string };
    }>(`/api/action-templates/conflicts?${params.toString()}`);
  },
  actionTemplateUsage: (id: string) =>
    request<{ usage: ActionTemplateUsage[]; count: number }>(`/api/action-templates/${id}/usage`),
  deleteActionTemplate: (id: string) =>
    request<{ usage: ActionTemplateUsage[]; removedCreatureActions: number }>(
      `/api/action-templates/${id}`,
      { method: "DELETE" },
    ),
  createActionTemplate: (payload: ActionFormState) =>
    request<{ actionTemplate: ActionTemplate }>("/api/action-templates", {
      method: "POST",
      body: JSON.stringify(actionPayload(payload)),
    }),
  createActionTemplateFromCreatureAction: (creatureActionId: string, name: string) =>
    request<{ actionTemplate: ActionTemplate }>("/api/action-templates/from-creature-action", {
      method: "POST",
      body: JSON.stringify({ creatureActionId, name }),
    }),
  updateActionTemplate: (id: string, payload: ActionFormState) =>
    request<{ actionTemplate: ActionTemplate }>(`/api/action-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(actionPayload(payload)),
    }),
  overwriteActionTemplateFromCreatureAction: (id: string, creatureActionId: string, name: string) =>
    request<{ actionTemplate: ActionTemplate }>(
      `/api/action-templates/${id}/from-creature-action`,
      {
        method: "PUT",
        body: JSON.stringify({ creatureActionId, name }),
      },
    ),
  updateCreatureActionSourceTemplate: (
    creatureId: string,
    actionId: string,
    sourceTemplateId: string,
  ) =>
    request<{ action: CreatureAction }>(
      `/api/library/creatures/${creatureId}/actions/${actionId}/source-template`,
      {
        method: "PATCH",
        body: JSON.stringify({ sourceTemplateId }),
      },
    ),
};
