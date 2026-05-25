package db

import "strings"

func inferCuratedStandardLateEffectSpellAutomation(spell *standardSpellSeed) bool {
	switch strings.ToLower(spell.Name) {
	case "vampiric touch":
		roll := standardDamageRoll("damage", "necrotic", 3, 6, 0, "immediate", nil)
		roll.ScalingType = "spell_level"
		roll.ScalingFromLevel = max(1, spell.Level)
		roll.ScalingDiceCount = 1
		roll.ScalingDieSize = 6
		roll.ScalingStepSize = 1
		spell.Actions = []standardSpellActionSeed{{
			Name:              "Vampiric Touch",
			ActionType:        "spell_attack",
			HitSpecialEvent:   "none",
			DamageTypeChoice:  "specific",
			DamageTypeOptions: []string{"necrotic"},
			Rolls: []standardSpellActionRollSeed{
				roll,
				effectRoll("linked_healing", 0, "immediate", map[string]any{"target": "caster", "source": "damage_dealt", "multiplier": "0.5"}),
				effectRoll("action_restriction", 0, "immediate", map[string]any{"mode": "repeat_spell_attack_each_turn"}),
			},
		}}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "ray of enfeeblement":
		if spell.SourceKey == "srd-5-2-1" {
			spell.Actions = []standardSpellActionSeed{{
				Name:                 "Ray of Enfeeblement",
				ActionType:           "save",
				SaveAbility:          "con",
				SuccessfulSaveEffect: "negates",
				HitSpecialEvent:      "none",
				DamageTypeChoice:     "specific",
				DamageTypeOptions:    []string{},
				Rolls: []standardSpellActionRollSeed{
					effectRoll("advantage_state", 0, "start_caster_turn_once", map[string]any{"state": "disadvantage", "category": "attack_roll", "appliesTo": "target_rolls", "uses": "next_attack_on_success"}),
					effectRoll("advantage_state", 0, "immediate", map[string]any{"state": "disadvantage", "category": "strength_d20_test", "appliesTo": "target_rolls"}),
					effectRoll("roll_modifier", 0, "immediate", map[string]any{"mode": "subtract", "category": "damage_roll", "dice": "1d8"}),
					effectRoll("saving_throw_repeat", 0, "end_target_turn_each", map[string]any{"ability": "con", "success": "end_effect"}),
				},
			}}
		} else {
			spell.Actions = []standardSpellActionSeed{simpleEffectAction("Ray of Enfeeblement",
				effectRoll("action_restriction", 0, "immediate", map[string]any{"mode": "half_strength_weapon_damage"}),
				effectRoll("saving_throw_repeat", 0, "end_target_turn_each", map[string]any{"ability": "con", "success": "end_effect"}),
			)}
		}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "aura of life":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Aura of Life",
			effectRoll("damage_defense", 0, "immediate", map[string]any{"mode": "resistance", "damageTypes": "necrotic", "scope": "aura"}),
			effectRoll("death_protection", 0, "immediate", map[string]any{"mode": "hp_max_cannot_be_reduced"}),
			effectRoll("recurring_hp_change", 1, "start_target_turn_each", map[string]any{"mode": "healing", "onlyIfCurrentHP": 0}),
		)}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	default:
		return false
	}
}
