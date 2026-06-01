export type User = {
  id: string;
  email: string;
  avatarAssetId?: string;
  avatarUrl: string;
  createdAt: string;
};

export type AccountIdentity = {
  provider: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
};

export type AccountInfo = {
  email: string;
  avatarAssetId?: string;
  avatarUrl: string;
  hasPassword: boolean;
  identities: AccountIdentity[];
  stats: {
    campaigns: number;
    playerCharacters: number;
    creatures: number;
    spells: number;
    actionTemplates: number;
    encounters: number;
  };
};

export type AuthStatus = {
  setupRequired: boolean;
  authenticated: boolean;
  localAuthEnabled: boolean;
  user?: User | null;
};

export type AuthProvider = {
  id: string;
  label: string;
  url: string;
};

export type Campaign = {
  id: string;
  name: string;
  description: string;
  allowedStandardSources: string[];
  createdAt: string;
  updatedAt: string;
};

export type CampaignDetail = {
  campaign: Campaign;
  players: Player[];
  encounters: Encounter[];
  npcs: Creature[];
  playerCount: number;
  encounterCount: number;
  journeyCount: number;
};

export type Encounter = {
  id: string;
  campaignId: string;
  name: string;
  description: string;
  status: "planned" | "completed" | "skipped";
  location: string;
  roomNumber: string;
  lootNotes: string;
  combatants?: EncounterCombatant[];
  combatantCount: number;
  enemyCount: number;
  createdAt: string;
  updatedAt: string;
};

