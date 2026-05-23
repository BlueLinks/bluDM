import type { AbilityKey, CommonWeapon, SenseName } from "../../types";

export const actionTypes = [
  { value: "melee_weapon", label: "Melee weapon" },
  { value: "ranged_weapon", label: "Ranged weapon" },
  { value: "spell_attack", label: "Spell attack" },
  { value: "save", label: "Save" },
  { value: "damage", label: "Damage" },
  { value: "healing", label: "Healing" },
  { value: "other", label: "Other" },
];

export const missEffects = [
  { value: "none", label: "No effect" },
  { value: "half", label: "Half damage" },
  { value: "full", label: "Full damage" },
];

export const hitSpecialEvents = [
  { value: "none", label: "No effect" },
  { value: "heal_caster_full", label: "Heal caster full" },
  { value: "heal_caster_half", label: "Heal caster half" },
  { value: "reduce_max_hp", label: "Reduce max HP" },
  { value: "increase_max_hp", label: "Increase target max HP" },
  { value: "grant_temp_hp", label: "Grant temporary HP" },
  { value: "add_condition", label: "Add condition" },
];

export const spellRollKinds = [
  { value: "damage", label: "Deal damage to target" },
  { value: "healing", label: "Restore target current HP" },
  { value: "max_hp", label: "Increase target HP maximum" },
  { value: "temp_hp", label: "Set target temporary HP" },
  { value: "condition", label: "Apply condition to target" },
  { value: "condition_immunity", label: "Grant condition immunity" },
  { value: "custom", label: "Custom target effect" },
];

export const spellEffectTimings = [
  { value: "immediate", label: "Immediate" },
  { value: "start_target_turn", label: "Start of each target turn" },
  { value: "start_target_turn_once", label: "Start of target's next turn only" },
  { value: "end_target_turn", label: "End of each target turn" },
  { value: "end_target_turn_once", label: "End of target's next turn only" },
];

export const spellLevels = [
  { value: "0", label: "Cantrip" },
  ...Array.from({ length: 9 }, (_, index) => ({
    value: String(index + 1),
    label: `${index + 1}${index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th"} level`,
  })),
];

export const spellSchools = [
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation",
];

export const spellCastTypes = ["Action", "Bonus Action", "Reaction", "Longer Time", "Special"];

export const spellCastingTriggers = [
  { value: "normal", label: "Normal casting" },
  { value: "after_ranged_weapon_hit", label: "After a ranged weapon hit" },
  { value: "after_melee_weapon_hit", label: "After a melee weapon hit" },
  { value: "when_hit", label: "When the caster is hit" },
  { value: "manual_special", label: "Manual / special trigger" },
];

export const spellTargetPatterns = [
  { value: "target", label: "Target" },
  { value: "self", label: "Self" },
  { value: "area", label: "Area" },
  { value: "special", label: "Special" },
];

export const spellTargetAnchors = [
  { value: "chosen_target", label: "Chosen target" },
  { value: "target_hit_by_triggering_attack", label: "Target hit by triggering attack" },
  { value: "caster", label: "Caster" },
  { value: "point_in_range", label: "Point in range" },
];

export const weaponAttackSources = [
  { value: "chosen_weapon", label: "Chosen weapon" },
  { value: "triggering_weapon", label: "Triggering weapon" },
  { value: "specific_weapon", label: "Specific weapon" },
];

export const abilityOverrideOptions = [
  { value: "normal", label: "Use weapon's normal ability" },
  { value: "spellcasting", label: "Use spellcasting ability" },
];

export const damageTypeChoices = [
  { value: "weapon", label: "Use weapon damage" },
  { value: "specific", label: "Use specific damage" },
  { value: "choice", label: "Give damage options" },
];

export const spellRangeTypes = ["Self", "Touch", "Range", "Sight", "Unlimited", "Special"];

export const spellClasses = [
  "Bard",
  "Cleric",
  "Druid",
  "Paladin",
  "Ranger",
  "Sorcerer",
  "Warlock",
  "Wizard",
];

export const spellDurationTypes = [
  "Concentration",
  "Instantaneous",
  "Special",
  "Time",
  "Until Dispelled",
  "Until Dispelled Or Triggered",
];

export const spellTimeScales = ["Round", "Minute", "Hour", "Day"];

export const spellAOETypes = [
  "None",
  "Cone",
  "Cube",
  "Cylinder",
  "Line",
  "Radius",
  "Sphere",
  "Square",
  "Square Feet",
];

