package store

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
)

type TravelStore struct {
	db *gorm.DB
}

type LocationInput struct {
	Name  string
	Notes string
}

type JourneyInput struct {
	Name                  string
	Origin                string
	Destination           string
	Distance              float64
	DistanceUnit          string
	Terrain               string
	Pace                  string
	GoodRoads             bool
	EncounterDistanceFeet *int
	Weather               models.TravelWeather
	RouteInputMode        string
}

func (s TravelStore) LocationsForCampaign(ctx context.Context, campaignID string) ([]models.CampaignLocation, error) {
	var entities []dbmodels.CampaignLocationEntity
	if err := s.db.WithContext(ctx).
		Where("campaign_id = ?", strings.TrimSpace(campaignID)).
		Order("name asc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	locations := make([]models.CampaignLocation, 0, len(entities))
	for _, entity := range entities {
		locations = append(locations, locationFromEntity(entity))
	}
	return locations, nil
}

func (s TravelStore) CreateLocation(ctx context.Context, campaignID string, input LocationInput) (models.CampaignLocation, error) {
	entity := dbmodels.CampaignLocationEntity{
		CampaignID: strings.TrimSpace(campaignID),
		Name:       input.Name,
		Notes:      input.Notes,
	}
	if err := s.db.WithContext(ctx).Create(&entity).Error; err != nil {
		return models.CampaignLocation{}, err
	}
	return locationFromEntity(entity), nil
}

func (s TravelStore) UpdateLocation(ctx context.Context, campaignID, locationID string, input LocationInput) (models.CampaignLocation, error) {
	var entity dbmodels.CampaignLocationEntity
	err := s.db.WithContext(ctx).
		Where("id = ? and campaign_id = ?", strings.TrimSpace(locationID), strings.TrimSpace(campaignID)).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.CampaignLocation{}, ErrNotFound
	}
	if err != nil {
		return models.CampaignLocation{}, err
	}
	entity.Name = input.Name
	entity.Notes = input.Notes
	if err := s.db.WithContext(ctx).Save(&entity).Error; err != nil {
		return models.CampaignLocation{}, err
	}
	return locationFromEntity(entity), nil
}

