package db

import "strings"

func prismaticRow(roll int, name string, effect string, diceCount int, damageType string) map[string]any {
	if diceCount == 12 {
		effect = strings.Replace(effect, "10d6", "12d6", 1)
	}
	return map[string]any{"roll": roll, "name": name, "saveAbility": "dex", "saveEffect": "half", "effect": effect, "effectText": effect, "damageType": damageType, "diceCount": diceCount, "dieSize": 6, "effects": []map[string]any{{"rollKind": "damage", "damageType": damageType, "diceCount": diceCount, "dieSize": 6, "saveEffect": "half"}}}
}

func prismaticConditionRow(roll int, name string, condition string, repeatSave string, effect string, details string) map[string]any {
	return map[string]any{
		"roll":        roll,
		"name":        name,
		"saveAbility": "dex",
		"saveEffect":  "negates",
		"effect":      effect,
		"effectText":  effect,
		"condition":   condition,
		"repeatSave":  repeatSave,
		"effects": []map[string]any{
			{"rollKind": "condition", "conditionName": condition, "applyOn": "failed_save"},
			{"rollKind": "saving_throw_repeat", "applyOn": "failed_save", "effectConfig": map[string]any{"checkType": "saving_throw", "ability": repeatSave, "successOutcome": repeatSaveSuccessOutcome(repeatSave), "details": details}},
		},
	}
}

func repeatSaveSuccessOutcome(ability string) string {
	if ability == "con" {
		return "three_successes_or_failures"
	}
	return "manual"
}

func prismaticLayer(order int, color string, damageType string, diceCount int, removal string) map[string]any {
	layer := map[string]any{"order": order, "color": color, "damageType": damageType, "diceCount": diceCount, "dieSize": 6, "saveAbility": "dex", "saveEffect": "half", "effect": "Dexterity save or take damage from this layer; half on a successful save.", "effectText": "Dexterity save or take damage from this layer; half on a successful save.", "removal": removal}
	if order == 1 {
		layer["rangedAttackRule"] = "Nonmagical ranged attacks cannot pass through this layer."
	}
	if order == 2 {
		layer["rangedAttackRule"] = "Magical ranged attacks cannot pass through this layer."
	}
	return layer
}
