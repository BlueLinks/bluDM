package store

import (
	"context"
	"errors"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
)

type ActionStore struct {
	db *gorm.DB
}

type ActionInput struct {
	Name             string
	SourceTemplateID string
	Description      string
	Recharge         string
	LimitedUses      int
	LimitType        string
	Reach            int
	Range            int
	AOEType          string
	AOESize          int
	ActionType       string
	DisplaySection   string
	AttackModifier   int
	MissEffect       string
	HitSpecialEvent  string
	IconSource       string
	IconKey          string
	IconAssetID      string
	IconURL          string
	IconAttribution  string
	Rolls            []models.ActionRollPart
}

type ActionTemplateConflict struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func (s ActionStore) ListTemplates(ctx context.Context, ownerUserID string) ([]models.ActionTemplate, error) {
	var entities []dbmodels.ActionTemplateEntity
	if err := s.db.WithContext(ctx).
		Where("owner_user_id = ?", ownerUserID).
		Order("name asc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	templates := make([]models.ActionTemplate, 0, len(entities))
	for _, entity := range entities {
		template := actionTemplateFromEntity(entity)
		rolls, err := s.templateRolls(ctx, template.ID)
		if err != nil {
			return nil, err
		}
		template.Rolls = rolls
		templates = append(templates, template)
	}
	return templates, nil
}

func (s ActionStore) TemplateByID(ctx context.Context, ownerUserID, templateID string) (models.ActionTemplate, error) {
	var entity dbmodels.ActionTemplateEntity
	err := s.db.WithContext(ctx).
		Where("id = ? and owner_user_id = ?", strings.TrimSpace(templateID), ownerUserID).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.ActionTemplate{}, ErrNotFound
	}
	if err != nil {
		return models.ActionTemplate{}, err
	}
	template := actionTemplateFromEntity(entity)
	rolls, err := s.templateRolls(ctx, template.ID)
	if err != nil {
		return models.ActionTemplate{}, err
	}
	template.Rolls = rolls
	return template, nil
}

func (s ActionStore) TemplateUsage(ctx context.Context, ownerUserID, templateID string) ([]map[string]any, error) {
	type usageRow struct {
		ActionID     string
		CreatureID   string
		CreatureName string
		ActionName   string
	}
	var rows []usageRow
	if err := s.db.WithContext(ctx).
		Table("creature_actions").
		Select("creature_actions.id as action_id, creatures.id as creature_id, creatures.name as creature_name, creature_actions.name as action_name").
		Joins("join creatures on creatures.id = creature_actions.creature_id").
		Where("creature_actions.source_template_id = ? and creatures.owner_user_id = ?", strings.TrimSpace(templateID), ownerUserID).
		Order("creatures.name asc, creature_actions.name asc").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	usage := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		usage = append(usage, map[string]any{
			"actionId":     row.ActionID,
			"creatureId":   row.CreatureID,
			"creatureName": row.CreatureName,
			"actionName":   row.ActionName,
		})
	}
	return usage, nil
}

func (s ActionStore) FindTemplateConflict(ctx context.Context, ownerUserID, name string) (ActionTemplateConflict, error) {
	var entity dbmodels.ActionTemplateEntity
	err := s.db.WithContext(ctx).
		Where("owner_user_id = ? and lower(name) = lower(?)", ownerUserID, strings.TrimSpace(name)).
		Order("updated_at desc").
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ActionTemplateConflict{}, ErrNotFound
	}
	if err != nil {
		return ActionTemplateConflict{}, err
	}
	return ActionTemplateConflict{ID: entity.ID, Name: entity.Name}, nil
}

func (s ActionStore) CreateTemplate(ctx context.Context, ownerUserID string, input ActionInput) (models.ActionTemplate, error) {
	var template models.ActionTemplate
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		entity := actionTemplateEntityFromInput(ownerUserID, input)
		if err := tx.Create(&entity).Error; err != nil {
			return err
		}
		if err := replaceTemplateRolls(ctx, tx, entity.ID, input.Rolls); err != nil {
			return err
		}
		template = actionTemplateFromEntity(entity)
		template.Rolls = actionRollsFromInput(input.Rolls)
		return nil
	})
	return template, err
}

