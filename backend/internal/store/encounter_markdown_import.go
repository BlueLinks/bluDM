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

type MarkdownEncounterImportInput struct {
	SourceKey   string
	SourcePath  string
	BlockID     string
	ContentHash string
	Encounter   EncounterInput
	LootNotes   string
	Combatants  []EncounterCombatantInput
}

type MarkdownEncounterImportResult struct {
	Encounter models.Encounter
	Operation string
}

func (s EncounterStore) ByMarkdownSourceKey(
	ctx context.Context,
	ownerUserID string,
	campaignID string,
	sourceKey string,
) (models.Encounter, error) {
	var entity dbmodels.EncounterEntity
	err := s.db.WithContext(ctx).
		Table("encounters").
		Select("encounters.*").
		Joins("join campaigns on campaigns.id = encounters.campaign_id").
		Where(
			"encounters.campaign_id = ? and campaigns.owner_user_id = ? and encounters.metadata ->> 'markdownSourceKey' = ?",
			strings.TrimSpace(campaignID),
			ownerUserID,
			strings.TrimSpace(sourceKey),
		).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Encounter{}, ErrNotFound
	}
	if err != nil {
		return models.Encounter{}, err
	}
	return s.ByID(ctx, ownerUserID, entity.ID)
}

func (s EncounterStore) ImportMarkdown(
	ctx context.Context,
	ownerUserID string,
	campaignID string,
	inputs []MarkdownEncounterImportInput,
) ([]MarkdownEncounterImportResult, error) {
	type pendingResult struct {
		id        string
		operation string
	}
	pending := make([]pendingResult, 0, len(inputs))
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureCampaignOwnedTx(ctx, tx, ownerUserID, campaignID); err != nil {
			return err
		}
		for _, input := range inputs {
			entity, operation, err := upsertMarkdownEncounterTx(ctx, tx, campaignID, input)
			if err != nil {
				return err
			}
			if err := tx.
				Where("encounter_id = ?", entity.ID).
				Delete(&dbmodels.EncounterCombatantEntity{}).Error; err != nil {
				return err
			}
			for index, combatant := range input.Combatants {
				combatantEntity := encounterCombatantEntityFromInput(entity.ID, index, combatant)
				if err := tx.Create(&combatantEntity).Error; err != nil {
					return err
				}
			}
			if err := recordEncounterRevision(
				ctx, tx, entity, ownerUserID, "Markdown encounter "+operation,
			); err != nil {
				return err
			}
			pending = append(pending, pendingResult{id: entity.ID, operation: operation})
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	results := make([]MarkdownEncounterImportResult, 0, len(pending))
	for _, item := range pending {
		encounter, err := s.ByID(ctx, ownerUserID, item.id)
		if err != nil {
			return nil, err
		}
		encounter.Combatants, err = s.Combatants(ctx, ownerUserID, item.id)
		if err != nil {
			return nil, err
		}
		results = append(results, MarkdownEncounterImportResult{
			Encounter: encounter,
			Operation: item.operation,
		})
	}
	return results, nil
}

func (s EncounterStore) MarkdownSourceInfo(
	ctx context.Context,
	ownerUserID string,
	encounterID string,
) (string, string, error) {
	entity, err := encounterEntityForOwner(ctx, s.db, ownerUserID, encounterID)
	if err != nil {
		return "", "", err
	}
	return mapString(entity.Metadata, "markdownBlockId"),
		mapString(entity.Metadata, "markdownSourcePath"),
		nil
}

func upsertMarkdownEncounterTx(
	ctx context.Context,
	tx *gorm.DB,
	campaignID string,
	input MarkdownEncounterImportInput,
) (dbmodels.EncounterEntity, string, error) {
	var entity dbmodels.EncounterEntity
	err := tx.WithContext(ctx).
		Where(
			"campaign_id = ? and metadata ->> 'markdownSourceKey' = ?",
			strings.TrimSpace(campaignID),
			strings.TrimSpace(input.SourceKey),
		).
		First(&entity).Error
	operation := "update"
	if errors.Is(err, gorm.ErrRecordNotFound) {
		entity = dbmodels.EncounterEntity{
			CampaignID: strings.TrimSpace(campaignID), Revision: 1,
		}
		operation = "create"
	} else if err != nil {
		return dbmodels.EncounterEntity{}, "", err
	} else {
		entity.Revision++
	}

	if input.Encounter.LocationID != "" {
		if err := ensureLocationInCampaignTx(ctx, tx, campaignID, input.Encounter.LocationID); err != nil {
			return dbmodels.EncounterEntity{}, "", err
		}
	}
	entity.Name = input.Encounter.Name
	entity.Description = input.Encounter.Description
	entity.Status = input.Encounter.Status
	entity.Location = input.Encounter.Location
	entity.LocationID = optionalString(input.Encounter.LocationID)
	entity.RoomNumber = input.Encounter.RoomNumber
	entity.LootNotes = input.LootNotes
	if entity.Metadata == nil {
		entity.Metadata = dbmodels.JSONMap{}
	}
	entity.Metadata["markdownSourceKey"] = input.SourceKey
	entity.Metadata["markdownSourcePath"] = input.SourcePath
	entity.Metadata["markdownBlockId"] = input.BlockID
	entity.Metadata["markdownContentHash"] = input.ContentHash
	entity.Metadata["markdownImportedAt"] = time.Now().UTC().Format(time.RFC3339)
	if err := tx.WithContext(ctx).Save(&entity).Error; err != nil {
		return dbmodels.EncounterEntity{}, "", err
	}
	return entity, operation, nil
}

func mapString(values map[string]any, key string) string {
	value, _ := values[key].(string)
	return strings.TrimSpace(value)
}
