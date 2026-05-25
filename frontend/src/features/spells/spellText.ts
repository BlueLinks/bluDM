import { damageTypes } from "../../components/shared/damageTypes";
import { rollModifierCategories, spellRollKinds } from "../../lib/domain/options";
import { configText } from "../../lib/domain/effectConfig";
import {
  areaTriggerModes,
  areaTriggerOutcomes,
  baseACAbilityModifiers,
  damageDefenseRestrictions,
  repeatSaveCheckTypes,
  repeatSaveSuccessOutcomes,
} from "../../lib/domain/spellEffectOptions";
import type { Spell, SpellAreaScalingFormState, SpellFormState } from "../../types";

type SpellLike = Pick<
  Spell | SpellFormState,
  | "name"
  | "level"
  | "school"
  | "range"
  | "rangeType"
  | "rangeFeet"
  | "duration"
  | "durationType"
  | "durationValue"
  | "durationScale"
  | "concentration"
  | "aoeType"
  | "aoeSize"
  | "projectileScaling"
  | "areaScaling"
  | "actions"
> & {
  targetPattern?: string;
  targetAnchor?: string;
  mechanics?: Record<string, unknown>;
};

export function displaySpellRange(spell: SpellLike) {
  if (spell.range.trim()) return spell.range;
  const type = spell.rangeType || "Range";
  const feet = Number(spell.rangeFeet) || 0;
  if (type === "Range" && feet > 0) return `${feet} ft.`;
  if ((type === "Self" || type === "Touch" || type === "Sight") && feet > 0) {
    return `${type} (${feet} ft.)`;
  }
  return type || "-";
}

export function displaySpellDuration(spell: SpellLike) {
  if (spell.duration.trim()) return spell.duration;
  const type = spell.durationType || "Instantaneous";
  const value = Number(spell.durationValue) || 0;
  const scale = spell.durationScale || "Minute";
  if (type === "Concentration") {
    return value > 0 ? `Concentration, up to ${value} ${plural(scale, value)}` : "Concentration";
  }
  if (type === "Time") {
    return value > 0 ? `${value} ${plural(scale, value)}` : "-";
  }
  return type;
}

export function generateSpellDescription(spell: SpellLike) {
  const pieces = [
    targetSentence(spell),
    areaSentence(spell),
    areaScalingSentence(spell),
    weaponAttackSentence(spell),
    spellAttackSentence(spell),
    ...spell.actions.flatMap((action) => [
      actionDamageTypeSentence(action),
      ...action.rolls.map((roll) => effectSentence(spell, roll)),
    ]),
  ].filter(Boolean);
  if (pieces.length === 0) {
    const name = spell.name.trim() || "This spell";
    const level = Number(spell.level) === 0 ? "cantrip" : `${spell.level} level spell`;
    return `${name} is a ${spell.school ? `${spell.school.toLowerCase()} ` : ""}${level}.`;
  }
  return pieces.join(" ");
}

function areaScalingSentence(spell: SpellLike) {
  const scaling = spell.areaScaling || areaScalingFromMechanics(spell);
  if (!scaling || scaling.scalingType === "none") return "";
  const added = Number(scaling.additionalSize) || 0;
  const from = Number(scaling.scaleFromLevel) || 1;
  const step = Math.max(1, Number(scaling.stepSize) || 1);
  if (added <= 0) return "";
  if (scaling.description?.trim()) return scaling.description.trim();
  if (scaling.scalingType === "character_level") {
    return `At character level ${from}, the area size increases by ${added} ft. for ${step === 1 ? "every level" : `every ${step} character levels`} after that.`;
  }
  if (scaling.scalingType === "spell_scale") {
    return `At spell scale ${from}, the area size increases by ${added} ft. for ${step === 1 ? "every scale step" : `every ${step} scale steps`} after that.`;
  }
  return `When cast using a spell slot above ${ordinalNumber(from)}, the area size increases by ${added} ft. for ${step === 1 ? "every level" : `every ${step} slot levels`} above ${ordinalNumber(from)}.`;
}

