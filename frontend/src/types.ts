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
  sourceLabel: string;
  statBlock: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ActionRollPart = {
  id?: string;
  sortOrder?: number;
  rollKind: string;
  damageType: string;
  magical: boolean;
  diceCount: number;
  dieSize: number;
  fixedValue: number;
  rolledValue?: number;
  criticalRolledValue?: number;
  total?: number;
};

export type ActionTemplate = {
  id: string;
  name: string;
  description: string;
  recharge: string;
  limitedUses: number;
  limitType: string;
  reach: number;
  range: number;
  aoeType: string;
  aoeSize: number;
  actionType: string;
  attackModifier: number;
  missEffect: string;
  hitSpecialEvent: string;
  rolls: ActionRollPart[];
  createdAt: string;
  updatedAt: string;
};

export type CreatureAction = ActionTemplate & {
  creatureId: string;
  sourceTemplateId?: string;
  sortOrder: number;
};

export type ActionFormState = {
  id: string;
  name: string;
  description: string;
  recharge: string;
  limitedUses: string;
  limitType: string;
  reach: string;
  range: string;
  aoeType: string;
  aoeSize: string;
  actionType: string;
  attackModifier: string;
  missEffect: string;
  hitSpecialEvent: string;
  rolls: ActionRollFormState[];
};

export type ActionRollFormState = {
  id: string;
  rollKind: string;
  damageType: string;
  magical: boolean;
  diceCount: string;
  dieSize: string;
  fixedValue: string;
};

export type ActionTemplateUsage = {
  actionId: string;
  creatureId: string;
  creatureName: string;
  actionName: string;
};

export type Spell = {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: Record<string, unknown>;
  duration: string;
  ritual: boolean;
  concentration: boolean;
  description: string;
  higherLevel: string;
  sourceNote: string;
  mechanics: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ApiError = {
  error: string;
};

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type SenseName = "Blindsight" | "Darkvision" | "Tremorsense" | "Truesight";

export type RollMode = "normal" | "advantage" | "disadvantage";

export type LongRestSnapshot = {
  id: string;
  currentHitPoints: number;
  temporaryHitPoints: number;
  temporaryMaxHitPoints: number;
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
  spellIds: string[];
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
  notes: string;
};

export type SpellFormState = {
  name: string;
  level: string;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  ritual: boolean;
  concentration: boolean;
  description: string;
  higherLevel: string;
  sourceNote: string;
  components: string;
  mechanics: string;
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
