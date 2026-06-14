package store

import (
	"context"
	"errors"
	"strings"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"
	"gorm.io/gorm"
)

type CreatureStore struct {
	db *gorm.DB
}

type CreatureInput struct {
	Name            string
	Description     string
	Size            string
	CreatureType    string
	Alignment       string
	ArmorClass      int
	HitPoints       int
	HitDice         string
	ChallengeRating string
	XP              int
	ImageAssetID    string
	AvatarURL       string
	StatBlock       map[string]any
}

func (s CreatureStore) List(ctx context.Context, ownerUserID, q string, includeUser, includeStandard bool, sources []string) ([]models.Creature, error) {
	q = strings.TrimSpace(q)
	creatures := []models.Creature{}
	if includeUser {
		var entities []dbmodels.CreatureEntity
		query := s.db.WithContext(ctx).
			Where("owner_user_id = ?", ownerUserID).
			Order("updated_at desc").
			Limit(100)
		if q != "" {
			query = query.Where("name ilike ? or creature_type ilike ?", "%"+q+"%", "%"+q+"%")
		}
		if err := query.Find(&entities).Error; err != nil {
			return nil, err
		}
		for _, entity := range entities {
			creatures = append(creatures, creatureFromEntity(entity))
		}
	}
	if includeStandard {
		var entities []standardCreatureEntity
		query := s.db.WithContext(ctx).
			Table("standard_creatures").
			Order("name asc").
			Limit(500)
		if q != "" {
			query = query.Where("name ilike ? or creature_type ilike ?", "%"+q+"%", "%"+q+"%")
		}
		if len(sources) > 0 {
			query = query.Where("source_key in ?", sources)
		}
		if err := query.Find(&entities).Error; err != nil {
			return nil, err
		}
		for _, entity := range entities {
			creatures = append(creatures, standardCreatureFromEntity(entity))
		}
	}
	return creatures, nil
}

func (s CreatureStore) Create(ctx context.Context, ownerUserID string, input CreatureInput) (models.Creature, error) {
	entity := creatureEntityFromInput(ownerUserID, input)
	if err := s.db.WithContext(ctx).Create(&entity).Error; err != nil {
		return models.Creature{}, err
	}
	return creatureFromEntity(entity), nil
}

func (s CreatureStore) ByID(ctx context.Context, ownerUserID, creatureID string) (models.Creature, error) {
	var entity dbmodels.CreatureEntity
	err := s.db.WithContext(ctx).
		Where("id = ? and owner_user_id = ?", strings.TrimSpace(creatureID), ownerUserID).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Creature{}, ErrNotFound
	}
	if err != nil {
		return models.Creature{}, err
	}
	return creatureFromEntity(entity), nil
}

func (s CreatureStore) Exists(ctx context.Context, ownerUserID, creatureID string) (bool, error) {
	var count int64
	err := s.db.WithContext(ctx).
		Model(&dbmodels.CreatureEntity{}).
		Where("id = ? and owner_user_id = ?", strings.TrimSpace(creatureID), ownerUserID).
		Count(&count).Error
	return count > 0, err
}

func (s CreatureStore) Update(ctx context.Context, ownerUserID, creatureID string, input CreatureInput) (models.Creature, error) {
	var entity dbmodels.CreatureEntity
	err := s.db.WithContext(ctx).
		Where("id = ? and owner_user_id = ?", strings.TrimSpace(creatureID), ownerUserID).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Creature{}, ErrNotFound
	}
	if err != nil {
		return models.Creature{}, err
	}
	updated := creatureEntityFromInput(ownerUserID, input)
	updated.ID = entity.ID
	updated.CreatedAt = entity.CreatedAt
	if err := s.db.WithContext(ctx).Save(&updated).Error; err != nil {
		return models.Creature{}, err
	}
	return creatureFromEntity(updated), nil
}

