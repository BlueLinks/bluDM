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

type LocationInput struct {
	ParentLocationID string
	Name             string
	LocationType     string
	CustomTypeLabel  string
	Summary          string
	Notes            string
	PublicNotes      string
	DMNotes          string
	Tags             []string
	SortOrder        int
	Status           string
	MapAnchor        map[string]any
}

type LocationLinkInput struct {
	SourceLocationID string
	TargetLocationID string
	LinkType         string
	Label            string
	Direction        string
	Visibility       string
	Notes            string
}

type NpcLocationLinkInput struct {
	CreatureID string
	LocationID string
	LinkType   string
	Visibility string
	Notes      string
}

func (s TravelStore) LocationsForCampaign(ctx context.Context, ownerUserID, campaignID string) ([]models.CampaignLocation, error) {
	if err := ensureCampaignOwnedTx(ctx, s.db, ownerUserID, campaignID); err != nil {
		return nil, err
	}
	var entities []dbmodels.CampaignLocationEntity
	if err := s.db.WithContext(ctx).
		Where("campaign_id = ?", strings.TrimSpace(campaignID)).
		Order("parent_location_id asc nulls first, sort_order asc, name asc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	return locationsFromEntities(entities), nil
}

func (s TravelStore) LocationLinksForCampaign(ctx context.Context, ownerUserID, campaignID string) ([]models.CampaignLocationLink, error) {
	if err := ensureCampaignOwnedTx(ctx, s.db, ownerUserID, campaignID); err != nil {
		return nil, err
	}
	var entities []dbmodels.CampaignLocationLinkEntity
	if err := s.db.WithContext(ctx).
		Where("campaign_id = ?", strings.TrimSpace(campaignID)).
		Order("created_at asc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	links := make([]models.CampaignLocationLink, 0, len(entities))
	for _, entity := range entities {
		links = append(links, locationLinkFromEntity(entity))
	}
	return links, nil
}

func (s TravelStore) NpcLocationLinksForCampaign(ctx context.Context, ownerUserID, campaignID string) ([]models.CampaignNpcLocationLink, error) {
	if err := ensureCampaignOwnedTx(ctx, s.db, ownerUserID, campaignID); err != nil {
		return nil, err
	}
	var entities []dbmodels.CampaignNpcLocationLinkEntity
	if err := s.db.WithContext(ctx).
		Where("campaign_id = ?", strings.TrimSpace(campaignID)).
		Order("updated_at desc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	links := make([]models.CampaignNpcLocationLink, 0, len(entities))
	for _, entity := range entities {
		links = append(links, npcLocationLinkFromEntity(entity))
	}
	return links, nil
}

func (s TravelStore) CreateNpcLocationLink(ctx context.Context, ownerUserID, campaignID string, input NpcLocationLinkInput) (models.CampaignNpcLocationLink, error) {
	var entity dbmodels.CampaignNpcLocationLinkEntity
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureCampaignOwnedTx(ctx, tx, ownerUserID, campaignID); err != nil {
			return err
		}
		if err := ensureLocationInCampaignTx(ctx, tx, campaignID, input.LocationID); err != nil {
			return err
		}
		if err := ensureCampaignCreatureInCampaignTx(ctx, tx, campaignID, input.CreatureID); err != nil {
			return err
		}
		entity = dbmodels.CampaignNpcLocationLinkEntity{
			CampaignID: strings.TrimSpace(campaignID),
			CreatureID: strings.TrimSpace(input.CreatureID),
			LocationID: strings.TrimSpace(input.LocationID),
			LinkType:   strings.TrimSpace(input.LinkType),
			Visibility: strings.TrimSpace(input.Visibility),
			Notes:      strings.TrimSpace(input.Notes),
		}
		if entity.LinkType == "" {
			entity.LinkType = "frequents"
		}
		if entity.Visibility == "" {
			entity.Visibility = "dm"
		}
		return tx.Save(&entity).Error
	})
	if err != nil {
		return models.CampaignNpcLocationLink{}, err
	}
	return npcLocationLinkFromEntity(entity), nil
}

func (s TravelStore) DeleteNpcLocationLink(ctx context.Context, ownerUserID, campaignID, linkID string) error {
	if err := ensureCampaignOwnedTx(ctx, s.db, ownerUserID, campaignID); err != nil {
		return err
	}
	result := s.db.WithContext(ctx).
		Where("id = ? and campaign_id = ?", strings.TrimSpace(linkID), strings.TrimSpace(campaignID)).
		Delete(&dbmodels.CampaignNpcLocationLinkEntity{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s TravelStore) CreateLocationLink(ctx context.Context, ownerUserID, campaignID string, input LocationLinkInput) (models.CampaignLocationLink, error) {
	campaignID = strings.TrimSpace(campaignID)
	var entity dbmodels.CampaignLocationLinkEntity
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureCampaignOwnedTx(ctx, tx, ownerUserID, campaignID); err != nil {
			return err
		}
		if input.SourceLocationID == input.TargetLocationID {
			return ErrNotFound
		}
		if err := ensureLocationInCampaignTx(ctx, tx, campaignID, input.SourceLocationID); err != nil {
			return err
		}
		if err := ensureLocationInCampaignTx(ctx, tx, campaignID, input.TargetLocationID); err != nil {
			return err
		}
		entity = dbmodels.CampaignLocationLinkEntity{
			CampaignID:       campaignID,
			SourceLocationID: strings.TrimSpace(input.SourceLocationID),
			TargetLocationID: strings.TrimSpace(input.TargetLocationID),
			LinkType:         input.LinkType,
			Label:            input.Label,
			Direction:        input.Direction,
			Visibility:       input.Visibility,
			Notes:            input.Notes,
		}
		return tx.WithContext(ctx).Create(&entity).Error
	})
	if err != nil {
		return models.CampaignLocationLink{}, err
	}
	return locationLinkFromEntity(entity), nil
}

func (s TravelStore) DeleteLocationLink(ctx context.Context, ownerUserID, campaignID, linkID string) error {
	if err := ensureCampaignOwnedTx(ctx, s.db, ownerUserID, campaignID); err != nil {
		return err
	}
	result := s.db.WithContext(ctx).
		Where("id = ? and campaign_id = ?", strings.TrimSpace(linkID), strings.TrimSpace(campaignID)).
		Delete(&dbmodels.CampaignLocationLinkEntity{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func locationsFromEntities(entities []dbmodels.CampaignLocationEntity) []models.CampaignLocation {
	byID := make(map[string]dbmodels.CampaignLocationEntity, len(entities))
	locations := make([]models.CampaignLocation, 0, len(entities))
	for _, entity := range entities {
		byID[entity.ID] = entity
	}
	for _, entity := range entities {
		locations = append(locations, locationFromEntity(entity, locationPathForEntity(entity, byID)))
	}
	return locations
}

func (s TravelStore) CreateLocation(ctx context.Context, ownerUserID, campaignID string, input LocationInput) (models.CampaignLocation, error) {
	campaignID = strings.TrimSpace(campaignID)
	var entity dbmodels.CampaignLocationEntity
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureCampaignOwnedTx(ctx, tx, ownerUserID, campaignID); err != nil {
			return err
		}
		if input.ParentLocationID != "" {
			if err := ensureLocationInCampaignTx(ctx, tx, campaignID, input.ParentLocationID); err != nil {
				return err
			}
		}
		entity = locationEntityFromInput(campaignID, input)
		return tx.WithContext(ctx).Create(&entity).Error
	})
	if err != nil {
		return models.CampaignLocation{}, err
	}
	return s.locationWithPath(ctx, ownerUserID, campaignID, entity.ID)
}

func (s TravelStore) UpdateLocation(ctx context.Context, ownerUserID, campaignID, locationID string, input LocationInput) (models.CampaignLocation, error) {
	campaignID = strings.TrimSpace(campaignID)
	locationID = strings.TrimSpace(locationID)
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureCampaignOwnedTx(ctx, tx, ownerUserID, campaignID); err != nil {
			return err
		}
		var entity dbmodels.CampaignLocationEntity
		if err := tx.WithContext(ctx).
			Where("id = ? and campaign_id = ?", locationID, campaignID).
			First(&entity).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}
		if input.ParentLocationID != "" {
			if input.ParentLocationID == locationID {
				return ErrNotFound
			}
			if err := ensureLocationInCampaignTx(ctx, tx, campaignID, input.ParentLocationID); err != nil {
				return err
			}
			descendant, err := isLocationDescendantTx(ctx, tx, campaignID, input.ParentLocationID, locationID)
			if err != nil {
				return err
			}
			if descendant {
				return ErrNotFound
			}
		}
		updated := locationEntityFromInput(campaignID, input)
		updated.ID = entity.ID
		updated.CreatedAt = entity.CreatedAt
		return tx.WithContext(ctx).Save(&updated).Error
	})
	if err != nil {
		return models.CampaignLocation{}, err
	}
	return s.locationWithPath(ctx, ownerUserID, campaignID, locationID)
}

