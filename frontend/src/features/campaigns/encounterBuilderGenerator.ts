import { avatarImageSrc } from "../../components/AvatarImagePicker";
import { calculateEncounterDifficulty } from "../../lib/domain/combat";
import type { Creature, EncounterCombatant, Player } from "../../types";
import type { EncounterArchetypeIconKey } from "./encounterArchetypeIcons";
import { locationPathLabel } from "./world/campaignWorldLocationUtils";
import type { CampaignLocation } from "./world/travelTypes";

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

export const challengeOptions = [
  { label: "Easy", value: "easy" },
  { label: "Medium", value: "medium" },
  { label: "Hard", value: "hard" },
  { label: "Deadly", value: "deadly" },
];

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

export function buildRandomEncounterPreview({
  creatures,
  location,
  options,
  players,
  roll,
}: {
  creatures: Creature[];
  location: CampaignLocation | null;
  options: EncounterBuilderRandomOptions;
  players: Player[];
  roll: number;
}): EncounterBuilderPreview {
  const archetype = archetypeOptions.find((option) => option.value === options.archetype);
  const candidates = matchingCreatures(creatures, archetype?.terms ?? []);
  const count = enemyCount(options);
  const pool = candidates.length ? candidates : creatures;
  const result = selectTargetedEnemies(pool, count, options, players, roll);
  const enemies = result.enemies;
  const place = location?.name ?? "the campaign";
  const terrain = options.terrain === "location-theme" ? "local terrain" : options.terrain;
  const title = `${capitalize(archetype?.label ?? "Encounter")} at ${place}`;
  const context = location
    ? [
        options.useLocationTheme ? locationPathLabel(location) : "",
        options.useLocationNotes
          ? [location.summary, location.publicNotes || location.notes, location.dmNotes]
              .filter(Boolean)
              .join(" ")
          : "",
      ]
        .filter(Boolean)
        .join(" - ")
    : "";
  const summary = [
    `${archetype?.label ?? "Mixed encounter"} tuned as ${options.challenge} difficulty.`,
    `Terrain: ${terrain.replaceAll("-", " ")}.`,
    context ? `Location context: ${context}` : "",
    options.includeBoss ? "Includes a boss-style anchor." : "",
    options.includeMinions ? "Includes minion pressure around the main threat." : "",
    options.includeHazards ? "Includes environmental hazards as encounter pressure." : "",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    title,
    difficulty: capitalize(options.challenge),
    estimatedXp: enemies.reduce((total, enemy) => total + enemy.creature.xp * enemy.quantity, 0),
    targetNotice: result.notice,
    summary,
    enemies,
  };
}

function matchingCreatures(creatures: Creature[], terms: string[]) {
  if (terms.length === 0) return creatures;
  return creatures.filter((creature) => {
    const haystack =
      `${creature.name} ${creature.creatureType} ${creature.description}`.toLowerCase();
    return terms.some((term) => haystack.includes(term));
  });
}

function selectCreatures(creatures: Creature[], count: number, roll: number) {
  if (creatures.length === 0) return [];
  return Array.from({ length: Math.min(count, creatures.length) }, (_, index) => {
    const creatureIndex = Math.abs(hash(`${roll}-${index}`)) % creatures.length;
    return creatures[(creatureIndex + index) % creatures.length];
  });
}

function selectTargetedEnemies(
  creatures: Creature[],
  count: number,
  options: EncounterBuilderRandomOptions,
  players: Player[],
  roll: number,
) {
  if (creatures.length === 0) {
    return { enemies: [], notice: "No matching creatures are available for this preset." };
  }
  if (players.length === 0) {
    return {
      enemies: createEnemyDrafts(selectCreatures(creatures, count, roll), options, roll),
      notice: "Add party members to tune this preview to a challenge target.",
    };
  }

  const attempts = Math.min(80, Math.max(24, creatures.length * 3));
  const scored = Array.from({ length: attempts }, (_, attempt) => {
    const selected = selectCreatures(creatures, count, roll + attempt);
    const enemies = createEnemyDrafts(selected, options, roll + attempt);
    const difficulty = calculateEncounterDifficulty(players, previewCombatantsFromDrafts(enemies));
    return {
      difficulty,
      enemies,
      score: challengeScore(options.challenge, difficulty),
    };
  }).sort((left, right) => left.score - right.score);
  const best = scored[0];
  const targetLabel = capitalize(options.challenge);
  return {
    enemies: best.enemies,
    notice:
      best.difficulty.label === targetLabel
        ? ""
        : `Closest available result is ${best.difficulty.label}; this creature set cannot reliably hit ${targetLabel}.`,
  };
}

function createEnemyDrafts(
  selected: Creature[],
  options: EncounterBuilderRandomOptions,
  roll: number,
): EncounterBuilderCreatureDraft[] {
  return selected.map((creature, index) => ({
    id: `generated-${creature.id}-${roll}-${index}`,
    creature,
    quantity: options.includeBoss && index === 0 ? 1 : minionQuantity(options, index),
    rolledHp: false,
    side: "enemy" as const,
  }));
}

function challengeScore(
  challenge: string,
  difficulty: ReturnType<typeof calculateEncounterDifficulty>,
) {
  const target = capitalize(challenge);
  const range = challengeRange(challenge, difficulty.thresholds);
  const midpoint = (range.min + range.max) / 2;
  const bandMiss =
    difficulty.adjustedXP >= range.min && difficulty.adjustedXP < range.max
      ? 0
      : Math.min(
          Math.abs(difficulty.adjustedXP - range.min),
          Math.abs(difficulty.adjustedXP - range.max),
        );
  const labelPenalty =
    difficulty.label === target ? 0 : labelDistance(target, difficulty.label) * 100000;
  return labelPenalty + bandMiss + Math.abs(difficulty.adjustedXP - midpoint) / 100;
}

function challengeRange(
  challenge: string,
  thresholds: { easy: number; medium: number; hard: number; deadly: number },
) {
  if (challenge === "easy") return { min: thresholds.easy, max: thresholds.medium || Infinity };
  if (challenge === "hard") return { min: thresholds.hard, max: thresholds.deadly || Infinity };
  if (challenge === "deadly") {
    return { min: thresholds.deadly, max: thresholds.deadly ? thresholds.deadly * 1.5 : Infinity };
  }
  return { min: thresholds.medium, max: thresholds.hard || Infinity };
}

function labelDistance(target: string, actual: string) {
  const order = ["Trivial", "Easy", "Medium", "Hard", "Deadly", "Over Deadly"];
  const targetIndex = order.indexOf(target);
  const actualIndex = order.indexOf(actual);
  return Math.abs(
    (targetIndex >= 0 ? targetIndex : 0) - (actualIndex >= 0 ? actualIndex : order.length),
  );
}

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

function enemyCount(options: EncounterBuilderRandomOptions) {
  return Math.max(enemyCountMin, Math.min(enemyCountMax, options.enemyCount || enemyCountMin));
}

function minionQuantity(options: EncounterBuilderRandomOptions, index: number) {
  if (options.archetype === "large-monster" && index === 0) return 1;
  if (!options.includeMinions) return 1;
  return index === 0 ? 2 : 1;
}

function hash(value: string) {
  return [...value].reduce(
    (total, char) => Math.imul(total ^ char.charCodeAt(0), 16777619),
    2166136261,
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("-", " ");
}
