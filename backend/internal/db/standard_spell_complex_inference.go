package db

import "strings"

func inferComplexStandardSpellAutomation(spell *standardSpellSeed) bool {
	switch strings.ToLower(spell.Name) {
	case "prismatic spray":
		inferPrismaticSpraySpell(spell)
		return true
	case "prismatic wall":
		inferPrismaticWallSpell(spell)
		return true
	case "wall of fire":
		inferPersistentAreaDamageSpell(spell, persistentAreaDamageSpec{
			name:        "Wall of Fire",
			saveAbility: "dex",
			damageType:  "fire",
			diceCount:   5,
			dieSize:     8,
			shape:       "wall",
			sizeText:    "Up to 60 ft long, 20 ft high, and 1 ft thick, or a ring up to 20 ft diameter.",
			trigger:     "enter_or_end_turn",
			details:     "One chosen side also damages creatures ending within 10 feet of that side.",
		})
		return true
	case "cloudkill":
		trigger := "enter_or_start_turn"
		if spell.SourceKey == "srd-5-2-1" {
			trigger = "appear_move_enter_or_end_turn"
		}
		inferPersistentAreaDamageSpell(spell, persistentAreaDamageSpec{
			name:             "Cloudkill",
			saveAbility:      "con",
			damageType:       "poison",
			diceCount:        5,
			dieSize:          8,
			shape:            "sphere",
			radiusFeet:       20,
			moveDistanceFeet: 10,
			trigger:          trigger,
			details:          "The fog is heavily obscured and moves 10 feet away from the caster at the start of each caster turn.",
		})
		return true
	case "blade barrier":
		inferPersistentAreaDamageSpell(spell, persistentAreaDamageSpec{
			name:        "Blade Barrier",
			saveAbility: "dex",
			damageType:  "slashing",
			diceCount:   6,
			dieSize:     10,
			shape:       "wall",
			sizeText:    "Straight wall up to 100 ft long, 20 ft high, and 5 ft thick, or ring up to 60 ft diameter.",
			trigger:     "enter_or_start_turn",
			details:     "The wall provides three-quarters cover and its space is difficult terrain.",
			extraRolls: []standardSpellActionRollSeed{
				effectRoll("terrain_effect", 0, "immediate", map[string]any{"mode": "difficult_terrain", "durationMode": "spell_duration"}),
			},
		})
		return true
	case "wall of thorns":
		inferPersistentAreaDamageSpell(spell, persistentAreaDamageSpec{
			name:        "Wall of Thorns",
			saveAbility: "dex",
			damageType:  "slashing",
			diceCount:   7,
			dieSize:     8,
			shape:       "wall",
			sizeText:    "Up to 60 ft long, 10 ft high, and 5 ft thick, or a circle up to 20 ft diameter.",
			trigger:     "enter_or_end_turn",
			details:     "The wall blocks line of sight and costs 4 feet of movement for every 1 foot moved through it.",
			extraRolls: []standardSpellActionRollSeed{
				effectRoll("terrain_effect", 0, "immediate", map[string]any{"mode": "difficult_terrain,blocks_line_of_sight", "durationMode": "spell_duration"}),
			},
		})
		return true
	case "wind wall":
		roll := standardDamageRoll("damage", "bludgeoning", 3, 8, 0, "immediate", nil)
		spell.Actions = []standardSpellActionSeed{{
			Name:                 "Wind Wall",
			ActionType:           "save",
			SaveAbility:          "str",
			SuccessfulSaveEffect: "half",
			HitSpecialEvent:      "none",
			DamageTypeChoice:     "specific",
			DamageTypeOptions:    []string{"bludgeoning"},
			Rolls: []standardSpellActionRollSeed{
				roll,
				effectRoll("battlefield_object", 0, "immediate", map[string]any{
					"kind":        "spell_area",
					"shape":       "wall",
					"sizeText":    "Up to 50 ft long, 15 ft high, and 1 ft thick.",
					"riderText":   "Small or smaller flying creatures and loose lightweight materials cannot pass through. Arrows and similar ordinary projectiles are deflected.",
					"areaSpell":   true,
					"damageType":  "bludgeoning",
					"diceCount":   3,
					"dieSize":     8,
					"saveAbility": "str",
					"saveEffect":  "half",
				}),
			},
		}}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "insect plague":
		inferPersistentAreaDamageSpell(spell, persistentAreaDamageSpec{
			name:        "Insect Plague",
			saveAbility: "con",
			damageType:  "piercing",
			diceCount:   4,
			dieSize:     10,
			shape:       "sphere",
			radiusFeet:  20,
			trigger:     "enter_or_end_turn",
			details:     "The area is lightly obscured and difficult terrain. A creature makes the save only once per turn.",
			extraRolls: []standardSpellActionRollSeed{
				effectRoll("terrain_effect", 0, "immediate", map[string]any{"mode": "difficult_terrain,lightly_obscured", "durationMode": "spell_duration"}),
			},
		})
		return true
	case "ice storm":
		bludgeoningDie := 8
		if spell.SourceKey == "srd-5-2-1" {
			bludgeoningDie = 10
		}
		bludgeoning := standardDamageRoll("damage", "bludgeoning", 2, bludgeoningDie, 0, "immediate", nil)
		bludgeoning.ScalingType = "spell_level"
		bludgeoning.ScalingFromLevel = max(1, spell.Level)
		bludgeoning.ScalingDiceCount = 1
		bludgeoning.ScalingDieSize = bludgeoningDie
		bludgeoning.ScalingStepSize = 1
		spell.Actions = []standardSpellActionSeed{{
			Name:                 "Ice Storm",
			ActionType:           "save",
			SaveAbility:          "dex",
			SuccessfulSaveEffect: "half",
			HitSpecialEvent:      "none",
			DamageTypeChoice:     "specific",
			DamageTypeOptions:    []string{"bludgeoning", "cold"},
			Rolls: []standardSpellActionRollSeed{
				bludgeoning,
				standardDamageRoll("damage", "cold", 4, 6, 0, "immediate", nil),
				effectRoll("terrain_effect", 0, "end_caster_turn_once", map[string]any{"mode": "difficult_terrain", "durationMode": "end_caster_next"}),
			},
		}}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "storm of vengeance":
		initial := standardDamageRoll("damage", "thunder", 2, 6, 0, "immediate", nil)
		spell.Actions = []standardSpellActionSeed{{
			Name:                 "Storm of Vengeance",
			ActionType:           "save",
			SaveAbility:          "con",
			SuccessfulSaveEffect: "none",
			HitSpecialEvent:      "none",
			DamageTypeChoice:     "specific",
			DamageTypeOptions:    []string{"thunder", "acid", "lightning", "bludgeoning", "cold"},
			Rolls: []standardSpellActionRollSeed{
				initial,
				effectRoll("condition", 0, "immediate", map[string]any{"condition": "Deafened", "durationMode": "spell_duration"}),
				effectRoll("battlefield_object", 0, "immediate", map[string]any{
					"kind":       "spell_area",
					"shape":      "special",
					"radiusFeet": 360,
					"areaSpell":  true,
					"riderText":  "Multi-round storm: acid rain, six lightning bolts, hail, then difficult terrain, heavy obscurement, cold damage, impossible ranged weapon attacks, and strong wind.",
				}),
				standardDamageRoll("recurring_hp_change", "acid", stormAcidDice(spell), 6, 0, "start_caster_turn_each", map[string]any{"mode": "damage", "round": "2"}),
				standardDamageRoll("recurring_hp_change", "lightning", 10, 6, 0, "start_caster_turn_each", map[string]any{"mode": "damage", "round": "3", "targets": "six"}),
				standardDamageRoll("recurring_hp_change", "bludgeoning", 2, 6, 0, "start_caster_turn_each", map[string]any{"mode": "damage", "round": "4"}),
				standardDamageRoll("recurring_hp_change", "cold", 1, 6, 0, "start_caster_turn_each", map[string]any{"mode": "damage", "round": "5-10"}),
				effectRoll("terrain_effect", 0, "start_caster_turn_each", map[string]any{"mode": "difficult_terrain,heavily_obscured,strong_wind,no_ranged_weapon_attacks", "round": "5-10"}),
			},
		}}
		spell.Actions[0].Rolls[1].ConditionName = "Deafened"
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "conjure animals":
		if spell.SourceKey == "srd-5-2-1" {
			inferPersistentAreaDamageSpell(spell, persistentAreaDamageSpec{
				name:             "Conjure Animals",
				saveAbility:      "dex",
				damageType:       "slashing",
				diceCount:        3,
				dieSize:          10,
				shape:            "special",
				radiusFeet:       10,
				moveDistanceFeet: 30,
				trigger:          "moves_into_or_within",
				details:          "A Large spectral pack can move up to 30 feet when the caster moves. The caster has advantage on Strength saves within 5 feet of it.",
			})
		} else {
			inferSummonOrTransformationSpell(spell, "Summon beast combatants", "Choose one CR 2 beast, two CR 1 beasts, four CR 1/2 beasts, or eight CR 1/4 beasts. More creatures appear with higher-level slots.")
		}
		return true
	case "conjure minor elementals", "conjure woodland beings", "conjure elemental", "conjure fey", "conjure celestial", "summon dragon":
		inferSummonOrTransformationSpell(spell, "Summoned combatant or battlefield entity", "Create the summoned creature or object manually, then track it as a run-scoped combatant or battlefield reminder.")
		return true
	case "arcane hand":
		inferSummonOrTransformationSpell(spell, "Arcane hand object", "Large magical hand, AC 20, HP equal to caster maximum HP, moves up to 60 feet, and can punch, push, grapple, crush, or interpose.")
		spell.Actions[0].Rolls = append(spell.Actions[0].Rolls,
			standardDamageRoll("attack_damage_rider", "force", arcaneHandFistDice(spell), 8, 0, "immediate", map[string]any{"trigger": "hand_clenched_fist"}),
			standardDamageRoll("attack_damage_rider", "bludgeoning", 4, 6, 0, "immediate", map[string]any{"trigger": "hand_grasping_crush", "addSpellcastingAbilityModifier": spell.SourceKey == "srd-5-2-1"}),
			effectRoll("forced_movement", 0, "immediate", map[string]any{"direction": "push", "details": "Pushes up to 5 feet plus five times the caster's spellcasting ability modifier."}),
		)
		return true
	case "polymorph", "true polymorph", "shapechange":
		inferSummonOrTransformationSpell(spell, "Transformation", "Replace or overlay the target's game statistics with the chosen form. Track HP carryover and the spell's end condition manually.")
		if strings.EqualFold(spell.Name, "Polymorph") {
			spell.Actions[0].ActionType = "save"
			spell.Actions[0].SaveAbility = "wis"
			spell.Actions[0].SuccessfulSaveEffect = "negates"
		}
		return true
	case "flesh to stone":
		spell.Actions = []standardSpellActionSeed{{
			Name:                 "Flesh to Stone",
			ActionType:           "save",
			SaveAbility:          "con",
			SuccessfulSaveEffect: "negates",
			HitSpecialEvent:      "none",
			DamageTypeChoice:     "specific",
			DamageTypeOptions:    []string{},
			Rolls: []standardSpellActionRollSeed{
				effectRoll("condition", 0, "immediate", map[string]any{"condition": "Restrained", "durationMode": "spell_duration"}),
				effectRoll("saving_throw_repeat", 0, "end_target_turn_each", map[string]any{"checkType": "saving_throw", "ability": "con", "successOutcome": "three_successes_or_failures", "details": "Three successes end the spell. Three failures apply Petrified for the duration."}),
				effectRoll("condition", 0, "manual", map[string]any{"condition": "Petrified", "durationMode": "spell_duration"}),
			},
		}}
		spell.Actions[0].Rolls[0].ConditionName = "Restrained"
		spell.Actions[0].Rolls[2].ConditionName = "Petrified"
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "hypnotic pattern":
		spell.Actions = []standardSpellActionSeed{{
			Name:                 "Hypnotic Pattern",
			ActionType:           "save",
			SaveAbility:          "wis",
			SuccessfulSaveEffect: "negates",
			HitSpecialEvent:      "none",
			DamageTypeChoice:     "specific",
			DamageTypeOptions:    []string{},
			Rolls: []standardSpellActionRollSeed{
				effectRoll("condition", 0, "immediate", map[string]any{"condition": "Charmed", "durationMode": "spell_duration"}),
				effectRoll("condition", 0, "immediate", map[string]any{"condition": "Incapacitated", "durationMode": "spell_duration"}),
				effectRoll("speed_multiplier", 0, "immediate", map[string]any{"multiplier": "0", "durationMode": "spell_duration"}),
			},
		}}
		spell.Actions[0].Rolls[0].ConditionName = "Charmed"
		spell.Actions[0].Rolls[1].ConditionName = "Incapacitated"
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "sleep":
		if spell.SourceKey == "srd-5-2-1" {
			spell.Actions = []standardSpellActionSeed{{
				Name:                 "Sleep",
				ActionType:           "save",
				SaveAbility:          "wis",
				SuccessfulSaveEffect: "negates",
				HitSpecialEvent:      "none",
				DamageTypeChoice:     "specific",
				DamageTypeOptions:    []string{},
				Rolls: []standardSpellActionRollSeed{
					effectRoll("condition", 0, "immediate", map[string]any{"condition": "Incapacitated", "durationMode": "end_target_next"}),
					effectRoll("saving_throw_repeat", 0, "end_target_turn_each", map[string]any{"checkType": "saving_throw", "ability": "wis", "successOutcome": "apply_unconscious_or_end"}),
					effectRoll("condition", 0, "manual", map[string]any{"condition": "Unconscious", "durationMode": "spell_duration"}),
				},
			}}
			spell.Actions[0].Rolls[0].ConditionName = "Incapacitated"
			spell.Actions[0].Rolls[2].ConditionName = "Unconscious"
		} else {
			inferSummonOrTransformationSpell(spell, "HP pool sleep effect", "Roll 5d8 plus 2d8 per slot above 1st, then apply Unconscious to creatures in ascending current HP until the pool is spent.")
			pool := standardDamageRoll("custom", "healing", 5, 8, 0, "immediate", map[string]any{"mode": "hp_pool", "condition": "Unconscious"})
			pool.ScalingType = "spell_level"
			pool.ScalingFromLevel = max(1, spell.Level)
			pool.ScalingDiceCount = 2
			pool.ScalingDieSize = 8
			pool.ScalingStepSize = 1
			spell.Actions[0].Rolls = append([]standardSpellActionRollSeed{pool}, spell.Actions[0].Rolls...)
		}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	case "antimagic field", "forcecage", "maze", "reverse gravity":
		inferSummonOrTransformationSpell(spell, spell.Name, "Complex battlefield control. Log this prominently and resolve placement, escape checks, suppression, layers, or forced movement manually.")
		return true
	case "earthquake":
		spell.Actions = []standardSpellActionSeed{simpleEffectAction("Earthquake",
			effectRoll("battlefield_object", 0, "immediate", map[string]any{"kind": "spell_area", "shape": "special", "radiusFeet": 100, "areaSpell": true, "riderText": "Seismic area with concentration disruption, fissures, structure damage, collapses, and buried creatures."}),
			effectRoll("terrain_effect", 0, "immediate", map[string]any{"mode": "difficult_terrain", "durationMode": "spell_duration"}),
			effectRoll("area_trigger", 0, "end_caster_turn_each", map[string]any{"trigger": "manual", "outcome": "dex_save_or_prone", "saveAbility": "dex", "details": "When cast and at the end of each concentrating turn, creatures on the ground save or fall prone."}),
		)}
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		return true
	default:
		return false
	}
}

