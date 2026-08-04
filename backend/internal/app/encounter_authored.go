package app

import (
	"context"
	"strings"

	dbmodels "bludm/backend/internal/db"

	"gorm.io/gorm"
)

func (s *Service) CreateEncounter(
	ctx context.Context,
	campaignID string,
	command EncounterCommand,
) (EncounterWriteResult, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeEncountersWrite)
	if err != nil {
		return EncounterWriteResult{}, err
	}
	if err := validateEncounterCommand(command, false); err != nil {
		return EncounterWriteResult{}, err
	}
	if command.PreviewFingerprint != "" &&
		command.PreviewFingerprint != authoredEnemyRosterFingerprint(command.Combatants) {
		return EncounterWriteResult{}, ValidationError(
			"preview_changed",
			"the enemy roster no longer matches the accepted generation preview",
			nil,
		)
	}
	inputHash, _ := normalizedHash(command)
	var result EncounterWriteResult
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[EncounterWriteResult](
			ctx, tx, principal, "create_encounter", command.IdempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			result = replay
			result.IdempotencyReplay = true
			return nil
		}
		if err := locationBelongsToCampaign(ctx, tx, campaignID, command.LocationID); err != nil {
			return err
		}
		entity := encounterEntityFromCommand(campaignID, command)
		entity.Revision = 1
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
		enemies, err := s.replaceAuthoredRoster(
			ctx, tx, principal, campaignID, entity.ID, command.Combatants,
		)
		if err != nil {
			return err
		}
		snapshot, err := encounterSnapshot(ctx, tx, entity)
		if err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Create(&dbmodels.EncounterRevisionEntity{
			EncounterID: entity.ID, Revision: 1, Snapshot: snapshot,
			ChangeReason: "authored encounter created", ActorUserID: principal.UserID,
			ActorTokenID:    optionalID(principal.TokenID),
			GenerationInput: dbmodels.JSONMap{}, GenerationOutput: dbmodels.JSONMap{},
		}).Error; err != nil {
			return err
		}
		result = EncounterWriteResult{
			Encounter: encounterModel(entity, len(command.Combatants), enemies),
			AuthoringWriteMetadata: AuthoringWriteMetadata{
				Operation: "created",
				AppURL:    s.AppURL("/campaigns/" + campaignID + "/encounters/" + entity.ID),
				Warnings:  []string{},
			},
			ExportLinks: encounterExportLinks(campaignID, entity.ID),
		}
		return saveIdempotency(
			ctx, tx, principal, "create_encounter", command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func (s *Service) UpdateEncounter(
	ctx context.Context,
	campaignID string,
	encounterID string,
	command UpdateEncounterCommand,
) (EncounterWriteResult, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeEncountersWrite)
	if err != nil {
		return EncounterWriteResult{}, err
	}
	if err := validateUpdateEncounterCommand(command); err != nil {
		return EncounterWriteResult{}, err
	}
	inputHash, _ := normalizedHash(command)
	var result EncounterWriteResult
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		operation := "update_encounter:" + encounterID
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
		entity, existing, err := lockedEncounter(ctx, tx, campaignID, encounterID)
		if err != nil {
			return err
		}
		if entity.Revision != command.ExpectedRevision {
			return NewError(CodeConflict, "encounter revision changed", map[string]any{
				"expectedRevision": command.ExpectedRevision, "actualRevision": entity.Revision,
			})
		}
		if command.LocationID != nil {
			if err := locationBelongsToCampaign(ctx, tx, campaignID, *command.LocationID); err != nil {
				return err
			}
		}
		applyEncounterMetadataPatch(&entity, command)
		entity.Revision++
		if err := tx.WithContext(ctx).Save(&entity).Error; err != nil {
			return err
		}
		if command.ReplaceRoster {
			if err := tx.WithContext(ctx).Where("encounter_id = ?", encounterID).
				Delete(&dbmodels.EncounterCombatantEntity{}).Error; err != nil {
				return err
			}
			_, err = s.replaceAuthoredRoster(
				ctx, tx, principal, campaignID, encounterID, command.Combatants,
			)
			if err != nil {
				return err
			}
		} else {
			if err := s.applyTargetedRosterPatch(
				ctx, tx, principal, campaignID, encounterID, existing, command,
			); err != nil {
				return err
			}
		}
		var finalCombatants []dbmodels.EncounterCombatantEntity
		if err := tx.WithContext(ctx).Where("encounter_id = ?", encounterID).
			Order("sort_order asc, created_at asc").Find(&finalCombatants).Error; err != nil {
			return err
		}
		enemies := 0
		for _, combatant := range finalCombatants {
			if combatant.Side == "enemy" {
				enemies++
			}
		}
		snapshot, err := encounterSnapshot(ctx, tx, entity)
		if err != nil {
			return err
		}
		reason := "encounter metadata updated"
		if command.ReplaceRoster {
			reason = "encounter roster replaced"
		} else if len(command.AddCombatants)+len(command.UpdateCombatants)+len(command.RemoveCombatantIDs) > 0 {
			reason = "encounter roster patched"
		}
		if err := tx.WithContext(ctx).Create(&dbmodels.EncounterRevisionEntity{
			EncounterID: encounterID, Revision: entity.Revision, Snapshot: snapshot,
			ChangeReason: reason, ActorUserID: principal.UserID,
			ActorTokenID:    optionalID(principal.TokenID),
			GenerationInput: dbmodels.JSONMap{}, GenerationOutput: dbmodels.JSONMap{},
		}).Error; err != nil {
			return err
		}
		result = EncounterWriteResult{
			Encounter: encounterModel(entity, len(finalCombatants), enemies),
			AuthoringWriteMetadata: AuthoringWriteMetadata{
				Operation: "updated",
				AppURL:    s.AppURL("/campaigns/" + campaignID + "/encounters/" + entity.ID),
				Warnings:  []string{},
			},
			ExportLinks: encounterExportLinks(campaignID, entity.ID),
		}
		return saveIdempotency(
			ctx, tx, principal, operation, command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func validateUpdateEncounterCommand(command UpdateEncounterCommand) error {
	if command.ExpectedRevision < 1 {
		return ValidationError("missing_revision", "expectedRevision is required", nil)
	}
	if command.Name != nil && strings.TrimSpace(*command.Name) == "" {
		return ValidationError("missing_name", "encounter name cannot be empty", nil)
	}
	if command.Status != nil {
		switch normalizedToken(*command.Status, "") {
		case "planned", "completed", "skipped":
		default:
			return ValidationError(
				"invalid_status", "status must be planned, completed, or skipped", nil,
			)
		}
	}
	if command.ReplaceRoster &&
		(len(command.AddCombatants)+len(command.UpdateCombatants)+len(command.RemoveCombatantIDs) > 0) {
		return ValidationError(
			"conflicting_roster_changes",
			"replaceRoster cannot be combined with targeted roster operations",
			nil,
		)
	}
	commands := command.AddCombatants
	if command.ReplaceRoster {
		commands = command.Combatants
	} else if len(command.Combatants) > 0 {
		return ValidationError(
			"replace_roster_required",
			"combatants is only valid when replaceRoster is true; use addCombatants for targeted additions",
			nil,
		)
	}
	for index, combatant := range commands {
		if combatant.SourceType == "" || combatant.Side == "" {
			return ValidationError(
				"invalid_combatant", "sourceType and side are required",
				map[string]any{"index": index},
			)
		}
	}
	return nil
}

func applyEncounterMetadataPatch(
	entity *dbmodels.EncounterEntity,
	command UpdateEncounterCommand,
) {
	if command.Name != nil {
		entity.Name = strings.TrimSpace(*command.Name)
	}
	if command.Description != nil {
		entity.Description = strings.TrimSpace(*command.Description)
	}
	if command.Status != nil {
		entity.Status = normalizedToken(*command.Status, entity.Status)
	}
	if command.LocationID != nil {
		entity.LocationID = optionalID(*command.LocationID)
	}
	if command.Location != nil {
		entity.Location = strings.TrimSpace(*command.Location)
	}
	if command.RoomNumber != nil {
		entity.RoomNumber = strings.TrimSpace(*command.RoomNumber)
	}
	if command.LootNotes != nil {
		entity.LootNotes = strings.TrimSpace(*command.LootNotes)
	}
}

func (s *Service) applyTargetedRosterPatch(
	ctx context.Context,
	tx *gorm.DB,
	principal Principal,
	campaignID string,
	encounterID string,
	existing []dbmodels.EncounterCombatantEntity,
	command UpdateEncounterCommand,
) error {
	campaign, err := s.stores.Campaigns.ByID(ctx, principal.UserID, campaignID)
	if err != nil {
		return err
	}
	byID := make(map[string]*dbmodels.EncounterCombatantEntity, len(existing))
	nextOrder := 0
	for index := range existing {
		byID[existing[index].ID] = &existing[index]
		nextOrder = max(nextOrder, existing[index].SortOrder+1)
	}
	seen := map[string]bool{}
	for _, combatantID := range command.RemoveCombatantIDs {
		combatantID = strings.TrimSpace(combatantID)
		combatant, ok := byID[combatantID]
		if !ok {
			return ValidationError(
				"unknown_combatant", "unknown or cross-encounter combatant ID",
				map[string]any{"combatantId": combatantID},
			)
		}
		if seen[combatantID] {
			return ValidationError(
				"duplicate_combatant", "a combatant can only be changed once per request",
				map[string]any{"combatantId": combatantID},
			)
		}
		seen[combatantID] = true
		if err := tx.WithContext(ctx).Delete(combatant).Error; err != nil {
			return err
		}
	}
	for _, patch := range command.UpdateCombatants {
		combatantID := strings.TrimSpace(patch.CombatantID)
		combatant, ok := byID[combatantID]
		if !ok {
			return ValidationError(
				"unknown_combatant", "unknown or cross-encounter combatant ID",
				map[string]any{"combatantId": combatantID},
			)
		}
		if seen[combatantID] {
			return ValidationError(
				"duplicate_combatant", "a combatant can only be changed once per request",
				map[string]any{"combatantId": combatantID},
			)
		}
		seen[combatantID] = true
		if err := applyCombatantPatch(combatant, patch); err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Save(combatant).Error; err != nil {
			return err
		}
	}
	for _, addition := range command.AddCombatants {
		combatant, err := s.authoredCombatant(
			ctx, principal, campaign,
			encounterID, nextOrder, addition,
		)
		if err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Create(&combatant).Error; err != nil {
			return err
		}
		nextOrder++
	}
	return nil
}

func applyCombatantPatch(
	combatant *dbmodels.EncounterCombatantEntity,
	patch EncounterCombatantPatchCommand,
) error {
	if patch.Side != nil {
		side := normalizedToken(*patch.Side, "")
		if side != "enemy" && side != "ally" {
			return ValidationError("invalid_side", "side must be enemy or ally", nil)
		}
		combatant.Side = side
	}
	if patch.DisplayName != nil {
		name := strings.TrimSpace(*patch.DisplayName)
		if name == "" {
			return ValidationError("missing_display_name", "displayName cannot be empty", nil)
		}
		combatant.DisplayName = name
	}
	if patch.AvatarURL != nil {
		combatant.AvatarURL = strings.TrimSpace(*patch.AvatarURL)
	}
	if patch.ArmorClass != nil {
		if *patch.ArmorClass < 0 {
			return ValidationError("invalid_armor_class", "armorClass cannot be negative", nil)
		}
		combatant.ArmorClass = *patch.ArmorClass
	}
	if patch.MaxHitPoints != nil {
		if *patch.MaxHitPoints < 1 {
			return ValidationError("invalid_hit_points", "maxHitPoints must be positive", nil)
		}
		combatant.MaxHitPoints = *patch.MaxHitPoints
	}
	if patch.CurrentHitPoints != nil {
		if *patch.CurrentHitPoints < 0 {
			return ValidationError("invalid_hit_points", "currentHitPoints cannot be negative", nil)
		}
		combatant.CurrentHitPoints = *patch.CurrentHitPoints
	}
	if patch.RolledHP != nil {
		combatant.RolledHP = *patch.RolledHP
	}
	return nil
}

func validateEncounterCommand(command EncounterCommand, update bool) error {
	if strings.TrimSpace(command.Name) == "" {
		return ValidationError("missing_name", "encounter name is required", nil)
	}
	if update && command.ExpectedRevision < 1 {
		return ValidationError("missing_revision", "expectedRevision is required", nil)
	}
	for index, combatant := range command.Combatants {
		if combatant.SourceType == "" || combatant.Side == "" {
			return ValidationError(
				"invalid_combatant", "sourceType and side are required",
				map[string]any{"index": index},
			)
		}
	}
	return nil
}

func encounterEntityFromCommand(
	campaignID string,
	command EncounterCommand,
) dbmodels.EncounterEntity {
	status := normalizedToken(command.Status, "planned")
	return dbmodels.EncounterEntity{
		CampaignID: campaignID, Name: strings.TrimSpace(command.Name),
		Description: strings.TrimSpace(command.Description), Status: status,
		Location: strings.TrimSpace(command.Location), LocationID: optionalID(command.LocationID),
		RoomNumber: strings.TrimSpace(command.RoomNumber),
		LootNotes:  strings.TrimSpace(command.LootNotes), Metadata: dbmodels.JSONMap{},
	}
}
