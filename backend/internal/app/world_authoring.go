package app

import (
	"context"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"github.com/lib/pq"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (s *Service) CreateLocation(
	ctx context.Context,
	campaignID string,
	command LocationCommand,
) (LocationWriteResult, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeWorldWrite)
	if err != nil {
		return LocationWriteResult{}, err
	}
	normalizeLocationCommand(&command)
	if command.Name == "" {
		return LocationWriteResult{}, ValidationError("missing_name", "location name is required", nil)
	}
	inputHash, _ := normalizedHash(command)
	var result LocationWriteResult
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[LocationWriteResult](
			ctx, tx, principal, "create_location", command.IdempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			result = replay
			result.IdempotencyReplay = true
			return nil
		}
		if err := locationBelongsToCampaign(ctx, tx, campaignID, command.ParentLocationID); err != nil {
			return err
		}
		entity := locationEntity(campaignID, command)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
		result = LocationWriteResult{
			CampaignLocation: locationModel(entity),
			AuthoringWriteMetadata: AuthoringWriteMetadata{
				Operation: "created", AppURL: s.AppURL("/campaigns/" + campaignID + "/world/location/" + entity.ID),
				Warnings: []string{},
			},
		}
		return saveIdempotency(
			ctx, tx, principal, "create_location", command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func (s *Service) UpdateLocation(
	ctx context.Context,
	campaignID string,
	locationID string,
	command LocationCommand,
) (LocationWriteResult, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeWorldWrite)
	if err != nil {
		return LocationWriteResult{}, err
	}
	normalizeLocationCommand(&command)
	if command.Name == "" || command.ExpectedUpdatedAt == nil {
		return LocationWriteResult{}, ValidationError(
			"missing_concurrency", "name and expectedUpdatedAt are required", nil,
		)
	}
	var entity dbmodels.CampaignLocationEntity
	inputHash, _ := normalizedHash(command)
	var result LocationWriteResult
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[LocationWriteResult](
			ctx, tx, principal, "update_location:"+locationID,
			command.IdempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			result = replay
			result.IdempotencyReplay = true
			return nil
		}
		if err := tx.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? and campaign_id = ?", locationID, campaignID).
			First(&entity).Error; err != nil {
			return storeError(err, "location")
		}
		if !databaseTimestampEqual(entity.UpdatedAt, *command.ExpectedUpdatedAt) {
			return NewError(CodeConflict, "location changed since it was read", map[string]any{
				"actualUpdatedAt": entity.UpdatedAt,
			})
		}
		if command.ParentLocationID == locationID {
			return ValidationError("parent_cycle", "a location cannot parent itself", nil)
		}
		if err := locationBelongsToCampaign(ctx, tx, campaignID, command.ParentLocationID); err != nil {
			return err
		}
		if err := locationParentDoesNotCreateCycle(
			ctx, tx, campaignID, locationID, command.ParentLocationID,
		); err != nil {
			return err
		}
		updated := locationEntity(campaignID, command)
		updated.ID, updated.CreatedAt = entity.ID, entity.CreatedAt
		entity = updated
		if err := tx.WithContext(ctx).Clauses(clause.Returning{}).Save(&entity).Error; err != nil {
			return err
		}
		result = LocationWriteResult{
			CampaignLocation: locationModel(entity),
			AuthoringWriteMetadata: AuthoringWriteMetadata{
				Operation: "updated", AppURL: s.AppURL("/campaigns/" + campaignID + "/world/location/" + entity.ID),
				Warnings: []string{},
			},
		}
		return saveIdempotency(
			ctx, tx, principal, "update_location:"+locationID,
			command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func locationParentDoesNotCreateCycle(
	ctx context.Context,
	tx *gorm.DB,
	campaignID string,
	locationID string,
	parentLocationID string,
) error {
	if parentLocationID == "" {
		return nil
	}
	var descendantCount int64
	err := tx.WithContext(ctx).Raw(`
		with recursive descendants as (
			select id from campaign_locations where id = ? and campaign_id = ?
			union all
			select child.id
			from campaign_locations child
			join descendants parent on child.parent_location_id = parent.id
			where child.campaign_id = ?
		)
		select count(*) from descendants where id = ?
	`, locationID, campaignID, campaignID, parentLocationID).Scan(&descendantCount).Error
	if err != nil {
		return err
	}
	if descendantCount > 0 {
		return ValidationError(
			"parent_cycle", "a location cannot be moved beneath one of its descendants", nil,
		)
	}
	return nil
}

func normalizeLocationCommand(command *LocationCommand) {
	command.Name = strings.TrimSpace(command.Name)
	command.ParentLocationID = strings.TrimSpace(command.ParentLocationID)
	command.LocationType = normalizedToken(command.LocationType, "custom")
	command.Status = normalizedToken(command.Status, "active")
	command.Tags = normalizedStringList(command.Tags)
	if command.MapAnchor == nil {
		command.MapAnchor = map[string]any{}
	}
}

func locationEntity(campaignID string, command LocationCommand) dbmodels.CampaignLocationEntity {
	return dbmodels.CampaignLocationEntity{
		CampaignID: campaignID, ParentLocationID: optionalID(command.ParentLocationID),
		Name: command.Name, LocationType: command.LocationType,
		CustomTypeLabel: strings.TrimSpace(command.CustomTypeLabel),
		Summary:         strings.TrimSpace(command.Summary), Notes: strings.TrimSpace(command.Notes),
		PublicNotes: strings.TrimSpace(command.PublicNotes), DMNotes: strings.TrimSpace(command.DMNotes),
		Tags: pq.StringArray(command.Tags), SortOrder: command.SortOrder, Status: command.Status,
		MapAnchor: dbmodels.JSONMap(command.MapAnchor),
	}
}

func locationModel(entity dbmodels.CampaignLocationEntity) models.CampaignLocation {
	return models.CampaignLocation{
		ID: entity.ID, CampaignID: entity.CampaignID,
		ParentLocationID: valueFromPointer(entity.ParentLocationID), Name: entity.Name,
		LocationType: entity.LocationType, CustomTypeLabel: entity.CustomTypeLabel,
		Summary: entity.Summary, Notes: entity.Notes, PublicNotes: entity.PublicNotes,
		DMNotes: entity.DMNotes, Tags: []string(entity.Tags), SortOrder: entity.SortOrder,
		Status: entity.Status, MapAnchor: map[string]any(entity.MapAnchor),
		Path: []models.CampaignLocationPathSegment{}, CreatedAt: entity.CreatedAt, UpdatedAt: entity.UpdatedAt,
	}
}

func locationBelongsToCampaign(
	ctx context.Context,
	tx *gorm.DB,
	campaignID string,
	locationID string,
) error {
	if locationID == "" {
		return nil
	}
	var count int64
	if err := tx.WithContext(ctx).Model(&dbmodels.CampaignLocationEntity{}).
		Where("id = ? and campaign_id = ?", locationID, campaignID).
		Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return ValidationError(
			"unknown_location", "unknown or cross-campaign location ID",
			map[string]any{"locationId": locationID},
		)
	}
	return nil
}

func normalizedToken(value, fallback string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.NewReplacer("_", "-", " ", "-").Replace(value)
	if value == "" {
		return fallback
	}
	return value
}

func normalizedStringList(values []string) []string {
	result := []string{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" && !containsString(result, value) {
			result = append(result, value)
		}
	}
	return result
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
