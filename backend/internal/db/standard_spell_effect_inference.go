package db

import (
	"regexp"
	"strings"
)

var speedReductionPattern = regexp.MustCompile(`(?i)\bSpeed\b[^.]*reduced by (\d+) feet until the start of your next turn`)

func inferSpeedReductionRolls(description string) []standardSpellActionRollSeed {
	match := speedReductionPattern.FindStringSubmatch(description)
	if len(match) != 2 {
		return nil
	}
	return []standardSpellActionRollSeed{{
		RollKind:        "speed_reduction",
		FixedValue:      mustAtoi(match[1]),
		Timing:          "start_caster_turn_once",
		ScalingType:     "none",
		ScalingStepSize: 1,
	}}
}

func simpleEffectAction(name string, rolls ...standardSpellActionRollSeed) standardSpellActionSeed {
	return standardSpellActionSeed{
		Name:                 name,
		ActionType:           "damage",
		SuccessfulSaveEffect: "none",
		HitSpecialEvent:      "none",
		DamageTypeChoice:     "specific",
		DamageTypeOptions:    []string{},
		Rolls:                rolls,
	}
}

func effectRoll(kind string, fixedValue int, timing string, config map[string]any) standardSpellActionRollSeed {
	return standardSpellActionRollSeed{
		RollKind:        kind,
		Magical:         true,
		FixedValue:      fixedValue,
		Timing:          defaultText(timing, "immediate"),
		ScalingType:     "none",
		ScalingStepSize: 1,
		EffectConfig:    config,
	}
}

func inferAdditionalEffectRolls(spell standardSpellSeed) []standardSpellActionRollSeed {
	rolls := inferSpeedReductionRolls(spell.Description)
	switch strings.ToLower(spell.Name) {
	case "chill touch":
		rolls = append(rolls, effectRoll("healing_block", 0, "start_caster_turn_once", nil))
	case "harm":
		rolls = append(rolls, effectRoll("max_hp_reduction", 0, "immediate", map[string]any{"amountSource": "damageTaken"}))
	case "thunderwave":
		rolls = append(rolls, effectRoll("forced_movement", 10, "immediate", map[string]any{"direction": "push"}))
	}
	return rolls
}

func attackDamageRiderRoll(name string) (standardSpellActionRollSeed, bool) {
	switch strings.ToLower(name) {
	case "hunter's mark", "hunter’s mark":
		return damageRider("force", 1, 6, map[string]any{"trigger": "weapon_attack_hit"}), true
	case "hex":
		return damageRider("necrotic", 1, 6, map[string]any{"trigger": "attack_hit"}), true
	case "divine favor":
		return damageRider("radiant", 1, 4, map[string]any{"trigger": "weapon_attack_hit"}), true
	default:
		return standardSpellActionRollSeed{}, false
	}
}

func damageRider(damageType string, diceCount int, dieSize int, config map[string]any) standardSpellActionRollSeed {
	if config == nil {
		config = map[string]any{}
	}
	config["diceCount"] = diceCount
	config["dieSize"] = dieSize
	roll := effectRoll("attack_damage_rider", 0, "immediate", config)
	roll.DamageType = damageType
	return roll
}
