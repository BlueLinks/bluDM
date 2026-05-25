package db

import "strings"

func inferCuratedStandardSpellAutomation(spell *standardSpellSeed) bool {
	if inferCuratedStandardLateEffectSpellAutomation(spell) {
		return true
	}
	switch strings.ToLower(spell.Name) {
	case "longstrider":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Longstrider", effectRoll("speed_bonus", 10, "immediate", nil))}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "fly":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Fly", effectRoll("movement_mode", 60, "immediate", map[string]any{"mode": "flying"}))}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "spider climb":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Spider Climb", effectRoll("movement_mode", 0, "immediate", map[string]any{"mode": "climbing", "source": "walking_speed"}))}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "mage armor":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Mage Armor", effectRoll("base_ac", 13, "immediate", map[string]any{"formula": "13 + Dex modifier"}))}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "shield":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Shield", effectRoll("ac_bonus", 5, "start_caster_turn_once", nil))}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "shield of faith":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Shield of Faith", effectRoll("ac_bonus", 2, "immediate", nil))}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "bless":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Bless", effectRoll("roll_modifier", 0, "immediate", map[string]any{"mode": "add", "category": "attack_roll,saving_throw", "dice": "1d4"}))}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "bane":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Bane", effectRoll("roll_modifier", 0, "immediate", map[string]any{"mode": "subtract", "category": "attack_roll,saving_throw", "dice": "1d4"}))}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "guidance":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Guidance", effectRoll("roll_modifier", 0, "immediate", map[string]any{"mode": "add", "category": "ability_check", "dice": "1d4"}))}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "protection from energy":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Protection from Energy", effectRoll("damage_defense", 0, "immediate", map[string]any{"mode": "resistance", "damageTypes": "acid,cold,fire,lightning,thunder"}))}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "stoneskin":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Stoneskin", effectRoll("damage_defense", 0, "immediate", map[string]any{"mode": "resistance", "damageTypes": "bludgeoning,piercing,slashing", "restriction": "nonmagical"}))}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "gust of wind":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Gust of Wind", effectRoll("forced_movement", 15, "start_target_turn_each", map[string]any{"direction": "push"}))}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "grease":
		spell.Actions = []standardSpellActionSeed{{
			Name:                 "Grease",
			ActionType:           "save",
			SaveAbility:          "dex",
			SuccessfulSaveEffect: "negates",
			HitSpecialEvent:      "none",
			DamageTypeChoice:     "specific",
			DamageTypeOptions:    []string{},
			Rolls: []standardSpellActionRollSeed{
				effectRoll("terrain_effect", 0, "immediate", map[string]any{"mode": "difficult_terrain", "durationMode": "spell_duration"}),
				effectRoll("area_trigger", 0, "immediate", map[string]any{"trigger": "enter_or_end_turn", "effect": "dex_save_or_prone", "durationMode": "spell_duration"}),
			},
		}}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "command":
		spell.Actions = []standardSpellActionSeed{{
			Name:                 "Command",
			ActionType:           "save",
			SaveAbility:          "wis",
			SuccessfulSaveEffect: "negates",
			HitSpecialEvent:      "none",
			DamageTypeChoice:     "specific",
			DamageTypeOptions:    []string{},
			Rolls: []standardSpellActionRollSeed{
				effectRoll("custom", 0, "immediate", map[string]any{"durationMode": "end_target_next"}),
				effectRoll("action_restriction", 0, "immediate", map[string]any{"mode": "commanded_behavior", "durationMode": "end_target_next"}),
			},
		}}
		spell.Actions[0].Rolls[0].ConditionName = "Target follows the chosen command on its next turn, such as Approach, Drop, Flee, Grovel, or Halt."
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "beacon of hope":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Beacon of Hope",
			effectRoll("advantage_state", 0, "immediate", map[string]any{"state": "advantage", "category": "wisdom_saving_throw,death_save", "appliesTo": "target_rolls"}),
			effectRoll("healing_maximized", 0, "immediate", nil),
		)}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "regenerate":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Regenerate",
			standardDamageRoll("healing", "healing", 4, 8, 15, "immediate", nil),
			effectRoll("recurring_hp_change", 1, "start_target_turn_each", map[string]any{"mode": "healing"}),
			effectRoll("battlefield_object", 0, "immediate", map[string]any{"kind": "body_part_regrowth", "note": "Severed body parts regrow after 2 minutes."}),
		)}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "power word heal":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Power Word Heal",
			effectRoll("heal_to_full", 0, "immediate", nil),
			effectRoll("remove_condition", 0, "immediate", map[string]any{"conditions": "Charmed,Frightened,Paralyzed,Poisoned,Stunned"}),
			effectRoll("action_restriction", 0, "immediate", map[string]any{"mode": "reaction_stand_from_prone"}),
		)}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "warding bond":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Warding Bond",
			effectRoll("ac_bonus", 1, "immediate", nil),
			effectRoll("roll_modifier", 1, "immediate", map[string]any{"mode": "add", "category": "saving_throw", "amountType": "fixed"}),
			effectRoll("damage_defense", 0, "immediate", map[string]any{"mode": "resistance", "damageTypes": "all"}),
			effectRoll("damage_transfer", 0, "immediate", map[string]any{"mode": "mirror_damage_to_caster"}),
		)}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "haste":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Haste",
			effectRoll("speed_multiplier", 0, "immediate", map[string]any{"multiplier": "2"}),
			effectRoll("ac_bonus", 2, "immediate", nil),
			effectRoll("advantage_state", 0, "immediate", map[string]any{"state": "advantage", "category": "dexterity_saving_throw", "appliesTo": "target_rolls"}),
			effectRoll("action_restriction", 0, "immediate", map[string]any{"mode": "extra_limited_action", "allowedActions": "Attack one weapon attack only,Dash,Disengage,Hide,Use an Object,Utilize"}),
			effectRoll("action_restriction", 0, "end_spell", map[string]any{"mode": "lethargy"}),
		)}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "slow":
		spell.Actions = []standardSpellActionSeed{{
			Name:                 "Slow",
			ActionType:           "save",
			SaveAbility:          "wis",
			SuccessfulSaveEffect: "negates",
			HitSpecialEvent:      "none",
			DamageTypeChoice:     "specific",
			DamageTypeOptions:    []string{},
			Rolls: []standardSpellActionRollSeed{
				effectRoll("speed_multiplier", 0, "immediate", map[string]any{"multiplier": "0.5"}),
				effectRoll("ac_bonus", -2, "immediate", nil),
				effectRoll("roll_modifier", -2, "immediate", map[string]any{"mode": "subtract", "category": "dexterity_saving_throw", "amountType": "fixed"}),
				effectRoll("action_restriction", 0, "immediate", map[string]any{"mode": "no_reactions_action_or_bonus_one_attack_spell_delay"}),
				effectRoll("saving_throw_repeat", 0, "end_target_turn_each", map[string]any{"ability": "wis", "success": "end_effect"}),
			},
		}}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "freedom of movement":
		rolls := []standardSpellActionRollSeed{
			effectRoll("terrain_effect", 0, "immediate", map[string]any{"mode": "ignore_difficult_terrain"}),
			effectRoll("terrain_effect", 0, "immediate", map[string]any{"mode": "speed_cannot_be_reduced"}),
			effectRoll("condition_immunity", 0, "immediate", map[string]any{"conditions": "Paralyzed,Restrained"}),
		}
		if spell.SourceKey == "srd-5-2-1" {
			rolls = append(rolls, effectRoll("movement_mode", 0, "immediate", map[string]any{"mode": "swimming", "source": "walking_speed"}))
		}
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Freedom of Movement", rolls...)}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "guiding bolt":
		roll := standardDamageRoll("damage", "radiant", 4, 6, 0, "immediate", nil)
		roll.ScalingType = "spell_level"
		roll.ScalingFromLevel = max(1, spell.Level)
		roll.ScalingDiceCount = 1
		roll.ScalingDieSize = 6
		roll.ScalingStepSize = 1
		spell.Actions = []standardSpellActionSeed{{
			Name:              "Guiding Bolt",
			ActionType:        "spell_attack",
			HitSpecialEvent:   "none",
			DamageTypeChoice:  "specific",
			DamageTypeOptions: []string{"radiant"},
			Rolls: []standardSpellActionRollSeed{
				roll,
				effectRoll("advantage_state", 0, "end_caster_turn_once", map[string]any{"state": "advantage", "category": "attack_roll", "appliesTo": "attacks_against_target", "uses": "next_attack"}),
				effectRoll("visibility_effect", 0, "end_caster_turn_once", map[string]any{"mode": "glittering_light"}),
			},
		}}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "faerie fire":
		spell.Actions = []standardSpellActionSeed{{
			Name:                 "Faerie Fire",
			ActionType:           "save",
			SaveAbility:          "dex",
			SuccessfulSaveEffect: "negates",
			HitSpecialEvent:      "none",
			DamageTypeChoice:     "specific",
			DamageTypeOptions:    []string{},
			Rolls: []standardSpellActionRollSeed{
				effectRoll("visibility_effect", 0, "immediate", map[string]any{"mode": "outlined_dim_light", "lightRadius": 10}),
				effectRoll("advantage_state", 0, "immediate", map[string]any{"state": "advantage", "category": "attack_roll", "appliesTo": "attacks_against_target"}),
				effectRoll("visibility_effect", 0, "immediate", map[string]any{"mode": "cannot_benefit_from_invisible"}),
			},
		}}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "shining smite":
		roll := damageRider("radiant", 2, 6, map[string]any{"trigger": "melee_weapon_or_unarmed_hit"})
		roll.ScalingType = "spell_level"
		roll.ScalingFromLevel = max(1, spell.Level)
		roll.ScalingDiceCount = 1
		roll.ScalingDieSize = 6
		roll.ScalingStepSize = 1
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Shining Smite",
			roll,
			effectRoll("visibility_effect", 0, "immediate", map[string]any{"mode": "bright_light", "lightRadius": 5}),
			effectRoll("advantage_state", 0, "immediate", map[string]any{"state": "advantage", "category": "attack_roll", "appliesTo": "attacks_against_target"}),
			effectRoll("visibility_effect", 0, "immediate", map[string]any{"mode": "cannot_benefit_from_invisible"}),
		)}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "invisibility", "greater invisibility":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction(spell.Name, effectRoll("condition", 0, "immediate", map[string]any{"condition": "Invisible"}))}
		spell.Actions[0].Rolls[0].ConditionName = "Invisible"
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "see invisibility":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("See Invisibility", effectRoll("sense_effect", 0, "immediate", map[string]any{"mode": "see_invisibility", "plane": "ethereal"}))}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "darkvision":
		rangeFeet := 60
		if spell.SourceKey == "srd-5-2-1" {
			rangeFeet = 150
		}
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Darkvision", effectRoll("sense_effect", rangeFeet, "immediate", map[string]any{"mode": "darkvision"}))}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "sleet storm":
		spell.Actions = []standardSpellActionSeed{{
			Name:                 "Sleet Storm",
			ActionType:           "save",
			SaveAbility:          "dex",
			SuccessfulSaveEffect: "negates",
			HitSpecialEvent:      "none",
			DamageTypeChoice:     "specific",
			DamageTypeOptions:    []string{},
			Rolls: []standardSpellActionRollSeed{
				effectRoll("terrain_effect", 0, "immediate", map[string]any{"mode": "difficult_terrain,heavily_obscured"}),
				effectRoll("area_trigger", 0, "immediate", map[string]any{"trigger": "enter_or_start_turn", "effect": "dex_save_or_prone", "breaksConcentration": true}),
			},
		}}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "web":
		spell.Actions = []standardSpellActionSeed{{
			Name:                 "Web",
			ActionType:           "save",
			SaveAbility:          "dex",
			SuccessfulSaveEffect: "negates",
			HitSpecialEvent:      "none",
			DamageTypeChoice:     "specific",
			DamageTypeOptions:    []string{},
			Rolls: []standardSpellActionRollSeed{
				effectRoll("terrain_effect", 0, "immediate", map[string]any{"mode": "difficult_terrain,lightly_obscured"}),
				effectRoll("area_trigger", 0, "immediate", map[string]any{"trigger": "enter_or_start_turn", "effect": "restrained"}),
				standardDamageRoll("area_trigger", "fire", 2, 4, 0, "immediate", map[string]any{"trigger": "web_burns", "effect": "fire_damage"}),
			},
		}}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "spike growth":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Spike Growth",
			effectRoll("terrain_effect", 0, "immediate", map[string]any{"mode": "difficult_terrain,camouflaged"}),
			standardDamageRoll("area_trigger", "piercing", 2, 4, 0, "immediate", map[string]any{"trigger": "moves_into_or_within", "per": "5 feet traveled"}),
		)}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "moonbeam":
		roll := standardDamageRoll("damage", "radiant", 2, 10, 0, "immediate", nil)
		roll.ScalingType = "spell_level"
		roll.ScalingFromLevel = max(1, spell.Level)
		roll.ScalingDiceCount = 1
		roll.ScalingDieSize = 10
		roll.ScalingStepSize = 1
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
				effectRoll("area_trigger", 0, "immediate", map[string]any{"trigger": "appear_enter_moved_into_or_end_turn", "effect": "save_for_damage", "shapechanger": "revert_true_form"}),
			},
		}}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "spirit guardians":
		roll := standardDamageRoll("damage", "radiant", 3, 8, 0, "immediate", map[string]any{"alternateDamageTypes": "radiant,necrotic"})
		roll.ScalingType = "spell_level"
		roll.ScalingFromLevel = max(1, spell.Level)
		roll.ScalingDiceCount = 1
		roll.ScalingDieSize = 8
		roll.ScalingStepSize = 1
		spell.Actions = []standardSpellActionSeed{{
			Name:                 "Spirit Guardians",
			ActionType:           "save",
			SaveAbility:          "wis",
			SuccessfulSaveEffect: "half",
			HitSpecialEvent:      "none",
			DamageTypeChoice:     "choice",
			DamageTypeOptions:    []string{"radiant", "necrotic"},
			Rolls: []standardSpellActionRollSeed{
				effectRoll("speed_multiplier", 0, "immediate", map[string]any{"multiplier": "0.5", "scope": "affected_area"}),
				roll,
				effectRoll("area_trigger", 0, "immediate", map[string]any{"trigger": "enter_or_start_turn", "effect": "save_for_damage", "oncePerTurn": true}),
			},
		}}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "acid arrow":
		initial := standardDamageRoll("damage", "acid", 4, 4, 0, "immediate", nil)
		initial.ScalingType = "spell_level"
		initial.ScalingFromLevel = max(1, spell.Level)
		initial.ScalingDiceCount = 1
		initial.ScalingDieSize = 4
		initial.ScalingStepSize = 1
		later := standardDamageRoll("recurring_hp_change", "acid", 2, 4, 0, "end_target_turn_once", map[string]any{"mode": "damage"})
		later.ScalingType = initial.ScalingType
		later.ScalingFromLevel = initial.ScalingFromLevel
		later.ScalingDiceCount = initial.ScalingDiceCount
		later.ScalingDieSize = initial.ScalingDieSize
		later.ScalingStepSize = initial.ScalingStepSize
		spell.Actions = []standardSpellActionSeed{{
			Name:              "Acid Arrow",
			ActionType:        "spell_attack",
			HitSpecialEvent:   "none",
			DamageTypeChoice:  "specific",
			DamageTypeOptions: []string{"acid"},
			Rolls:             []standardSpellActionRollSeed{initial, later},
		}}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "searing smite":
		initial := damageRider("fire", 1, 6, map[string]any{"trigger": "melee_weapon_or_unarmed_hit"})
		initial.ScalingType = "spell_level"
		initial.ScalingFromLevel = max(1, spell.Level)
		initial.ScalingDiceCount = 1
		initial.ScalingDieSize = 6
		initial.ScalingStepSize = 1
		burning := standardDamageRoll("recurring_hp_change", "fire", 1, 6, 0, "start_target_turn_each", map[string]any{"mode": "damage"})
		burning.ScalingType = initial.ScalingType
		burning.ScalingFromLevel = initial.ScalingFromLevel
		burning.ScalingDiceCount = initial.ScalingDiceCount
		burning.ScalingDieSize = initial.ScalingDieSize
		burning.ScalingStepSize = initial.ScalingStepSize
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Searing Smite",
			initial,
			burning,
			effectRoll("saving_throw_repeat", 0, "start_target_turn_each", map[string]any{"ability": "con", "success": "end_effect"}),
		)}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "ensnaring strike":
		ongoing := standardDamageRoll("recurring_hp_change", "piercing", 1, 6, 0, "start_target_turn_each", map[string]any{"mode": "damage"})
		ongoing.ScalingType = "spell_level"
		ongoing.ScalingFromLevel = max(1, spell.Level)
		ongoing.ScalingDiceCount = 1
		ongoing.ScalingDieSize = 6
		ongoing.ScalingStepSize = 1
		spell.Actions = []standardSpellActionSeed{{
			Name:                 "Ensnaring Strike",
			ActionType:           "save",
			SaveAbility:          "str",
			SuccessfulSaveEffect: "negates",
			HitSpecialEvent:      "none",
			DamageTypeChoice:     "specific",
			DamageTypeOptions:    []string{"piercing"},
			Rolls: []standardSpellActionRollSeed{
				effectRoll("condition", 0, "immediate", map[string]any{"condition": "Restrained", "largeOrLargerSaveAdvantage": true}),
				ongoing,
				effectRoll("saving_throw_repeat", 0, "manual", map[string]any{"ability": "str_athletics", "success": "end_effect", "requiresAction": true}),
			},
		}}
		spell.Actions[0].Rolls[0].ConditionName = "Restrained"
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "hunter's mark", "hunter’s mark", "hex", "divine favor":
		if roll, ok := attackDamageRiderRoll(spell.Name); ok {
			spell.Actions = []standardSpellActionSeed{simpleEffectAction(spell.Name, roll)}
			spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
			return true
		}
		return false
	case "aid":
		roll := fixedSpellLevelRoll("max_hp", 5, max(1, spell.Level), 5)
		spell.Actions = []standardSpellActionSeed{{
			Name:              "Aid",
			ActionType:        "damage",
			HitSpecialEvent:   "none",
			DamageTypeChoice:  "specific",
			DamageTypeOptions: []string{"healing"},
			Rolls: []standardSpellActionRollSeed{
				roll,
				fixedSpellLevelRoll("healing", 5, max(1, spell.Level), 5),
			},
		}}
		spell.ProjectileScaling = &standardSpellProjectileScalingSeed{BaseProjectiles: 3, ScalingType: "none", StepSize: 1}
		return true
	case "elementalism":
		if spell.SourceKey != "srd-5-2-1" {
			return false
		}
		spell.Actions = []standardSpellActionSeed{{
			Name:              "Elemental effect",
			ActionType:        "other",
			HitSpecialEvent:   "none",
			DamageTypeChoice:  "specific",
			DamageTypeOptions: []string{},
			Rolls: []standardSpellActionRollSeed{{
				RollKind:        "custom",
				ConditionName:   "Choose one effect: Beckon Air, Beckon Earth, Beckon Fire, Beckon Water, or Sculpt Element.",
				Timing:          "immediate",
				ScalingType:     "none",
				ScalingStepSize: 1,
			}},
		}}
		spell.ProjectileScaling = &standardSpellProjectileScalingSeed{
			BaseProjectiles: 1,
			ScalingType:     "none",
			StepSize:        1,
			Description:     "Choose one elemental effect within range.",
		}
		return true
	case "healing word":
		if spell.SourceKey != "srd-5-2-1" {
			return false
		}
		roll := standardSpellActionRollSeed{
			RollKind:               "healing",
			DamageType:             "healing",
			Magical:                true,
			DiceCount:              2,
			DieSize:                4,
			AddPrimaryStatModifier: true,
			Timing:                 "immediate",
			ScalingType:            "spell_level",
			ScalingFromLevel:       max(1, spell.Level),
			ScalingDiceCount:       2,
			ScalingDieSize:         4,
			ScalingStepSize:        1,
		}
		spell.Actions = []standardSpellActionSeed{{
			Name:              "Healing Word",
			ActionType:        "damage",
			HitSpecialEvent:   "none",
			DamageTypeChoice:  "specific",
			DamageTypeOptions: []string{"healing"},
			Rolls:             []standardSpellActionRollSeed{roll},
		}}
		spell.ProjectileScaling = &standardSpellProjectileScalingSeed{BaseProjectiles: 1, ScalingType: "none", StepSize: 1}
		return true
	case "heroism":
		spell.Actions = []standardSpellActionSeed{{
			Name:              "Heroism",
			ActionType:        "damage",
			HitSpecialEvent:   "none",
			DamageTypeChoice:  "specific",
			DamageTypeOptions: []string{"healing"},
			Rolls: []standardSpellActionRollSeed{
				{
					RollKind:               "temp_hp",
					DamageType:             "healing",
					Magical:                true,
					AddPrimaryStatModifier: true,
					Timing:                 "start_target_turn_each",
					ScalingType:            "none",
					ScalingStepSize:        1,
				},
				{
					RollKind:        "condition_immunity",
					ConditionName:   "Frightened",
					Timing:          "immediate",
					ScalingType:     "none",
					ScalingStepSize: 1,
				},
			},
		}}
		spell.ProjectileScaling = &standardSpellProjectileScalingSeed{
			BaseProjectiles:       1,
			ScalingType:           "spell_level",
			ScaleFromLevel:        max(1, spell.Level),
			AdditionalProjectiles: 1,
			StepSize:              1,
		}
		return true
	default:
		return false
	}
}