export type EncounterCombatant = {
  id: string;
  encounterId: string;
  sourceType: "player" | "creature";
  playerId?: string;
  creatureId?: string;
  side: "player" | "friendly" | "enemy";
  displayName: string;
  colorLabel: string;
  avatarUrl: string;
  armorClass: number;
  maxHitPoints: number;
  currentHitPoints: number;
  rolledHp: boolean;
  sortOrder: number;
  snapshot: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type EncounterRun = {
  id: string;
  encounterId: string;
  status: string;
  isTest: boolean;
  currentRound: number;
  currentTurnIndex: number;
  startedAt: string;
  endedAt?: string;
  summary: Record<string, unknown>;
  combatants?: EncounterRunCombatant[];
  events?: CombatLogEvent[];
  spellSlots?: EncounterRunSpellSlot[];
  activeEffects?: EncounterRunEffect[];
  alerts?: EncounterRunAlert[];
};

export type EncounterRunSpellSlot = {
  id: string;
  encounterRunId: string;
  combatantId: string;
  spellLevel: number;
  maxSlots: number;
  remainingSlots: number;
};

export type EncounterRunEffect = {
  id: string;
  encounterRunId: string;
  casterId: string;
  targetId: string;
  spellId?: string;
  librarySource: string;
  spellName: string;
  castLevel: number;
  concentration: boolean;
  timing: string;
  effectKind: string;
  conditionName: string;
  amount: number;
  payload: Record<string, unknown>;
  active: boolean;
  createdAt: string;
};

export type EncounterRunAlert = {
  id: string;
  encounterRunId: string;
  alertType: string;
  actorId?: string;
  targetId?: string;
  title: string;
  message: string;
  dc: number;
  payload: Record<string, unknown>;
  resolved: boolean;
  createdAt: string;
};

export type EncounterRunCombatant = {
  id: string;
  encounterRunId: string;
  sourceCombatantId?: string;
  sourceType: "player" | "creature";
  playerId?: string;
  creatureId?: string;
  side: "player" | "friendly" | "enemy";
  displayName: string;
  colorLabel: string;
  avatarUrl: string;
  armorClass: number;
  maxHitPoints: number;
  currentHitPoints: number;
  temporaryHitPoints: number;
  maxHitPointsModifier: number;
  armorClassBonus: number;
  armorClassOverride: number;
  maxHitPointsOverride: number;
  currentHitPointsOverride: number;
  initiative: number;
  initiativeSet: boolean;
  sortOrder: number;
  defeated: boolean;
  conditions: string[];
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  healingReceived: number;
  kills: number;
  deathSaveSuccesses: number;
  deathSaveFailures: number;
  stable: boolean;
  snapshot: Record<string, unknown>;
};

export type CombatLogEvent = {
  id: string;
  encounterRunId: string;
  sequence: number;
  eventType: string;
  actorId?: string;
  targetId?: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type Player = {
  id: string;
  campaignId: string;
  campaignName?: string;
  characterName: string;
  playerName: string;
  avatarAssetId?: string;
  avatarUrl: string;
  armorClass: number;
  maxHitPoints: number;
  currentHitPoints: number;
  temporaryHitPoints: number;
  temporaryMaxHitPoints: number;
  experiencePoints: number;
  characterSheet: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type Creature = {
  id: string;
  name: string;
  description: string;
  size: string;
  creatureType: string;
  alignment: string;
  armorClass: number;
  hitPoints: number;
  hitDice: string;
  challengeRating: string;
  xp: number;
  imageAssetId?: string;
  avatarUrl: string;
  librarySource: "user" | "standard";
  readOnly: boolean;
  sourceKey: string;
  sourceLabel: string;
  statBlock: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type {
  ActionFormState,
  ActionIconSource,
  ActionRollFormState,
  ActionRollPart,
  ActionTemplate,
  ActionTemplateUsage,
  CreatureAction,
} from "./types/actions";
export type {
  Spell,
  SpellAction,
  SpellActionFormState,
  SpellActionRollFormState,
  SpellActionRollPart,
  SpellAreaScalingFormState,
  SpellFormState,
  SpellProjectileScaling,
  SpellProjectileScalingFormState,
} from "./types/spells";
export type { Item, ItemFormState } from "./types/items";

export type CreatureSpellRef = {
  spellId: string;
  librarySource: "user" | "standard";
  spellLevel: number;
};

export type CreatureSpell = CreatureSpellRef & {
  id: string;
  creatureId: string;
  spellName: string;
  sourceKey: string;
  sourceLabel: string;
  spellLevel: number;
  prepared: boolean;
  innate: boolean;
  sortOrder: number;
};

export type CreatureSpellcastingProfile = {
  creatureId: string;
  spellcastingAbility: string;
  innateSpellcastingAbility: string;
  casterLevel: number;
  spellSaveDC: number;
  spellAttackBonus: number;
  slots: Record<string, unknown>;
  spells: CreatureSpell[];
  createdAt?: string;
  updatedAt?: string;
};

export type ApiError = {
  error: string;
};

export type StandardSource = {
  key: string;
  label: string;
  ruleset: string;
  licenseName: string;
  sourceUrl: string;
  attribution: string;
  createdAt: string;
  updatedAt: string;
};

export type StandardLibraryEntry = {
  id: string;
  sourceKey: string;
  sourceLabel: string;
  category: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  readOnly: boolean;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type SenseName = "Blindsight" | "Darkvision" | "Tremorsense" | "Truesight";

export type RollMode = "normal" | "advantage" | "disadvantage";

export type LongRestSnapshot = {
  id: string;
  currentHitPoints: number;
  temporaryHitPoints: number;
  temporaryMaxHitPoints: number;
  spellSlotsRemaining?: Record<string, unknown>;
};

export type CommonWeapon = {
  name: string;
  ability: "str" | "dex" | "finesse";
  diceCount: number;
  dieSize: number;
  damageType: string;
  range: number;
  reach: number;
};

export type CreatureFormState = {
  imageAssetId: string;
  avatarUrl: string;
  name: string;
  description: string;
  size: string;
  creatureType: string;
  creatureSubtype: string;
  alignment: string;
  environment: string;
  defaultDisposition: "friendly" | "enemy";
  languages: string;
  walkSpeed: string;
  swimSpeed: string;
  flySpeed: string;
  burrowSpeed: string;
  climbSpeed: string;
  armorClass: string;
  hitPoints: string;
  hitDice: string;
  challengeRating: string;
  xp: string;
  passivePerception: string;
  passiveInvestigation: string;
  passiveInsight: string;
  abilityScores: Record<AbilityKey, string>;
  savingThrowProficiencies: string[];
  skillProficiencies: string[];
  skillExpertise: string[];
  damageVulnerabilities: string[];
  damageResistances: string[];
  damageImmunities: string[];
  conditionImmunities: string[];
  senses: Record<SenseName, { enabled: boolean; range: string }>;
  spellcastingAbility: string;
  innateSpellcastingAbility: string;
  casterLevel: string;
  spellSaveDC: string;
  spellAttackBonus: string;
  spellSlots1: string;
  spellSlots2: string;
  spellSlots3: string;
  spellSlots4: string;
  spellSlots5: string;
  spellSlots6: string;
  spellSlots7: string;
  spellSlots8: string;
  spellSlots9: string;
  spellRefs: CreatureSpellRef[];
  statBlock: string;
};

export type PlayerFormState = {
  campaignId: string;
  avatarAssetId: string;
  avatarUrl: string;
  characterName: string;
  playerName: string;
  className: string;
  level: string;
  experiencePoints: string;
  species: string;
  background: string;
  feats: string[];
  speed: string;
  armorClass: string;
  maxHitPoints: string;
  temporaryHitPoints: string;
  temporaryMaxHitPoints: string;
  passivePerception: string;
  passiveInvestigation: string;
  passiveInsight: string;
  spellSaveDC: string;
  abilityScores: Record<AbilityKey, string>;
  savingThrowProficiencies: string[];
  skillProficiencies: string[];
  skillExpertise: string[];
  damageVulnerabilities: string[];
  damageResistances: string[];
  damageImmunities: string[];
  conditionImmunities: string[];
  senses: Record<SenseName, { enabled: boolean; range: string }>;
  spellcastingAbility: string;
  innateSpellcastingAbility: string;
  spellSlots1: string;
  spellSlots2: string;
  spellSlots3: string;
  spellSlots4: string;
  spellSlots5: string;
  spellSlots6: string;
  spellSlots7: string;
  spellSlots8: string;
  spellSlots9: string;
  spellSlotsRemaining1: string;
  spellSlotsRemaining2: string;
  spellSlotsRemaining3: string;
  spellSlotsRemaining4: string;
  spellSlotsRemaining5: string;
  spellSlotsRemaining6: string;
  spellSlotsRemaining7: string;
  spellSlotsRemaining8: string;
  spellSlotsRemaining9: string;
  notes: string;
};

export type DraftCombatant = EncounterCombatant & {
  pendingAdd?: {
    sourceType: "player" | "creature";
    playerId?: string;
    creatureId?: string;
    standardCreatureId?: string;
    rolledHp: boolean;
  };
};
