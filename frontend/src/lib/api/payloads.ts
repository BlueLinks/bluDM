import type {
  ActionFormState,
  CreatureFormState,
  ItemFormState,
  PlayerFormState,
  SpellFormState,
} from "../../types";
import { abilities } from "../domain/options";
import { effectiveCharacterLevel } from "../domain/progression";

export function parseJSONField(value: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON fields must contain an object");
  }
  return parsed as Record<string, unknown>;
}

export function actionPayload(action: ActionFormState) {
  return {
    name: action.name,
    sourceTemplateId: action.sourceTemplateId ?? "",
    description: action.description,
    recharge: action.recharge,
    limitedUses: Number(action.limitedUses) || 0,
    limitType: action.limitType,
    reach: Number(action.reach) || 0,
    range: Number(action.range) || 0,
    aoeType: action.aoeType,
    aoeSize: Number(action.aoeSize) || 0,
    actionType: action.actionType,
    displaySection: action.displaySection,
    attackModifier: Number(action.attackModifier) || 0,
    missEffect: action.missEffect,
    hitSpecialEvent: action.hitSpecialEvent,
    iconSource: action.iconSource,
    iconKey: action.iconKey,
    iconAssetId: action.iconAssetId,
    iconUrl: action.iconUrl,
    iconAttribution: action.iconAttribution,
    rolls: action.rolls.map((roll) => ({
      rollKind: roll.rollKind,
      damageType: roll.damageType,
      magical: roll.magical,
      diceCount: Number(roll.diceCount) || 1,
      dieSize: Number(roll.dieSize) || 6,
      fixedValue: Number(roll.fixedValue) || 0,
    })),
  };
}

export function spellPayload(payload: SpellFormState) {
  return {
    name: payload.name,
    level: Number(payload.level) || 0,
    school: payload.school,
    castingTime: spellCastingTime(payload),
    castType: payload.castType,
    range: payload.range,
    rangeType: payload.rangeType,
    rangeFeet: Number(payload.rangeFeet) || 0,
    components: {
      verbal: payload.components.verbal,
      somatic: payload.components.somatic,
      material: payload.components.material,
      materialText: payload.materialComponents,
    },
    materialComponents: payload.materialComponents,
    classes: payload.classes,
    duration: payload.duration,
    durationType: payload.durationType,
    durationValue: Number(payload.durationValue) || 0,
    durationScale: payload.durationScale,
    aoeType: payload.aoeType,
    aoeSize: payload.aoeType === "None" ? 0 : Number(payload.aoeSize) || 0,
    ritual: payload.ritual,
    concentration: payload.concentration,
    scalingType: payload.scalingType,
    description: payload.description,
    higherLevel: payload.higherLevel,
    sourceNote: payload.sourceNote,
    sourceMaterial: payload.sourceMaterial,
    mechanics: {
      castingTrigger: payload.castingTrigger,
      triggerDetail: payload.triggerDetail,
      targetPattern: payload.targetPattern,
      targetAnchor: payload.targetAnchor,
      ...(payload.areaScaling && payload.areaScaling.scalingType !== "none"
        ? {
            areaScaling: {
              scalingType: payload.areaScaling.scalingType,
              scaleFromLevel: Number(payload.areaScaling.scaleFromLevel) || 0,
              additionalSize: Number(payload.areaScaling.additionalSize) || 0,
              stepSize: Number(payload.areaScaling.stepSize) || 1,
              description: payload.areaScaling.description,
            },
          }
        : {}),
    },
    projectileScaling: payload.projectileScaling
      ? {
          baseProjectiles: Number(payload.projectileScaling.baseProjectiles) || 1,
          scalingType: payload.projectileScaling.scalingType,
          scaleFromLevel: Number(payload.projectileScaling.scaleFromLevel) || 0,
          additionalProjectiles: Number(payload.projectileScaling.additionalProjectiles) || 0,
          stepSize: Number(payload.projectileScaling.stepSize) || 1,
          description: payload.projectileScaling.description,
          cantripScaling: projectileCantripScalingPayload(payload.projectileScaling),
        }
      : undefined,
    actions: payload.actions.map((action) => ({
      name: action.name,
      actionType: action.actionType,
      saveAbility: action.saveAbility,
      successfulSaveEffect: action.successfulSaveEffect,
      attackModifier: Number(action.attackModifier) || 0,
      hitSpecialEvent: action.hitSpecialEvent,
      weaponSource: action.weaponSource,
      attackAbilityOverride: action.attackAbilityOverride,
      damageAbilityOverride: action.damageAbilityOverride,
      damageTypeChoice: action.damageTypeChoice,
      damageTypeOptions: action.damageTypeOptions,
      rolls: action.rolls.map((roll) => ({
        rollKind: roll.rollKind,
        damageType: roll.damageType,
        magical: roll.magical,
        diceCount: Number(roll.diceCount) || 0,
        dieSize: Number(roll.dieSize) || 6,
        fixedValue: Number(roll.fixedValue) || 0,
        addPrimaryStatModifier: roll.addPrimaryStatModifier,
        conditionName: roll.conditionName,
        effectConfig: roll.effectConfig ?? {},
        timing: roll.timing,
        scalingType: roll.scalingType,
        scalingFromLevel: roll.scalingType === "none" ? 0 : Number(roll.scalingFromLevel) || 0,
        scalingDiceCount: roll.scalingType === "none" ? 0 : Number(roll.scalingDiceCount) || 0,
        scalingDieSize: roll.scalingType === "none" ? 6 : Number(roll.scalingDieSize) || 6,
        scalingFixedValue: roll.scalingType === "none" ? 0 : Number(roll.scalingFixedValue) || 0,
        scalingStepSize: roll.scalingType === "none" ? 1 : Number(roll.scalingStepSize) || 1,
        cantripScaling: cantripScalingPayload(roll),
      })),
    })),
  };
}

