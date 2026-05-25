package db

import (
	"encoding/json"
	"regexp"
	"strconv"
	"strings"
)

func inferStandardSpellAutomation(spell *standardSpellSeed) {
	if len(spell.Actions) > 0 {
		return
	}
	if inferCuratedStandardSpellAutomation(spell) {
		return
	}
	mechanics := map[string]any{}
	_ = json.Unmarshal(spell.Mechanics, &mechanics)

	if healBySlot, ok := stringMap(mechanics["healAtSlotLevel"]); ok {
		if action, ok := inferHealingAction(*spell, healBySlot); ok {
			spell.Actions = append(spell.Actions, action)
			spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
		}
		return
	}

	damageRolls := inferDamageRolls(spell.Level, mechanics)
	if len(damageRolls) == 0 {
		return
	}

	actionType := "damage"
	if attackType := strings.ToLower(stringValue(mechanics["attackType"])); attackType == "ranged" || attackType == "melee" {
		actionType = "spell_attack"
	}
	saveAbility, saveEffect := inferSave(mechanics["dc"], spell.Description)
	if saveAbility != "" {
		actionType = "save"
	}

	spell.Actions = []standardSpellActionSeed{{
		Name:                 "Spell effect",
		ActionType:           actionType,
		SaveAbility:          saveAbility,
		SuccessfulSaveEffect: saveEffect,
		HitSpecialEvent:      "none",
		DamageTypeChoice:     "specific",
		DamageTypeOptions:    uniqueDamageTypes(damageRolls),
		Rolls:                damageRolls,
	}}
	if spell.ProjectileScaling == nil {
		spell.ProjectileScaling = inferTargetsFromDescription(spell.Description)
	}
}