func (s ActionStore) UpdateTemplate(ctx context.Context, ownerUserID, templateID string, input ActionInput) (models.ActionTemplate, error) {
	var template models.ActionTemplate
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var entity dbmodels.ActionTemplateEntity
		err := tx.Where("id = ? and owner_user_id = ?", strings.TrimSpace(templateID), ownerUserID).First(&entity).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}
		updated := actionTemplateEntityFromInput(ownerUserID, input)
		updated.ID = entity.ID
		updated.CreatedAt = entity.CreatedAt
		if err := tx.Save(&updated).Error; err != nil {
			return err
		}
		if err := replaceTemplateRolls(ctx, tx, updated.ID, input.Rolls); err != nil {
			return err
		}
		template = actionTemplateFromEntity(updated)
		template.Rolls = actionRollsFromInput(input.Rolls)
		return nil
	})
	return template, err
}

func (s ActionStore) DeleteTemplate(ctx context.Context, ownerUserID, templateID string) ([]map[string]any, error) {
	usage, err := s.TemplateUsage(ctx, ownerUserID, templateID)
	if err != nil {
		return nil, err
	}
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var actionIDs []string
		if err := tx.Table("creature_actions").
			Select("creature_actions.id").
			Joins("join creatures on creatures.id = creature_actions.creature_id").
			Where("creature_actions.source_template_id = ? and creatures.owner_user_id = ?", strings.TrimSpace(templateID), ownerUserID).
			Pluck("creature_actions.id", &actionIDs).Error; err != nil {
			return err
		}
		if len(actionIDs) > 0 {
			if err := tx.Where("creature_action_id in ?", actionIDs).Delete(&dbmodels.CreatureActionRollPartEntity{}).Error; err != nil {
				return err
			}
			if err := tx.Where("id in ?", actionIDs).Delete(&dbmodels.CreatureActionEntity{}).Error; err != nil {
				return err
			}
		}
		if err := tx.Where("action_template_id = ?", strings.TrimSpace(templateID)).Delete(&dbmodels.ActionTemplateRollPartEntity{}).Error; err != nil {
			return err
		}
		result := tx.Where("id = ? and owner_user_id = ?", strings.TrimSpace(templateID), ownerUserID).Delete(&dbmodels.ActionTemplateEntity{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrNotFound
		}
		return nil
	})
	return usage, err
}

func (s ActionStore) ListCreatureActions(ctx context.Context, ownerUserID, creatureID string) ([]models.CreatureAction, error) {
	if err := s.ensureCreatureOwned(ctx, ownerUserID, creatureID); err != nil {
		return nil, err
	}
	var entities []dbmodels.CreatureActionEntity
	if err := s.db.WithContext(ctx).
		Where("creature_id = ?", strings.TrimSpace(creatureID)).
		Order("sort_order asc, created_at asc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	actions := make([]models.CreatureAction, 0, len(entities))
	for _, entity := range entities {
		action := creatureActionFromEntity(entity)
		rolls, err := s.creatureActionRolls(ctx, action.ID)
		if err != nil {
			return nil, err
		}
		action.Rolls = rolls
		actions = append(actions, action)
	}
	return actions, nil
}

func (s ActionStore) CreatureActionByID(ctx context.Context, ownerUserID, actionID string) (models.CreatureAction, error) {
	var entity dbmodels.CreatureActionEntity
	err := s.db.WithContext(ctx).
		Table("creature_actions").
		Joins("join creatures on creatures.id = creature_actions.creature_id").
		Where("creature_actions.id = ? and creatures.owner_user_id = ?", strings.TrimSpace(actionID), ownerUserID).
		Select("creature_actions.*").
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.CreatureAction{}, ErrNotFound
	}
	if err != nil {
		return models.CreatureAction{}, err
	}
	action := creatureActionFromEntity(entity)
	rolls, err := s.creatureActionRolls(ctx, action.ID)
	if err != nil {
		return models.CreatureAction{}, err
	}
	action.Rolls = rolls
	return action, nil
}

