package db

import "strings"

func inferCuratedStandardSpellAutomation(spell *standardSpellSeed) bool {
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

func fixedSpellLevelRoll(kind string, fixedValue int, scalingFromLevel int, scalingFixedValue int) standardSpellActionRollSeed {
	return standardSpellActionRollSeed{
		RollKind:          kind,
		DamageType:        "healing",
		Magical:           true,
		FixedValue:        fixedValue,
		Timing:            "immediate",
		ScalingType:       "spell_level",
		ScalingFromLevel:  scalingFromLevel,
		ScalingFixedValue: scalingFixedValue,
		ScalingStepSize:   1,
	}
}
