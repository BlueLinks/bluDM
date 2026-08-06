import { avatarImageSrc } from "../../components/AvatarImagePicker";
import type { Creature, EncounterCombatant } from "../../types";
import {
  defaultDifficulty,
  difficultyOptions,
  encounterRuleset2014,
  type EncounterRuleset,
} from "../../lib/domain/encounterRulesets";
import type { EncounterArchetypeIconKey } from "./encounterArchetypeIcons";

export type EncounterBuilderMode = "custom" | "random";
export type EncounterBuilderStep = "party" | "setup" | "review";

export type EncounterBuilderMetaDraft = {
  name: string;
  description: string;
  dmNotes: string;
  environment: string;
  status: string;
  timeOfDay: string;
  location: string;
  locationId: string;
  roomNumber: string;
};

export type EncounterBuilderCreatureDraft = {
  id: string;
  creature: Creature;
  quantity: number;
  rolledHp: boolean;
  side: "friendly" | "enemy";
};

export type EncounterBuilderRandomOptions = {
  archetype: string;
  challenge: string;
  enemyCount: number;
  includeBoss: boolean;
  includeHazards: boolean;
  includeMinions: boolean;
  terrain: string;
  useLocationTheme: boolean;
  useLocationNotes: boolean;
};

export type EncounterBuilderPreview = {
  title: string;
  difficulty: string;
  estimatedXp: number;
  targetNotice: string;
  summary: string;
  enemies: EncounterBuilderCreatureDraft[];
};

export const defaultRandomOptions: EncounterBuilderRandomOptions = {
  archetype: "monsters",
  challenge: "medium",
  enemyCount: 3,
  includeBoss: false,
  includeHazards: false,
  includeMinions: true,
  terrain: "location-theme",
  useLocationTheme: true,
  useLocationNotes: true,
};

export function defaultRandomOptionsForRuleset(
  ruleset: EncounterRuleset,
): EncounterBuilderRandomOptions {
  return { ...defaultRandomOptions, challenge: defaultDifficulty(ruleset) };
}

export const archetypeOptions = [
  {
    value: "large-monster",
    iconKey: "large-monster",
    label: "One large monster",
    copy: "Dragon, giant, troll, owlbear, hydra",
    terms: ["dragon", "giant", "troll", "owlbear", "hydra"],
  },
  {
    value: "humanoids",
    iconKey: "humanoids",
    label: "Humanoids",
    copy: "Bandits, guards, pirates, mercenaries, cultists",
    terms: ["bandit", "guard", "pirate", "mercenary", "cultist"],
  },
  {
    value: "monsters",
    iconKey: "monsters",
    label: "Monsters",
    copy: "Goblins, kobolds, orcs, gnolls, bugbears",
    terms: ["goblin", "kobold", "orc", "gnoll", "bugbear"],
  },
  {
    value: "undead",
    iconKey: "undead",
    label: "Undead",
    copy: "Skeletons, zombies, revenants",
    terms: ["undead", "skeleton", "zombie", "ghost", "wight"],
  },
  {
    value: "beasts",
    iconKey: "beasts",
    label: "Beasts",
    copy: "Wolves, bears, giant animals",
    terms: ["beast", "wolf", "bear", "boar", "spider"],
  },
  {
    value: "spellcasters",
    iconKey: "spellcasters",
    label: "Spellcasters",
    copy: "Mages, cultists, warlocks",
    terms: ["mage", "wizard", "priest", "cult", "warlock"],
  },
  {
    value: "melee",
    iconKey: "melee",
    label: "Melee fighters",
    copy: "Warriors, knights, berserkers",
    terms: ["warrior", "knight", "berserker", "veteran", "gladiator"],
  },
  {
    value: "stealth",
    iconKey: "stealth",
    label: "Stealth / assassins",
    copy: "Rogues, scouts, assassins",
    terms: ["rogue", "scout", "assassin", "spy", "thief"],
  },
  {
    value: "mixed",
    iconKey: "mixed",
    label: "Mixed encounter",
    copy: "A varied hostile group",
    terms: [],
  },
  {
    value: "custom-mix",
    iconKey: "custom-mix",
    label: "Custom mix",
    copy: "Use the preset as a loose prompt",
    terms: [],
  },
] satisfies Array<{
  copy: string;
  iconKey: EncounterArchetypeIconKey;
  label: string;
  terms: string[];
  value: string;
}>;

export const challengeOptions = difficultyOptions(encounterRuleset2014);

export const enemyCountMax = 6;
export const enemyCountMin = 1;

export const terrainOptions = [
  { label: "Use location theme", value: "location-theme" },
  { label: "Dungeon", value: "dungeon" },
  { label: "Urban", value: "urban" },
  { label: "Wilderness", value: "wilderness" },
  { label: "Road", value: "road" },
  { label: "Ruins", value: "ruins" },
];

export function previewCombatantsFromDrafts(
  enemies: EncounterBuilderCreatureDraft[],
): EncounterCombatant[] {
  return enemies.flatMap((enemy) =>
    Array.from({ length: enemy.quantity }, (_, index) => ({
      id: `${enemy.id}-${index}`,
      encounterId: "preview",
      sourceType: "creature" as const,
      creatureId: enemy.creature.id,
      side: "enemy" as const,
      displayName: enemy.creature.name,
      colorLabel: "",
      avatarUrl: avatarImageSrc(enemy.creature.imageAssetId, enemy.creature.avatarUrl),
      armorClass: enemy.creature.armorClass,
      maxHitPoints: enemy.creature.hitPoints,
      currentHitPoints: enemy.creature.hitPoints,
      rolledHp: false,
      sortOrder: index,
      snapshot: { creature: enemy.creature },
      createdAt: "",
      updatedAt: "",
    })),
  );
}
