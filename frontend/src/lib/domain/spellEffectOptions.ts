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