func (s ActionStore) CreateCreatureAction(ctx context.Context, ownerUserID, creatureID, sourceTemplateID string, input ActionInput) (models.CreatureAction, error) {
	var action models.CreatureAction
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureCreatureOwnedTx(ctx, tx, ownerUserID, creatureID); err != nil {
			return err
		}
		entity, err := createCreatureAction(ctx, tx, creatureID, sourceTemplateID, input)
		if err != nil {
			return err
		}
		if err := replaceCreatureActionRolls(ctx, tx, entity.ID, input.Rolls); err != nil {
			return err
		}
		action = creatureActionFromEntity(entity)
		action.Rolls = actionRollsFromInput(input.Rolls)
		return nil
	})
	return action, err
}

func (s ActionStore) ReplaceCreatureActions(ctx context.Context, ownerUserID, creatureID string, inputs []ActionInput) ([]models.CreatureAction, error) {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureCreatureOwnedTx(ctx, tx, ownerUserID, creatureID); err != nil {
			return err
		}
		if err := deleteCreatureActionsTx(ctx, tx, creatureID); err != nil {
			return err
		}
		for _, input := range inputs {
			entity, err := createCreatureAction(ctx, tx, creatureID, input.SourceTemplateID, input)
			if err != nil {
				return err
			}
			if err := replaceCreatureActionRolls(ctx, tx, entity.ID, input.Rolls); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.ListCreatureActions(ctx, ownerUserID, creatureID)
}

func (s ActionStore) ReorderCreatureActions(ctx context.Context, ownerUserID, creatureID string, actionIDs []string) ([]models.CreatureAction, error) {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureCreatureOwnedTx(ctx, tx, ownerUserID, creatureID); err != nil {
			return err
		}
		for index, id := range actionIDs {
			if err := tx.Model(&dbmodels.CreatureActionEntity{}).
				Where("creature_id = ? and id = ?", strings.TrimSpace(creatureID), strings.TrimSpace(id)).
				Update("sort_order", index).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.ListCreatureActions(ctx, ownerUserID, creatureID)
}

func (s ActionStore) UpdateCreatureActionSourceTemplate(ctx context.Context, ownerUserID, creatureID, actionID, sourceTemplateID string) (models.CreatureAction, error) {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureCreatureOwnedTx(ctx, tx, ownerUserID, creatureID); err != nil {
			return err
		}
		result := tx.Model(&dbmodels.CreatureActionEntity{}).
			Where("creature_id = ? and id = ?", strings.TrimSpace(creatureID), strings.TrimSpace(actionID)).
			Update("source_template_id", stringPointer(strings.TrimSpace(sourceTemplateID)))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrNotFound
		}
		return nil
	})
	if err != nil {
		return models.CreatureAction{}, err
	}
	return s.CreatureActionByID(ctx, ownerUserID, actionID)
}

func (s ActionStore) ensureCreatureOwned(ctx context.Context, ownerUserID, creatureID string) error {
	return ensureCreatureOwnedTx(ctx, s.db, ownerUserID, creatureID)
}

func ensureCreatureOwnedTx(ctx context.Context, tx *gorm.DB, ownerUserID, creatureID string) error {
	var count int64
	if err := tx.WithContext(ctx).
		Model(&dbmodels.CreatureEntity{}).
		Where("id = ? and owner_user_id = ?", strings.TrimSpace(creatureID), ownerUserID).
		Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return ErrNotFound
	}
	return nil
}

