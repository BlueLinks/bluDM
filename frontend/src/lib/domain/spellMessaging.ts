import { displayACFormula } from "./acFormula";
import { configText } from "./effectConfig";
import {
  advantageStates,
  damageDefenseModes,
  forcedMovementDirections,
  rollModifierCategories,
  rollModifierModes,
  spellCastingTriggers,
  spellEffectTimings,
  spellRollKinds,
  spellTargetAnchors,
  spellTargetPatterns,
} from "./options";
import {
  actionRestrictionModes,
  advantageAppliesTo,
  areaTriggerModes,
  areaTriggerOutcomes,
  baseACAbilityModifiers,
  battlefieldAreaShapes,
  battlefieldObjectTypes,
  damageDefenseRestrictions,
  effectAbilities,
  repeatSaveCheckTypes,
  repeatSaveSuccessOutcomes,
  senseEffectModes,
  terrainEffectModes,
  visibilityEffectModes,
} from "./spellEffectOptions";

type Option = { value: string; label: string };

const mechanicLabels: Record<string, string> = {
  areaScaling: "Area scaling",
  attackType: "Attack type",
  castingTrigger: "Casting trigger",
  damage: "Damage",
  dc: "Difficulty class",
  healAtSlotLevel: "Healing by slot level",
  rawText: "Imported source text",
  source: "Source",
  targetAnchor: "Target anchor",
  targetPattern: "Targeting",
  triggerDetail: "Trigger detail",
};

const optionGroups: Option[][] = [
  actionRestrictionModes,
  advantageAppliesTo,
  advantageStates,
  areaTriggerModes,
  areaTriggerOutcomes,
  baseACAbilityModifiers,
  battlefieldAreaShapes,
  battlefieldObjectTypes,
  damageDefenseModes,
  damageDefenseRestrictions,
  effectAbilities,
  forcedMovementDirections,
  repeatSaveCheckTypes,
  repeatSaveSuccessOutcomes,
  rollModifierCategories,
  rollModifierModes,
  senseEffectModes,
  spellCastingTriggers,
  spellEffectTimings,
  spellRollKinds,
  spellTargetAnchors,
  spellTargetPatterns,
  terrainEffectModes,
  visibilityEffectModes,
];

export function friendlyOption(value: unknown, fallback = "") {
  const text = configText(value, fallback);
  if (!text) return fallback;
  for (const group of optionGroups) {
    const found = group.find((option) => option.value === text);
    if (found) return found.label;
  }
  return fallbackForToken(text);
}

export function friendlyMechanicKey(key: string) {
  return mechanicLabels[key] ?? humanizeToken(key);
}

export function friendlyMechanicValue(key: string, value: unknown): string {
  if (Array.isArray(value))
    return friendlyList(value.map((item) => friendlyMechanicValue(key, item)));
  if (typeof value === "object" && value) {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== null && item !== "" && !emptyArray(item))
      .map(
        ([childKey, item]) =>
          `${friendlyMechanicKey(childKey)}: ${friendlyMechanicValue(childKey, item)}`,
      )
      .join("; ");
  }
  if (key === "castingTrigger") return friendlyOption(value, "Normal casting");
  if (key === "targetPattern") return friendlyOption(value, "Target");
  if (key === "targetAnchor") return friendlyOption(value, "Chosen target");
  return friendlyOption(value, String(value));
}

export function friendlyRollCategories(
  config?: Record<string, unknown>,
  fallback = "configured rolls",
) {
  const categories = stringArray(config?.categories);
  const legacy = configText(config?.category);
  const values = categories.length > 0 ? categories : legacy ? [legacy] : [];
  if (hasEveryRollCategory(values)) return "all roll categories";
  return values.length > 0
    ? friendlyList(values.map((value) => lowerFirst(labelFor(rollModifierCategories, value))))
    : fallback;
}

export function friendlyAdvantageEffect(config?: Record<string, unknown>) {
  const state = friendlyOption(config?.state, "Advantage").toLowerCase();
  const appliesTo = friendlyOption(config?.appliesTo, "Target's rolls");
  const verb = appliesTo.toLowerCase().endsWith("rolls") ? "have" : "has";
  return `${appliesTo} ${verb} ${state} on ${friendlyRollCategories(config)}.`;
}

export function friendlyRerollEffect(config?: Record<string, unknown>) {
  const mode = configText(config?.mode, "reroll_use_lower");
  const appliesTo = friendlyOption(config?.appliesTo, "Triggering creature");
  const categories = rollCategoryValues(config);
  const rolls = hasEveryRollCategory(categories)
    ? "the d20"
    : friendlyRollCategories(config, "the configured d20 roll");
  if (mode === "reroll_use_higher")
    return `${appliesTo} rerolls ${rolls} and uses the higher roll.`;
  if (mode === "reroll_choose")
    return `${appliesTo} rerolls ${rolls}; the DM chooses which roll is used.`;
  return `${appliesTo} rerolls ${rolls} and uses the lower roll.`;
}

