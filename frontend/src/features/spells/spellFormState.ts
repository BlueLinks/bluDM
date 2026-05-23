import { createId } from "../../lib/domain/ids";
import type {
  Spell,
  SpellActionFormState,
  SpellActionRollFormState,
  SpellAreaScalingFormState,
  SpellFormState,
  SpellProjectileScalingFormState,
} from "../../types";

export const emptySpellForm: SpellFormState = {
  name: "",
  level: "0",
  school: "",
  castingTime: "",
  castType: "Action",
  range: "",
  rangeType: "Range",
  rangeFeet: "0",
  duration: "",
  durationType: "Instantaneous",
  durationValue: "0",
  durationScale: "Minute",
  aoeType: "None",
  aoeSize: "0",
  ritual: false,
  concentration: false,
  scalingType: "none",
  description: "",
  higherLevel: "",
  sourceNote: "",
  sourceMaterial: "",
  castingTrigger: "normal",
  triggerDetail: "",
  targetPattern: "target",
  targetAnchor: "chosen_target",
  materialComponents: "",
  components: { verbal: false, somatic: false, material: false },
  classes: [],
  projectileScaling: undefined,
  areaScaling: undefined,
  actions: [],
};

export function blankProjectileScaling(): SpellProjectileScalingFormState {
  return {
    baseProjectiles: "1",
    scalingType: "none",
    scaleFromLevel: "0",
    additionalProjectiles: "0",
    stepSize: "1",
    description: "",
    cantrip5Targets: "0",
    cantrip11Targets: "0",
    cantrip17Targets: "0",
  };
}

export function blankAreaScaling(): SpellAreaScalingFormState {
  return {
    scalingType: "none",
    scaleFromLevel: "0",
    additionalSize: "0",
    stepSize: "1",
    description: "",
  };
}

export function blankSpellAction(): SpellActionFormState {
  return {
    id: createId("spell-action"),
    name: "",
    actionType: "damage",
    saveAbility: "",
    successfulSaveEffect: "none",
    attackModifier: "0",
    hitSpecialEvent: "none",
    weaponSource: "chosen_weapon",
    attackAbilityOverride: "normal",
    damageAbilityOverride: "normal",
    damageTypeChoice: "weapon",
    damageTypeOptions: ["radiant"],
    rolls: [],
  };
}

export function blankSpellRoll(): SpellActionRollFormState {
  return {
    id: createId("spell-roll"),
    rollKind: "damage",
    damageType: "force",
    magical: true,
    diceCount: "1",
    dieSize: "6",
    fixedValue: "0",
    addPrimaryStatModifier: false,
    conditionName: "",
    timing: "immediate",
    scalingType: "none",
    scalingFromLevel: "0",
    scalingDiceCount: "0",
    scalingDieSize: "6",
    scalingFixedValue: "0",
    scalingStepSize: "1",
    cantrip5DiceCount: "0",
    cantrip5DieSize: "6",
    cantrip11DiceCount: "0",
    cantrip11DieSize: "6",
    cantrip17DiceCount: "0",
    cantrip17DieSize: "6",
  };
}