func (s TravelStore) DeleteLocation(ctx context.Context, ownerUserID, campaignID, locationID string) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureCampaignOwnedTx(ctx, tx, ownerUserID, campaignID); err != nil {
			return err
		}
		campaignID = strings.TrimSpace(campaignID)
		locationID = strings.TrimSpace(locationID)
		if err := tx.WithContext(ctx).
			Where("campaign_id = ? and (source_location_id = ? or target_location_id = ?)", campaignID, locationID, locationID).
			Delete(&dbmodels.CampaignLocationLinkEntity{}).Error; err != nil {
			return err
		}
		if err := tx.WithContext(ctx).
			Model(&dbmodels.CampaignLocationEntity{}).
			Where("campaign_id = ? and parent_location_id = ?", campaignID, locationID).
			Update("parent_location_id", nil).Error; err != nil {
			return err
		}
		if err := tx.WithContext(ctx).
			Model(&dbmodels.CampaignMapEntity{}).
			Where("campaign_id = ? and parent_location_id = ?", campaignID, locationID).
			Update("parent_location_id", nil).Error; err != nil {
			return err
		}
		if err := tx.WithContext(ctx).
			Where("campaign_id = ? and location_id = ?", campaignID, locationID).
			Delete(&dbmodels.CampaignMapPinEntity{}).Error; err != nil {
			return err
		}
		if err := tx.WithContext(ctx).
			Model(&dbmodels.EncounterEntity{}).
			Where("campaign_id = ? and location_id = ?", campaignID, locationID).
			Update("location_id", nil).Error; err != nil {
			return err
		}
		result := tx.WithContext(ctx).
			Where("id = ? and campaign_id = ?", locationID, campaignID).
			Delete(&dbmodels.CampaignLocationEntity{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrNotFound
		}
		return nil
	})
}

