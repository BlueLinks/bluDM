package store

import (
	"context"
	"errors"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
)

type CampaignEncounterInput struct {
	Name        string
	Description string
	Status      string
	Location    string
	RoomNumber  string
}

type LongRestSnapshot struct {
	ID                    string         `json:"id"`
	CurrentHitPoints      int            `json:"currentHitPoints"`
	TemporaryHitPoints    int            `json:"temporaryHitPoints"`
	TemporaryMaxHitPoints int            `json:"temporaryMaxHitPoints"`
	SpellSlotsRemaining   map[string]any `json:"spellSlotsRemaining,omitempty"`
}

func (s CampaignStore) CreateEncounter(ctx context.Context, ownerUserID, campaignID string, input CampaignEncounterInput) (models.Encounter, error) {
	if _, err := s.ByID(ctx, ownerUserID, campaignID); err != nil {
		return models.Encounter{}, err
	}
	entity := dbmodels.EncounterEntity{
		CampaignID:  strings.TrimSpace(campaignID),
		Name:        input.Name,
		Description: input.Description,
		Status:      input.Status,
		Location:    input.Location,
		RoomNumber:  input.RoomNumber,
	}
	if err := s.db.WithContext(ctx).Create(&entity).Error; err != nil {
		return models.Encounter{}, err
	}
	return encounterFromCounts(entity, 0, 0), nil
}

func (s CampaignStore) LinkCreature(ctx context.Context, ownerUserID, campaignID, creatureID, disposition string) error {
	if _, err := s.ByID(ctx, ownerUserID, campaignID); err != nil {
		return err
	}
	var count int64
	if err := s.db.WithContext(ctx).Model(&dbmodels.CreatureEntity{}).
		Where("id = ? and owner_user_id = ?", strings.TrimSpace(creatureID), ownerUserID).
		Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return ErrNotFound
	}
	entity := dbmodels.CampaignCreatureEntity{
		CampaignID:  strings.TrimSpace(campaignID),
		CreatureID:  strings.TrimSpace(creatureID),
		Disposition: disposition,
	}
	return s.db.WithContext(ctx).Save(&entity).Error
}

func (s CampaignStore) UnlinkCreature(ctx context.Context, ownerUserID, campaignID, creatureID string) error {
	if _, err := s.ByID(ctx, ownerUserID, campaignID); err != nil {
		return err
	}
	result := s.db.WithContext(ctx).
		Where("campaign_id = ? and creature_id = ?", strings.TrimSpace(campaignID), strings.TrimSpace(creatureID)).
		Delete(&dbmodels.CampaignCreatureEntity{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s CampaignStore) LongRest(ctx context.Context, ownerUserID, campaignID string) ([]LongRestSnapshot, int64, error) {
	if _, err := s.ByID(ctx, ownerUserID, campaignID); err != nil {
		return nil, 0, err
	}
	var players []dbmodels.PlayerEntity
	if err := s.db.WithContext(ctx).Where("campaign_id = ? and owner_user_id = ?", strings.TrimSpace(campaignID), ownerUserID).Find(&players).Error; err != nil {
		return nil, 0, err
	}
	snapshot := make([]LongRestSnapshot, 0, len(players))
	for _, player := range players {
		snapshot = append(snapshot, LongRestSnapshot{
			ID:                    player.ID,
			CurrentHitPoints:      player.CurrentHitPoints,
			TemporaryHitPoints:    player.TemporaryHitPoints,
			TemporaryMaxHitPoints: player.TemporaryMaxHitPoints,
			SpellSlotsRemaining:   mapFromAny(player.CharacterSheet["spellSlotsRemaining"]),
		})
	}
	result := s.db.WithContext(ctx).Model(&dbmodels.PlayerEntity{}).
		Where("campaign_id = ? and owner_user_id = ?", strings.TrimSpace(campaignID), ownerUserID).
		Updates(map[string]any{
			"current_hit_points":       gorm.Expr("max_hit_points"),
			"temporary_hit_points":     0,
			"temporary_max_hit_points": 0,
			"character_sheet":          gorm.Expr("jsonb_set(coalesce(character_sheet, '{}'::jsonb), '{spellSlotsRemaining}', coalesce(character_sheet->'spellSlots', '{}'::jsonb), true)"),
		})
	return snapshot, result.RowsAffected, result.Error
}

func (s CampaignStore) UndoLongRest(ctx context.Context, ownerUserID, campaignID string, players []LongRestSnapshot) (int64, error) {
	if _, err := s.ByID(ctx, ownerUserID, campaignID); err != nil {
		return 0, err
	}
	restored := int64(0)
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, player := range players {
			if player.SpellSlotsRemaining == nil {
				player.SpellSlotsRemaining = map[string]any{}
			}
			result := tx.Model(&dbmodels.PlayerEntity{}).
				Where("campaign_id = ? and owner_user_id = ? and id = ?", strings.TrimSpace(campaignID), ownerUserID, strings.TrimSpace(player.ID)).
				Updates(map[string]any{
					"current_hit_points":       player.CurrentHitPoints,
					"temporary_hit_points":     player.TemporaryHitPoints,
					"temporary_max_hit_points": player.TemporaryMaxHitPoints,
					"character_sheet":          gorm.Expr("jsonb_set(coalesce(character_sheet, '{}'::jsonb), '{spellSlotsRemaining}', ?::jsonb, true)", dbmodels.JSONMap(player.SpellSlotsRemaining)),
				})
			if result.Error != nil {
				return result.Error
			}
			restored += result.RowsAffected
		}
		return nil
	})
	return restored, err
}

