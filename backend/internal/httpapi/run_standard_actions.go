package httpapi

import (
	"context"
	"errors"
	"regexp"
	"strconv"
	"strings"

	"bludm/backend/internal/models"
)

var standardDamageDice = regexp.MustCompile(`^(\d+)d(\d+)([+-]\d+)?$`)

func (s *Server) runCreatureAction(ctx context.Context, actor models.EncounterRunCombatant, actionID string) (models.CreatureAction, error) {
	if strings.HasPrefix(actionID, "standard:") {
		action, ok := standardRunAction(actor, actionID)
		if !ok {
			return models.CreatureAction{}, errors.New("standard action not found in actor snapshot")
		}
		return action, nil
	}
	userID, _ := currentUserID(ctx)
	return s.stores.Actions.CreatureActionByID(ctx, userID, actionID)
}

func standardRunAction(combatant models.EncounterRunCombatant, actionID string) (models.CreatureAction, bool) {
	if combatant.SourceType != "creature" || stringFromAny(combatant.Snapshot["standardCreatureId"]) == "" {
		return models.CreatureAction{}, false
	}
	parts := strings.Split(actionID, ":")
	if len(parts) != 3 || parts[0] != "standard" || !standardActionSection(parts[1]) {
		return models.CreatureAction{}, false
	}
	index, err := strconv.Atoi(parts[2])
	if err != nil || index < 0 {
		return models.CreatureAction{}, false
	}
	creature, ok := combatant.Snapshot["creature"].(map[string]any)
	if !ok {
		return models.CreatureAction{}, false
	}
	statBlock, ok := creature["statBlock"].(map[string]any)
	if !ok {
		return models.CreatureAction{}, false
	}
	features, ok := statBlock[parts[1]].([]any)
	if !ok || index >= len(features) {
		return models.CreatureAction{}, false
	}
	feature, ok := features[index].(map[string]any)
	if !ok || strings.TrimSpace(stringFromAny(feature["name"])) == "" {
		return models.CreatureAction{}, false
	}
	description := stringFromAny(feature["description"])
	actionType := "feature"
	if strings.HasPrefix(strings.ToLower(strings.TrimSpace(description)), "melee ") {
		actionType = "melee_weapon"
	} else if strings.HasPrefix(strings.ToLower(strings.TrimSpace(description)), "ranged ") {
		actionType = "ranged_weapon"
	}
	action := models.CreatureAction{
		ID:             actionID,
		CreatureID:     stringFromAny(combatant.Snapshot["standardCreatureId"]),
		SortOrder:      index,
		Name:           stringFromAny(feature["name"]),
		Description:    description,
		ActionType:     actionType,
		DisplaySection: standardActionDisplaySection(parts[1]),
		AttackModifier: intFromAny(feature["attackBonus"]),
		MissEffect:     "none",
		Rolls:          standardActionRolls(feature["damage"]),
	}
	if len(action.Rolls) == 0 && actionType == "feature" {
		return models.CreatureAction{}, false
	}
	return action, true
}

func standardActionSection(section string) bool {
	switch section {
	case "actions", "bonusActions", "reactions", "legendaryActions", "mythicActions", "lairActions":
		return true
	default:
		return false
	}
}

func standardActionDisplaySection(section string) string {
	switch section {
	case "bonusActions":
		return "bonus_action"
	case "reactions":
		return "reaction"
	case "legendaryActions":
		return "legendary_action"
	case "mythicActions":
		return "mythic_action"
	case "lairActions":
		return "lair_action"
	default:
		return "action"
	}
}

func standardActionRolls(raw any) []models.ActionRollPart {
	values, ok := raw.([]any)
	if !ok {
		return nil
	}
	rolls := make([]models.ActionRollPart, 0, len(values))
	for _, value := range values {
		damage, ok := value.(map[string]any)
		if !ok {
			continue
		}
		formula := strings.ReplaceAll(stringFromAny(damage["damageDice"]), " ", "")
		match := standardDamageDice.FindStringSubmatch(formula)
		if match == nil {
			continue
		}
		count, _ := strconv.Atoi(match[1])
		size, _ := strconv.Atoi(match[2])
		fixed, _ := strconv.Atoi(match[3])
		if count <= 0 || size <= 0 {
			continue
		}
		rolls = append(rolls, models.ActionRollPart{
			SortOrder:  len(rolls),
			RollKind:   "damage",
			DamageType: strings.ToLower(strings.TrimSpace(stringFromAny(damage["damageType"]))),
			DiceCount:  count,
			DieSize:    size,
			FixedValue: fixed,
		})
	}
	return rolls
}