func (s TravelStore) locationWithPath(ctx context.Context, ownerUserID, campaignID, locationID string) (models.CampaignLocation, error) {
	locations, err := s.LocationsForCampaign(ctx, ownerUserID, campaignID)
	if err != nil {
		return models.CampaignLocation{}, err
	}
	for _, location := range locations {
		if location.ID == strings.TrimSpace(locationID) {
			return location, nil
		}
	}
	return models.CampaignLocation{}, ErrNotFound
}

func locationEntityFromInput(campaignID string, input LocationInput) dbmodels.CampaignLocationEntity {
	mapAnchor := dbmodels.JSONMap(input.MapAnchor)
	if mapAnchor == nil {
		mapAnchor = dbmodels.JSONMap{}
	}
	return dbmodels.CampaignLocationEntity{
		CampaignID:       strings.TrimSpace(campaignID),
		ParentLocationID: stringPointer(strings.TrimSpace(input.ParentLocationID)),
		Name:             input.Name,
		LocationType:     input.LocationType,
		CustomTypeLabel:  input.CustomTypeLabel,
		Summary:          input.Summary,
		Notes:            input.Notes,
		PublicNotes:      input.PublicNotes,
		DMNotes:          input.DMNotes,
		Tags:             pq.StringArray(input.Tags),
		SortOrder:        input.SortOrder,
		Status:           input.Status,
		MapAnchor:        mapAnchor,
	}
}

func locationFromEntity(entity dbmodels.CampaignLocationEntity, path []models.CampaignLocationPathSegment) models.CampaignLocation {
	mapAnchor := map[string]any(entity.MapAnchor)
	if mapAnchor == nil {
		mapAnchor = map[string]any{}
	}
	return models.CampaignLocation{
		ID:               entity.ID,
		CampaignID:       entity.CampaignID,
		ParentLocationID: stringFromPointer(entity.ParentLocationID),
		Name:             entity.Name,
		LocationType:     entity.LocationType,
		CustomTypeLabel:  entity.CustomTypeLabel,
		Summary:          entity.Summary,
		Notes:            entity.Notes,
		PublicNotes:      entity.PublicNotes,
		DMNotes:          entity.DMNotes,
		Tags:             []string(entity.Tags),
		SortOrder:        entity.SortOrder,
		Status:           entity.Status,
		MapAnchor:        mapAnchor,
		Path:             path,
		CreatedAt:        entity.CreatedAt,
		UpdatedAt:        entity.UpdatedAt,
	}
}

