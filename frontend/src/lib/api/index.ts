import type {
  ActionFormState,
  ActionTemplate,
  ActionTemplateUsage,
  AuthStatus,
  AuthProvider,
  Campaign,
  CampaignDetail,
  Creature,
  CreatureAction,
  CreatureFormState,
  Encounter,
  EncounterCombatant,
  EncounterRun,
  EncounterRunCombatant,
  LongRestSnapshot,
  Player,
  PlayerFormState,
  RollMode,
  Spell,
  SpellFormState,
  User,
} from "../../types";
import { actionPayload, creaturePayload, parseJSONField, playerPayload } from "./payloads";
import { request } from "./request";

export const api = {
  status: () => request<AuthStatus>("/api/auth/status"),
  authProviders: () =>
    request<{ providers: AuthProvider[]; localAuthEnabled: boolean }>("/api/auth/providers"),
  setup: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/setup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  async logout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
  },
  uploadImage(file: Blob, filename = "avatar.png"): Promise<{ assetId: string; url: string }> {
    const formData = new FormData();
    formData.append("image", file, filename);
    return request("/api/assets/images", { method: "POST", body: formData });
  },

  campaigns: () => request<{ campaigns: Campaign[] }>("/api/campaigns"),
  campaign: (id: string) => request<CampaignDetail>(`/api/campaigns/${id}`),
  createCampaign: (name: string, description: string) =>
    request<{ campaign: Campaign }>("/api/campaigns", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    }),
  linkCampaignNpc: (campaignId: string, creatureId: string) =>
    request<void>(`/api/campaigns/${campaignId}/npcs`, {
      method: "POST",
      body: JSON.stringify({ creatureId, disposition: "neutral" }),
    }),
  unlinkCampaignNpc: (campaignId: string, creatureId: string) =>
    request<void>(`/api/campaigns/${campaignId}/npcs/${creatureId}`, { method: "DELETE" }),
  longRestCampaign: (id: string) =>
    request<{ restedPlayers: number; snapshot: LongRestSnapshot[] }>(
      `/api/campaigns/${id}/long-rest`,
      { method: "POST" },
    ),
  undoLongRestCampaign: (id: string, players: LongRestSnapshot[]) =>
    request<{ restoredPlayers: number }>(`/api/campaigns/${id}/long-rest/undo`, {
      method: "POST",
      body: JSON.stringify({ players }),
    }),

  createEncounter: (
    campaignId: string,
    payload: {
      name: string;
      description: string;
      status?: string;
      location?: string;
      roomNumber?: string;
    },
  ) =>
    request<{ encounter: Encounter }>(`/api/campaigns/${campaignId}/encounters`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  encounter: (id: string) => request<{ encounter: Encounter }>(`/api/encounters/${id}`),
  updateEncounter: (
    id: string,
    payload: {
      name: string;
      description: string;
      status: string;
      location: string;
      roomNumber: string;
    },
  ) =>
    request<{ encounter: Encounter }>(`/api/encounters/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteEncounter: (id: string) => request<void>(`/api/encounters/${id}`, { method: "DELETE" }),
  cloneEncounter: (id: string) =>
    request<{ encounter: Encounter }>(`/api/encounters/${id}/clone`, { method: "POST" }),
  startEncounter: (id: string, test: boolean) =>
    request<{ run: EncounterRun }>(`/api/encounters/${id}/start`, {
      method: "POST",
      body: JSON.stringify({ test }),
    }),

  encounterRun: (id: string) => request<{ run: EncounterRun }>(`/api/encounter-runs/${id}`),
  rollInitiative: (runId: string, sides: string[]) =>
    request<{ run: EncounterRun }>(`/api/encounter-runs/${runId}/commands/roll-initiative`, {
      method: "POST",
      body: JSON.stringify({ sides }),
    }),
  setInitiative: (runId: string, combatantId: string, initiative: number) =>
    request<{ run: EncounterRun }>(`/api/encounter-runs/${runId}/commands/set-initiative`, {
      method: "POST",
      body: JSON.stringify({ combatantId, initiative }),
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
  addRunCombatants: (
    runId: string,
    payload: {
      creatureId: string;
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
  updateRunCombatant: (combatant: EncounterRunCombatant) =>
    request<{ run: EncounterRun }>(`/api/encounter-run-combatants/${combatant.id}`, {
      method: "PUT",
      body: JSON.stringify({
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

  addEncounterCombatants: (
    encounterId: string,
    payload: {
      sourceType: "player" | "creature";
      playerId?: string;
      creatureId?: string;
      side: "player" | "friendly" | "enemy";
      displayName?: string;
      colorLabel?: string;
      avatarUrl?: string;
      armorClass?: number;
      maxHitPoints?: number;
      currentHitPoints?: number;
      quantity?: number;
      rolledHp?: boolean;
    },
  ) =>
    request<{ combatants: EncounterCombatant[] }>(`/api/encounters/${encounterId}/combatants`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  addAllPlayersToEncounter: (encounterId: string) =>
    request<{ combatants: EncounterCombatant[] }>(
      `/api/encounters/${encounterId}/combatants/add-all-players`,
      { method: "POST" },
    ),
  updateEncounterCombatant: (combatant: EncounterCombatant) =>
    request<{ combatant: EncounterCombatant }>(`/api/encounter-combatants/${combatant.id}`, {
      method: "PUT",
      body: JSON.stringify({
        side: combatant.side,
        displayName: combatant.displayName,
        colorLabel: combatant.colorLabel,
        avatarUrl: combatant.avatarUrl,
        armorClass: combatant.armorClass,
        maxHitPoints: combatant.maxHitPoints,
        currentHitPoints: combatant.currentHitPoints,
      }),
    }),
  deleteEncounterCombatant: (id: string) =>
    request<void>(`/api/encounter-combatants/${id}`, { method: "DELETE" }),

  players: () => request<{ players: Player[] }>("/api/players"),
  player: (id: string) => request<{ player: Player }>(`/api/players/${id}`),
  createPlayer: (payload: PlayerFormState) =>
    request<{ player: Player }>(`/api/campaigns/${payload.campaignId}/players`, {
      method: "POST",
      body: JSON.stringify(playerPayload(payload)),
    }),
  updatePlayer: (id: string, payload: PlayerFormState) =>
    request<{ player: Player }>(`/api/players/${id}`, {
      method: "PUT",
      body: JSON.stringify(playerPayload(payload)),
    }),
  deletePlayer: (id: string) => request<void>(`/api/players/${id}`, { method: "DELETE" }),

  creatures: () => request<{ creatures: Creature[] }>("/api/library/creatures"),
  creature: (id: string) => request<{ creature: Creature }>(`/api/library/creatures/${id}`),
  creatureCampaigns: (id: string) =>
    request<{ campaigns: Campaign[] }>(`/api/library/creatures/${id}/campaigns`),
  createCreature: (payload: CreatureFormState) =>
    request<{ creature: Creature }>("/api/library/creatures", {
      method: "POST",
      body: JSON.stringify(creaturePayload(payload)),
    }),
  updateCreature: (id: string, payload: CreatureFormState) =>
    request<{ creature: Creature }>(`/api/library/creatures/${id}`, {
      method: "PUT",
      body: JSON.stringify(creaturePayload(payload)),
    }),
  deleteCreature: (id: string) =>
    request<void>(`/api/library/creatures/${id}`, { method: "DELETE" }),
  creatureActions: (creatureId: string) =>
    request<{ actions: CreatureAction[] }>(`/api/library/creatures/${creatureId}/actions`),
  createCreatureAction: (creatureId: string, payload: ActionFormState) =>
    request<{ action: CreatureAction }>(`/api/library/creatures/${creatureId}/actions`, {
      method: "POST",
      body: JSON.stringify(actionPayload(payload)),
    }),
  replaceCreatureActions: (creatureId: string, actions: ActionFormState[]) =>
    request<{ actions: CreatureAction[] }>(`/api/library/creatures/${creatureId}/actions`, {
      method: "PUT",
      body: JSON.stringify({
        actions: actions.filter((action) => action.name.trim()).map(actionPayload),
      }),
    }),
  copyActionTemplate: (creatureId: string, templateId: string) =>
    request<{ action: CreatureAction }>(
      `/api/library/creatures/${creatureId}/actions/copy-template`,
      { method: "POST", body: JSON.stringify({ templateId }) },
    ),
  reorderCreatureActions: (creatureId: string, actionIds: string[]) =>
    request<{ actions: CreatureAction[] }>(`/api/library/creatures/${creatureId}/actions/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ actionIds }),
    }),
  saveCreatureSpellcasting: (creatureId: string, payload: CreatureFormState) =>
    request<unknown>(`/api/library/creatures/${creatureId}/spellcasting`, {
      method: "PUT",
      body: JSON.stringify({
        spellcastingAbility: payload.spellcastingAbility,
        innateSpellcastingAbility: payload.innateSpellcastingAbility,
        casterLevel: Number(payload.casterLevel) || 0,
        spellSaveDC: Number(payload.spellSaveDC) || 0,
        spellAttackBonus: Number(payload.spellAttackBonus) || 0,
        slots: {
          1: Number(payload.spellSlots1) || 0,
          2: Number(payload.spellSlots2) || 0,
          3: Number(payload.spellSlots3) || 0,
          4: Number(payload.spellSlots4) || 0,
          5: Number(payload.spellSlots5) || 0,
          6: Number(payload.spellSlots6) || 0,
          7: Number(payload.spellSlots7) || 0,
          8: Number(payload.spellSlots8) || 0,
          9: Number(payload.spellSlots9) || 0,
        },
        spells: payload.spellIds.map((spellId) => ({
          spellId,
          spellLevel: 0,
          prepared: true,
          innate: false,
        })),
      }),
    }),

  actionTemplates: () => request<{ actionTemplates: ActionTemplate[] }>("/api/action-templates"),
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
  updateActionTemplate: (id: string, payload: ActionFormState) =>
    request<{ actionTemplate: ActionTemplate }>(`/api/action-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(actionPayload(payload)),
    }),

  spells: () => request<{ spells: Spell[] }>("/api/library/spells"),
  createSpell: (payload: SpellFormState) =>
    request<{ spell: Spell }>("/api/library/spells", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        level: Number(payload.level),
        components: parseJSONField(payload.components),
        mechanics: parseJSONField(payload.mechanics),
      }),
    }),
  seedTestData: () =>
    request<{ campaignId: string; message: string }>("/api/dev/seed-test-data", { method: "POST" }),
};
