import { displayACFormula } from "../../lib/domain/acFormula";
import { configText } from "../../lib/domain/effectConfig";
import {
  friendlyAdvantageEffect,
  friendlyAreaTriggerSummary,
  friendlyBattlefieldObject,
  friendlyDamageDefense,
  friendlyLayeredEffectDetails,
  friendlyOption,
  friendlyRepeatSave,
  friendlyRerollEffect,
  friendlyRollTableDetails,
} from "../../lib/domain/spellMessaging";
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
    return friendlyDamageDefense(roll.effectConfig);
  }
  if (roll.rollKind === "healing_block") return "Prevents healing";
  if (roll.rollKind === "healing_maximized") return "Maximizes healing";
  if (roll.rollKind === "heal_to_full") return "Restores to full HP";
  if (roll.rollKind === "advantage_state") {
    return friendlyAdvantageEffect(roll.effectConfig).replace(/\.$/, "");
  }
  if (roll.rollKind === "roll_reroll")
    return friendlyRerollEffect(roll.effectConfig).replace(/\.$/, "");
  if (roll.rollKind === "roll_table") {
    return friendlyRollTableDetails(roll.effectConfig);
  }
  if (roll.rollKind === "layered_effect") {
    return friendlyLayeredEffectDetails(roll.effectConfig);
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
    return `Action restriction: ${friendlyOption(roll.effectConfig?.mode, "Manual restriction")}`;
  }
  if (roll.rollKind === "saving_throw_repeat") {
    return friendlyRepeatSave(roll.effectConfig);
  }
  if (roll.rollKind === "area_trigger") {
    return `Area: ${friendlyAreaTriggerSummary(roll.effectConfig)}`;
  }
  if (roll.rollKind === "visibility_effect") {
    return `Visibility: ${friendlyOption(roll.effectConfig?.mode, "effect")}`;
  }
  if (roll.rollKind === "sense_effect") {
    return `Sense: ${friendlyOption(roll.effectConfig?.mode, "special")}`;
  }
  if (roll.rollKind === "terrain_effect") {
    return `Terrain: ${friendlyOption(roll.effectConfig?.mode, "effect")}`;
  }
  if (roll.rollKind === "death_protection") {
    return `Death protection: ${friendlyOption(roll.effectConfig?.mode, "effect")}`;
  }
  if (roll.rollKind === "linked_healing") return "Linked healing";
  if (roll.rollKind === "damage_transfer") return "Damage transfer";
  if (roll.rollKind === "battlefield_object") {
    return friendlyBattlefieldObject(roll.effectConfig);
  }
  const fixed =
    roll.fixedValue > 0 ? `+${roll.fixedValue}` : roll.fixedValue < 0 ? roll.fixedValue : "";
  const amount = roll.diceCount > 0 ? `${roll.diceCount}d${roll.dieSize}${fixed}` : fixed || "0";
  return `${amount} ${roll.rollKind === "damage" ? roll.damageType : rollKindLabel(roll.rollKind)}`;
}

function baseACSummary(roll: Spell["actions"][number]["rolls"][number]) {
  if (configText(roll.effectConfig?.calculationMode, "formula") === "dice") {
    const ability = friendlyOption(roll.effectConfig?.abilityModifier);
    return `${baseACDiceText(roll)}${ability ? ` + ${ability}` : ""}`;
  }
  return displayACFormula(roll.effectConfig?.formula, String(roll.fixedValue));
}

function baseACDiceText(roll: Spell["actions"][number]["rolls"][number]) {
  const dice = Number(roll.diceCount) || 0;
  const fixed = Number(roll.fixedValue) || 0;
  const diceText = dice > 0 ? `${dice === 1 ? "" : dice}d${roll.dieSize || 6}` : "";
  const fixedText = fixed > 0 ? `+${fixed}` : fixed < 0 ? String(fixed) : "";
  return `${diceText}${fixedText}` || String(roll.fixedValue || 0);
}

function rollKindLabel(kind: string) {
  if (kind === "max_hp") return "HP maximum";
  if (kind === "max_hp_reduction") return "reduces HP maximum";
  if (kind === "temp_hp") return "sets temp HP";
  if (kind === "recurring_hp_change") return "recurring HP change";
  if (kind === "attack_damage_rider") return "attack damage rider";
  if (kind === "roll_table") return "roll table";
  if (kind === "layered_effect") return "layered effect";
  if (kind === "revive") return "revive";
  return kind;
}
