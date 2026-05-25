import { spellRollKinds } from "./options";

export type SpellEffectCategory =
  | "hp"
  | "damage"
  | "movement"
  | "defense"
  | "rolls"
  | "conditions"
  | "action"
  | "senses"
  | "area"
  | "utility";

export const spellEffectCategories: Array<{ value: SpellEffectCategory; label: string }> = [
  { value: "hp", label: "HP" },
  { value: "damage", label: "Damage" },
  { value: "movement", label: "Movement" },
  { value: "defense", label: "Defense" },
  { value: "rolls", label: "Rolls" },
  { value: "conditions", label: "Conditions" },
  { value: "action", label: "Action Economy" },
  { value: "senses", label: "Visibility / Senses" },
  { value: "area", label: "Area / Recurring" },
  { value: "utility", label: "Utility" },
];

export const spellEffectKindCategories: Record<string, SpellEffectCategory> = {
  healing: "hp",
  max_hp: "hp",
  max_hp_reduction: "hp",
  temp_hp: "hp",
  healing_block: "hp",
  healing_maximized: "hp",
  heal_to_full: "hp",
  revive: "hp",
  death_protection: "hp",
  damage: "damage",
  attack_damage_rider: "damage",
  linked_healing: "damage",
  speed_bonus: "movement",
  speed_reduction: "movement",
  speed_multiplier: "movement",
  movement_mode: "movement",
  forced_movement: "movement",
  terrain_effect: "movement",
  ac_bonus: "defense",
  base_ac: "defense",
  damage_defense: "defense",
  damage_transfer: "defense",
  roll_modifier: "rolls",
  advantage_state: "rolls",
  saving_throw_repeat: "rolls",
  condition: "conditions",
  remove_condition: "conditions",
  condition_immunity: "conditions",
  action_restriction: "action",
  visibility_effect: "senses",
  sense_effect: "senses",
  recurring_hp_change: "area",
  area_trigger: "area",
  battlefield_object: "area",
  custom: "utility",
};

export function spellEffectCategoryForKind(kind: string): SpellEffectCategory {
  return spellEffectKindCategories[kind] ?? "utility";
}

export function spellEffectOptionsForCategory(category: SpellEffectCategory) {
  return spellRollKinds.filter((option) => spellEffectCategoryForKind(option.value) === category);
}

export type SpellEffectAmountControl = "dice" | "flat" | "none";

export type SpellEffectMetadata = {
  amountControl: SpellEffectAmountControl;
  category: SpellEffectCategory;
  duration: boolean;
  flatAmountLabel?: string;
  scaling: boolean;
  trigger: boolean;
};

const effectAmountControls: Record<string, SpellEffectAmountControl> = {
  ac_bonus: "flat",
  attack_damage_rider: "dice",
  damage: "dice",
  forced_movement: "flat",
  healing: "dice",
  max_hp: "dice",
  max_hp_reduction: "dice",
  movement_mode: "flat",
  recurring_hp_change: "dice",
  revive: "flat",
  speed_bonus: "flat",
  speed_reduction: "flat",
  temp_hp: "dice",
};

const persistentEffectKinds = new Set([
  "ac_bonus",
  "action_restriction",
  "advantage_state",
  "attack_damage_rider",
  "base_ac",
  "battlefield_object",
  "condition",
  "condition_immunity",
  "custom",
  "damage_defense",
  "damage_transfer",
  "death_protection",
  "healing_block",
  "healing_maximized",
  "linked_healing",
  "max_hp",
  "max_hp_reduction",
  "movement_mode",
  "remove_condition",
  "roll_modifier",
  "saving_throw_repeat",
  "sense_effect",
  "speed_bonus",
  "speed_multiplier",
  "speed_reduction",
  "terrain_effect",
  "temp_hp",
  "visibility_effect",
]);

const triggeredEffectKinds = new Set([
  "area_trigger",
  "recurring_hp_change",
  "saving_throw_repeat",
]);

export function spellEffectMetadata(kind: string): SpellEffectMetadata {
  return {
    amountControl: effectAmountControls[kind] ?? "none",
    category: spellEffectCategoryForKind(kind),
    duration: persistentEffectKinds.has(kind),
    flatAmountLabel: flatAmountLabel(kind),
    scaling: [
      "damage",
      "healing",
      "max_hp",
      "max_hp_reduction",
      "temp_hp",
      "recurring_hp_change",
      "attack_damage_rider",
    ].includes(kind),
    trigger: triggeredEffectKinds.has(kind),
  };
}