func (s ActionStore) templateRolls(ctx context.Context, templateID string) ([]models.ActionRollPart, error) {
	var entities []dbmodels.ActionTemplateRollPartEntity
	if err := s.db.WithContext(ctx).Where("action_template_id = ?", templateID).Order("sort_order asc").Find(&entities).Error; err != nil {
		return nil, err
	}
	rolls := make([]models.ActionRollPart, 0, len(entities))
	for _, entity := range entities {
		rolls = append(rolls, actionRollFromTemplateEntity(entity))
	}
	return rolls, nil
}

func (s ActionStore) creatureActionRolls(ctx context.Context, actionID string) ([]models.ActionRollPart, error) {
	var entities []dbmodels.CreatureActionRollPartEntity
	if err := s.db.WithContext(ctx).Where("creature_action_id = ?", actionID).Order("sort_order asc").Find(&entities).Error; err != nil {
		return nil, err
	}
	rolls := make([]models.ActionRollPart, 0, len(entities))
	for _, entity := range entities {
		rolls = append(rolls, actionRollFromCreatureEntity(entity))
	}
	return rolls, nil
}

func createCreatureAction(ctx context.Context, tx *gorm.DB, creatureID, sourceTemplateID string, input ActionInput) (dbmodels.CreatureActionEntity, error) {
	var nextOrder int
	if err := tx.WithContext(ctx).
		Model(&dbmodels.CreatureActionEntity{}).
		Where("creature_id = ?", strings.TrimSpace(creatureID)).
		Select("coalesce(max(sort_order) + 1, 0)").
		Scan(&nextOrder).Error; err != nil {
		return dbmodels.CreatureActionEntity{}, err
	}
	entity := creatureActionEntityFromInput(creatureID, sourceTemplateID, nextOrder, input)
	if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
		return dbmodels.CreatureActionEntity{}, err
	}
	return entity, nil
}

func deleteCreatureActionsTx(ctx context.Context, tx *gorm.DB, creatureID string) error {
	var actionIDs []string
	if err := tx.WithContext(ctx).Model(&dbmodels.CreatureActionEntity{}).
		Where("creature_id = ?", strings.TrimSpace(creatureID)).
		Pluck("id", &actionIDs).Error; err != nil {
		return err
	}
	if len(actionIDs) > 0 {
		if err := tx.WithContext(ctx).Where("creature_action_id in ?", actionIDs).Delete(&dbmodels.CreatureActionRollPartEntity{}).Error; err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Where("id in ?", actionIDs).Delete(&dbmodels.CreatureActionEntity{}).Error; err != nil {
			return err
		}
	}
	return nil
}

func replaceTemplateRolls(ctx context.Context, tx *gorm.DB, templateID string, rolls []models.ActionRollPart) error {
	if err := tx.WithContext(ctx).Where("action_template_id = ?", templateID).Delete(&dbmodels.ActionTemplateRollPartEntity{}).Error; err != nil {
		return err
	}
	for index, roll := range rolls {
		entity := dbmodels.ActionTemplateRollPartEntity{
			ActionTemplateID: templateID,
			SortOrder:        index,
			RollKind:         roll.RollKind,
			DamageType:       roll.DamageType,
			Magical:          roll.Magical,
			DiceCount:        positiveOrDefault(roll.DiceCount, 1),
			DieSize:          positiveOrDefault(roll.DieSize, 6),
			FixedValue:       roll.FixedValue,
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	return nil
}

func replaceCreatureActionRolls(ctx context.Context, tx *gorm.DB, actionID string, rolls []models.ActionRollPart) error {
	if err := tx.WithContext(ctx).Where("creature_action_id = ?", actionID).Delete(&dbmodels.CreatureActionRollPartEntity{}).Error; err != nil {
		return err
	}
	for index, roll := range rolls {
		entity := dbmodels.CreatureActionRollPartEntity{
			CreatureActionID: actionID,
			SortOrder:        index,
			RollKind:         roll.RollKind,
			DamageType:       roll.DamageType,
			Magical:          roll.Magical,
			DiceCount:        positiveOrDefault(roll.DiceCount, 1),
			DieSize:          positiveOrDefault(roll.DieSize, 6),
			FixedValue:       roll.FixedValue,
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	return nil
}
