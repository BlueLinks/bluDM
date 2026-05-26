package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"errors"
	"fmt"
	"strings"
)

func (s *Server) applyRollTableSpellEffect(ctx context.Context, runID, actorID, targetID string, spell models.Spell, castLevel int, roll models.SpellActionRollPart, resolution rollTableResolutionRequest) ([]map[string]any, error) {
	rows := configRows(roll.EffectConfig["rows"])
	if len(rows) == 0 {
		return nil, errors.New("roll table has no outcomes")
	}
	rolled := resolution.Roll
	autoRoll := resolution.Mode == "" || resolution.Mode == "auto"
	if autoRoll {
		rolled = rollDice(1, tableDieSize(roll.EffectConfig["dice"]))
	}
	row, ok := rowForRoll(rows, rolled)
	if !ok {
		return nil, fmt.Errorf("roll table outcome %d is not configured", rolled)
	}
	appliedRows, rolledValues, err := resolvedRollTableRows(rows, row, rolled, autoRoll, resolution.FollowUpRolls)
	if err != nil {
		return nil, err
	}
	results := []map[string]any{}
	for _, row := range appliedRows {
		outcome, err := s.applyRollTableRow(ctx, runID, actorID, targetID, spell, castLevel, row, rolledValues, resolution.SaveResult)
		if err != nil {
			return nil, err
		}
		results = append(results, outcome)
	}
	return results, nil
}

func resolvedRollTableRows(rows []map[string]any, row map[string]any, rolled int, autoRoll bool, followUps []int) ([]map[string]any, []int, error) {
	appliedRows := []map[string]any{row}
	rolledValues := []int{rolled}
	if rolled != 8 {
		return appliedRows, rolledValues, nil
	}
	if autoRoll {
		followUps = []int{rollDice(1, 7), rollDice(1, 7)}
	}
	if len(followUps) != 2 {
		return nil, nil, errors.New("roll table outcome 8 requires two follow-up rolls")
	}
	for _, followUp := range followUps {
		if followUp == 8 {
			return nil, nil, errors.New("follow-up rolls for outcome 8 must reroll any 8")
		}
		followUpRow, ok := rowForRoll(rows, followUp)
		if !ok {
			return nil, nil, fmt.Errorf("follow-up outcome %d is not configured", followUp)
		}
		appliedRows = append(appliedRows, followUpRow)
		rolledValues = append(rolledValues, followUp)
	}
	return appliedRows, rolledValues, nil
}

func (s *Server) applyRollTableRow(ctx context.Context, runID, actorID, targetID string, spell models.Spell, castLevel int, row map[string]any, rolledValues []int, saveResult string) (map[string]any, error) {
	outcome := map[string]any{"targetId": targetID, "effectKind": "roll_table", "spellName": spell.Name, "roll": intFromAny(row["roll"]), "name": stringFromAny(row["name"]), "saveResult": saveResult, "rolled": rolledValues, "status": "resolved"}
	_ = s.appendCombatLogEvent(ctx, runID, "spell_roll_table_outcome", actorID, targetID, outcome)
	for _, effect := range configRows(row["effects"]) {
		nestedRoll := rollFromTableEffect(row, effect)
		if nestedRoll.RollKind == "" || skipNestedEffectForSave(nestedRoll, row, saveResult) {
			continue
		}
		amount := spellEffectAmount(nestedRoll, 0, 0)
		if saveResult == "success" && nestedSaveEffect(effect) == "half" {
			amount /= 2
		}
		if err := s.applySpellEffect(ctx, runID, actorID, targetID, nestedRoll, amount, spell.Name); err != nil {
			return nil, err
		}
		if shouldTrackSpellEffect(nestedRoll) {
			_ = s.createActiveSpellEffect(ctx, runID, actorID, targetID, spell, castLevel, nestedRoll, amount)
		}
		outcome["nestedEffectKind"] = nestedRoll.RollKind
	}
	return outcome, nil
}

func rollFromTableEffect(row map[string]any, effect map[string]any) models.SpellActionRollPart {
	config := map[string]any{}
	if nested, ok := effect["effectConfig"].(map[string]any); ok {
		for key, value := range nested {
			config[key] = value
		}
	}
	for _, key := range []string{"applyOn", "saveEffect"} {
		if value, ok := effect[key]; ok {
			config[key] = value
		}
	}
	conditionName := strings.TrimSpace(stringFromAny(effect["conditionName"]))
	if conditionName == "" {
		conditionName = strings.TrimSpace(stringFromAny(row["condition"]))
	}
	return models.SpellActionRollPart{RollKind: strings.TrimSpace(stringFromAny(effect["rollKind"])), DamageType: strings.TrimSpace(stringFromAny(effect["damageType"])), DiceCount: intFromAny(effect["diceCount"]), DieSize: intFromAny(effect["dieSize"]), FixedValue: intFromAny(effect["fixedValue"]), ConditionName: conditionName, EffectConfig: config, Timing: "immediate"}
}

func nestedSaveEffect(effect map[string]any) string {
	if value := strings.TrimSpace(stringFromAny(effect["saveEffect"])); value != "" {
		return value
	}
	if config, ok := effect["effectConfig"].(map[string]any); ok {
		return strings.TrimSpace(stringFromAny(config["saveEffect"]))
	}
	return ""
}

func skipNestedEffectForSave(roll models.SpellActionRollPart, row map[string]any, saveResult string) bool {
	saveResult = strings.TrimSpace(saveResult)
	if saveResult == "" || saveResult == "manual" {
		return roll.RollKind == "damage" || roll.RollKind == "condition" || roll.RollKind == "saving_throw_repeat"
	}
	if saveResult != "success" {
		return false
	}
	if strings.TrimSpace(stringFromAny(roll.EffectConfig["applyOn"])) == "failed_save" {
		return true
	}
	return roll.RollKind == "condition" || roll.RollKind == "saving_throw_repeat" || strings.TrimSpace(stringFromAny(row["saveEffect"])) == "negates"
}

func configRows(value any) []map[string]any {
	if rows, ok := value.([]map[string]any); ok {
		return rows
	}
	if rows, ok := value.([]any); ok {
		out := make([]map[string]any, 0, len(rows))
		for _, row := range rows {
			if rowMap, ok := row.(map[string]any); ok {
				out = append(out, rowMap)
			}
		}
		return out
	}
	return nil
}

func rowForRoll(rows []map[string]any, roll int) (map[string]any, bool) {
	for _, row := range rows {
		if intFromAny(row["roll"]) == roll {
			return row, true
		}
	}
	return nil, false
}

func tableDieSize(value any) int {
	dice := strings.TrimSpace(stringFromAny(value))
	if strings.HasPrefix(dice, "1d") {
		size := intFromAny(strings.TrimPrefix(dice, "1d"))
		if size > 0 {
			return size
		}
	}
	return 8
}
