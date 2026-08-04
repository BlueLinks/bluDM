package app

import (
	"context"
	"errors"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
)

func (s *Service) ListEncounterRevisions(
	ctx context.Context,
	campaignID string,
	encounterID string,
) ([]EncounterRevisionSummary, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeEncountersRead)
	if err != nil {
		return nil, err
	}
	encounter, err := s.stores.Encounters.ByID(ctx, principal.UserID, encounterID)
	if err != nil || encounter.CampaignID != campaignID {
		return nil, NewError(CodeNotFound, "encounter not found", nil)
	}
	var revisions []dbmodels.EncounterRevisionEntity
	if err := s.db.WithContext(ctx).
		Where("encounter_id = ?", encounterID).
		Order("revision desc").
		Find(&revisions).Error; err != nil {
		return nil, err
	}
	result := make([]EncounterRevisionSummary, 0, len(revisions))
	for _, revision := range revisions {
		result = append(result, EncounterRevisionSummary{
			Revision: revision.Revision, ChangeReason: revision.ChangeReason,
			GenerationInput:  map[string]any(revision.GenerationInput),
			GenerationOutput: map[string]any(revision.GenerationOutput),
			ActorUserID:      revision.ActorUserID,
			ActorTokenID:     valueFromPointer(revision.ActorTokenID), CreatedAt: revision.CreatedAt,
		})
	}
	return result, nil
}

func (s *Service) RestoreEncounterRevision(
	ctx context.Context,
	campaignID string,
	encounterID string,
	revisionNumber int,
	command RestoreRevisionCommand,
) (EncounterWriteResult, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeEncountersWrite)
	if err != nil {
		return EncounterWriteResult{}, err
	}
	inputHash, err := normalizedHash(map[string]any{
		"revision": revisionNumber, "command": command,
	})
	if err != nil {
		return EncounterWriteResult{}, err
	}
	var result EncounterWriteResult
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		operation := "restore_encounter_revision:" + encounterID
		replay, found, err := idempotencyReplay[EncounterWriteResult](
			ctx, tx, principal, operation, command.IdempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			result = replay
			result.IdempotencyReplay = true
			return nil
		}
		entity, currentCombatants, err := lockedEncounter(ctx, tx, campaignID, encounterID)
		if err != nil {
			return err
		}
		if entity.Revision != command.ExpectedRevision {
			return NewError(CodeConflict, "encounter revision changed", map[string]any{
				"expectedRevision": command.ExpectedRevision, "actualRevision": entity.Revision,
			})
		}
		var revision dbmodels.EncounterRevisionEntity
		err = tx.WithContext(ctx).
			Where("encounter_id = ? and revision = ?", encounterID, revisionNumber).
			First(&revision).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return NewError(CodeNotFound, "encounter revision not found", nil)
		}
		if err != nil {
			return err
		}
		var snapshot struct {
			Encounter  dbmodels.EncounterEntity            `json:"encounter"`
			Combatants []dbmodels.EncounterCombatantEntity `json:"combatants"`
		}
		if err := decodeMap(revision.Snapshot, &snapshot); err != nil {
			return err
		}
		entity.Name = snapshot.Encounter.Name
		entity.Description = snapshot.Encounter.Description
		entity.Status = snapshot.Encounter.Status
		entity.Location = snapshot.Encounter.Location
		entity.LocationID = snapshot.Encounter.LocationID
		entity.RoomNumber = snapshot.Encounter.RoomNumber
		entity.LootNotes = snapshot.Encounter.LootNotes
		entity.Metadata = snapshot.Encounter.Metadata
		entity.Revision++
		if err := tx.WithContext(ctx).Save(&entity).Error; err != nil {
			return err
		}
		if err := tx.WithContext(ctx).
			Where("encounter_id = ?", encounterID).
			Delete(&dbmodels.EncounterCombatantEntity{}).Error; err != nil {
			return err
		}
		enemies := 0
		for _, combatant := range snapshot.Combatants {
			combatant.ID = ""
			combatant.EncounterID = encounterID
			if combatant.Side == "enemy" {
				enemies++
			}
			if err := tx.WithContext(ctx).Create(&combatant).Error; err != nil {
				return err
			}
		}
		newSnapshot, err := encounterSnapshot(ctx, tx, entity)
		if err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Create(&dbmodels.EncounterRevisionEntity{
			EncounterID: encounterID, Revision: entity.Revision, Snapshot: newSnapshot,
			ChangeReason: "restored revision", ActorUserID: principal.UserID,
			ActorTokenID:     optionalID(principal.TokenID),
			GenerationInput:  dbmodels.JSONMap{"restoredRevision": revisionNumber},
			GenerationOutput: dbmodels.JSONMap{},
		}).Error; err != nil {
			return err
		}
		result = EncounterWriteResult{
			Encounter: encounterModel(entity, len(snapshot.Combatants), enemies),
			AuthoringWriteMetadata: AuthoringWriteMetadata{
				Operation: "restored",
				AppURL:    s.AppURL("/campaigns/" + campaignID + "/encounters/" + entity.ID),
				Warnings:  []string{},
			},
			ExportLinks: encounterExportLinks(campaignID, entity.ID),
		}
		if len(currentCombatants) == 0 && len(snapshot.Combatants) == 0 {
			result.Combatants = []models.EncounterCombatant{}
		}
		return saveIdempotency(
			ctx, tx, principal, operation, command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}
