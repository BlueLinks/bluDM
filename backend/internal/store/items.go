package store

import (
	"context"
	"errors"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

type ItemStore struct {
	db *gorm.DB
}

type ItemInput struct {
	Name        string
	Category    string
	ItemType    string
	Rarity      string
	Attunement  bool
	ValueAmount int
	ValueUnit   string
	Weight      float64
	Description string
	Properties  []string
	Damage      map[string]any
	ArmorClass  map[string]any
	Data        map[string]any
}

func (s ItemStore) List(ctx context.Context, ownerUserID, q, category string) ([]models.Item, error) {
	var entities []dbmodels.ItemEntity
	query := s.db.WithContext(ctx).
		Where("owner_user_id = ?", ownerUserID).
		Order("category asc, name asc").
		Limit(500)
	if q != "" {
		pattern := "%" + q + "%"
		query = query.Where(`name ilike ? or category ilike ? or item_type ilike ? or description ilike ?
			or properties::text ilike ? or damage::text ilike ? or armor_class::text ilike ? or data::text ilike ?`,
			pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern)
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if err := query.Find(&entities).Error; err != nil {
		return nil, err
	}
	items := make([]models.Item, 0, len(entities))
	for _, entity := range entities {
		items = append(items, itemFromEntity(entity))
	}
	return items, nil
}

func (s ItemStore) Create(ctx context.Context, ownerUserID string, input ItemInput) (models.Item, error) {
	entity := itemEntityFromInput(ownerUserID, input)
	if err := s.db.WithContext(ctx).Create(&entity).Error; err != nil {
		return models.Item{}, err
	}
	return itemFromEntity(entity), nil
}

func (s ItemStore) ByID(ctx context.Context, ownerUserID, itemID string) (models.Item, error) {
	var entity dbmodels.ItemEntity
	err := s.db.WithContext(ctx).
		Where("id = ? and owner_user_id = ?", strings.TrimSpace(itemID), ownerUserID).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Item{}, ErrNotFound
	}
	if err != nil {
		return models.Item{}, err
	}
	return itemFromEntity(entity), nil
}

func (s ItemStore) Update(ctx context.Context, ownerUserID, itemID string, input ItemInput) (models.Item, error) {
	var entity dbmodels.ItemEntity
	err := s.db.WithContext(ctx).
		Where("id = ? and owner_user_id = ?", strings.TrimSpace(itemID), ownerUserID).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Item{}, ErrNotFound
	}
	if err != nil {
		return models.Item{}, err
	}
	updated := itemEntityFromInput(ownerUserID, input)
	updated.ID = entity.ID
	updated.CreatedAt = entity.CreatedAt
	if err := s.db.WithContext(ctx).Save(&updated).Error; err != nil {
		return models.Item{}, err
	}
	return itemFromEntity(updated), nil
}

func (s ItemStore) Delete(ctx context.Context, ownerUserID, itemID string) error {
	result := s.db.WithContext(ctx).
		Where("id = ? and owner_user_id = ?", strings.TrimSpace(itemID), ownerUserID).
		Delete(&dbmodels.ItemEntity{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func itemEntityFromInput(ownerUserID string, input ItemInput) dbmodels.ItemEntity {
	return dbmodels.ItemEntity{
		OwnerUserID: ownerUserID,
		Name:        input.Name,
		Category:    input.Category,
		ItemType:    input.ItemType,
		Rarity:      input.Rarity,
		Attunement:  input.Attunement,
		ValueAmount: input.ValueAmount,
		ValueUnit:   input.ValueUnit,
		Weight:      input.Weight,
		Description: input.Description,
		Properties:  pq.StringArray(input.Properties),
		Damage:      jsonMap(input.Damage),
		ArmorClass:  jsonMap(input.ArmorClass),
		Data:        jsonMap(input.Data),
	}
}

func itemFromEntity(entity dbmodels.ItemEntity) models.Item {
	return models.Item{
		ID:            entity.ID,
		Name:          entity.Name,
		Category:      entity.Category,
		ItemType:      entity.ItemType,
		Rarity:        entity.Rarity,
		Attunement:    entity.Attunement,
		ValueAmount:   entity.ValueAmount,
		ValueUnit:     entity.ValueUnit,
		Weight:        entity.Weight,
		Description:   entity.Description,
		Properties:    []string(entity.Properties),
		Damage:        map[string]any(entity.Damage),
		ArmorClass:    map[string]any(entity.ArmorClass),
		Data:          map[string]any(entity.Data),
		LibrarySource: "user",
		CreatedAt:     entity.CreatedAt,
		UpdatedAt:     entity.UpdatedAt,
	}
}

func jsonMap(value map[string]any) dbmodels.JSONMap {
	if value == nil {
		return dbmodels.JSONMap{}
	}
	return dbmodels.JSONMap(value)
}