function areaScalingFromMechanics(spell: SpellLike): SpellAreaScalingFormState | undefined {
  const raw = spell.mechanics?.areaScaling;
  if (!raw || typeof raw !== "object") return undefined;
  const areaScaling = raw as Record<string, unknown>;
  return {
    scalingType: stringFromUnknown(areaScaling.scalingType, "none"),
    scaleFromLevel: stringFromUnknown(areaScaling.scaleFromLevel, "0"),
    additionalSize: stringFromUnknown(areaScaling.additionalSize, "0"),
    stepSize: stringFromUnknown(areaScaling.stepSize, "1"),
    description: stringFromUnknown(areaScaling.description, ""),
  };
}

function spellAttackSentence(spell: SpellLike) {
  const count = spell.actions.filter((action) => action.actionType === "spell_attack").length;
  if (count === 0) return "";
  return count === 1
    ? "Make a spell attack roll against the target."
    : "Make a separate spell attack roll for each spell attack.";
}

function weaponAttackSentence(spell: SpellLike) {
  const weaponActions = spell.actions.filter(isWeaponAction);
  if (weaponActions.length === 0) return "";
  const usesSpellAttack = weaponActions.some(
    (action) => action.attackAbilityOverride === "spellcasting",
  );
  const usesSpellDamage = weaponActions.some(
    (action) => action.damageAbilityOverride === "spellcasting",
  );
  const details = [];
  if (usesSpellAttack && usesSpellDamage) {
    details.push("uses your spellcasting ability for the attack and damage rolls");
  } else if (usesSpellAttack) {
    details.push("uses your spellcasting ability for the attack roll");
  } else if (usesSpellDamage) {
    details.push("uses your spellcasting ability for the damage roll");
  }
  const suffix = details.length > 0 ? ` It ${details.join(" and ")}.` : "";
  return `This spell uses or modifies a weapon attack.${suffix}`;
}

function actionDamageTypeSentence(action: SpellLike["actions"][number]) {
  if (!isWeaponAction(action) && action.actionType !== "spell_attack") {
    return "";
  }
  if (action.damageTypeChoice === "weapon") {
    return "The attack uses the weapon's original damage type.";
  }
  if (action.damageTypeChoice === "specific") {
    const damageType = damageTypeLabel(action.damageTypeOptions[0]);
    return damageType ? `The attack's damage type is ${damageType}.` : "";
  }
  if (action.damageTypeChoice === "choice") {
    const options = action.damageTypeOptions.map(damageTypeLabel).filter(Boolean);
    if (options.length === 0) return "";
    return `The caster chooses whether the attack deals ${list(options)} damage.`;
  }
  return "";
}

function isWeaponAction(action: SpellLike["actions"][number]) {
  return (
    action.actionType === "weapon_attack" ||
    action.actionType === "melee_weapon" ||
    action.actionType === "ranged_weapon"
  );
}

function targetSentence(spell: SpellLike) {
  const targetCount = Number(spell.projectileScaling?.baseProjectiles) || 0;
  if (targetCount <= 0) return "";
  const noun = targetCount === 1 ? "target or projectile" : "targets or projectiles";
  const cantripTargets = cantripTargetSentence(spell);
  return `Choose up to ${targetCount} ${noun} within ${displaySpellRange(spell)}.${cantripTargets ? ` ${cantripTargets}` : ""}`;
}