func locationLinkFromEntity(entity dbmodels.CampaignLocationLinkEntity) models.CampaignLocationLink {
	return models.CampaignLocationLink{
		ID:               entity.ID,
		CampaignID:       entity.CampaignID,
		SourceLocationID: entity.SourceLocationID,
		TargetLocationID: entity.TargetLocationID,
		LinkType:         entity.LinkType,
		Label:            entity.Label,
		Direction:        entity.Direction,
		Visibility:       entity.Visibility,
		Notes:            entity.Notes,
		CreatedAt:        entity.CreatedAt,
		UpdatedAt:        entity.UpdatedAt,
	}
}

func npcLocationLinkFromEntity(entity dbmodels.CampaignNpcLocationLinkEntity) models.CampaignNpcLocationLink {
	return models.CampaignNpcLocationLink{
		ID:         entity.ID,
		CampaignID: entity.CampaignID,
		CreatureID: entity.CreatureID,
		LocationID: entity.LocationID,
		LinkType:   entity.LinkType,
		Visibility: entity.Visibility,
		Notes:      entity.Notes,
		CreatedAt:  entity.CreatedAt,
		UpdatedAt:  entity.UpdatedAt,
	}
}

func locationPathForEntity(entity dbmodels.CampaignLocationEntity, byID map[string]dbmodels.CampaignLocationEntity) []models.CampaignLocationPathSegment {
	reversed := []models.CampaignLocationPathSegment{}
	seen := map[string]bool{}
	current := entity
	for {
		if seen[current.ID] {
			break
		}
		seen[current.ID] = true
		reversed = append(reversed, models.CampaignLocationPathSegment{
			ID:           current.ID,
			Name:         current.Name,
			LocationType: current.LocationType,
		})
		if current.ParentLocationID == nil {
			break
		}
		parent, ok := byID[*current.ParentLocationID]
		if !ok {
			break
		}
		current = parent
	}
	path := make([]models.CampaignLocationPathSegment, 0, len(reversed))
	for i := len(reversed) - 1; i >= 0; i-- {
		path = append(path, reversed[i])
	}
	return path
}

func ensureLocationInCampaignTx(ctx context.Context, tx *gorm.DB, campaignID, locationID string) error {
	var count int64
	if err := tx.WithContext(ctx).
		Model(&dbmodels.CampaignLocationEntity{}).
		Where("id = ? and campaign_id = ?", strings.TrimSpace(locationID), strings.TrimSpace(campaignID)).
		Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return ErrNotFound
	}
	return nil
}

func ensureCampaignCreatureInCampaignTx(ctx context.Context, tx *gorm.DB, campaignID, creatureID string) error {
	var count int64
	if err := tx.WithContext(ctx).
		Model(&dbmodels.CampaignCreatureEntity{}).
		Where("campaign_id = ? and creature_id = ?", strings.TrimSpace(campaignID), strings.TrimSpace(creatureID)).
		Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return ErrNotFound
	}
	return nil
}

func isLocationDescendantTx(ctx context.Context, tx *gorm.DB, campaignID, candidateID, ancestorID string) (bool, error) {
	var locations []dbmodels.CampaignLocationEntity
	if err := tx.WithContext(ctx).
		Where("campaign_id = ?", strings.TrimSpace(campaignID)).
		Find(&locations).Error; err != nil {
		return false, err
	}
	byID := make(map[string]dbmodels.CampaignLocationEntity, len(locations))
	for _, location := range locations {
		byID[location.ID] = location
	}
	current, ok := byID[strings.TrimSpace(candidateID)]
	seen := map[string]bool{}
	for ok && current.ParentLocationID != nil {
		if seen[current.ID] {
			return false, nil
		}
		seen[current.ID] = true
		if *current.ParentLocationID == strings.TrimSpace(ancestorID) {
			return true, nil
		}
		current, ok = byID[*current.ParentLocationID]
	}
	return false, nil
}