func (s CreatureStore) Delete(ctx context.Context, ownerUserID, creatureID string) error {
	result := s.db.WithContext(ctx).
		Where("id = ? and owner_user_id = ?", strings.TrimSpace(creatureID), ownerUserID).
		Delete(&dbmodels.CreatureEntity{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s CreatureStore) StandardByID(ctx context.Context, creatureID string) (models.Creature, error) {
	var entity standardCreatureEntity
	err := s.db.WithContext(ctx).
		Table("standard_creatures").
		Where("id = ?", strings.TrimSpace(creatureID)).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Creature{}, ErrNotFound
	}
	if err != nil {
		return models.Creature{}, err
	}
	return standardCreatureFromEntity(entity), nil
}

func creatureEntityFromInput(ownerUserID string, input CreatureInput) dbmodels.CreatureEntity {
	var assetID *string
	if strings.TrimSpace(input.ImageAssetID) != "" {
		value := strings.TrimSpace(input.ImageAssetID)
		assetID = &value
	}
	statBlock := dbmodels.JSONMap(input.StatBlock)
	if statBlock == nil {
		statBlock = dbmodels.JSONMap{}
	}
	return dbmodels.CreatureEntity{
		OwnerUserID:     ownerUserID,
		Name:            input.Name,
		Description:     input.Description,
		Size:            input.Size,
		CreatureType:    input.CreatureType,
		Alignment:       input.Alignment,
		ArmorClass:      input.ArmorClass,
		HitPoints:       input.HitPoints,
		HitDice:         input.HitDice,
		ChallengeRating: input.ChallengeRating,
		XP:              input.XP,
		ImageAssetID:    assetID,
		AvatarURL:       input.AvatarURL,
		StatBlock:       statBlock,
	}
}

func creatureFromEntity(entity dbmodels.CreatureEntity) models.Creature {
	return models.Creature{
		ID:              entity.ID,
		Name:            entity.Name,
		Description:     entity.Description,
		Size:            entity.Size,
		CreatureType:    entity.CreatureType,
		Alignment:       entity.Alignment,
		ArmorClass:      entity.ArmorClass,
		HitPoints:       entity.HitPoints,
		HitDice:         entity.HitDice,
		ChallengeRating: entity.ChallengeRating,
		XP:              entity.XP,
		ImageAssetID:    stringFromPointer(entity.ImageAssetID),
		AvatarURL:       entity.AvatarURL,
		LibrarySource:   "user",
		StatBlock:       map[string]any(entity.StatBlock),
		CreatedAt:       entity.CreatedAt,
		UpdatedAt:       entity.UpdatedAt,
	}
}

type standardCreatureEntity struct {
	ID              string
	Name            string
	Description     string
	Size            string
	CreatureType    string
	Alignment       string
	ArmorClass      int
	HitPoints       int
	HitDice         string
	ChallengeRating string
	XP              int
	AvatarURL       string
	SourceKey       string
	SourceLabel     string
	StatBlock       dbmodels.JSONMap
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

func standardCreatureFromEntity(entity standardCreatureEntity) models.Creature {
	return models.Creature{
		ID:              entity.ID,
		Name:            entity.Name,
		Description:     entity.Description,
		Size:            entity.Size,
		CreatureType:    entity.CreatureType,
		Alignment:       entity.Alignment,
		ArmorClass:      entity.ArmorClass,
		HitPoints:       entity.HitPoints,
		HitDice:         entity.HitDice,
		ChallengeRating: entity.ChallengeRating,
		XP:              entity.XP,
		AvatarURL:       entity.AvatarURL,
		LibrarySource:   "standard",
		ReadOnly:        true,
		SourceKey:       entity.SourceKey,
		SourceLabel:     entity.SourceLabel,
		StatBlock:       map[string]any(entity.StatBlock),
		CreatedAt:       entity.CreatedAt,
		UpdatedAt:       entity.UpdatedAt,
	}
}