function cantripTargetSentence(spell: SpellLike) {
  const rawProjectileScaling = spell.projectileScaling as Record<string, unknown> | undefined;
  const rawScaling: unknown = rawProjectileScaling?.cantripScaling;
  if (!rawScaling || typeof rawScaling !== "object" || Array.isArray(rawScaling)) return "";
  const scaling = rawScaling as Record<string, unknown>;
  const parts = [
    targetBreakpoint("5th", scaling, "5"),
    targetBreakpoint("11th", scaling, "11"),
    targetBreakpoint("17th", scaling, "17"),
  ].filter(Boolean);
  if (parts.length === 0) return "";
  return `This cantrip can affect ${list(parts)}. Resolve each target or projectile separately.`;
}

function targetBreakpoint(label: string, scaling: Record<string, unknown>, key: string) {
  const entry = scaling[key];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return "";
  const targets = Number((entry as Record<string, unknown>).targets) || 0;
  if (targets <= 0) return "";
  return `${targets} ${targets === 1 ? "target" : "targets"} at ${label} level`;
}

function areaSentence(spell: SpellLike) {
  if (!spell.aoeType || spell.aoeType === "None") return "";
  const size = Number(spell.aoeSize) || 0;
  const area = `${size > 0 ? `${size} ft. ` : ""}${spell.aoeType.toLowerCase()} area`;
  const within = size > 0 ? `within ${size} ft.` : "in the area";
  if (targetPattern(spell) !== "area" && targetPattern(spell) !== "area_around_target") {
    return `The spell affects a ${area}.`;
  }
  if (targetAnchor(spell) === "target_hit_by_triggering_attack") {
    return `The target of the triggering attack and each creature ${within} of it are affected.`;
  }
  if (targetAnchor(spell) === "caster") {
    return `Each creature ${within} of the caster is affected.`;
  }
  if (targetAnchor(spell) === "chosen_target") {
    return `The chosen target and each creature ${within} of it are affected.`;
  }
  return `Each creature in the ${area} is affected.`;
}

