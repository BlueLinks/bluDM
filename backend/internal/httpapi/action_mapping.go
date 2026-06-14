package httpapi

import (
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
)

func actionInputFromRequest(req actionRequest) store.ActionInput {
	return store.ActionInput{
		Name:             req.Name,
		SourceTemplateID: req.SourceTemplateID,
		Description:      req.Description,
		Recharge:         req.Recharge,
		LimitedUses:      req.LimitedUses,
		LimitType:        req.LimitType,
		Reach:            req.Reach,
		Range:            req.Range,
		AOEType:          req.AOEType,
		AOESize:          req.AOESize,
		ActionType:       req.ActionType,
		AttackModifier:   req.AttackModifier,
		MissEffect:       req.MissEffect,
		HitSpecialEvent:  req.HitSpecialEvent,
		IconSource:       req.IconSource,
		IconKey:          req.IconKey,
		IconAssetID:      req.IconAssetID,
		IconURL:          req.IconURL,
		IconAttribution:  req.IconAttribution,
		Rolls:            req.toModelRolls(),
	}
}

func actionRequestFromTemplate(template models.ActionTemplate) actionRequest {
	rolls := make([]actionRollPartRequest, 0, len(template.Rolls))
	for _, roll := range template.Rolls {
		rolls = append(rolls, actionRollPartRequest{
			RollKind:   roll.RollKind,
			DamageType: roll.DamageType,
			Magical:    roll.Magical,
			DiceCount:  roll.DiceCount,
			DieSize:    roll.DieSize,
			FixedValue: roll.FixedValue,
		})
	}
	return actionRequest{
		Name:            template.Name,
		Description:     template.Description,
		Recharge:        template.Recharge,
		LimitedUses:     template.LimitedUses,
		LimitType:       template.LimitType,
		Reach:           template.Reach,
		Range:           template.Range,
		AOEType:         template.AOEType,
		AOESize:         template.AOESize,
		ActionType:      template.ActionType,
		AttackModifier:  template.AttackModifier,
		MissEffect:      template.MissEffect,
		HitSpecialEvent: template.HitSpecialEvent,
		IconSource:      template.IconSource,
		IconKey:         template.IconKey,
		IconAssetID:     template.IconAssetID,
		IconURL:         template.IconURL,
		IconAttribution: template.IconAttribution,
		Rolls:           rolls,
	}
}

func actionRequestFromCreatureAction(action models.CreatureAction) actionRequest {
	rolls := make([]actionRollPartRequest, 0, len(action.Rolls))
	for _, roll := range action.Rolls {
		rolls = append(rolls, actionRollPartRequest{
			RollKind:   roll.RollKind,
			DamageType: roll.DamageType,
			Magical:    roll.Magical,
			DiceCount:  roll.DiceCount,
			DieSize:    roll.DieSize,
			FixedValue: roll.FixedValue,
		})
	}
	return actionRequest{
		Name:             action.Name,
		SourceTemplateID: action.SourceTemplateID,
		Description:      action.Description,
		Recharge:         action.Recharge,
		LimitedUses:      action.LimitedUses,
		LimitType:        action.LimitType,
		Reach:            action.Reach,
		Range:            action.Range,
		AOEType:          action.AOEType,
		AOESize:          action.AOESize,
		ActionType:       action.ActionType,
		AttackModifier:   action.AttackModifier,
		MissEffect:       action.MissEffect,
		HitSpecialEvent:  action.HitSpecialEvent,
		IconSource:       action.IconSource,
		IconKey:          action.IconKey,
		IconAssetID:      action.IconAssetID,
		IconURL:          action.IconURL,
		IconAttribution:  action.IconAttribution,
		Rolls:            rolls,
	}
}
