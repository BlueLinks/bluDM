package db

import "regexp"

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