func inferPrismaticSpraySpell(spell *standardSpellSeed) {
	diceCount := 10
	if spell.SourceKey == "srd-5-2-1" {
		diceCount = 12
	}
	spell.Actions = []standardSpellActionSeed{{
		Name:                 "Prismatic Spray",
		ActionType:           "save",
		SaveAbility:          "dex",
		SuccessfulSaveEffect: "half",
		HitSpecialEvent:      "none",
		DamageTypeChoice:     "specific",
		DamageTypeOptions:    []string{"fire", "acid", "lightning", "poison", "cold"},
		Rolls: []standardSpellActionRollSeed{
			effectRoll("roll_table", 0, "manual", map[string]any{
				"dice":        "1d8",
				"name":        "Prismatic Rays",
				"instruction": "Roll once for each target. On an 8, roll twice more and reroll any 8.",
				"rows": []map[string]any{
					prismaticRow(1, "Red", "10d6 fire damage; half on a successful Dexterity save.", diceCount, "fire"),
					prismaticRow(2, "Orange", "10d6 acid damage; half on a successful Dexterity save.", diceCount, "acid"),
					prismaticRow(3, "Yellow", "10d6 lightning damage; half on a successful Dexterity save.", diceCount, "lightning"),
					prismaticRow(4, "Green", "10d6 poison damage; half on a successful Dexterity save.", diceCount, "poison"),
					prismaticRow(5, "Blue", "10d6 cold damage; half on a successful Dexterity save.", diceCount, "cold"),
					prismaticConditionRow(6, "Indigo", "Restrained", "con", "Restrained; repeat Constitution saves until three successes end it or three failures apply Petrified.", "Indigo ray: three successes end Restrained; three failures apply Petrified."),
					prismaticConditionRow(7, "Violet", "Blinded", "wis", "Blinded; Wisdom save at the start of the caster's next turn or teleport to another plane.", "Violet ray: save at the start of the caster's next turn; failure teleports the creature to another plane."),
					{"roll": 8, "name": "Special", "effect": "Roll twice more, rerolling any 8.", "effectText": "Roll twice more, rerolling any 8.", "rerollRule": "Roll twice more and reroll any 8.", "effects": []map[string]any{{"rollKind": "custom", "conditionName": "Roll twice more, rerolling any 8."}}},
				},
			}),
		},
	}}
	spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
}

