import type { EncounterRun, EncounterRunCombatant, RollMode } from "../../types";
import { request } from "./request";

export type RollTableResolutionPayload = {
  targetId: string;
  rollId: string;
  mode: "auto" | "entered";
  roll: number;
  followUpRolls: number[];
  saveResult: "manual" | "failed" | "success";
};

export const encounterRunApi = {
  encounterRun: (id: string) => request<{ run: EncounterRun }>(`/api/encounter-runs/${id}`),
  rollInitiative: (runId: string, sides: string[]) =>
    request<{ run: EncounterRun }>(`/api/encounter-runs/${runId}/commands/roll-initiative`, {
      method: "POST",
      body: JSON.stringify({ sides }),
    }),
  setInitiative: (runId: string, combatantId: string, initiative: number | null) =>
    request<{ run: EncounterRun }>(`/api/encounter-runs/${runId}/commands/set-initiative`, {
      method: "POST",
      body: JSON.stringify({ combatantId, initiative }),
    }),
  clearInitiative: (runId: string) =>
    request<{ run: EncounterRun }>(`/api/encounter-runs/${runId}/commands/clear-initiative`, {
      method: "POST",
    }),
  reorderInitiative: (runId: string, combatantIds: string[]) =>
    request<{ run: EncounterRun }>(`/api/encounter-runs/${runId}/commands/reorder-initiative`, {
      method: "POST",
      body: JSON.stringify({ combatantIds }),
    }),
  beginEncounterRun: (runId: string) =>
    request<{ run: EncounterRun }>(`/api/encounter-runs/${runId}/commands/begin`, {
      method: "POST",
    }),
  moveTurn: (runId: string, direction: "next" | "previous") =>
    request<{ run: EncounterRun }>(`/api/encounter-runs/${runId}/commands/${direction}-turn`, {
      method: "POST",
    }),
  manualHP: (
    runId: string,
    payload: {
      actorId?: string;
      targetId: string;
      amount: number;
      mode: string;
      damageType?: string;
    },
  ) =>
    request<{ run: EncounterRun }>(`/api/encounter-runs/${runId}/commands/manual-hp`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  applyResolution: (runId: string, resolution: unknown) =>
    request<{ run: EncounterRun; result: Record<string, unknown> }>(
      `/api/encounter-runs/${runId}/commands/apply-resolution`,
      { method: "POST", body: JSON.stringify(resolution) },
    ),
  addRunCombatants: (
    runId: string,
    payload: {
      creatureId?: string;
      standardCreatureId?: string;
      side: "friendly" | "enemy";
      quantity: number;
      rolledHp: boolean;
      initiative?: number;
      initiativeSet?: boolean;
      displayName?: string;
      colorLabel?: string;
      avatarUrl?: string;
    },
  ) =>
    request<{ run: EncounterRun; combatants: EncounterRunCombatant[] }>(
      `/api/encounter-runs/${runId}/combatants`,
      { method: "POST", body: JSON.stringify(payload) },
    ),
  executeAction: (
    runId: string,
    payload: { actorId: string; targetId: string; actionId: string; rollMode?: RollMode },
  ) =>
    request<{ result: Record<string, unknown> }>(
      `/api/encounter-runs/${runId}/commands/execute-action`,
      { method: "POST", body: JSON.stringify(payload) },
    ),
  resolveActionDamage: (
    runId: string,
    payload: { actorId: string; targetId: string; damage: number; override: string },
  ) =>
    request<{ run: EncounterRun; result: Record<string, unknown> }>(
      `/api/encounter-runs/${runId}/commands/resolve-action-damage`,
      { method: "POST", body: JSON.stringify(payload) },
    ),
  castSpell: (
    runId: string,
    payload: {
      actorId: string;
      targetIds: string[];
      spellId: string;
      librarySource: "user" | "standard";
      castLevel: number;
      rollMode?: RollMode;
      rollTableResolutions?: RollTableResolutionPayload[];
    },
  ) =>
    request<{ run: EncounterRun; result: Record<string, unknown> }>(
      `/api/encounter-runs/${runId}/commands/cast-spell`,
      { method: "POST", body: JSON.stringify(payload) },
    ),
  resolveConcentration: (runId: string, alertId: string, action: string) =>
    request<{ run: EncounterRun }>(`/api/encounter-runs/${runId}/commands/resolve-concentration`, {
      method: "POST",
      body: JSON.stringify({ alertId, action }),
    }),
  manualSpellSlot: (
    runId: string,
    payload: { combatantId: string; spellLevel: number; mode: "consume" | "restore" },
  ) =>
    request<{ run: EncounterRun }>(`/api/encounter-runs/${runId}/commands/manual-spell-slot`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  moveSpellArea: (runId: string, payload: { areaEffectId: string; note?: string }) =>
    request<{ run: EncounterRun }>(`/api/encounter-runs/${runId}/commands/move-spell-area`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  applySpellArea: (
    runId: string,
    payload: { areaEffectId: string; targetIds: string[]; rollMode?: RollMode },
  ) =>
    request<{ run: EncounterRun; result: Record<string, unknown> }>(
      `/api/encounter-runs/${runId}/commands/apply-spell-area`,
      { method: "POST", body: JSON.stringify(payload) },
    ),
  endSpellArea: (runId: string, payload: { areaEffectId: string }) =>
    request<{ run: EncounterRun }>(`/api/encounter-runs/${runId}/commands/end-spell-area`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateRunCombatant: (combatant: EncounterRunCombatant) =>
    request<{ run: EncounterRun }>(`/api/encounter-run-combatants/${combatant.id}`, {
      method: "PUT",
      body: JSON.stringify({
        displayName: combatant.displayName,
        colorLabel: combatant.colorLabel,
        avatarUrl: combatant.avatarUrl,
        initiative: combatant.initiative,
        initiativeSet: combatant.initiativeSet,
        armorClassBonus: combatant.armorClassBonus,
        temporaryHitPoints: combatant.temporaryHitPoints,
        maxHitPointsModifier: combatant.maxHitPointsModifier,
        armorClassOverride: combatant.armorClassOverride,
        maxHitPointsOverride: combatant.maxHitPointsOverride,
        currentHitPointsOverride: combatant.currentHitPointsOverride,
        currentHitPoints: combatant.currentHitPoints,
        conditions: combatant.conditions,
        defeated: combatant.defeated,
      }),
    }),
  rollCheck: (
    runId: string,
    payload: {
      actorId: string;
      label: string;
      ability: string;
      bonus: number;
      rollMode?: RollMode;
    },
  ) =>
    request<{ result: Record<string, unknown> }>(
      `/api/encounter-runs/${runId}/commands/roll-check`,
      { method: "POST", body: JSON.stringify(payload) },
    ),
  deathSave: (
    runId: string,
    combatantId: string,
    action: "success" | "failure" | "undo-success" | "undo-failure" | "stabilize",
  ) =>
    request<{ run: EncounterRun }>(`/api/encounter-runs/${runId}/commands/death-save`, {
      method: "POST",
      body: JSON.stringify({ combatantId, action }),
    }),
  undoRun: (runId: string) =>
    request<{ run: EncounterRun }>(`/api/encounter-runs/${runId}/commands/undo`, {
      method: "POST",
    }),
  endEncounterRun: (
    runId: string,
    payload: {
      xpAwards: Record<string, number>;
      lootPool: string[];
      lootAssignments: Record<string, string[]>;
    },
  ) =>
    request<{ run: EncounterRun }>(`/api/encounter-runs/${runId}/end`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
