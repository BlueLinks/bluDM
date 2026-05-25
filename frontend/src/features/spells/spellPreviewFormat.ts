import { configText } from "../../lib/domain/effectConfig";
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
    return `Base AC ${configText(roll.effectConfig?.formula, String(roll.fixedValue))}`;
  }
  if (roll.rollKind === "damage_defense") {
    return `${configText(roll.effectConfig?.mode, "Defense")} ${configText(roll.effectConfig?.damageTypes, "")}`.trim();
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
    return `Repeat ${configText(roll.effectConfig?.ability, "save")}`;
  }
  if (roll.rollKind === "area_trigger") {
    return `Area trigger: ${configText(roll.effectConfig?.trigger, "manual")}`;
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

function rollKindLabel(kind: string) {
  if (kind === "max_hp") return "HP maximum";
  if (kind === "max_hp_reduction") return "reduces HP maximum";
  if (kind === "temp_hp") return "sets temp HP";
  if (kind === "recurring_hp_change") return "recurring HP change";
  if (kind === "attack_damage_rider") return "attack damage rider";
  if (kind === "revive") return "revive";
  return kind;
}
