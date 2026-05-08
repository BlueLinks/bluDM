import type { ActionFormState, CreatureFormState, PlayerFormState } from "../../types";
import { abilities } from "../domain/options";

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
    description: action.description,
    recharge: action.recharge,
    limitedUses: Number(action.limitedUses) || 0,
    limitType: action.limitType,
    reach: Number(action.reach) || 0,
    range: Number(action.range) || 0,
    aoeType: action.aoeType,
    aoeSize: Number(action.aoeSize) || 0,
    actionType: action.actionType,
    attackModifier: Number(action.attackModifier) || 0,
    missEffect: action.missEffect,
    hitSpecialEvent: action.hitSpecialEvent,
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

export function playerPayload(payload: PlayerFormState) {
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
      level: Number(payload.level),
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
      senses: payload.senses,
      spellcastingAbility: payload.spellcastingAbility,
      innateSpellcastingAbility: payload.innateSpellcastingAbility,
      casterLevel: Number(payload.casterLevel),
      spellSaveDC: Number(payload.spellSaveDC),
      spellAttackBonus: Number(payload.spellAttackBonus),
    },
  };
}
