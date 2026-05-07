import type { AbilityKey, CommonWeapon, SenseName } from "../../types";

export const actionTypes = [
  { value: "melee_weapon", label: "Melee weapon" },
  { value: "ranged_weapon", label: "Ranged weapon" },
  { value: "spell_attack", label: "Spell attack" },
  { value: "save", label: "Save" },
  { value: "damage", label: "Damage" },
  { value: "healing", label: "Healing" },
  { value: "other", label: "Other" }
];

export const missEffects = [
  { value: "none", label: "No effect" },
  { value: "half", label: "Half damage" },
  { value: "full", label: "Full damage" }
];

export const hitSpecialEvents = [
  { value: "none", label: "No effect" },
  { value: "heal_caster_full", label: "Heal caster full" },
  { value: "heal_caster_half", label: "Heal caster half" },
  { value: "reduce_max_hp", label: "Reduce max HP" }
];

export const encounterStatusOptions = [
  { value: "planned", label: "Planned" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" }
];

export const challengeRatings = ["0", "1/8", "1/4", "1/2", ...Array.from({ length: 30 }, (_, index) => String(index + 1))];

export const creatureSizes = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];

export const creatureTypes = [
  "Aberration",
  "Beast",
  "Celestial",
  "Construct",
  "Dragon",
  "Elemental",
  "Fey",
  "Fiend",
  "Giant",
  "Humanoid",
  "Monstrosity",
  "Ooze",
  "Plant",
  "Swarm of tiny beasts",
  "Undead"
];

export const creatureSubtypes: Record<string, string[]> = {
  Fiend: ["Demon", "Devil", "Shapechanger"],
  Humanoid: ["Any race", "Dwarf", "Elf", "Gnoll", "Gnome", "Goblinoid", "Grimlock", "Human", "Shapechanger", "Kobold", "Lizardfolk", "Merfolk", "Orc", "Sahuagin"],
  Monstrosity: ["Shapechanger", "Titan"],
  Undead: ["Shapechanger"]
};

export const creatureEnvironments = [
  "arctic",
  "coastal",
  "desert",
  "forest",
  "grassland",
  "hill",
  "mountain",
  "swamp",
  "underdark",
  "underwater",
  "urban"
];

export const diceSizes = [4, 6, 8, 10, 12, 20];

export const creatureDispositionOptions = [
  { value: "enemy", label: "Enemy by default" },
  { value: "friendly", label: "Friendly by default" }
];

export const alignments = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
  "Unaligned"
];

export const abilities: Array<{ key: AbilityKey; label: string }> = [
  { key: "str", label: "STR" },
  { key: "dex", label: "DEX" },
  { key: "con", label: "CON" },
  { key: "int", label: "INT" },
  { key: "wis", label: "WIS" },
  { key: "cha", label: "CHA" }
];

export const skillDefinitions: Array<{ name: string; ability: AbilityKey }> = [
  { name: "Acrobatics", ability: "dex" },
  { name: "Animal Handling", ability: "wis" },
  { name: "Arcana", ability: "int" },
  { name: "Athletics", ability: "str" },
  { name: "Deception", ability: "cha" },
  { name: "History", ability: "int" },
  { name: "Insight", ability: "wis" },
  { name: "Intimidation", ability: "cha" },
  { name: "Investigation", ability: "int" },
  { name: "Medicine", ability: "wis" },
  { name: "Nature", ability: "int" },
  { name: "Perception", ability: "wis" },
  { name: "Performance", ability: "cha" },
  { name: "Persuasion", ability: "cha" },
  { name: "Religion", ability: "int" },
  { name: "Sleight Of Hand", ability: "dex" },
  { name: "Stealth", ability: "dex" },
  { name: "Survival", ability: "wis" }
];

export const conditionImmunities = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Exhaustion",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious"
];

export const senseTypes: SenseName[] = ["Blindsight", "Darkvision", "Tremorsense", "Truesight"];

export const commonWeapons: CommonWeapon[] = [
  { name: "Dagger", ability: "finesse", diceCount: 1, dieSize: 4, damageType: "piercing", range: 20, reach: 5 },
  { name: "Shortsword", ability: "finesse", diceCount: 1, dieSize: 6, damageType: "piercing", range: 0, reach: 5 },
  { name: "Longsword", ability: "str", diceCount: 1, dieSize: 8, damageType: "slashing", range: 0, reach: 5 },
  { name: "Shortbow", ability: "dex", diceCount: 1, dieSize: 6, damageType: "piercing", range: 80, reach: 0 },
  { name: "Light Crossbow", ability: "dex", diceCount: 1, dieSize: 8, damageType: "piercing", range: 80, reach: 0 },
  { name: "Club", ability: "str", diceCount: 1, dieSize: 4, damageType: "bludgeoning", range: 0, reach: 5 }
];

export const combatantColors = [
  { label: "Default", value: "default" },
  { label: "Slate", value: "#64748b" },
  { label: "Blue", value: "#2563eb" },
  { label: "Green", value: "#16a34a" },
  { label: "Amber", value: "#d97706" },
  { label: "Red", value: "#dc2626" },
  { label: "Violet", value: "#7c3aed" }
];

export const defaultCombatantColor = "default";