export function itemPayload(payload: ItemFormState) {
  const damage: Record<string, unknown> = {};
  const itemKind = itemCategoryKind(payload.category);
  if (itemKind === "weapon" && (payload.damageDice || payload.damageType)) {
    damage.damage = {
      damage_dice: payload.damageDice,
      damage_type: payload.damageType ? { name: payload.damageType } : undefined,
    };
  }
  if (itemKind === "weapon" && payload.twoHandedDamageDice) {
    damage.two_handed_damage = { damage_dice: payload.twoHandedDamageDice };
  }
  if (itemKind === "weapon" && (payload.normalRange || payload.longRange)) {
    damage.range = {
      normal: Number(payload.normalRange) || 0,
      long: Number(payload.longRange) || 0,
    };
  }
  if (itemKind === "weapon" && (payload.thrownNormalRange || payload.thrownLongRange)) {
    damage.throw_range = {
      normal: Number(payload.thrownNormalRange) || 0,
      long: Number(payload.thrownLongRange) || 0,
    };
  }

  const armorClass: Record<string, unknown> = {};
  if (itemKind === "armor") {
    if (payload.acMode === "bonus") {
      addNumber(armorClass, "bonus", payload.acBonus);
    } else {
      addNumber(armorClass, "base", payload.acBase);
    }
    if (payload.dexModifier && payload.dexModifier !== "none") {
      armorClass.dex_modifier = payload.dexModifier;
    }
    addNumber(armorClass, "str_minimum", payload.strengthMinimum);
    if (payload.stealthDisadvantage) armorClass.stealth_disadvantage = true;
    if (payload.shield) armorClass.shield = true;
  }

  const data: Record<string, unknown> = {
    inventory: {
      carried: payload.inventoryCarried,
      equippable: payload.inventoryEquippable,
      consumable: payload.inventoryConsumable,
      stackable: payload.inventoryStackable,
    },
  };
  if (itemKind === "weapon") {
    addString(data, "weaponCategory", payload.weaponCategory);
    addString(data, "weaponRange", payload.weaponRange);
    addString(data, "mastery", payload.mastery);
  }
  if (itemKind === "armor") {
    addString(data, "armorCategory", payload.armorCategory);
  }
  if (itemKind === "tool") {
    addString(data, "toolCategory", payload.toolCategory);
    addString(data, "ability", payload.ability);
    addString(data, "utilize", payload.utilize);
    addList(data, "craft_outputs", splitList(payload.craftOutputs));
    addList(data, "variants", splitList(payload.variants));
  }
  if (itemKind === "focus") {
    addString(data, "focusFamily", payload.focusFamily);
    addString(data, "variant", payload.focusVariant);
    addString(data, "focus_usage", payload.focusUsage);
  }
  if (itemKind === "ammunition") {
    addNumber(data, "quantity", payload.quantity);
    addString(data, "compatible_weapon", payload.compatibleWeapon);
  }
  if (itemKind === "pack") {
    addList(data, "contents", splitList(payload.contents));
  }
  if (itemKind === "consumable" || itemKind === "food") {
    addNumber(data, "quantity", payload.quantity);
    addNumber(data, "uses", payload.uses);
    addNumber(data, "charges", payload.charges);
    addString(data, "effect", payload.effect);
    addString(data, "consumableType", payload.consumableType);
    addString(data, "consumeBehavior", payload.consumeBehavior);
  }
  if (itemKind === "food") {
    addString(data, "serviceDuration", payload.serviceDuration);
    addString(data, "quality", payload.quality);
  }
  if (itemKind === "mount" || itemKind === "vehicle") {
    addString(data, "speed", payload.speed);
    addString(data, "carrying_capacity", payload.carryingCapacity);
    addString(data, "cargo", payload.cargo);
    addString(data, "crew", payload.crew);
    addString(data, "passengers", payload.passengers);
    addNumber(data, "vehicleArmorClass", payload.vehicleArmorClass);
    addNumber(data, "vehicleHitPoints", payload.vehicleHitPoints);
  }
  if (itemKind === "generic") {
    addString(data, "effect", payload.effect);
  }

  return {
    name: payload.name,
    category: payload.category,
    itemType: payload.itemType,
    rarity: payload.rarity,
    attunement: payload.attunement,
    valueAmount: Number(payload.valueAmount) || 0,
    valueUnit: payload.valueUnit,
    weight: Number(payload.weight) || 0,
    description: payload.description,
    properties: itemKind === "weapon" ? payload.properties : [],
    damage,
    armorClass,
    data,
  };
}

