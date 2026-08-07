package store

import (
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"
)

func actionTemplateEntityFromInput(ownerUserID string, input ActionInput) dbmodels.ActionTemplateEntity {
	return dbmodels.ActionTemplateEntity{
		OwnerUserID:     ownerUserID,
		Name:            input.Name,
		Description:     input.Description,
		Recharge:        input.Recharge,
		LimitedUses:     input.LimitedUses,
		LimitType:       input.LimitType,
		Reach:           input.Reach,
		ActionRange:     input.Range,
		AOEType:         input.AOEType,
		AOESize:         input.AOESize,
		ActionType:      input.ActionType,
		DisplaySection:  normalizedDisplaySection(input.DisplaySection),
		AttackModifier:  input.AttackModifier,
		MissEffect:      input.MissEffect,
		HitSpecialEvent: input.HitSpecialEvent,
		IconSource:      input.IconSource,
		IconKey:         input.IconKey,
		IconAssetID:     stringPointer(input.IconAssetID),
		IconURL:         input.IconURL,
		IconAttribution: input.IconAttribution,
	}
}

func creatureActionEntityFromInput(creatureID, sourceTemplateID string, sortOrder int, input ActionInput) dbmodels.CreatureActionEntity {
	return dbmodels.CreatureActionEntity{
		CreatureID:       strings.TrimSpace(creatureID),
		SourceTemplateID: stringPointer(strings.TrimSpace(sourceTemplateID)),
		SortOrder:        sortOrder,
		Name:             input.Name,
		Description:      input.Description,
		Recharge:         input.Recharge,
		LimitedUses:      input.LimitedUses,
		LimitType:        input.LimitType,
		Reach:            input.Reach,
		ActionRange:      input.Range,
		AOEType:          input.AOEType,
		AOESize:          input.AOESize,
		ActionType:       input.ActionType,
		DisplaySection:   normalizedDisplaySection(input.DisplaySection),
		AttackModifier:   input.AttackModifier,
		MissEffect:       input.MissEffect,
		HitSpecialEvent:  input.HitSpecialEvent,
		IconSource:       input.IconSource,
		IconKey:          input.IconKey,
		IconAssetID:      stringPointer(input.IconAssetID),
		IconURL:          input.IconURL,
		IconAttribution:  input.IconAttribution,
	}
}

func actionTemplateFromEntity(entity dbmodels.ActionTemplateEntity) models.ActionTemplate {
	return models.ActionTemplate{
		ID:              entity.ID,
		Name:            entity.Name,
		Description:     entity.Description,
		Recharge:        entity.Recharge,
		LimitedUses:     entity.LimitedUses,
		LimitType:       entity.LimitType,
		Reach:           entity.Reach,
		Range:           entity.ActionRange,
		AOEType:         entity.AOEType,
		AOESize:         entity.AOESize,
		ActionType:      entity.ActionType,
		DisplaySection:  normalizedDisplaySection(entity.DisplaySection),
		AttackModifier:  entity.AttackModifier,
		MissEffect:      entity.MissEffect,
		HitSpecialEvent: entity.HitSpecialEvent,
		IconSource:      entity.IconSource,
		IconKey:         entity.IconKey,
		IconAssetID:     stringFromPointer(entity.IconAssetID),
		IconURL:         entity.IconURL,
		IconAttribution: entity.IconAttribution,
		Rolls:           []models.ActionRollPart{},
		CreatedAt:       entity.CreatedAt,
		UpdatedAt:       entity.UpdatedAt,
	}
}

func creatureActionFromEntity(entity dbmodels.CreatureActionEntity) models.CreatureAction {
	return models.CreatureAction{
		ID:               entity.ID,
		CreatureID:       entity.CreatureID,
		SourceTemplateID: stringFromPointer(entity.SourceTemplateID),
		SortOrder:        entity.SortOrder,
		Name:             entity.Name,
		Description:      entity.Description,
		Recharge:         entity.Recharge,
		LimitedUses:      entity.LimitedUses,
		LimitType:        entity.LimitType,
		Reach:            entity.Reach,
		Range:            entity.ActionRange,
		AOEType:          entity.AOEType,
		AOESize:          entity.AOESize,
		ActionType:       entity.ActionType,
		DisplaySection:   entity.DisplaySection,
		AttackModifier:   entity.AttackModifier,
		MissEffect:       entity.MissEffect,
		HitSpecialEvent:  entity.HitSpecialEvent,
		IconSource:       entity.IconSource,
		IconKey:          entity.IconKey,
		IconAssetID:      stringFromPointer(entity.IconAssetID),
		IconURL:          entity.IconURL,
		IconAttribution:  entity.IconAttribution,
		Rolls:            []models.ActionRollPart{},
		CreatedAt:        entity.CreatedAt,
		UpdatedAt:        entity.UpdatedAt,
	}
}

func normalizedDisplaySection(value string) string {
	switch strings.TrimSpace(value) {
	case "trait", "action", "bonus_action", "reaction", "legendary_action", "mythic_action", "lair_action":
		return strings.TrimSpace(value)
	default:
		return "action"
	}
}

func actionRollFromTemplateEntity(entity dbmodels.ActionTemplateRollPartEntity) models.ActionRollPart {
	return models.ActionRollPart{
		ID:         entity.ID,
		SortOrder:  entity.SortOrder,
		RollKind:   entity.RollKind,
		DamageType: entity.DamageType,
		Magical:    entity.Magical,
		DiceCount:  entity.DiceCount,
		DieSize:    entity.DieSize,
		FixedValue: entity.FixedValue,
	}
}

func actionRollFromCreatureEntity(entity dbmodels.CreatureActionRollPartEntity) models.ActionRollPart {
	return models.ActionRollPart{
		ID:         entity.ID,
		SortOrder:  entity.SortOrder,
		RollKind:   entity.RollKind,
		DamageType: entity.DamageType,
		Magical:    entity.Magical,
		DiceCount:  entity.DiceCount,
		DieSize:    entity.DieSize,
		FixedValue: entity.FixedValue,
	}
}

func actionRollsFromInput(rolls []models.ActionRollPart) []models.ActionRollPart {
	normalized := make([]models.ActionRollPart, 0, len(rolls))
	for index, roll := range rolls {
		roll.ID = ""
		roll.SortOrder = index
		roll.DiceCount, roll.DieSize = normalizedActionRollDice(roll)
		normalized = append(normalized, roll)
	}
	return normalized
}

func normalizedActionRollDice(roll models.ActionRollPart) (int, int) {
	if roll.DiceCount == 0 && roll.DieSize == 0 && roll.FixedValue != 0 {
		return 0, 0
	}
	return positiveOrDefault(roll.DiceCount, 1), positiveOrDefault(roll.DieSize, 6)
}