export function spellToForm(spell: Spell): SpellFormState {
  const castType = normalizeCastType(spell.castType);
  return {
    ...emptySpellForm,
    name: spell.name,
    level: String(spell.level),
    school: spell.school,
    castType,
    castingTime:
      castType === "Longer Time" && !spell.castingTime ? spell.castType : spell.castingTime,
    range: spell.range,
    rangeType: spell.rangeType,
    rangeFeet: String(spell.rangeFeet),
    duration: spell.duration,
    durationType: spell.durationType,
    durationValue: String(spell.durationValue),
    durationScale: spell.durationScale,
    aoeType: spell.aoeType,
    aoeSize: String(spell.aoeSize),
    ritual: spell.ritual,
    concentration: spell.concentration,
    scalingType: spell.scalingType,
    description: spell.description,
    higherLevel: spell.higherLevel,
    sourceNote: spell.sourceNote,
    sourceMaterial: spell.sourceMaterial,
    castingTrigger: stringFromMechanics(spell.mechanics, "castingTrigger", "normal"),
    triggerDetail: stringFromMechanics(spell.mechanics, "triggerDetail", ""),
    targetPattern: normalizeTargetPattern(
      stringFromMechanics(spell.mechanics, "targetPattern", "target"),
    ),
    targetAnchor: normalizeTargetAnchor(
      stringFromMechanics(spell.mechanics, "targetAnchor", "chosen_target"),
    ),
    materialComponents: spell.materialComponents,
    components: {
      verbal: Boolean(spell.components.verbal),
      somatic: Boolean(spell.components.somatic),
      material: Boolean(spell.components.material),
    },
    classes: spell.classes ?? [],
    projectileScaling: spell.projectileScaling
      ? {
          baseProjectiles: String(spell.projectileScaling.baseProjectiles),
          scalingType: spell.projectileScaling.scalingType,
          scaleFromLevel: String(spell.projectileScaling.scaleFromLevel),
          additionalProjectiles: String(spell.projectileScaling.additionalProjectiles),
          stepSize: String(spell.projectileScaling.stepSize),
          description: spell.projectileScaling.description,
          cantrip5Targets: stringFromCantripScaling(
            spell.projectileScaling.cantripScaling,
            "5",
            "targets",
          ),
          cantrip11Targets: stringFromCantripScaling(
            spell.projectileScaling.cantripScaling,
            "11",
            "targets",
          ),
          cantrip17Targets: stringFromCantripScaling(
            spell.projectileScaling.cantripScaling,
            "17",
            "targets",
          ),
        }
      : undefined,
    areaScaling: areaScalingFromMechanics(spell.mechanics),
    actions: spell.actions.map((action) => ({
      id: action.id,
      name: action.name,
      actionType: action.actionType,
      saveAbility: action.saveAbility,
      successfulSaveEffect: action.successfulSaveEffect,
      attackModifier: String(action.attackModifier),
      hitSpecialEvent: action.hitSpecialEvent,
      weaponSource: action.weaponSource || "chosen_weapon",
      attackAbilityOverride: action.attackAbilityOverride || "normal",
      damageAbilityOverride: action.damageAbilityOverride || "normal",
      damageTypeChoice: normalizeDamageTypeChoice(action.damageTypeChoice),
      damageTypeOptions: action.damageTypeOptions?.length ? action.damageTypeOptions : ["radiant"],
      rolls: action.rolls.map((roll) => ({
        id: roll.id,
        rollKind: roll.rollKind,
        damageType: roll.damageType,
        magical: roll.magical,
        diceCount: String(roll.diceCount),
        dieSize: String(roll.dieSize),
        fixedValue: String(roll.fixedValue),
        addPrimaryStatModifier: roll.addPrimaryStatModifier,
        conditionName: roll.conditionName ?? "",
        timing: roll.timing ?? "immediate",
        scalingType: roll.scalingType,
        scalingFromLevel: String(roll.scalingFromLevel),
        scalingDiceCount: String(roll.scalingDiceCount),
        scalingDieSize: String(roll.scalingDieSize),
        scalingFixedValue: String(roll.scalingFixedValue),
        scalingStepSize: String(roll.scalingStepSize),
        cantrip5DiceCount: stringFromCantripScaling(roll.cantripScaling, "5", "diceCount"),
        cantrip5DieSize: stringFromCantripScaling(roll.cantripScaling, "5", "dieSize"),
        cantrip11DiceCount: stringFromCantripScaling(roll.cantripScaling, "11", "diceCount"),
        cantrip11DieSize: stringFromCantripScaling(roll.cantripScaling, "11", "dieSize"),
        cantrip17DiceCount: stringFromCantripScaling(roll.cantripScaling, "17", "diceCount"),
        cantrip17DieSize: stringFromCantripScaling(roll.cantripScaling, "17", "dieSize"),
      })),
    })),
  };
}

function areaScalingFromMechanics(
  mechanics: Record<string, unknown> | undefined,
): SpellAreaScalingFormState | undefined {
  const raw = mechanics?.areaScaling;
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

function normalizeDamageTypeChoice(value: string) {
  if (value === "normal") return "weapon";
  if (value === "radiant_or_normal" || value === "radiant_or_weapon" || value === "custom_choice") {
    return "choice";
  }
  if (value === "spell_roll" || value === "effect" || value === "radiant") return "specific";
  return value || "weapon";
}

function normalizeTargetPattern(value: string) {
  if (value === "chosen_targets" || value === "attack_target") return "target";
  if (value === "area_around_attack_target") return "area_around_target";
  return value || "target";
}

function normalizeCastType(value: string) {
  if (value === "Minute" || value === "Hour") return "Longer Time";
  if (
    value === "Action" ||
    value === "Bonus Action" ||
    value === "Reaction" ||
    value === "Longer Time" ||
    value === "Special"
  ) {
    return value;
  }
  return "Action";
}

function normalizeTargetAnchor(value: string) {
  if (value === "selected_target") return "chosen_target";
  if (value === "triggering_attack_target") return "target_hit_by_triggering_attack";
  return value || "chosen_target";
}

function stringFromMechanics(
  mechanics: Record<string, unknown> | undefined,
  key: string,
  fallback: string,
) {
  const value = mechanics?.[key];
  return stringFromUnknown(value, fallback);
}

function stringFromCantripScaling(
  scaling: Record<string, unknown> | undefined,
  level: string,
  key: string,
) {
  const fallback = key === "dieSize" ? "6" : "0";
  const entry = scaling?.[level];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return fallback;
  const value = (entry as Record<string, unknown>)[key];
  return stringFromUnknown(value, fallback);
}

function stringFromUnknown(value: unknown, fallback: string) {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}
