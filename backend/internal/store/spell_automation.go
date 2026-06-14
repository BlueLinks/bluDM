package store

import (
	"context"
	"errors"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

func (s SpellStore) AttachAutomation(ctx context.Context, spells []models.Spell) ([]models.Spell, error) {
	for index := range spells {
		projectiles, actions, err := s.automation(ctx, spells[index])
		if err != nil {
			return nil, err
		}
		spells[index].ProjectileScaling = projectiles
		spells[index].Actions = actions
	}
	return spells, nil
}

func (s SpellStore) automation(ctx context.Context, spell models.Spell) (*models.SpellProjectileScaling, []models.SpellAction, error) {
	if spell.LibrarySource == "standard" {
		projectiles, err := s.standardProjectileScaling(ctx, spell.ID)
		if err != nil {
			return nil, nil, err
		}
		actions, err := s.standardActions(ctx, spell.ID)
		if err != nil {
			return nil, nil, err
		}
		return projectiles, actions, nil
	}
	projectiles, err := s.projectileScaling(ctx, spell.ID)
	if err != nil {
		return nil, nil, err
	}
	actions, err := s.actions(ctx, spell.ID)
	if err != nil {
		return nil, nil, err
	}
	return projectiles, actions, nil
}

func replaceSpellAutomation(ctx context.Context, tx *gorm.DB, spellID string, input SpellInput) error {
	if err := tx.WithContext(ctx).Where("spell_id = ?", spellID).Delete(&dbmodels.SpellProjectileScalingEntity{}).Error; err != nil {
		return err
	}
	if input.ProjectileScaling != nil {
		scaling := input.ProjectileScaling
		entity := dbmodels.SpellProjectileScalingEntity{
			SpellID:               spellID,
			BaseProjectiles:       scaling.BaseProjectiles,
			ScalingType:           scaling.ScalingType,
			ScaleFromLevel:        scaling.ScaleFromLevel,
			AdditionalProjectiles: scaling.AdditionalProjectiles,
			StepSize:              scaling.StepSize,
			Description:           scaling.Description,
			CantripScaling:        jsonMap(scaling.CantripScaling),
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	var actionIDs []string
	if err := tx.WithContext(ctx).
		Model(&dbmodels.SpellActionEntity{}).
		Where("spell_id = ?", spellID).
		Pluck("id", &actionIDs).Error; err != nil {
		return err
	}
	if len(actionIDs) > 0 {
		if err := tx.WithContext(ctx).Where("spell_action_id in ?", actionIDs).Delete(&dbmodels.SpellActionRollPartEntity{}).Error; err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Where("id in ?", actionIDs).Delete(&dbmodels.SpellActionEntity{}).Error; err != nil {
			return err
		}
	}
	for actionIndex, action := range input.Actions {
		actionEntity := dbmodels.SpellActionEntity{
			SpellID:               spellID,
			Name:                  action.Name,
			SortOrder:             actionIndex,
			ActionType:            action.ActionType,
			SaveAbility:           action.SaveAbility,
			SuccessfulSaveEffect:  action.SuccessfulSaveEffect,
			AttackModifier:        action.AttackModifier,
			HitSpecialEvent:       action.HitSpecialEvent,
			WeaponSource:          action.WeaponSource,
			AttackAbilityOverride: action.AttackAbilityOverride,
			DamageAbilityOverride: action.DamageAbilityOverride,
			DamageTypeChoice:      action.DamageTypeChoice,
			DamageTypeOptions:     pq.StringArray(action.DamageTypeOptions),
		}
		if err := tx.WithContext(ctx).Create(&actionEntity).Error; err != nil {
			return err
		}
		for rollIndex, roll := range action.Rolls {
			rollEntity := dbmodels.SpellActionRollPartEntity{
				SpellActionID:          actionEntity.ID,
				SortOrder:              rollIndex,
				RollKind:               roll.RollKind,
				DamageType:             roll.DamageType,
				Magical:                roll.Magical,
				DiceCount:              nonNegativeOrDefault(roll.DiceCount, 0),
				DieSize:                positiveOrDefault(roll.DieSize, 6),
				FixedValue:             roll.FixedValue,
				AddPrimaryStatModifier: roll.AddPrimaryStatModifier,
				ConditionName:          roll.ConditionName,
				EffectConfig:           jsonMap(roll.EffectConfig),
				Timing:                 roll.Timing,
				ScalingType:            roll.ScalingType,
				ScalingFromLevel:       roll.ScalingFromLevel,
				ScalingDiceCount:       roll.ScalingDiceCount,
				ScalingDieSize:         positiveOrDefault(roll.ScalingDieSize, 6),
				ScalingFixedValue:      roll.ScalingFixedValue,
				ScalingStepSize:        positiveOrDefault(roll.ScalingStepSize, 1),
				CantripScaling:         jsonMap(roll.CantripScaling),
			}
			if err := tx.WithContext(ctx).Create(&rollEntity).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

func (s SpellStore) projectileScaling(ctx context.Context, spellID string) (*models.SpellProjectileScaling, error) {
	var entity dbmodels.SpellProjectileScalingEntity
	err := s.db.WithContext(ctx).Where("spell_id = ?", spellID).First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return projectileScalingFromEntity(entity), nil
}

func (s SpellStore) standardProjectileScaling(ctx context.Context, spellID string) (*models.SpellProjectileScaling, error) {
	var entity standardSpellProjectileScalingEntity
	err := s.db.WithContext(ctx).Table("standard_spell_projectile_scaling").Where("standard_spell_id = ?", spellID).First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &models.SpellProjectileScaling{
		BaseProjectiles:       entity.BaseProjectiles,
		ScalingType:           entity.ScalingType,
		ScaleFromLevel:        entity.ScaleFromLevel,
		AdditionalProjectiles: entity.AdditionalProjectiles,
		StepSize:              entity.StepSize,
		Description:           entity.Description,
		CantripScaling:        map[string]any(entity.CantripScaling),
	}, nil
}

func (s SpellStore) actions(ctx context.Context, spellID string) ([]models.SpellAction, error) {
	var entities []dbmodels.SpellActionEntity
	if err := s.db.WithContext(ctx).Where("spell_id = ?", spellID).Order("sort_order asc, name asc").Find(&entities).Error; err != nil {
		return nil, err
	}
	actions := make([]models.SpellAction, 0, len(entities))
	for _, entity := range entities {
		action := spellActionFromEntity(entity)
		rolls, err := s.actionRolls(ctx, action.ID)
		if err != nil {
			return nil, err
		}
		action.Rolls = rolls
		actions = append(actions, action)
	}
	return actions, nil
}

func (s SpellStore) standardActions(ctx context.Context, spellID string) ([]models.SpellAction, error) {
	var entities []standardSpellActionEntity
	if err := s.db.WithContext(ctx).Table("standard_spell_actions").Where("standard_spell_id = ?", spellID).Order("sort_order asc, name asc").Find(&entities).Error; err != nil {
		return nil, err
	}
	actions := make([]models.SpellAction, 0, len(entities))
	for _, entity := range entities {
		action := standardSpellActionFromEntity(entity)
		rolls, err := s.standardActionRolls(ctx, action.ID)
		if err != nil {
			return nil, err
		}
		action.Rolls = rolls
		actions = append(actions, action)
	}
	return actions, nil
}

func (s SpellStore) actionRolls(ctx context.Context, actionID string) ([]models.SpellActionRollPart, error) {
	var entities []dbmodels.SpellActionRollPartEntity
	if err := s.db.WithContext(ctx).Where("spell_action_id = ?", actionID).Order("sort_order asc").Find(&entities).Error; err != nil {
		return nil, err
	}
	rolls := make([]models.SpellActionRollPart, 0, len(entities))
	for _, entity := range entities {
		rolls = append(rolls, spellActionRollFromEntity(entity))
	}
	return rolls, nil
}

func (s SpellStore) standardActionRolls(ctx context.Context, actionID string) ([]models.SpellActionRollPart, error) {
	var entities []standardSpellActionRollPartEntity
	if err := s.db.WithContext(ctx).Table("standard_spell_action_roll_parts").Where("standard_spell_action_id = ?", actionID).Order("sort_order asc").Find(&entities).Error; err != nil {
		return nil, err
	}
	rolls := make([]models.SpellActionRollPart, 0, len(entities))
	for _, entity := range entities {
		rolls = append(rolls, standardSpellActionRollFromEntity(entity))
	}
	return rolls, nil
}

func projectileScalingFromEntity(entity dbmodels.SpellProjectileScalingEntity) *models.SpellProjectileScaling {
	return &models.SpellProjectileScaling{
		BaseProjectiles:       entity.BaseProjectiles,
		ScalingType:           entity.ScalingType,
		ScaleFromLevel:        entity.ScaleFromLevel,
		AdditionalProjectiles: entity.AdditionalProjectiles,
		StepSize:              entity.StepSize,
		Description:           entity.Description,
		CantripScaling:        map[string]any(entity.CantripScaling),
	}
}

func spellActionFromEntity(entity dbmodels.SpellActionEntity) models.SpellAction {
	return models.SpellAction{
		ID:                    entity.ID,
		Name:                  entity.Name,
		SortOrder:             entity.SortOrder,
		ActionType:            entity.ActionType,
		SaveAbility:           entity.SaveAbility,
		SuccessfulSaveEffect:  entity.SuccessfulSaveEffect,
		AttackModifier:        entity.AttackModifier,
		HitSpecialEvent:       entity.HitSpecialEvent,
		WeaponSource:          entity.WeaponSource,
		AttackAbilityOverride: entity.AttackAbilityOverride,
		DamageAbilityOverride: entity.DamageAbilityOverride,
		DamageTypeChoice:      entity.DamageTypeChoice,
		DamageTypeOptions:     []string(entity.DamageTypeOptions),
	}
}

func spellActionRollFromEntity(entity dbmodels.SpellActionRollPartEntity) models.SpellActionRollPart {
	return models.SpellActionRollPart{
		ID:                     entity.ID,
		SortOrder:              entity.SortOrder,
		RollKind:               entity.RollKind,
		DamageType:             entity.DamageType,
		Magical:                entity.Magical,
		DiceCount:              entity.DiceCount,
		DieSize:                entity.DieSize,
		FixedValue:             entity.FixedValue,
		AddPrimaryStatModifier: entity.AddPrimaryStatModifier,
		ConditionName:          entity.ConditionName,
		EffectConfig:           map[string]any(entity.EffectConfig),
		Timing:                 entity.Timing,
		ScalingType:            entity.ScalingType,
		ScalingFromLevel:       entity.ScalingFromLevel,
		ScalingDiceCount:       entity.ScalingDiceCount,
		ScalingDieSize:         entity.ScalingDieSize,
		ScalingFixedValue:      entity.ScalingFixedValue,
		ScalingStepSize:        entity.ScalingStepSize,
		CantripScaling:         map[string]any(entity.CantripScaling),
	}
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
