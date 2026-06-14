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

type EncounterStore struct {
	db *gorm.DB
}

type EncounterInput struct {
	Name        string
	Description string
	Status      string
	Location    string
	RoomNumber  string
}

type EncounterCombatantInput struct {
	SourceType       string
	PlayerID         string
	CreatureID       string
	Side             string
	DisplayName      string
	ColorLabel       string
	AvatarURL        string
	ArmorClass       int
	MaxHitPoints     int
	CurrentHitPoints int
	RolledHP         bool
	Snapshot         map[string]any
}

func (s EncounterStore) ByID(ctx context.Context, ownerUserID, encounterID string) (models.Encounter, error) {
	var row struct {
		ID             string
		CampaignID     string
		Name           string
		Description    string
		Status         string
		Location       string
		RoomNumber     string
		LootNotes      string
		CombatantCount int
		EnemyCount     int
		CreatedAt      time.Time
		UpdatedAt      time.Time
	}
	err := s.db.WithContext(ctx).
		Table("encounters").
		Select(`
			encounters.id,
			encounters.campaign_id,
			encounters.name,
			encounters.description,
			encounters.status,
			encounters.location,
			encounters.room_number,
			encounters.loot_notes,
			count(encounter_combatants.id)::int as combatant_count,
			count(encounter_combatants.id) filter (where encounter_combatants.side = 'enemy')::int as enemy_count,
			encounters.created_at,
			encounters.updated_at
		`).
		Joins("join campaigns on campaigns.id = encounters.campaign_id").
		Joins("left join encounter_combatants on encounter_combatants.encounter_id = encounters.id").
		Where("encounters.id = ? and campaigns.owner_user_id = ?", strings.TrimSpace(encounterID), ownerUserID).
		Group("encounters.id").
		Scan(&row).Error
	if err != nil {
		return models.Encounter{}, err
	}
	if row.ID == "" {
		return models.Encounter{}, ErrNotFound
	}
	return models.Encounter{
		ID:             row.ID,
		CampaignID:     row.CampaignID,
		Name:           row.Name,
		Description:    row.Description,
		Status:         row.Status,
		Location:       row.Location,
		RoomNumber:     row.RoomNumber,
		LootNotes:      row.LootNotes,
		CombatantCount: row.CombatantCount,
		EnemyCount:     row.EnemyCount,
		CreatedAt:      row.CreatedAt,
		UpdatedAt:      row.UpdatedAt,
	}, nil
}

func (s EncounterStore) Combatants(ctx context.Context, ownerUserID, encounterID string) ([]models.EncounterCombatant, error) {
	if _, err := s.ByID(ctx, ownerUserID, encounterID); err != nil {
		return nil, err
	}
	var entities []dbmodels.EncounterCombatantEntity
	if err := s.db.WithContext(ctx).
		Where("encounter_id = ?", strings.TrimSpace(encounterID)).
		Order("sort_order asc, created_at asc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	combatants := make([]models.EncounterCombatant, 0, len(entities))
	for _, entity := range entities {
		combatants = append(combatants, encounterCombatantFromEntity(entity))
	}
	return combatants, nil
}

func (s EncounterStore) Update(ctx context.Context, ownerUserID, encounterID string, input EncounterInput) (models.Encounter, error) {
	var entity dbmodels.EncounterEntity
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		found, err := encounterEntityForOwner(ctx, tx, ownerUserID, encounterID)
		if err != nil {
			return err
		}
		entity = found
		entity.Name = input.Name
		entity.Description = input.Description
		entity.Status = input.Status
		entity.Location = input.Location
		entity.RoomNumber = input.RoomNumber
		return tx.Save(&entity).Error
	})
	if err != nil {
		return models.Encounter{}, err
	}
	return s.ByID(ctx, ownerUserID, entity.ID)
}

