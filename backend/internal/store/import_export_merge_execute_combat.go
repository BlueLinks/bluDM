package store

import (
	"context"
	"fmt"

	dbmodels "bludm/backend/internal/db"

	"gorm.io/gorm"
)

func (s ImportExportStore) mergeEncountersAndRuns(ctx context.Context, tx *gorm.DB, manifest PortableManifest, state *mergeExecutionState) error {
	for _, entity := range manifest.Encounters {
		decision, create, err := state.shouldCreate("encounters", entity.ID)
		if err != nil {
			return err
		}
		oldID := entity.ID
		if !create {
			if decision.Action == "merge_missing_fields" {
				var existing dbmodels.EncounterEntity
				if err := mergeMissingFieldsIntoExisting(ctx, tx, "encounter", decision.ExistingID, &existing, entity, decision.Provenance); err != nil {
					return err
				}
				state.mapper.mapID("encounters", oldID, existing.ID)
			}
			continue
		}
		entity.ID = ""
		entity.CampaignID, err = requireMergeRemap(state.mapper, "campaigns", entity.CampaignID)
		if err != nil {
			return err
		}
		entity.LocationID = state.mapper.remapPtr("locations", entity.LocationID)
		entity.BackgroundAssetID = state.mapper.remapPtr("assets", entity.BackgroundAssetID)
		if decision.Action == "rename_imported" {
			entity.Name = s.importCampaignScopedName(ctx, tx, "encounters", entity.CampaignID, entity.Name)
		}
		mergeAttachProvenance(&entity, decision.Provenance)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return fmt.Errorf("merge encounter %s: %w", decision.Label, err)
		}
		state.mapper.mapID("encounters", oldID, entity.ID)
	}
	if err := mergeEncounterCombatants(ctx, tx, manifest, state); err != nil {
		return err
	}
	return mergeRuns(ctx, tx, manifest, state)
}

func mergeEncounterCombatants(ctx context.Context, tx *gorm.DB, manifest PortableManifest, state *mergeExecutionState) error {
	for _, entity := range manifest.Combatants {
		oldID := entity.ID
		entity.ID = ""
		var err error
		entity.EncounterID, err = requireMergeRemap(state.mapper, "encounters", entity.EncounterID)
		if err != nil {
			return err
		}
		entity.PlayerID = state.mapper.remapPtr("players", entity.PlayerID)
		entity.CreatureID = state.mapper.remapPtr("creatures", entity.CreatureID)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
		state.mapper.mapID("combatants", oldID, entity.ID)
	}
	return nil
}

func mergeRuns(ctx context.Context, tx *gorm.DB, manifest PortableManifest, state *mergeExecutionState) error {
	for _, entity := range manifest.Runs {
		oldID := entity.ID
		entity.ID = ""
		var err error
		entity.EncounterID, err = requireMergeRemap(state.mapper, "encounters", entity.EncounterID)
		if err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
		state.mapper.mapID("runs", oldID, entity.ID)
	}
	for _, entity := range manifest.RunCombatants {
		oldID := entity.ID
		entity.ID = ""
		var err error
		entity.EncounterRunID, err = requireMergeRemap(state.mapper, "runs", entity.EncounterRunID)
		if err != nil {
			return err
		}
		entity.SourceCombatantID = state.mapper.remapPtr("combatants", entity.SourceCombatantID)
		entity.PlayerID = state.mapper.remapPtr("players", entity.PlayerID)
		entity.CreatureID = state.mapper.remapPtr("creatures", entity.CreatureID)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
		state.mapper.mapID("runCombatants", oldID, entity.ID)
	}
	if err := mergeRunDetails(ctx, tx, manifest, state); err != nil {
		return err
	}
	return mergeCombatLog(ctx, tx, manifest, state)
}

func mergeRunDetails(ctx context.Context, tx *gorm.DB, manifest PortableManifest, state *mergeExecutionState) error {
	for _, entity := range manifest.RunSpellSlots {
		entity.ID = ""
		var err error
		entity.EncounterRunID, err = requireMergeRemap(state.mapper, "runs", entity.EncounterRunID)
		if err != nil {
			return err
		}
		entity.CombatantID, err = requireMergeRemap(state.mapper, "runCombatants", entity.CombatantID)
		if err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.RunEffects {
		entity.ID = ""
		var err error
		entity.EncounterRunID, err = requireMergeRemap(state.mapper, "runs", entity.EncounterRunID)
		if err != nil {
			return err
		}
		entity.CasterID, err = requireMergeRemap(state.mapper, "runCombatants", entity.CasterID)
		if err != nil {
			return err
		}
		entity.TargetID, err = requireMergeRemap(state.mapper, "runCombatants", entity.TargetID)
		if err != nil {
			return err
		}
		entity.SpellID = state.mapper.remapPtr("spells", entity.SpellID)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.RunAlerts {
		entity.ID = ""
		var err error
		entity.EncounterRunID, err = requireMergeRemap(state.mapper, "runs", entity.EncounterRunID)
		if err != nil {
			return err
		}
		entity.ActorID = state.mapper.remapPtr("runCombatants", entity.ActorID)
		entity.TargetID = state.mapper.remapPtr("runCombatants", entity.TargetID)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	return nil
}

func mergeCombatLog(ctx context.Context, tx *gorm.DB, manifest PortableManifest, state *mergeExecutionState) error {
	for _, entity := range manifest.CombatLog {
		entity.ID = ""
		var err error
		entity.EncounterRunID, err = requireMergeRemap(state.mapper, "runs", entity.EncounterRunID)
		if err != nil {
			return err
		}
		entity.ActorID = state.mapper.remapPtr("runCombatants", entity.ActorID)
		entity.TargetID = state.mapper.remapPtr("runCombatants", entity.TargetID)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	return nil
}

func (s ImportExportStore) mergeRollTables(ctx context.Context, tx *gorm.DB, manifest PortableManifest, state *mergeExecutionState) error {
	for _, entity := range manifest.RollTables {
		decision, create, err := state.shouldCreate("rollTables", entity.ID)
		if err != nil {
			return err
		}
		oldID := entity.ID
		if !create {
			if decision.Action == "merge_missing_fields" {
				var existing dbmodels.RollTableEntity
				if err := mergeMissingFieldsIntoExisting(ctx, tx, "roll table", decision.ExistingID, &existing, entity, decision.Provenance); err != nil {
					return err
				}
				state.mapper.mapID("rollTables", oldID, existing.ID)
			}
			continue
		}
		entity.ID = ""
		entity.CampaignID = state.mapper.remapPtr("campaigns", entity.CampaignID)
		if decision.Action == "rename_imported" && entity.CampaignID != nil {
			entity.Name = s.importCampaignScopedName(ctx, tx, "roll_tables", *entity.CampaignID, entity.Name)
		}
		mergeAttachProvenance(&entity, decision.Provenance)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return fmt.Errorf("merge roll table %s: %w", decision.Label, err)
		}
		state.mapper.mapID("rollTables", oldID, entity.ID)
	}
	for _, entity := range manifest.RollTableRows {
		entity.ID = ""
		var err error
		entity.TableID, err = requireMergeRemap(state.mapper, "rollTables", entity.TableID)
		if err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	return nil
}
