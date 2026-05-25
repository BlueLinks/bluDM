import { configText } from "../../lib/domain/effectConfig";
import {
  areaTriggerModes,
  areaTriggerOutcomes,
  baseACAbilityModifiers,
  damageDefenseRestrictions,
  repeatSaveCheckTypes,
  repeatSaveSuccessOutcomes,
} from "../../lib/domain/spellEffectOptions";
import type { Spell } from "../../types";

export function formatRollPart(roll: Spell["actions"][number]["rolls"][number]) {
  if (roll.rollKind === "condition") return `Apply ${roll.conditionName || "condition"}`;
  if (roll.rollKind === "remove_condition") return `Remove ${roll.conditionName || "condition"}`;
  if (roll.rollKind === "condition_immunity") {
    return `Immunity to ${roll.conditionName || configText(roll.effectConfig?.conditions, "condition")}`;
  }
  if (roll.rollKind === "custom") return roll.conditionName || "Custom target effect";
  if (roll.rollKind === "speed_reduction") {
    return `Speed -${Math.max(0, Number(roll.fixedValue) || 0)} ft.`;
  }
  if (roll.rollKind === "speed_bonus") {
    return `Speed +${Math.max(0, Number(roll.fixedValue) || 0)} ft.`;
  }
  if (roll.rollKind === "speed_multiplier") {
    return configText(roll.effectConfig?.multiplier) === "2" ? "Double speed" : "Halve speed";
  }
  if (roll.rollKind === "movement_mode") {
    return `${configText(roll.effectConfig?.mode, "Movement")} ${roll.fixedValue ? `${roll.fixedValue} ft.` : ""}`;
  }
  if (roll.rollKind === "ac_bonus")
    return `AC ${roll.fixedValue >= 0 ? "+" : ""}${roll.fixedValue}`;
  if (roll.rollKind === "base_ac") {
    return `Base AC ${baseACSummary(roll)}`;
  }
  if (roll.rollKind === "damage_defense") {
    const damageTypes = configStringArray(roll.effectConfig?.damageTypes).join(", ");
    const restriction = labelFor(
      damageDefenseRestrictions,
      configText(roll.effectConfig?.restriction),
    );
    return [
      titleCase(configText(roll.effectConfig?.mode, "defense")),
      damageTypes || "chosen damage",
      restriction && restriction !== "No restriction" ? restriction : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (roll.rollKind === "healing_block") return "Prevents healing";
  if (roll.rollKind === "healing_maximized") return "Maximizes healing";
  if (roll.rollKind === "heal_to_full") return "Restores to full HP";
  if (roll.rollKind === "advantage_state") {
    return `${configText(roll.effectConfig?.state, "Advantage")} on ${configText(roll.effectConfig?.category, "rolls")}`;
  }
  if (roll.rollKind === "forced_movement") {
    const direction = configText(roll.effectConfig?.direction, "forced movement");
    const label =
      direction === "prone"
        ? "Knock prone"
        : direction === "push"
          ? "Push away"
          : direction === "pull"
            ? "Pull toward"
            : direction === "move_away"
              ? "Move away using reaction"
              : direction === "manual_map"
                ? "Manual map movement"
                : "Forced movement";
    return `${label}${direction !== "prone" && roll.fixedValue ? ` ${roll.fixedValue} ft.` : ""}`;
  }
  if (roll.rollKind === "action_restriction") {
    return `Action restriction: ${configText(roll.effectConfig?.mode, "manual")}`;
  }
  if (roll.rollKind === "saving_throw_repeat") {
    const checkType = labelFor(repeatSaveCheckTypes, configText(roll.effectConfig?.checkType));
    const ability = configText(roll.effectConfig?.ability, "configured ability");
    const outcome = labelFor(
      repeatSaveSuccessOutcomes,
      configText(roll.effectConfig?.successOutcome),
    );
    return `Repeat ${checkType || "check"} (${ability}); success: ${outcome || "configured outcome"}`;
  }
  if (roll.rollKind === "area_trigger") {
    const trigger = labelFor(areaTriggerModes, configText(roll.effectConfig?.trigger));
    const outcome = labelFor(areaTriggerOutcomes, configText(roll.effectConfig?.outcome));
    return `Area: ${trigger || "Manual trigger"} -> ${outcome || "configured outcome"}`;
  }
  if (roll.rollKind === "visibility_effect") {
    return `Visibility: ${configText(roll.effectConfig?.mode, "effect")}`;
  }
  if (roll.rollKind === "sense_effect") {
    return `Sense: ${configText(roll.effectConfig?.mode, "special")}`;
  }
  if (roll.rollKind === "terrain_effect") {
    return `Terrain: ${configText(roll.effectConfig?.mode, "effect")}`;
  }
  if (roll.rollKind === "death_protection") {
    return `Death protection: ${configText(roll.effectConfig?.mode, "effect")}`;
  }
  if (roll.rollKind === "linked_healing") return "Linked healing";
  if (roll.rollKind === "damage_transfer") return "Damage transfer";
  if (roll.rollKind === "battlefield_object") {
    return `Battlefield object: ${configText(roll.effectConfig?.kind, "manual")}`;
  }
  const fixed =
    roll.fixedValue > 0 ? `+${roll.fixedValue}` : roll.fixedValue < 0 ? roll.fixedValue : "";
  const amount = roll.diceCount > 0 ? `${roll.diceCount}d${roll.dieSize}${fixed}` : fixed || "0";
  return `${amount} ${roll.rollKind === "damage" ? roll.damageType : rollKindLabel(roll.rollKind)}`;
}

function baseACSummary(roll: Spell["actions"][number]["rolls"][number]) {
  if (configText(roll.effectConfig?.calculationMode, "formula") === "standard_ac") {
    const ability = labelFor(
      baseACAbilityModifiers,
      configText(roll.effectConfig?.abilityModifier),
    );
    return `${configText(roll.effectConfig?.baseValue, String(roll.fixedValue))}${ability ? ` + ${ability}` : ""}`;
  }
  return configText(roll.effectConfig?.formula, String(roll.fixedValue));
}

function configStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function labelFor(options: Array<{ value: string; label: string }>, value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function rollKindLabel(kind: string) {
  if (kind === "max_hp") return "HP maximum";
  if (kind === "max_hp_reduction") return "reduces HP maximum";
  if (kind === "temp_hp") return "sets temp HP";
  if (kind === "recurring_hp_change") return "recurring HP change";
  if (kind === "attack_damage_rider") return "attack damage rider";
  if (kind === "revive") return "revive";
  return kind;
}