export const spellScalingTypes = [
  { value: "none", label: "None" },
  { value: "character_level", label: "Character Level" },
  { value: "spell_scale", label: "Spell Scale" },
  { value: "spell_level", label: "Spell Level" },
];

export const successfulSaveEffects = [
  { value: "none", label: "No effect" },
  { value: "half", label: "Half damage" },
  { value: "full", label: "Full damage" },
  { value: "negates", label: "Negates effect" },
];

export const encounterStatusOptions = [
  { value: "planned", label: "Planned" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" },
];

export const challengeRatings = [
  "0",
  "1/8",
  "1/4",
  "1/2",
  ...Array.from({ length: 30 }, (_, index) => String(index + 1)),
];

export const challengeRatingXp: Record<string, number> = {
  "0": 10,
  "1/8": 25,
  "1/4": 50,
  "1/2": 100,
  "1": 200,
  "2": 450,
  "3": 700,
  "4": 1100,
  "5": 1800,
  "6": 2300,
  "7": 2900,
  "8": 3900,
  "9": 5000,
  "10": 5900,
  "11": 7200,
  "12": 8400,
  "13": 10000,
  "14": 11500,
  "15": 13000,
  "16": 15000,
  "17": 18000,
  "18": 20000,
  "19": 22000,
  "20": 25000,
  "21": 33000,
  "22": 41000,
  "23": 50000,
  "24": 62000,
  "25": 75000,
  "26": 90000,
  "27": 105000,
  "28": 120000,
  "29": 135000,
  "30": 155000,
};

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
  "Undead",
];

export const creatureSubtypes: Record<string, string[]> = {
  Fiend: ["Demon", "Devil", "Shapechanger"],
  Humanoid: [
    "Any race",
    "Dwarf",
    "Elf",
    "Gnoll",
    "Gnome",
    "Goblinoid",
    "Grimlock",
    "Human",
    "Shapechanger",
    "Kobold",
    "Lizardfolk",
    "Merfolk",
    "Orc",
    "Sahuagin",
  ],
  Monstrosity: ["Shapechanger", "Titan"],
  Undead: ["Shapechanger"],
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
  "urban",
];

export const diceSizes = [4, 6, 8, 10, 12, 20];

export const creatureDispositionOptions = [
  { value: "enemy", label: "Enemy by default" },
  { value: "friendly", label: "Friendly by default" },
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
  "Unaligned",
];

export const abilities: Array<{ key: AbilityKey; label: string }> = [
  { key: "str", label: "STR" },
  { key: "dex", label: "DEX" },
  { key: "con", label: "CON" },
  { key: "int", label: "INT" },
  { key: "wis", label: "WIS" },
  { key: "cha", label: "CHA" },
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
  { name: "Survival", ability: "wis" },
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
  "Unconscious",
];

export const senseTypes: SenseName[] = ["Blindsight", "Darkvision", "Tremorsense", "Truesight"];

export const commonWeapons: CommonWeapon[] = [
  {
    name: "Dagger",
    ability: "finesse",
    diceCount: 1,
    dieSize: 4,
    damageType: "piercing",
    range: 20,
    reach: 5,
  },
  {
    name: "Shortsword",
    ability: "finesse",
    diceCount: 1,
    dieSize: 6,
    damageType: "piercing",
    range: 0,
    reach: 5,
  },
  {
    name: "Longsword",
    ability: "str",
    diceCount: 1,
    dieSize: 8,
    damageType: "slashing",
    range: 0,
    reach: 5,
  },
  {
    name: "Shortbow",
    ability: "dex",
    diceCount: 1,
    dieSize: 6,
    damageType: "piercing",
    range: 80,
    reach: 0,
  },
  {
    name: "Light Crossbow",
    ability: "dex",
    diceCount: 1,
    dieSize: 8,
    damageType: "piercing",
    range: 80,
    reach: 0,
  },
  {
    name: "Club",
    ability: "str",
    diceCount: 1,
    dieSize: 4,
    damageType: "bludgeoning",
    range: 0,
    reach: 5,
  },
];

export const combatantColors = [
  { label: "Default", value: "default" },
  { label: "Slate", value: "#64748b" },
  { label: "Blue", value: "#2563eb" },
  { label: "Green", value: "#16a34a" },
  { label: "Amber", value: "#d97706" },
  { label: "Red", value: "#dc2626" },
  { label: "Violet", value: "#7c3aed" },
];

export const defaultCombatantColor = "default";