func inferCuratedStandardSpellAutomation(spell *standardSpellSeed) bool {
	switch strings.ToLower(spell.Name) {
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

func inferHealingAction(spell standardSpellSeed, healBySlot map[string]string) (standardSpellActionSeed, bool) {
	baseLevel := max(1, spell.Level)
	baseFormula, ok := formulaForLevel(healBySlot, baseLevel)
	if !ok {
		return standardSpellActionSeed{}, false
	}
	roll := standardSpellActionRollSeed{
		RollKind:               "healing",
		DamageType:             "healing",
		Magical:                true,
		DiceCount:              baseFormula.diceCount,
		DieSize:                positiveOrDefault(baseFormula.dieSize, 6),
		FixedValue:             baseFormula.fixed,
		AddPrimaryStatModifier: baseFormula.addStat,
		Timing:                 "immediate",
		ScalingType:            "none",
		ScalingStepSize:        1,
	}
	if nextFormula, ok := formulaForLevel(healBySlot, baseLevel+1); ok {
		applySpellLevelScaling(&roll, baseLevel, baseFormula, nextFormula)
	}
	rolls := []standardSpellActionRollSeed{roll}
	if strings.EqualFold(spell.Name, "Aid") && roll.DiceCount == 0 && roll.FixedValue > 0 {
		roll.RollKind = "max_hp"
		rolls = []standardSpellActionRollSeed{
			roll,
			{
				RollKind:          "healing",
				DamageType:        "healing",
				Magical:           true,
				FixedValue:        roll.FixedValue,
				Timing:            "immediate",
				ScalingType:       roll.ScalingType,
				ScalingFromLevel:  roll.ScalingFromLevel,
				ScalingFixedValue: roll.ScalingFixedValue,
				ScalingStepSize:   roll.ScalingStepSize,
			},
		}
	}
	return standardSpellActionSeed{
		Name:              "Healing effect",
		ActionType:        "damage",
		HitSpecialEvent:   "none",
		DamageTypeChoice:  "specific",
		DamageTypeOptions: []string{"healing"},
		Rolls:             rolls,
	}, true
}

func inferDamageRolls(level int, mechanics map[string]any) []standardSpellActionRollSeed {
	damage := mechanics["damage"]
	if bySource, ok := damage.(map[string]any); ok {
		damageType := normalizeDamageType(stringValue(bySource["damageType"]))
		if slotMap, ok := stringMap(bySource["damageAtSlotLevel"]); ok {
			baseLevel := max(1, level)
			baseFormula, found := formulaForLevel(slotMap, baseLevel)
			if !found {
				return nil
			}
			roll := damageRoll(damageType, baseFormula)
			if nextFormula, ok := formulaForLevel(slotMap, baseLevel+1); ok {
				applySpellLevelScaling(&roll, baseLevel, baseFormula, nextFormula)
			}
			return []standardSpellActionRollSeed{roll}
		}
		if characterMap, ok := stringMap(bySource["damageAtCharacterLevel"]); ok {
			baseFormula, found := formulaForLevel(characterMap, 1)
			if !found {
				return nil
			}
			roll := damageRoll(damageType, baseFormula)
			roll.CantripScaling = cantripDamageScaling(characterMap, baseFormula)
			return []standardSpellActionRollSeed{roll}
		}
	}
	if list, ok := damage.([]any); ok {
		rolls := []standardSpellActionRollSeed{}
		for _, item := range list {
			entry, ok := item.(map[string]any)
			if !ok {
				continue
			}
			formula := parseSpellFormula(stringValue(entry["damageDice"]))
			if formula.diceCount == 0 && formula.fixed == 0 {
				continue
			}
			rolls = append(rolls, damageRoll(normalizeDamageType(stringValue(entry["damageType"])), formula))
		}
		return rolls
	}
	return nil
}

func damageRoll(damageType string, formula parsedSpellFormula) standardSpellActionRollSeed {
	return standardSpellActionRollSeed{
		RollKind:               "damage",
		DamageType:             damageType,
		Magical:                true,
		DiceCount:              formula.diceCount,
		DieSize:                positiveOrDefault(formula.dieSize, 6),
		FixedValue:             formula.fixed,
		AddPrimaryStatModifier: formula.addStat,
		Timing:                 "immediate",
		ScalingType:            "none",
		ScalingStepSize:        1,
	}
}

func applySpellLevelScaling(roll *standardSpellActionRollSeed, fromLevel int, base parsedSpellFormula, next parsedSpellFormula) {
	if base.dieSize != next.dieSize || base.addStat != next.addStat {
		return
	}
	roll.ScalingType = "spell_level"
	roll.ScalingFromLevel = fromLevel
	roll.ScalingDiceCount = max(0, next.diceCount-base.diceCount)
	roll.ScalingDieSize = positiveOrDefault(base.dieSize, next.dieSize)
	roll.ScalingFixedValue = next.fixed - base.fixed
	roll.ScalingStepSize = 1
}

func inferSave(value any, description string) (string, string) {
	dc, ok := value.(map[string]any)
	if !ok {
		return "", "none"
	}
	ability := strings.ToLower(stringValue(dc["dcType"]))
	if ability == "" {
		if dcType, ok := dc["dc_type"].(map[string]any); ok {
			ability = strings.ToLower(stringValue(dcType["index"]))
			if ability == "" {
				ability = strings.ToLower(stringValue(dcType["name"]))
			}
		}
	}
	switch ability {
	case "str", "strength":
		ability = "str"
	case "dex", "dexterity":
		ability = "dex"
	case "con", "constitution":
		ability = "con"
	case "int", "intelligence":
		ability = "int"
	case "wis", "wisdom":
		ability = "wis"
	case "cha", "charisma":
		ability = "cha"
	default:
		ability = ""
	}
	effect := "none"
	if strings.EqualFold(stringValue(dc["dc_success"]), "half") ||
		strings.Contains(strings.ToLower(stringValue(dc["success"])), "half") ||
		strings.Contains(strings.ToLower(description), "half as much") {
		effect = "half"
	}
	return ability, effect
}

func inferTargetsFromDescription(description string) *standardSpellProjectileScalingSeed {
	lower := strings.ToLower(description)
	switch {
	case strings.Contains(lower, "choose one creature within range") &&
		strings.Contains(lower, "choose two creatures within range") &&
		strings.Contains(lower, "within 5 feet of each other"):
		return &standardSpellProjectileScalingSeed{
			BaseProjectiles: 2,
			ScalingType:     "none",
			StepSize:        1,
			Description:     "Choose one creature, or two creatures within range that are within 5 feet of each other.",
		}
	case strings.Contains(lower, "5-foot-radius sphere") && strings.Contains(lower, "each creature in that sphere"):
		return &standardSpellProjectileScalingSeed{
			BaseProjectiles: 1,
			ScalingType:     "none",
			StepSize:        1,
			Description:     "Affects each creature in a 5-foot-radius Sphere.",
		}
	case strings.Contains(lower, "choose up to three"):
		return &standardSpellProjectileScalingSeed{BaseProjectiles: 3, ScalingType: "none", StepSize: 1}
	case strings.Contains(lower, "three glowing darts"):
		return &standardSpellProjectileScalingSeed{
			BaseProjectiles:       3,
			ScalingType:           "spell_level",
			ScaleFromLevel:        1,
			AdditionalProjectiles: 1,
			StepSize:              1,
		}
	default:
		return &standardSpellProjectileScalingSeed{BaseProjectiles: 1, ScalingType: "none", StepSize: 1}
	}
}

func cantripDamageScaling(values map[string]string, base parsedSpellFormula) map[string]any {
	scaling := map[string]any{}
	for _, key := range []string{"5", "11", "17"} {
		formula, ok := formulaForLevel(values, mustAtoi(key))
		if !ok || formula.dieSize != base.dieSize {
			continue
		}
		added := max(0, formula.diceCount-base.diceCount)
		if added > 0 {
			scaling[key] = map[string]any{"diceCount": added, "dieSize": formula.dieSize}
		}
	}
	return scaling
}

func formulaForLevel(values map[string]string, level int) (parsedSpellFormula, bool) {
	value, ok := values[strconv.Itoa(level)]
	if !ok {
		return parsedSpellFormula{}, false
	}
	return parseSpellFormula(value), true
}

var spellDicePattern = regexp.MustCompile(`(?i)(\d+)\s*d\s*(\d+)`)

func parseSpellFormula(value string) parsedSpellFormula {
	cleaned := strings.ToUpper(strings.ReplaceAll(value, " ", ""))
	formula := parsedSpellFormula{}
	if strings.Contains(cleaned, "MOD") {
		formula.addStat = true
		cleaned = strings.ReplaceAll(cleaned, "+MOD", "")
		cleaned = strings.ReplaceAll(cleaned, "MOD", "")
	}
	if match := spellDicePattern.FindStringSubmatch(cleaned); len(match) == 3 {
		formula.diceCount = mustAtoi(match[1])
		formula.dieSize = mustAtoi(match[2])
		cleaned = strings.Replace(cleaned, match[0], "", 1)
	}
	cleaned = strings.Trim(cleaned, "+")
	if cleaned != "" {
		formula.fixed = mustAtoi(cleaned)
	}
	return formula
}

func stringMap(value any) (map[string]string, bool) {
	raw, ok := value.(map[string]any)
	if !ok {
		return nil, false
	}
	result := map[string]string{}
	for key, item := range raw {
		result[key] = stringValue(item)
	}
	return result, len(result) > 0
}

func uniqueDamageTypes(rolls []standardSpellActionRollSeed) []string {
	seen := map[string]bool{}
	result := []string{}
	for _, roll := range rolls {
		if roll.DamageType == "" || seen[roll.DamageType] {
			continue
		}
		seen[roll.DamageType] = true
		result = append(result, roll.DamageType)
	}
	return result
}

func normalizeDamageType(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return "force"
	}
	return value
}

func stringValue(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case float64:
		if typed == float64(int(typed)) {
			return strconv.Itoa(int(typed))
		}
		return strconv.FormatFloat(typed, 'f', -1, 64)
	default:
		return ""
	}
}

func defaultText(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func nonNegativeOrDefault(value int, fallback int) int {
	if value >= 0 {
		return value
	}
	return fallback
}

func positiveOrDefault(value int, fallback int) int {
	if value > 0 {
		return value
	}
	return fallback
}

func mustAtoi(value string) int {
	number, _ := strconv.Atoi(value)
	return number
}