func inferPrismaticWallSpell(spell *standardSpellSeed) {
	diceCount := 10
	if spell.SourceKey == "srd-5-2-1" {
		diceCount = 12
	}
	spell.Actions = []standardSpellActionSeed{{
		Name:                 "Prismatic Wall",
		ActionType:           "save",
		SaveAbility:          "dex",
		SuccessfulSaveEffect: "half",
		HitSpecialEvent:      "none",
		DamageTypeChoice:     "specific",
		DamageTypeOptions:    []string{"fire", "acid", "lightning", "poison", "cold"},
		Rolls: []standardSpellActionRollSeed{
			effectRoll("layered_effect", 0, "immediate", map[string]any{
				"kind":      "wall",
				"shape":     "wall",
				"areaSpell": true,
				"name":      "Prismatic Layers",
				"sizeText":  "Wall up to 90 ft long, 30 ft high, and 1 inch thick, or globe up to 30 ft diameter.",
				"riderText": "Track seven layers in order. Creatures designated by the caster can pass safely; other creatures risk blindness near the wall and layer effects when passing through.",
				"layers": []map[string]any{
					prismaticLayer(1, "Red", "fire", diceCount, "Nonmagical ranged attacks cannot pass through. Destroyed by at least 25 cold damage."),
					prismaticLayer(2, "Orange", "acid", diceCount, "Magical ranged attacks cannot pass through. Destroyed by strong wind."),
					prismaticLayer(3, "Yellow", "lightning", diceCount, "Destroyed by at least 60 force damage."),
					prismaticLayer(4, "Green", "poison", diceCount, "Destroyed by Passwall or an equal-or-higher-level portal spell."),
					prismaticLayer(5, "Blue", "cold", diceCount, "Destroyed by at least 25 fire damage."),
					{"order": 6, "color": "Indigo", "saveAbility": "dex", "saveEffect": "manual", "effect": "Restrained; repeat Constitution saves until three successes end it or three failures apply Petrified.", "effectText": "Restrained; repeat Constitution saves until three successes end it or three failures apply Petrified.", "condition": "Restrained", "repeatSave": "con", "removal": "Destroyed by bright light from Daylight."},
					{"order": 7, "color": "Violet", "saveAbility": "dex", "saveEffect": "manual", "effect": "Blinded; Wisdom save at the start of the caster's next turn or teleport to another plane.", "effectText": "Blinded; Wisdom save at the start of the caster's next turn or teleport to another plane.", "condition": "Blinded", "repeatSave": "wis", "removal": "Destroyed by Dispel Magic."},
				},
			}),
			effectRoll("area_trigger", 0, "immediate", map[string]any{"trigger": "start_turn", "outcome": "manual", "saveAbility": "con", "details": "A creature that can see the wall and starts within 20 feet saves or is Blinded for 1 minute."}),
			effectRoll("saving_throw_repeat", 0, "manual", map[string]any{"checkType": "saving_throw", "ability": "con", "successOutcome": "three_successes_or_failures", "details": "Indigo layer: three successes end Restrained; three failures apply Petrified."}),
			effectRoll("saving_throw_repeat", 0, "manual", map[string]any{"checkType": "saving_throw", "ability": "wis", "successOutcome": "manual", "details": "Violet layer: save at the start of the caster's next turn; failure teleports the creature to another plane."}),
		},
	}}
	spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
}