function itemCategoryKind(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes("weapon")) return "weapon";
  if (normalized.includes("armor")) return "armor";
  if (normalized.includes("tool")) return "tool";
  if (normalized.includes("focus")) return "focus";
  if (normalized.includes("pack")) return "pack";
  if (normalized.includes("ammunition")) return "ammunition";
  if (normalized.includes("food")) return "food";
  if (normalized.includes("mount")) return "mount";
  if (normalized.includes("vehicle")) return "vehicle";
  if (normalized.includes("wondrous")) return "consumable";
  return "generic";
}

function addString(target: Record<string, unknown>, key: string, value: string) {
  if (value.trim()) target[key] = value.trim();
}

function addNumber(target: Record<string, unknown>, key: string, value: string) {
  const number = Number(value) || 0;
  if (number > 0) target[key] = number;
}

function addList(target: Record<string, unknown>, key: string, value: string[]) {
  if (value.length > 0) target[key] = value;
}

function splitList(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function spellCastingTime(payload: SpellFormState) {
  if (payload.castType === "Action") return "1 Action";
  if (payload.castType === "Bonus Action") return "1 Bonus Action";
  if (payload.castType === "Reaction") return payload.castingTime.trim() || "1 Reaction";
  if (payload.castType === "Longer Time") return payload.castingTime.trim();
  if (payload.castType === "Special") return payload.castingTime.trim() || "Special";
  return payload.castingTime.trim();
}

function projectileCantripScalingPayload(
  scaling: NonNullable<SpellFormState["projectileScaling"]>,
) {
  const hasCantripScaling =
    Number(scaling.cantrip5Targets) > 0 ||
    Number(scaling.cantrip11Targets) > 0 ||
    Number(scaling.cantrip17Targets) > 0;
  if (!hasCantripScaling) return {};
  return {
    5: { targets: Number(scaling.cantrip5Targets) || 0 },
    11: { targets: Number(scaling.cantrip11Targets) || 0 },
    17: { targets: Number(scaling.cantrip17Targets) || 0 },
  };
}

function cantripScalingPayload(roll: SpellFormState["actions"][number]["rolls"][number]) {
  const hasCantripScaling =
    Number(roll.cantrip5DiceCount) > 0 ||
    Number(roll.cantrip11DiceCount) > 0 ||
    Number(roll.cantrip17DiceCount) > 0;
  if (!hasCantripScaling) return {};
  return {
    5: {
      diceCount: Number(roll.cantrip5DiceCount) || 0,
      dieSize: Number(roll.cantrip5DieSize) || 6,
    },
    11: {
      diceCount: Number(roll.cantrip11DiceCount) || 0,
      dieSize: Number(roll.cantrip11DieSize) || 6,
    },
    17: {
      diceCount: Number(roll.cantrip17DiceCount) || 0,
      dieSize: Number(roll.cantrip17DieSize) || 6,
    },
  };
}

export function playerPayload(payload: PlayerFormState) {
  const trimmedLevelOverride = payload.level.trim();
  const levelOverride = trimmedLevelOverride === "" ? null : Number(trimmedLevelOverride);
  const level = effectiveCharacterLevel(payload.level, payload.experiencePoints);
  const spellSlots = {
    1: Number(payload.spellSlots1) || 0,
    2: Number(payload.spellSlots2) || 0,
    3: Number(payload.spellSlots3) || 0,
    4: Number(payload.spellSlots4) || 0,
    5: Number(payload.spellSlots5) || 0,
    6: Number(payload.spellSlots6) || 0,
    7: Number(payload.spellSlots7) || 0,
    8: Number(payload.spellSlots8) || 0,
    9: Number(payload.spellSlots9) || 0,
  };
  const spellSlotsRemaining = {
    1: Math.min(Number(payload.spellSlotsRemaining1) || 0, spellSlots[1]),
    2: Math.min(Number(payload.spellSlotsRemaining2) || 0, spellSlots[2]),
    3: Math.min(Number(payload.spellSlotsRemaining3) || 0, spellSlots[3]),
    4: Math.min(Number(payload.spellSlotsRemaining4) || 0, spellSlots[4]),
    5: Math.min(Number(payload.spellSlotsRemaining5) || 0, spellSlots[5]),
    6: Math.min(Number(payload.spellSlotsRemaining6) || 0, spellSlots[6]),
    7: Math.min(Number(payload.spellSlotsRemaining7) || 0, spellSlots[7]),
    8: Math.min(Number(payload.spellSlotsRemaining8) || 0, spellSlots[8]),
    9: Math.min(Number(payload.spellSlotsRemaining9) || 0, spellSlots[9]),
  };

  return {
    campaignId: payload.campaignId,
    characterName: payload.characterName,
    playerName: payload.playerName,
    avatarAssetId: payload.avatarAssetId,
    avatarUrl: payload.avatarUrl,
    armorClass: Number(payload.armorClass),
    maxHitPoints: Number(payload.maxHitPoints),
    temporaryHitPoints: Number(payload.temporaryHitPoints),
    temporaryMaxHitPoints: Number(payload.temporaryMaxHitPoints),
    experiencePoints: Number(payload.experiencePoints) || 0,
    characterSheet: {
      className: payload.className,
      level,
      levelOverride,
      species: payload.species,
      background: payload.background,
      feats: payload.feats,
      speed: Number(payload.speed),
      abilityScores: Object.fromEntries(
        abilities.map((ability) => [ability.key, Number(payload.abilityScores[ability.key])]),
      ),
      savingThrowProficiencies: payload.savingThrowProficiencies,
      skillProficiencies: payload.skillProficiencies,
      skillExpertise: payload.skillExpertise,
      passivePerception: Number(payload.passivePerception),
      passiveInvestigation: Number(payload.passiveInvestigation),
      passiveInsight: Number(payload.passiveInsight),
      spellSaveDC: Number(payload.spellSaveDC),
      spellSlots,
      spellSlotsRemaining,
      damageVulnerabilities: payload.damageVulnerabilities,
      damageResistances: payload.damageResistances,
      damageImmunities: payload.damageImmunities,
      conditionImmunities: payload.conditionImmunities,
      senses: payload.senses,
      spellcastingAbility: payload.spellcastingAbility,
      innateSpellcastingAbility: payload.innateSpellcastingAbility,
      notes: payload.notes,
    },
  };
}

export function creaturePayload(payload: CreatureFormState) {
  return {
    imageAssetId: payload.imageAssetId,
    avatarUrl: payload.avatarUrl,
    name: payload.name,
    description: payload.description,
    size: payload.size,
    creatureType: payload.creatureType,
    alignment: payload.alignment,
    armorClass: Number(payload.armorClass),
    hitPoints: Number(payload.hitPoints),
    hitDice: payload.hitDice,
    challengeRating: payload.challengeRating,
    xp: Number(payload.xp),
    statBlock: {
      ...parseJSONField(payload.statBlock),
      speed: {
        walk: Number(payload.walkSpeed) || 0,
        swim: Number(payload.swimSpeed) || 0,
        fly: Number(payload.flySpeed) || 0,
        burrow: Number(payload.burrowSpeed) || 0,
        climb: Number(payload.climbSpeed) || 0,
      },
      creatureSubtype: payload.creatureSubtype,
      environment: payload.environment,
      defaultDisposition: payload.defaultDisposition,
      languages: payload.languages,
      passivePerception: Number(payload.passivePerception),
      passiveInvestigation: Number(payload.passiveInvestigation),
      passiveInsight: Number(payload.passiveInsight),
      abilityScores: Object.fromEntries(
        abilities.map((ability) => [ability.key, Number(payload.abilityScores[ability.key])]),
      ),
      savingThrowProficiencies: payload.savingThrowProficiencies,
      skillProficiencies: payload.skillProficiencies,
      skillExpertise: payload.skillExpertise,
      damageVulnerabilities: payload.damageVulnerabilities,
      damageResistances: payload.damageResistances,
      damageImmunities: payload.damageImmunities,
      conditionImmunities: payload.conditionImmunities,
      traits: payload.traits
        .map((trait) => ({
          name: trait.name.trim(),
          description: trait.description.trim(),
        }))
        .filter((trait) => trait.name || trait.description),
      legendaryDescription: payload.legendaryDescription.trim(),
      mythicDescription: payload.mythicDescription.trim(),
      senses: payload.senses,
      spellcastingAbility: payload.spellcastingAbility,
      innateSpellcastingAbility: payload.innateSpellcastingAbility,
      casterLevel: Number(payload.casterLevel),
      spellSaveDC: Number(payload.spellSaveDC),
      spellAttackBonus: Number(payload.spellAttackBonus),
    },
  };
}