func (s CampaignStore) Players(ctx context.Context, ownerUserID, campaignID string) ([]models.Player, error) {
	if _, err := s.ByID(ctx, ownerUserID, campaignID); err != nil {
		return nil, err
	}
	var rows []playerRow
	if err := s.db.WithContext(ctx).
		Table("players").
		Select(`players.*, coalesce(campaigns.name, '') as campaign_name`).
		Joins("join campaigns on campaigns.id = players.campaign_id").
		Where("players.campaign_id = ? and players.owner_user_id = ?", strings.TrimSpace(campaignID), ownerUserID).
		Order("players.character_name asc").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	players := make([]models.Player, 0, len(rows))
	for _, row := range rows {
		players = append(players, playerFromRow(row))
	}
	return players, nil
}

func (s CampaignStore) Creatures(ctx context.Context, ownerUserID, campaignID string) ([]models.Creature, error) {
	if _, err := s.ByID(ctx, ownerUserID, campaignID); err != nil {
		return nil, err
	}
	var entities []dbmodels.CreatureEntity
	if err := s.db.WithContext(ctx).
		Table("creatures").
		Select("creatures.*").
		Joins("join campaign_creatures on campaign_creatures.creature_id = creatures.id").
		Where("campaign_creatures.campaign_id = ? and creatures.owner_user_id = ?", strings.TrimSpace(campaignID), ownerUserID).
		Order("creatures.name asc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	creatures := make([]models.Creature, 0, len(entities))
	for _, entity := range entities {
		creatures = append(creatures, creatureFromEntity(entity))
	}
	return creatures, nil
}

func (s CampaignStore) CampaignsForCreature(ctx context.Context, ownerUserID, creatureID string) ([]models.Campaign, error) {
	var entities []dbmodels.CampaignEntity
	if err := s.db.WithContext(ctx).
		Table("campaigns").
		Select("campaigns.*").
		Joins("join campaign_creatures on campaign_creatures.campaign_id = campaigns.id").
		Where("campaign_creatures.creature_id = ? and campaigns.owner_user_id = ? and campaigns.archived_at is null", strings.TrimSpace(creatureID), ownerUserID).
		Order("campaigns.name asc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	campaigns := make([]models.Campaign, 0, len(entities))
	for _, entity := range entities {
		campaigns = append(campaigns, campaignFromEntity(entity))
	}
	return campaigns, nil
}

func (s CampaignStore) Encounters(ctx context.Context, ownerUserID, campaignID string) ([]models.Encounter, error) {
	if _, err := s.ByID(ctx, ownerUserID, campaignID); err != nil {
		return nil, err
	}
	var rows []encounterCountRow
	if err := s.db.WithContext(ctx).
		Table("encounters").
		Select(`
			encounters.*,
			count(encounter_combatants.id)::int as combatant_count,
			count(encounter_combatants.id) filter (where encounter_combatants.side = 'enemy')::int as enemy_count
		`).
		Joins("left join encounter_combatants on encounter_combatants.encounter_id = encounters.id").
		Where("encounters.campaign_id = ?", strings.TrimSpace(campaignID)).
		Group("encounters.id").
		Order("encounters.updated_at desc").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	encounters := make([]models.Encounter, 0, len(rows))
	for _, row := range rows {
		encounters = append(encounters, encounterFromCounts(row.EncounterEntity, row.CombatantCount, row.EnemyCount))
	}
	return encounters, nil
}

func (s CampaignStore) CountRows(ctx context.Context, ownerUserID, kind, campaignID string) (int64, error) {
	if _, err := s.ByID(ctx, ownerUserID, campaignID); err != nil {
		return 0, err
	}
	var model any
	switch kind {
	case "encounters":
		model = &dbmodels.EncounterEntity{}
	case "campaign_locations":
		model = &dbmodels.CampaignLocationEntity{}
	default:
		return 0, errors.New("unsupported campaign count")
	}
	var count int64
	err := s.db.WithContext(ctx).Model(model).Where("campaign_id = ?", strings.TrimSpace(campaignID)).Count(&count).Error
	return count, err
}

type encounterCountRow struct {
	dbmodels.EncounterEntity
	CombatantCount int
	EnemyCount     int
}

func encounterFromCounts(entity dbmodels.EncounterEntity, combatantCount, enemyCount int) models.Encounter {
	return models.Encounter{
		ID:             entity.ID,
		CampaignID:     entity.CampaignID,
		Name:           entity.Name,
		Description:    entity.Description,
		Status:         entity.Status,
		Location:       entity.Location,
		RoomNumber:     entity.RoomNumber,
		LootNotes:      entity.LootNotes,
		CombatantCount: combatantCount,
		EnemyCount:     enemyCount,
		CreatedAt:      entity.CreatedAt,
		UpdatedAt:      entity.UpdatedAt,
	}
}