function effectSentence(spell: SpellLike, roll: SpellLike["actions"][number]["rolls"][number]) {
  const subject = isAreaEffect(spell) ? "Each affected creature" : "The target";
  if (roll.rollKind === "condition") {
    return roll.conditionName ? `${subject} gains the ${roll.conditionName} condition.` : "";
  }
  if (roll.rollKind === "remove_condition") {
    return roll.conditionName ? `${subject} loses the ${roll.conditionName} condition.` : "";
  }
  if (roll.rollKind === "condition_immunity") {
    return roll.conditionName
      ? `${subject} is immune to the ${roll.conditionName} condition while the effect is active.`
      : "";
  }
  if (roll.rollKind === "custom") {
    return roll.conditionName ? `${subject}: ${roll.conditionName}` : "";
  }
  if (roll.rollKind === "healing_block") {
    return `${subject} can't regain hit points while the effect is active.`;
  }
  if (roll.rollKind === "healing_maximized") {
    return `${subject} regains the maximum possible hit points from healing.`;
  }
  if (roll.rollKind === "heal_to_full") {
    return `${subject} regains all missing hit points.`;
  }
  if (roll.rollKind === "advantage_state") {
    return `${configText(roll.effectConfig?.appliesTo, subject)} has ${configText(roll.effectConfig?.state, "advantage")} on ${configText(roll.effectConfig?.category, "configured rolls")}.`;
  }
  if (roll.rollKind === "damage_defense") {
    return `${subject} gains ${configText(roll.effectConfig?.mode, "resistance")} to ${listOrFallback(roll.effectConfig?.damageTypes, "the chosen damage type")}${restrictionText(roll.effectConfig?.restriction)}.`;
  }
  if (roll.rollKind === "action_restriction") {
    return `${subject}: ${configText(roll.effectConfig?.mode, "restricted actions")}.`;
  }
  if (roll.rollKind === "saving_throw_repeat") {
    const checkType = labelFor(repeatSaveCheckTypes, configText(roll.effectConfig?.checkType));
    const outcome = labelFor(
      repeatSaveSuccessOutcomes,
      configText(roll.effectConfig?.successOutcome),
    );
    return `${subject} repeats the ${configText(roll.effectConfig?.ability, "configured")} ${checkType || "check"}; on success, ${outcome || "resolve the effect"}.`;
  }
  if (roll.rollKind === "area_trigger") {
    const trigger = labelFor(areaTriggerModes, configText(roll.effectConfig?.trigger));
    const outcome = labelFor(areaTriggerOutcomes, configText(roll.effectConfig?.outcome));
    const save = configText(roll.effectConfig?.saveAbility, "");
    const details = configText(roll.effectConfig?.details, "");
    return `Area trigger: ${trigger || "manual trigger"} causes ${outcome || "the configured effect"}${save ? ` (${save} save)` : ""}${details ? `; ${details}` : ""}.`;
  }
  if (roll.rollKind === "visibility_effect") {
    return `${subject}: ${configText(roll.effectConfig?.mode, "visibility effect")}.`;
  }
  if (roll.rollKind === "sense_effect") {
    return `${subject} gains ${configText(roll.effectConfig?.mode, "a special sense")}.`;
  }
  if (roll.rollKind === "terrain_effect") {
    return `Terrain or movement rule: ${configText(roll.effectConfig?.mode, "configured terrain effect")}.`;
  }
  if (roll.rollKind === "death_protection") {
    return `${subject}: ${configText(roll.effectConfig?.mode, "death protection")}.`;
  }
  if (roll.rollKind === "linked_healing") {
    return `${configText(roll.effectConfig?.target, "Caster")} heals from ${configText(roll.effectConfig?.source, "the linked effect")}.`;
  }
  if (roll.rollKind === "damage_transfer") {
    return `Damage transfer: ${configText(roll.effectConfig?.mode, "configured transfer")}.`;
  }
  if (roll.rollKind === "battlefield_object") {
    return `Battlefield object: ${configText(roll.effectConfig?.kind, "manual object")}.`;
  }
  if (roll.rollKind === "forced_movement") {
    const amount = effectAmount(roll);
    const direction = configText(roll.effectConfig?.direction, "forced movement");
    if (direction === "prone") return `${subject} has the Prone condition.`;
    return `${subject}: ${direction} ${amount ? `${amount} feet` : ""}.`;
  }
  const amount = effectAmount(roll);
  if (!amount) return "";
  const label = spellRollKinds.find((option) => option.value === roll.rollKind)?.label ?? "Effect";
  if (roll.rollKind === "damage") return `${subject} takes ${amount} ${roll.damageType} damage.`;
  if (roll.rollKind === "healing") return `${subject} regains ${amount} hit points.`;
  if (roll.rollKind === "max_hp") return `${subject}'s hit point maximum increases by ${amount}.`;
  if (roll.rollKind === "max_hp_reduction") {
    return `${subject}'s hit point maximum is reduced by ${amount}.`;
  }
  if (roll.rollKind === "temp_hp") {
    return `${subject}'s temporary hit points become ${amount}.`;
  }
  if (roll.rollKind === "speed_bonus") {
    return `${subject}'s speed increases by ${amount} feet.`;
  }
  if (roll.rollKind === "speed_reduction") {
    return `${subject}'s speed is reduced by ${amount} feet.`;
  }
  if (roll.rollKind === "speed_multiplier") {
    return `${subject}'s speed is ${configText(roll.effectConfig?.multiplier) === "2" ? "doubled" : "halved"}.`;
  }
  if (roll.rollKind === "movement_mode") {
    return `${subject} gains ${configText(roll.effectConfig?.mode, "a movement")} speed ${amount ? `of ${amount} feet` : "based on its walking speed"}.`;
  }
  if (roll.rollKind === "ac_bonus")
    return `${subject} gains a ${(Number(roll.fixedValue) || 0) >= 0 ? "+" : ""}${amount} bonus to AC.`;
  if (roll.rollKind === "base_ac")
    return `${subject}'s base AC becomes ${baseACText(roll, amount)}.`;
  if (roll.rollKind === "roll_modifier") {
    return `${subject} ${configText(roll.effectConfig?.mode, "adds")}s ${amount} to ${rollCategoryText(roll.effectConfig?.categories)}.`;
  }
  if (roll.rollKind === "attack_damage_rider")
    return `${subject}'s attacks deal an extra ${amount}.`;
  if (roll.rollKind === "revive") return `${subject} returns to life with ${amount} hit points.`;
  return `${label}: ${amount}.`;
}

