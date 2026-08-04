package app

import (
	"context"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
)

func (s *Service) CreateLocationLink(
	ctx context.Context,
	campaignID string,
	command LocationLinkCommand,
) (LocationLinkWriteResult, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeWorldWrite)
	if err != nil {
		return LocationLinkWriteResult{}, err
	}
	if command.SourceLocationID == "" || command.TargetLocationID == "" ||
		command.SourceLocationID == command.TargetLocationID {
		return LocationLinkWriteResult{}, ValidationError(
			"invalid_location_link", "two different discovered location IDs are required", nil,
		)
	}
	inputHash, _ := normalizedHash(command)
	var result LocationLinkWriteResult
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[LocationLinkWriteResult](
			ctx, tx, principal, "create_location_link", command.IdempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			result = replay
			result.IdempotencyReplay = true
			return nil
		}
		for _, id := range []string{command.SourceLocationID, command.TargetLocationID} {
			if err := locationBelongsToCampaign(ctx, tx, campaignID, id); err != nil {
				return err
			}
		}
		entity := dbmodels.CampaignLocationLinkEntity{
			CampaignID: campaignID, SourceLocationID: command.SourceLocationID,
			TargetLocationID: command.TargetLocationID,
			LinkType:         normalizedToken(command.LinkType, "link"),
			Label:            strings.TrimSpace(command.Label),
			Direction:        normalizedToken(command.Direction, "two-way"),
			Visibility:       normalizedToken(command.Visibility, "public"),
			Notes:            strings.TrimSpace(command.Notes),
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
		result = LocationLinkWriteResult{
			CampaignLocationLink: locationLinkModel(entity),
			AuthoringWriteMetadata: AuthoringWriteMetadata{
				Operation: "created",
				AppURL:    s.AppURL("/campaigns/" + campaignID + "/world/location/" + command.SourceLocationID),
				Warnings:  []string{},
			},
		}
		return saveIdempotency(
			ctx, tx, principal, "create_location_link", command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func locationLinkModel(entity dbmodels.CampaignLocationLinkEntity) models.CampaignLocationLink {
	return models.CampaignLocationLink{
		ID: entity.ID, CampaignID: entity.CampaignID,
		SourceLocationID: entity.SourceLocationID, TargetLocationID: entity.TargetLocationID,
		LinkType: entity.LinkType, Label: entity.Label, Direction: entity.Direction,
		Visibility: entity.Visibility, Notes: entity.Notes,
		CreatedAt: entity.CreatedAt, UpdatedAt: entity.UpdatedAt,
	}
}