type persistentAreaDamageSpec struct {
	name             string
	saveAbility      string
	damageType       string
	diceCount        int
	dieSize          int
	shape            string
	radiusFeet       int
	heightFeet       int
	moveDistanceFeet int
	sizeText         string
	trigger          string
	details          string
	extraRolls       []standardSpellActionRollSeed
}

func inferPersistentAreaDamageSpell(spell *standardSpellSeed, spec persistentAreaDamageSpec) {
	damage := standardDamageRoll("damage", spec.damageType, spec.diceCount, spec.dieSize, 0, "immediate", nil)
	damage.ScalingType = "spell_level"
	damage.ScalingFromLevel = max(1, spell.Level)
	damage.ScalingDiceCount = 1
	damage.ScalingDieSize = spec.dieSize
	damage.ScalingStepSize = 1

	areaObject := effectRoll("battlefield_object", 0, "immediate", map[string]any{
		"areaSpell":        true,
		"kind":             "spell_area",
		"shape":            spec.shape,
		"radiusFeet":       spec.radiusFeet,
		"heightFeet":       spec.heightFeet,
		"moveDistanceFeet": spec.moveDistanceFeet,
		"sizeText":         spec.sizeText,
		"saveAbility":      spec.saveAbility,
		"saveEffect":       "half",
		"damageType":       spec.damageType,
		"diceCount":        spec.diceCount,
		"dieSize":          spec.dieSize,
		"scalingType":      "spell_level",
		"scalingFromLevel": max(1, spell.Level),
		"scalingDiceCount": 1,
		"scalingDieSize":   spec.dieSize,
		"scalingStepSize":  1,
		"triggerRules":     spec.trigger,
		"oncePerTurn":      true,
		"riderText":        spec.details,
	})
	areaTrigger := effectRoll("area_trigger", 0, "immediate", map[string]any{
		"trigger":      spec.trigger,
		"outcome":      "save_for_damage",
		"saveAbility":  spec.saveAbility,
		"durationMode": "spell_duration",
		"details":      spec.details,
		"oncePerTurn":  true,
	})
	rolls := []standardSpellActionRollSeed{damage, areaObject, areaTrigger}
	rolls = append(rolls, spec.extraRolls...)
	spell.Actions = []standardSpellActionSeed{{
		Name:                 spec.name,
		ActionType:           "save",
		SaveAbility:          spec.saveAbility,
		SuccessfulSaveEffect: "half",
		HitSpecialEvent:      "none",
		DamageTypeChoice:     "specific",
		DamageTypeOptions:    []string{spec.damageType},
		Rolls:                rolls,
	}}
	spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
}

func inferSummonOrTransformationSpell(spell *standardSpellSeed, label string, details string) {
	spell.Actions = []standardSpellActionSeed{simpleEffectAction(label, effectRoll("battlefield_object", 0, "immediate", map[string]any{
		"kind":      "manual_object",
		"details":   details,
		"riderText": details,
	}))}
	spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
}

func arcaneHandFistDice(spell *standardSpellSeed) int {
	if spell.SourceKey == "srd-5-2-1" {
		return 5
	}
	return 4
}

func stormAcidDice(spell *standardSpellSeed) int {
	if spell.SourceKey == "srd-5-2-1" {
		return 4
	}
	return 1
}