function isAreaEffect(spell: SpellLike) {
  return targetPattern(spell) === "area" && !!spell.aoeType && spell.aoeType !== "None";
}

function effectAmount(roll: SpellLike["actions"][number]["rolls"][number]) {
  const diceCount = Number(roll.diceCount) || 0;
  const dieSize = Number(roll.dieSize) || 6;
  const fixed = Number(roll.fixedValue) || 0;
  const parts = [];
  if (diceCount > 0) parts.push(`${diceCount}d${dieSize}`);
  if (fixed > 0) parts.push(String(fixed));
  if (fixed < 0) parts.push(String(fixed));
  if (roll.addPrimaryStatModifier) parts.push("spellcasting ability modifier");
  if (parts.length === 0) return "";
  return parts
    .map((part, index) => {
      if (index === 0) return part;
      return part.startsWith("-") ? `- ${part.slice(1)}` : `+ ${part}`;
    })
    .join(" ");
}

function baseACText(roll: SpellLike["actions"][number]["rolls"][number], fallback: string) {
  if (configText(roll.effectConfig?.calculationMode, "formula") === "standard_ac") {
    const ability = labelFor(
      baseACAbilityModifiers,
      configText(roll.effectConfig?.abilityModifier),
    );
    return `${configText(roll.effectConfig?.baseValue, fallback)}${ability ? ` + ${ability}` : ""}`;
  }
  return configText(roll.effectConfig?.formula, fallback);
}

function rollCategoryText(value: unknown) {
  const categories = configStringArray(value)
    .map((category) => labelFor(rollModifierCategories, category))
    .filter(Boolean);
  return categories.length > 0 ? categories.join(", ") : "a configured roll";
}

function listOrFallback(value: unknown, fallback: string) {
  const values = configStringArray(value);
  return values.length > 0 ? values.join(", ") : fallback;
}

function restrictionText(value: unknown) {
  const label = labelFor(damageDefenseRestrictions, configText(value));
  return label && label !== "No restriction" ? ` (${label.toLowerCase()})` : "";
}

function configStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function labelFor(options: Array<{ value: string; label: string }>, value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function plural(value: string, count: number) {
  return count === 1 ? value.toLowerCase() : `${value.toLowerCase()}s`;
}

function damageTypeLabel(value: string) {
  if (value === "weapon_original") return "the weapon's original damage";
  return damageTypes.find((type) => type.id === value)?.label.toLowerCase() ?? "";
}

function list(values: string[]) {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} or ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, or ${values[values.length - 1]}`;
}

function ordinalNumber(value: number) {
  const suffix = value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th";
  return `${value}${suffix} level`;
}

function stringFromUnknown(value: unknown, fallback: string) {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

function targetPattern(spell: SpellLike) {
  const value =
    spell.targetPattern ||
    (typeof spell.mechanics?.targetPattern === "string" ? spell.mechanics.targetPattern : "") ||
    "target";
  if (value === "area_around_target" || value === "area_around_attack_target") return "area";
  return value;
}

function targetAnchor(spell: SpellLike) {
  const value =
    spell.targetAnchor ||
    (typeof spell.mechanics?.targetAnchor === "string" ? spell.mechanics.targetAnchor : "") ||
    "chosen_target";
  if (value === "triggering_attack_target") return "target_hit_by_triggering_attack";
  if (value === "selected_target") return "chosen_target";
  return value;
}
