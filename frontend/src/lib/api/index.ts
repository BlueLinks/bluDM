import type {
  ActionFormState,
  AccountInfo,
  AuthStatus,
  AuthProvider,
  Campaign,
  CampaignDetail,
  Creature,
  CreatureAction,
  CreatureFormState,
  CreatureSpellcastingProfile,
  Encounter,
  EncounterCombatant,
  EncounterRun,
  LongRestSnapshot,
  Player,
  PlayerFormState,
  Spell,
  SpellFormState,
  StandardLibraryEntry,
  StandardSource,
  User,
} from "../../types";
import { actionTemplateApi } from "./actionTemplates";
import { encounterRunApi } from "./encounterRuns";
import { actionPayload, creaturePayload, playerPayload, spellPayload } from "./payloads";
import { request } from "./request";
export const api = {
  ...actionTemplateApi,
  ...encounterRunApi,
  status: () => request<AuthStatus>("/api/auth/status"),
  authProviders: () =>
    request<{ providers: AuthProvider[]; localAuthEnabled: boolean }>("/api/auth/providers"),
  setup: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/setup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/register", {
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
  deleteAccount: (password: string, confirm: string) =>
    request<void>("/api/auth/account", {
      method: "DELETE",
      body: JSON.stringify({ password, confirm }),
    }),
  account: () => request<AccountInfo>("/api/auth/account"),
  updateAccountAvatar: (avatarAssetId: string, avatarUrl: string) =>
    request<AccountInfo>("/api/auth/account/avatar", {
      method: "PUT",
      body: JSON.stringify({ avatarAssetId, avatarUrl }),
    }),
  setPassword: (currentPassword: string, newPassword: string) =>
    request<AccountInfo>("/api/auth/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  unlinkIdentity: (provider: string, password: string) =>
    request<AccountInfo>(`/api/auth/identities/${provider}`, {
      method: "DELETE",
      body: JSON.stringify({ password }),
    }),
  uploadImage(file: Blob, filename = "avatar.png"): Promise<{ assetId: string; url: string }> {
    const formData = new FormData();
    formData.append("image", file, filename);
    return request("/api/assets/images", { method: "POST", body: formData });
  },

  campaigns: () => request<{ campaigns: Campaign[] }>("/api/campaigns"),
  campaign: (id: string) => request<CampaignDetail>(`/api/campaigns/${id}`),
  createCampaign: (payload: {
    name: string;
    description: string;
    allowedStandardSources?: string[];
  }) =>
    request<{ campaign: Campaign }>("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateCampaign: (
    id: string,
    payload: { name: string; description: string; allowedStandardSources: string[] },
  ) =>
    request<{ campaign: Campaign }>(`/api/campaigns/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
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

  addEncounterCombatants: (
    encounterId: string,
    payload: {
      sourceType: "player" | "creature";
      playerId?: string;
      creatureId?: string;
      standardCreatureId?: string;
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
    request<{ player: Player }>("/api/players", {
      method: "POST",
      body: JSON.stringify(playerPayload(payload)),
    }),
  updatePlayer: (id: string, payload: PlayerFormState) =>
    request<{ player: Player }>(`/api/players/${id}`, {
      method: "PUT",
      body: JSON.stringify(playerPayload(payload)),
    }),
  deletePlayer: (id: string) => request<void>(`/api/players/${id}`, { method: "DELETE" }),

  creatures: (
    options: {
      includeUser?: boolean;
      includeStandard?: boolean;
      query?: string;
      source?: string[];
    } = {},
  ) => {
    const params = new URLSearchParams();
    if (options.includeUser !== undefined) params.set("includeUser", String(options.includeUser));
    if (options.includeStandard !== undefined) {
      params.set("includeStandard", String(options.includeStandard));
    }
    if (options.query) params.set("q", options.query);
    if (options.source?.length) params.set("source", options.source.join(","));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<{ creatures: Creature[] }>(`/api/library/creatures${suffix}`);
  },
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
  creatureSpellcasting: (creatureId: string) =>
    request<{ spellcasting: CreatureSpellcastingProfile }>(
      `/api/library/creatures/${creatureId}/spellcasting`,
    ),
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
        spells: payload.spellRefs.map((spell) => ({
          spellId: spell.spellId,
          librarySource: spell.librarySource,
          spellLevel: spell.spellLevel,
          prepared: true,
          innate: false,
        })),
      }),
    }),
  spells: (options?: {
    includeStandard?: boolean;
    includeUser?: boolean;
    q?: string;
    level?: number;
    source?: string[];
  }) => {
    const params = new URLSearchParams();
    if (options?.includeStandard !== undefined) {
      params.set("includeStandard", String(options.includeStandard));
    }
    if (options?.includeUser !== undefined) params.set("includeUser", String(options.includeUser));
    if (options?.q) params.set("q", options.q);
    if (options?.level !== undefined) params.set("level", String(options.level));
    if (options?.source?.length) params.set("source", options.source.join(","));
    const query = params.toString();
    return request<{ spells: Spell[] }>(`/api/library/spells${query ? `?${query}` : ""}`);
  },
  standardSources: () => request<{ sources: StandardSource[] }>("/api/library/sources"),
  standardLibraryEntries: (options?: {
    category?: string;
    source?: string[];
    q?: string;
    compact?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (options?.category) params.set("category", options.category);
    if (options?.source?.length) params.set("source", options.source.join(","));
    if (options?.q) params.set("q", options.q);
    if (options?.compact) params.set("compact", "true");
    const query = params.toString();
    return request<{ entries: StandardLibraryEntry[] }>(
      `/api/library/entries${query ? `?${query}` : ""}`,
    );
  },
  createSpell: (payload: SpellFormState) =>
    request<{ spell: Spell }>("/api/library/spells", {
      method: "POST",
      body: JSON.stringify(spellPayload(payload)),
    }),
  updateSpell: (spellId: string, payload: SpellFormState) =>
    request<{ spell: Spell }>(`/api/library/spells/${spellId}`, {
      method: "PUT",
      body: JSON.stringify(spellPayload(payload)),
    }),
  deleteSpell: (spellId: string) =>
    request<void>(`/api/library/spells/${spellId}`, { method: "DELETE" }),
  seedTestData: () =>
    request<{ campaignId: string; message: string }>("/api/dev/seed-test-data", { method: "POST" }),
};