function flatAmountLabel(kind: string) {
  if (kind === "ac_bonus") return "AC modifier";
  if (kind === "forced_movement") return "Movement distance";
  if (kind === "movement_mode") return "Speed";
  if (kind === "revive") return "Revive HP";
  if (kind === "speed_bonus") return "Speed bonus";
  if (kind === "speed_reduction") return "Speed reduction";
  return "Amount";
}

export const spellEffectTriggers = [
  { value: "immediate", label: "Immediate" },
  { value: "start_target_turn_each", label: "Start of each target turn" },
  { value: "end_target_turn_each", label: "End of each target turn" },
  { value: "start_caster_turn_each", label: "Start of each caster turn" },
  { value: "end_caster_turn_each", label: "End of each caster turn" },
  { value: "manual", label: "Manual / DM prompted" },
];

export const spellEffectDurations = [
  { value: "instant", label: "Instant / one-off" },
  { value: "spell_duration", label: "Until the spell ends" },
  { value: "start_caster_next", label: "Until start of caster's next turn" },
  { value: "end_caster_next", label: "Until end of caster's next turn" },
  { value: "start_target_next", label: "Until start of target's next turn" },
  { value: "end_target_next", label: "Until end of target's next turn" },
  { value: "rounds", label: "For a number of rounds" },
  { value: "turns", label: "For a number of turns" },
  { value: "minutes", label: "For a number of minutes" },
  { value: "hours", label: "For a number of hours" },
  { value: "manual", label: "Manual / DM prompted" },
];

export const advantageAppliesTo = [
  { value: "target_rolls", label: "Target's rolls" },
  { value: "attacks_against_target", label: "Attacks against target" },
  { value: "target_attacks", label: "Target's attacks" },
  { value: "saves_against_source", label: "Saves against source" },
];

export const damageDefenseRestrictions = [
  { value: "", label: "No restriction" },
  { value: "nonmagical", label: "Nonmagical only" },
  { value: "spell", label: "Spell damage only" },
];

export const actionRestrictionModes = [
  { value: "no_reactions", label: "No reactions" },
  { value: "action_or_bonus", label: "Action or bonus action only" },
  { value: "forced_dodge", label: "Forced Dodge" },
  { value: "cant_cast_spells", label: "Can't cast spells" },
  { value: "cant_take_magic_action", label: "Can't take Magic action" },
  { value: "extra_limited_action", label: "Extra limited action" },
  { value: "no_actions_or_movement", label: "No actions or movement" },
  { value: "manual", label: "Manual restriction" },
];

export const areaTriggerModes = [
  { value: "enter", label: "Enters area" },
  { value: "start_turn", label: "Starts turn in area" },
  { value: "end_turn", label: "Ends turn in area" },
  { value: "enter_or_start_turn", label: "Enters or starts turn in area" },
  { value: "enter_or_end_turn", label: "Enters or ends turn in area" },
  { value: "move_within", label: "Moves within area" },
  { value: "manual", label: "Manual area trigger" },
];

export const visibilityEffectModes = [
  { value: "invisible", label: "Invisible" },
  { value: "outlined_dim_light", label: "Outlined and dim light" },
  { value: "bright_light", label: "Bright light" },
  { value: "dim_light", label: "Dim light" },
  { value: "cannot_benefit_from_invisible", label: "Can't benefit from invisible" },
  { value: "revealed", label: "Revealed" },
];

export const senseEffectModes = [
  { value: "darkvision", label: "Darkvision" },
  { value: "see_invisibility", label: "See invisibility" },
  { value: "truesight", label: "Truesight" },
  { value: "special", label: "Special sense" },
];

export const terrainEffectModes = [
  { value: "difficult_terrain", label: "Difficult terrain" },
  { value: "ignore_difficult_terrain", label: "Ignore difficult terrain" },
  { value: "speed_cannot_be_reduced", label: "Speed can't be reduced" },
  {
    value: "movement_cannot_be_magically_restricted",
    label: "Movement can't be magically restricted",
  },
  { value: "obscured", label: "Obscured area" },
];
