package store

import (
	"context"
	"errors"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
)

type CampaignStore struct {
	db *gorm.DB
}

type CampaignInput struct {
	Name                   string
	Description            string
	AllowedStandardSources []string
}

func (s CampaignStore) List(ctx context.Context, ownerUserID string) ([]models.Campaign, error) {
	var entities []dbmodels.CampaignEntity
	if err := s.db.WithContext(ctx).
		Where("owner_user_id = ? and archived_at is null", ownerUserID).
		Order("updated_at desc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	campaigns := make([]models.Campaign, 0, len(entities))
	for _, entity := range entities {
		campaigns = append(campaigns, campaignFromEntity(entity))
	}
	return campaigns, nil
}

func (s CampaignStore) Create(ctx context.Context, ownerUserID string, input CampaignInput) (models.Campaign, error) {
	entity := dbmodels.CampaignEntity{
		OwnerUserID:            ownerUserID,
		Name:                   input.Name,
		Description:            input.Description,
		AllowedStandardSources: input.AllowedStandardSources,
	}
	if err := s.db.WithContext(ctx).Create(&entity).Error; err != nil {
		return models.Campaign{}, err
	}
	return campaignFromEntity(entity), nil
}

func (s CampaignStore) ByID(ctx context.Context, ownerUserID, campaignID string) (models.Campaign, error) {
	var campaign dbmodels.CampaignEntity
	err := s.db.WithContext(ctx).
		Where("id = ? and owner_user_id = ? and archived_at is null", strings.TrimSpace(campaignID), ownerUserID).
		First(&campaign).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Campaign{}, ErrNotFound
	}
	if err != nil {
		return models.Campaign{}, err
	}
	return campaignFromEntity(campaign), nil
}

func (s CampaignStore) Update(ctx context.Context, ownerUserID, campaignID string, input CampaignInput) (models.Campaign, error) {
	var campaign dbmodels.CampaignEntity
	err := s.db.WithContext(ctx).
		Where("id = ? and owner_user_id = ? and archived_at is null", strings.TrimSpace(campaignID), ownerUserID).
		First(&campaign).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Campaign{}, ErrNotFound
	}
	if err != nil {
		return models.Campaign{}, err
	}
	campaign.Name = input.Name
	campaign.Description = input.Description
	campaign.AllowedStandardSources = input.AllowedStandardSources
	if err := s.db.WithContext(ctx).Save(&campaign).Error; err != nil {
		return models.Campaign{}, err
	}
	return campaignFromEntity(campaign), nil
}

func campaignFromEntity(campaign dbmodels.CampaignEntity) models.Campaign {
	return models.Campaign{
		ID:                     campaign.ID,
		Name:                   campaign.Name,
		Description:            campaign.Description,
		AllowedStandardSources: []string(campaign.AllowedStandardSources),
		CreatedAt:              campaign.CreatedAt,
		UpdatedAt:              campaign.UpdatedAt,
	}
}