func (s TravelStore) DeleteLocation(ctx context.Context, campaignID, locationID string) error {
	result := s.db.WithContext(ctx).
		Where("id = ? and campaign_id = ?", strings.TrimSpace(locationID), strings.TrimSpace(campaignID)).
		Delete(&dbmodels.CampaignLocationEntity{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s TravelStore) JourneysForCampaign(ctx context.Context, campaignID string) ([]models.CampaignJourney, error) {
	var entities []dbmodels.CampaignJourneyEntity
	if err := s.db.WithContext(ctx).
		Where("campaign_id = ?", strings.TrimSpace(campaignID)).
		Order("created_at desc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	journeys := make([]models.CampaignJourney, 0, len(entities))
	for _, entity := range entities {
		journey, err := journeyFromEntity(entity)
		if err != nil {
			return nil, err
		}
		journeys = append(journeys, journey)
	}
	return journeys, nil
}

func (s TravelStore) CreateJourney(ctx context.Context, campaignID string, input JourneyInput) (models.CampaignJourney, error) {
	entity, err := journeyEntityFromInput(campaignID, input)
	if err != nil {
		return models.CampaignJourney{}, err
	}
	if err := s.db.WithContext(ctx).Create(&entity).Error; err != nil {
		return models.CampaignJourney{}, err
	}
	return journeyFromEntity(entity)
}

func (s TravelStore) UpdateJourney(ctx context.Context, campaignID, journeyID string, input JourneyInput) (models.CampaignJourney, error) {
	var entity dbmodels.CampaignJourneyEntity
	err := s.db.WithContext(ctx).
		Where("id = ? and campaign_id = ?", strings.TrimSpace(journeyID), strings.TrimSpace(campaignID)).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.CampaignJourney{}, ErrNotFound
	}
	if err != nil {
		return models.CampaignJourney{}, err
	}
	updated, err := journeyEntityFromInput(campaignID, input)
	if err != nil {
		return models.CampaignJourney{}, err
	}
	updated.ID = entity.ID
	updated.CreatedAt = entity.CreatedAt
	if err := s.db.WithContext(ctx).Save(&updated).Error; err != nil {
		return models.CampaignJourney{}, err
	}
	return journeyFromEntity(updated)
}

func (s TravelStore) DeleteJourney(ctx context.Context, campaignID, journeyID string) error {
	result := s.db.WithContext(ctx).
		Where("id = ? and campaign_id = ?", strings.TrimSpace(journeyID), strings.TrimSpace(campaignID)).
		Delete(&dbmodels.CampaignJourneyEntity{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s TravelStore) CloneJourney(ctx context.Context, campaignID, journeyID string) (models.CampaignJourney, error) {
	var source dbmodels.CampaignJourneyEntity
	err := s.db.WithContext(ctx).
		Where("id = ? and campaign_id = ?", strings.TrimSpace(journeyID), strings.TrimSpace(campaignID)).
		First(&source).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.CampaignJourney{}, ErrNotFound
	}
	if err != nil {
		return models.CampaignJourney{}, err
	}
	source.ID = ""
	source.Name = "Copy of " + source.Name
	if err := s.db.WithContext(ctx).Create(&source).Error; err != nil {
		return models.CampaignJourney{}, err
	}
	return journeyFromEntity(source)
}

func locationFromEntity(entity dbmodels.CampaignLocationEntity) models.CampaignLocation {
	return models.CampaignLocation{
		ID:         entity.ID,
		CampaignID: entity.CampaignID,
		Name:       entity.Name,
		Notes:      entity.Notes,
		CreatedAt:  entity.CreatedAt,
		UpdatedAt:  entity.UpdatedAt,
	}
}

func journeyEntityFromInput(campaignID string, input JourneyInput) (dbmodels.CampaignJourneyEntity, error) {
	weather, err := weatherToJSONMap(input.Weather)
	if err != nil {
		return dbmodels.CampaignJourneyEntity{}, err
	}
	return dbmodels.CampaignJourneyEntity{
		CampaignID:            strings.TrimSpace(campaignID),
		Name:                  input.Name,
		Origin:                input.Origin,
		Destination:           input.Destination,
		Distance:              input.Distance,
		DistanceUnit:          input.DistanceUnit,
		Terrain:               input.Terrain,
		Pace:                  input.Pace,
		GoodRoads:             input.GoodRoads,
		EncounterDistanceFeet: input.EncounterDistanceFeet,
		Weather:               weather,
		RouteInputMode:        input.RouteInputMode,
	}, nil
}

func journeyFromEntity(entity dbmodels.CampaignJourneyEntity) (models.CampaignJourney, error) {
	weather, err := weatherFromJSONMap(entity.Weather)
	if err != nil {
		return models.CampaignJourney{}, err
	}
	return models.CampaignJourney{
		ID:                    entity.ID,
		CampaignID:            entity.CampaignID,
		Name:                  entity.Name,
		Origin:                entity.Origin,
		Destination:           entity.Destination,
		Distance:              entity.Distance,
		DistanceUnit:          entity.DistanceUnit,
		Terrain:               entity.Terrain,
		Pace:                  entity.Pace,
		GoodRoads:             entity.GoodRoads,
		EncounterDistanceFeet: entity.EncounterDistanceFeet,
		Weather:               weather,
		RouteInputMode:        entity.RouteInputMode,
		CreatedAt:             entity.CreatedAt,
		UpdatedAt:             entity.UpdatedAt,
	}, nil
}

func weatherToJSONMap(weather models.TravelWeather) (dbmodels.JSONMap, error) {
	bytes, err := json.Marshal(weather)
	if err != nil {
		return nil, err
	}
	var value map[string]any
	if err := json.Unmarshal(bytes, &value); err != nil {
		return nil, err
	}
	return dbmodels.JSONMap(value), nil
}

func weatherFromJSONMap(value dbmodels.JSONMap) (models.TravelWeather, error) {
	bytes, err := json.Marshal(map[string]any(value))
	if err != nil {
		return models.TravelWeather{}, err
	}
	var weather models.TravelWeather
	if err := json.Unmarshal(bytes, &weather); err != nil {
		return models.TravelWeather{}, err
	}
	return weather, nil
}
