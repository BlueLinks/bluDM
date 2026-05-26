package db

func inferMoonbeamSpell(spell *standardSpellSeed) bool {
	roll := standardDamageRoll("damage", "radiant", 2, 10, 0, "immediate", nil)
	roll.ScalingType = "spell_level"
	roll.ScalingFromLevel = max(1, spell.Level)
	roll.ScalingDiceCount = 1
	roll.ScalingDieSize = 10
	roll.ScalingStepSize = 1
	areaTrigger := map[string]any{
		"trigger":      "enter_or_start_turn",
		"outcome":      "save_for_damage",
		"saveAbility":  "con",
		"details":      "Shapechangers revert to their true form on a failed save.",
		"durationMode": "spell_duration",
		"oncePerTurn":  true,
	}
	if spell.SourceKey == "srd-5-2-1" {
		areaTrigger["trigger"] = "appear_move_enter_or_end_turn"
		areaTrigger["details"] = "The save happens when the cylinder appears, moves into a creature's space, a creature enters it, or a creature ends its turn there. Shape-shifted creatures revert on a failed save."
	}
	areaObject := effectRoll("battlefield_object", 0, "immediate", map[string]any{
		"areaSpell":         true,
		"kind":              "spell_area",
		"shape":             "cylinder",
		"radiusFeet":        5,
		"heightFeet":        40,
		"light":             "dim",
		"moveDistanceFeet":  60,
		"saveAbility":       "con",
		"saveEffect":        "half",
		"damageType":        "radiant",
		"diceCount":         2,
		"dieSize":           10,
		"fixedValue":        0,
		"scalingType":       "spell_level",
		"scalingFromLevel":  max(1, spell.Level),
		"scalingDiceCount":  1,
		"scalingDieSize":    10,
		"scalingFixedValue": 0,
		"scalingStepSize":   1,
		"triggerRules":      areaTrigger["trigger"],
		"oncePerTurn":       true,
		"riderText":         "On a failed save, a shapechanger reverts to its true form and cannot assume a different form while in the light.",
	})
	spell.Actions = []standardSpellActionSeed{{
		Name:                 "Moonbeam",
		ActionType:           "save",
		SaveAbility:          "con",
		SuccessfulSaveEffect: "half",
		HitSpecialEvent:      "none",
		DamageTypeChoice:     "specific",
		DamageTypeOptions:    []string{"radiant"},
		Rolls: []standardSpellActionRollSeed{
			roll,
			areaObject,
			effectRoll("area_trigger", 0, "immediate", areaTrigger),
		},
	}}
	spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
	return true
}