func (s EncounterStore) Delete(ctx context.Context, ownerUserID, encounterID string) error {
	entity, err := encounterEntityForOwner(ctx, s.db, ownerUserID, encounterID)
	if err != nil {
		return err
	}
	result := s.db.WithContext(ctx).Where("id = ?", entity.ID).Delete(&dbmodels.EncounterEntity{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s EncounterStore) Clone(ctx context.Context, ownerUserID, encounterID string) (models.Encounter, error) {
	source, err := encounterEntityForOwner(ctx, s.db, ownerUserID, encounterID)
	if err != nil {
		return models.Encounter{}, err
	}
	var combatants []dbmodels.EncounterCombatantEntity
	if err := s.db.WithContext(ctx).Where("encounter_id = ?", source.ID).Order("sort_order asc").Find(&combatants).Error; err != nil {
		return models.Encounter{}, err
	}
	var clone dbmodels.EncounterEntity
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		clone = dbmodels.EncounterEntity{
			CampaignID:  source.CampaignID,
			Name:        source.Name + " Copy",
			Description: source.Description,
			Status:      source.Status,
			Location:    source.Location,
			RoomNumber:  source.RoomNumber,
			LootNotes:   source.LootNotes,
		}
		if err := tx.Create(&clone).Error; err != nil {
			return err
		}
		for _, combatant := range combatants {
			combatant.ID = ""
			combatant.EncounterID = clone.ID
			if err := tx.Create(&combatant).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return models.Encounter{}, err
	}
	return s.ByID(ctx, ownerUserID, clone.ID)
}

func (s EncounterStore) AddCombatant(ctx context.Context, ownerUserID, encounterID string, input EncounterCombatantInput) (models.EncounterCombatant, error) {
	var entity dbmodels.EncounterCombatantEntity
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if _, err := encounterEntityForOwner(ctx, tx, ownerUserID, encounterID); err != nil {
			return err
		}
		var nextOrder int
		if err := tx.Model(&dbmodels.EncounterCombatantEntity{}).
			Where("encounter_id = ?", strings.TrimSpace(encounterID)).
			Select("coalesce(max(sort_order) + 1, 0)").
			Scan(&nextOrder).Error; err != nil {
			return err
		}
		entity = encounterCombatantEntityFromInput(encounterID, nextOrder, input)
		return tx.Create(&entity).Error
	})
	if err != nil {
		return models.EncounterCombatant{}, err
	}
	return encounterCombatantFromEntity(entity), nil
}

func (s EncounterStore) ExistingPlayerIDs(ctx context.Context, ownerUserID, encounterID string) (map[string]bool, error) {
	if _, err := s.ByID(ctx, ownerUserID, encounterID); err != nil {
		return nil, err
	}
	var ids []string
	if err := s.db.WithContext(ctx).
		Model(&dbmodels.EncounterCombatantEntity{}).
		Where("encounter_id = ? and source_type = 'player' and player_id is not null", strings.TrimSpace(encounterID)).
		Pluck("player_id", &ids).Error; err != nil {
		return nil, err
	}
	existing := make(map[string]bool, len(ids))
	for _, id := range ids {
		existing[id] = true
	}
	return existing, nil
}

func (s EncounterStore) UpdateCombatant(ctx context.Context, ownerUserID, combatantID string, input EncounterCombatantInput) (models.EncounterCombatant, error) {
	entity, err := encounterCombatantEntityForOwner(ctx, s.db, ownerUserID, combatantID)
	if err != nil {
		return models.EncounterCombatant{}, err
	}
	entity.Side = input.Side
	entity.DisplayName = input.DisplayName
	entity.ColorLabel = input.ColorLabel
	entity.AvatarURL = input.AvatarURL
	entity.ArmorClass = input.ArmorClass
	entity.MaxHitPoints = input.MaxHitPoints
	entity.CurrentHitPoints = input.CurrentHitPoints
	if err := s.db.WithContext(ctx).Save(&entity).Error; err != nil {
		return models.EncounterCombatant{}, err
	}
	return encounterCombatantFromEntity(entity), nil
}

func (s EncounterStore) DeleteCombatant(ctx context.Context, ownerUserID, combatantID string) error {
	entity, err := encounterCombatantEntityForOwner(ctx, s.db, ownerUserID, combatantID)
	if err != nil {
		return err
	}
	result := s.db.WithContext(ctx).Where("id = ?", entity.ID).Delete(&dbmodels.EncounterCombatantEntity{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func encounterEntityForOwner(ctx context.Context, db *gorm.DB, ownerUserID, encounterID string) (dbmodels.EncounterEntity, error) {
	var entity dbmodels.EncounterEntity
	err := db.WithContext(ctx).
		Table("encounters").
		Select("encounters.*").
		Joins("join campaigns on campaigns.id = encounters.campaign_id").
		Where("encounters.id = ? and campaigns.owner_user_id = ?", strings.TrimSpace(encounterID), ownerUserID).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return dbmodels.EncounterEntity{}, ErrNotFound
	}
	return entity, err
}

func encounterCombatantEntityForOwner(ctx context.Context, db *gorm.DB, ownerUserID, combatantID string) (dbmodels.EncounterCombatantEntity, error) {
	var entity dbmodels.EncounterCombatantEntity
	err := db.WithContext(ctx).
		Table("encounter_combatants").
		Select("encounter_combatants.*").
		Joins("join encounters on encounters.id = encounter_combatants.encounter_id").
		Joins("join campaigns on campaigns.id = encounters.campaign_id").
		Where("encounter_combatants.id = ? and campaigns.owner_user_id = ?", strings.TrimSpace(combatantID), ownerUserID).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return dbmodels.EncounterCombatantEntity{}, ErrNotFound
	}
	return entity, err
}
