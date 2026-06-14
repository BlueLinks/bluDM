package store

import (
	"context"
	"errors"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"
	"gorm.io/gorm"
)

type PlayerStore struct {
	db *gorm.DB
}

type PlayerInput struct {
	CampaignID            string
	CharacterName         string
	PlayerName            string
	AvatarAssetID         string
	AvatarURL             string
	ArmorClass            int
	MaxHitPoints          int
	TemporaryHitPoints    int
	TemporaryMaxHitPoints int
	ExperiencePoints      int
	CharacterSheet        map[string]any
}

func (s PlayerStore) List(ctx context.Context, ownerUserID string) ([]models.Player, error) {
	var rows []playerRow
	err := s.db.WithContext(ctx).
		Table("players").
		Select(`players.*, coalesce(campaigns.name, '') as campaign_name`).
		Joins("left join campaigns on campaigns.id = players.campaign_id").
		Where("players.owner_user_id = ?", ownerUserID).
		Order("coalesce(campaigns.name, '') asc, players.character_name asc").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	players := make([]models.Player, 0, len(rows))
	for _, row := range rows {
		players = append(players, playerFromRow(row))
	}
	return players, nil
}

func (s PlayerStore) Create(ctx context.Context, ownerUserID string, input PlayerInput) (models.Player, error) {
	entity := playerEntityFromInput(ownerUserID, input)
	entity.CurrentHitPoints = input.MaxHitPoints
	if err := s.db.WithContext(ctx).Create(&entity).Error; err != nil {
		return models.Player{}, err
	}
	player := playerFromEntity(entity)
	return player, nil
}

func (s PlayerStore) ByID(ctx context.Context, ownerUserID, playerID string) (models.Player, error) {
	var row playerRow
	err := s.db.WithContext(ctx).
		Table("players").
		Select(`players.*, coalesce(campaigns.name, '') as campaign_name`).
		Joins("left join campaigns on campaigns.id = players.campaign_id").
		Where("players.id = ? and players.owner_user_id = ?", strings.TrimSpace(playerID), ownerUserID).
		First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Player{}, ErrNotFound
	}
	if err != nil {
		return models.Player{}, err
	}
	return playerFromRow(row), nil
}

func (s PlayerStore) Update(ctx context.Context, ownerUserID, playerID string, input PlayerInput) (models.Player, error) {
	var entity dbmodels.PlayerEntity
	err := s.db.WithContext(ctx).
		Where("id = ? and owner_user_id = ?", strings.TrimSpace(playerID), ownerUserID).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Player{}, ErrNotFound
	}
	if err != nil {
		return models.Player{}, err
	}
	currentHP := entity.CurrentHitPoints
	if currentHP > input.MaxHitPoints {
		currentHP = input.MaxHitPoints
	}
	updated := playerEntityFromInput(ownerUserID, input)
	updated.ID = entity.ID
	updated.CurrentHitPoints = currentHP
	updated.CreatedAt = entity.CreatedAt
	if err := s.db.WithContext(ctx).Save(&updated).Error; err != nil {
		return models.Player{}, err
	}
	return playerFromEntity(updated), nil
}

func (s PlayerStore) Delete(ctx context.Context, ownerUserID, playerID string) error {
	result := s.db.WithContext(ctx).
		Where("id = ? and owner_user_id = ?", strings.TrimSpace(playerID), ownerUserID).
		Delete(&dbmodels.PlayerEntity{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func playerEntityFromInput(ownerUserID string, input PlayerInput) dbmodels.PlayerEntity {
	var campaignID *string
	if strings.TrimSpace(input.CampaignID) != "" {
		value := strings.TrimSpace(input.CampaignID)
		campaignID = &value
	}
	var avatarAssetID *string
	if strings.TrimSpace(input.AvatarAssetID) != "" {
		value := strings.TrimSpace(input.AvatarAssetID)
		avatarAssetID = &value
	}
	characterSheet := dbmodels.JSONMap(input.CharacterSheet)
	if characterSheet == nil {
		characterSheet = dbmodels.JSONMap{}
	}
	return dbmodels.PlayerEntity{
		OwnerUserID:           ownerUserID,
		CampaignID:            campaignID,
		CharacterName:         input.CharacterName,
		PlayerName:            input.PlayerName,
		ImageAssetID:          avatarAssetID,
		AvatarURL:             input.AvatarURL,
		ArmorClass:            input.ArmorClass,
		MaxHitPoints:          input.MaxHitPoints,
		TemporaryHitPoints:    input.TemporaryHitPoints,
		TemporaryMaxHitPoints: input.TemporaryMaxHitPoints,
		ExperiencePoints:      input.ExperiencePoints,
		CharacterSheet:        characterSheet,
	}
}

type playerRow struct {
	dbmodels.PlayerEntity
	CampaignName string
}

func playerFromRow(row playerRow) models.Player {
	player := playerFromEntity(row.PlayerEntity)
	player.CampaignName = row.CampaignName
	return player
}

func playerFromEntity(entity dbmodels.PlayerEntity) models.Player {
	return models.Player{
		ID:                    entity.ID,
		CampaignID:            stringFromPointer(entity.CampaignID),
		CharacterName:         entity.CharacterName,
		PlayerName:            entity.PlayerName,
		AvatarAssetID:         stringFromPointer(entity.ImageAssetID),
		AvatarURL:             entity.AvatarURL,
		ArmorClass:            entity.ArmorClass,
		MaxHitPoints:          entity.MaxHitPoints,
		CurrentHitPoints:      entity.CurrentHitPoints,
		TemporaryHitPoints:    entity.TemporaryHitPoints,
		TemporaryMaxHitPoints: entity.TemporaryMaxHitPoints,
		ExperiencePoints:      entity.ExperiencePoints,
		CharacterSheet:        map[string]any(entity.CharacterSheet),
		CreatedAt:             entity.CreatedAt,
		UpdatedAt:             entity.UpdatedAt,
	}
}