export function friendlyDamageDefense(config?: Record<string, unknown>) {
  const damageTypes = friendlyList(
    stringArray(config?.damageTypes).map((type) => friendlyOption(type)),
  );
  const restriction = friendlyOption(config?.restriction);
  return [
    `${friendlyOption(config?.mode, "Defense")} to ${damageTypes || "chosen damage"}`,
    restriction && restriction !== "No restriction" ? restriction : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function friendlyRepeatSave(config?: Record<string, unknown>) {
  const checkType = friendlyOption(config?.checkType, "check");
  const abilityValue = configText(config?.ability);
  const ability = abilityValue ? labelFor(effectAbilities, abilityValue) : "configured ability";
  const outcome = friendlyOption(config?.successOutcome, "configured outcome");
  return `Repeat ${checkType} (${ability}); success: ${outcome}`;
}

export function friendlyBattlefieldObject(config?: Record<string, unknown>) {
  const radius = configText(config?.radiusFeet);
  const height = configText(config?.heightFeet);
  const layers = Array.isArray(config?.layers) ? config.layers.length : 0;
  const parts = [
    labelFor(battlefieldObjectTypes, configText(config?.kind, "manual_object")),
    labelFor(battlefieldAreaShapes, configText(config?.shape)),
    radius ? `${radius} ft.` : "",
    height ? `${height} ft. high` : "",
    layers ? `${layers} layers` : "",
  ].filter(Boolean);
  return `Battlefield object: ${parts.join(" · ")}`;
}

export function friendlyRollTable(config?: Record<string, unknown>) {
  const dice = configText(config?.dice, "table roll");
  const name = configText(config?.name, "Roll table");
  const rows = Array.isArray(config?.rows) ? config.rows.length : 0;
  return `${name}: ${dice}${rows ? ` · ${rows} outcomes` : ""}`;
}

export function friendlyRollTableDetails(config?: Record<string, unknown>) {
  const rows = objectRows(config?.rows);
  if (rows.length === 0) return friendlyRollTable(config);
  const entries = rows.map((row, index) => {
    const roll = configText(row.roll, String(index + 1));
    const name = configText(row.name || row.color, "Outcome");
    return `${roll}. ${name}${effectDetail(row) ? `: ${effectDetail(row)}` : ""}`;
  });
  return `${friendlyRollTable(config)} (${entries.join("; ")})`;
}

export function friendlyLayeredEffect(config?: Record<string, unknown>) {
  const name = configText(config?.name, "Layered effect");
  const layers = Array.isArray(config?.layers) ? config.layers.length : 0;
  return `${name}${layers ? ` · ${layers} layers` : ""}`;
}

export function friendlyLayeredEffectDetails(config?: Record<string, unknown>) {
  const layers = objectRows(config?.layers);
  if (layers.length === 0) return friendlyLayeredEffect(config);
  const entries = layers.map((layer, index) => {
    const order = configText(layer.order, String(index + 1));
    const color = configText(layer.color || layer.name, "Layer");
    const details = [
      damageDetail(layer),
      configText(layer.effectText || layer.effect),
      configText(layer.rangedAttackRule),
      configText(layer.removal) ? `Removal: ${configText(layer.removal)}` : "",
    ].filter(Boolean);
    return `${order}. ${color}${details.length ? `: ${details.join("; ")}` : ""}`;
  });
  return `${friendlyLayeredEffect(config)} (${entries.join("; ")})`;
}

export function friendlyEffectLabel(effect: {
  amount?: number;
  conditionName?: string;
  effectKind: string;
  payload?: Record<string, unknown>;
  spellName?: string;
  timing?: string;
}) {
  const amount = Number(effect.amount) || 0;
  const payload = effect.payload ?? {};
  if (effect.effectKind === "speed_bonus") return `Speed +${amount} ft.`;
  if (effect.effectKind === "speed_reduction") return `Speed -${amount} ft.`;
  if (effect.effectKind === "speed_multiplier") {
    return configText(payload.multiplier) === "2" ? "Speed doubled" : "Speed halved";
  }
  if (effect.effectKind === "movement_mode") {
    return `${friendlyOption(payload.mode, "Movement")} ${amount ? `${amount} ft.` : ""}`.trim();
  }
  if (effect.effectKind === "ac_bonus") return `AC ${amount >= 0 ? "+" : ""}${amount}`;
  if (effect.effectKind === "base_ac") {
    return `Base AC ${displayACFormula(payload.formula, String(amount))}`;
  }
  if (effect.effectKind === "damage_defense") return friendlyDamageDefense(payload);
  if (effect.effectKind === "healing_block") return "Healing blocked";
  if (effect.effectKind === "healing_maximized") return "Healing maximized";
  if (effect.effectKind === "heal_to_full") return "Heal to full";
  if (effect.effectKind === "recurring_hp_change") return `${effect.spellName}: recurring HP`;
  if (effect.effectKind === "forced_movement") return friendlyForcedMovement(payload, amount);
  if (effect.effectKind === "roll_modifier") {
    return `${friendlyOption(payload.mode, "Add")} ${configText(payload.dice, String(amount))} to ${friendlyRollCategories(payload)}`;
  }
  if (effect.effectKind === "advantage_state")
    return friendlyAdvantageEffect(payload).replace(/\.$/, "");
  if (effect.effectKind === "roll_reroll") return friendlyRerollEffect(payload).replace(/\.$/, "");
  if (effect.effectKind === "roll_table") return friendlyRollTable(payload);
  if (effect.effectKind === "layered_effect") return friendlyLayeredEffect(payload);
  if (effect.effectKind === "attack_damage_rider")
    return `Damage rider ${amount || configText(payload.dice, "")}`;
  if (effect.effectKind === "action_restriction")
    return `Restriction: ${friendlyOption(payload.mode, "Manual restriction")}`;
  if (effect.effectKind === "saving_throw_repeat") {
    return friendlyRepeatSave(payload);
  }
  if (effect.effectKind === "area_trigger")
    return `Area: ${friendlyOption(payload.trigger, "Manual area trigger")}`;
  if (effect.effectKind === "visibility_effect")
    return `Visibility: ${friendlyOption(payload.mode, "Visibility effect")}`;
  if (effect.effectKind === "sense_effect")
    return `Sense: ${friendlyOption(payload.mode, "Special sense")}`;
  if (effect.effectKind === "terrain_effect")
    return `Terrain: ${friendlyOption(payload.mode, "Terrain effect")}`;
  if (effect.effectKind === "death_protection") return "Death protection";
  if (effect.effectKind === "linked_healing") return "Linked healing";
  if (effect.effectKind === "damage_transfer") return "Damage transfer";
  if (effect.effectKind === "battlefield_object") return friendlyBattlefieldObject(payload);
  if (effect.effectKind === "condition_immunity" && effect.conditionName) {
    return `Immune to ${effect.conditionName}`;
  }
  if (effect.effectKind === "concentration") return `Concentration: ${effect.spellName}`;
  if (effect.timing === "start_target_turn") return `${effect.spellName} at turn start`;
  return effect.spellName || friendlyOption(effect.effectKind, "Effect");
}

export function friendlyAreaTriggerSummary(config?: Record<string, unknown>) {
  const trigger = friendlyOption(config?.trigger, "Manual area trigger");
  const outcome = friendlyOption(config?.outcome, "configured outcome").toLowerCase();
  return `${trigger}: ${outcome}`;
}

export function friendlyList(values: string[]) {
  const items = values.map((item) => item.trim()).filter(Boolean);
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "")
    : [];
}

function rollCategoryValues(config?: Record<string, unknown>) {
  const categories = stringArray(config?.categories);
  const legacy = configText(config?.category);
  return categories.length ? categories : legacy ? [legacy] : [];
}

function hasEveryRollCategory(values: string[]) {
  const categoryValues = rollModifierCategories.map((option) => option.value);
  return categoryValues.length > 0 && categoryValues.every((value) => values.includes(value));
}

function friendlyForcedMovement(payload: Record<string, unknown>, amount: number) {
  const direction = configText(payload.direction);
  if (direction === "prone") return "Knock prone";
  const label = friendlyOption(direction, "Forced movement");
  return `${label}${direction !== "prone" && amount ? ` ${amount} ft.` : ""}`;
}

function labelFor(options: Option[], value: string) {
  return options.find((option) => option.value === value)?.label ?? friendlyOption(value);
}

function fallbackForToken(value: string) {
  if (/^[a-z0-9_]+$/.test(value) || /^[a-z][A-Za-z0-9]+$/.test(value)) {
    return humanizeToken(value);
  }
  return value;
}

function humanizeToken(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function emptyArray(value: unknown) {
  return Array.isArray(value) && value.length === 0;
}

function objectRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
      )
    : [];
}

function effectDetail(row: Record<string, unknown>) {
  return [
    damageDetail(row),
    configText(row.condition),
    configText(row.effectText || row.effect),
    configText(row.repeatSave) ? `repeat ${friendlyOption(row.repeatSave)} save` : "",
    configText(row.rerollRule),
  ]
    .filter(Boolean)
    .join("; ");
}

function damageDetail(row: Record<string, unknown>) {
  const diceCount = configText(row.diceCount);
  const dieSize = configText(row.dieSize);
  const damageType = configText(row.damageType);
  return diceCount && dieSize && damageType ? `${diceCount}d${dieSize} ${damageType}` : "";
}

function lowerFirst(value: string) {
  return value.replace(/^\w/, (letter) => letter.toLowerCase());
}
