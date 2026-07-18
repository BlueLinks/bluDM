package store

import (
	"context"
	"fmt"

	dbmodels "bludm/backend/internal/db"

	"gorm.io/gorm"
)

func (s ImportExportStore) mergeOwnerEntities(ctx context.Context, tx *gorm.DB, ownerUserID string, manifest PortableManifest, state *mergeExecutionState) error {
	if err := s.mergeCampaigns(ctx, tx, ownerUserID, manifest, state); err != nil {
		return err
	}
	if err := s.mergeItems(ctx, tx, ownerUserID, manifest, state); err != nil {
		return err
	}
	if err := s.mergeSpells(ctx, tx, ownerUserID, manifest, state); err != nil {
		return err
	}
	if err := s.mergeActionTemplates(ctx, tx, ownerUserID, manifest, state); err != nil {
		return err
	}
	if err := s.mergeCreatures(ctx, tx, ownerUserID, manifest, state); err != nil {
		return err
	}
	return s.mergePlayers(ctx, tx, ownerUserID, manifest, state)
}

func (s ImportExportStore) mergeCampaigns(ctx context.Context, tx *gorm.DB, ownerUserID string, manifest PortableManifest, state *mergeExecutionState) error {
	for _, entity := range manifest.Campaigns {
		decision, create, err := state.shouldCreate("campaigns", entity.ID)
		if err != nil {
			return err
		}
		oldID := entity.ID
		if !create {
			if decision.Action == "merge_missing_fields" {
				var existing dbmodels.CampaignEntity
				if err := mergeMissingFieldsIntoExisting(ctx, tx, "campaign", decision.ExistingID, &existing, entity, decision.Provenance); err != nil {
					return err
				}
				state.mapper.mapID("campaigns", oldID, existing.ID)
			}
			continue
		}
		entity.ID = ""
		entity.OwnerUserID = ownerUserID
		entity.ArchivedAt = nil
		if decision.Action == "rename_imported" {
			entity.Name = s.importName(ctx, tx, "campaigns", ownerUserID, entity.Name)
		}
		mergeAttachProvenance(&entity, decision.Provenance)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return fmt.Errorf("merge campaign %s: %w", decision.Label, err)
		}
		state.mapper.mapID("campaigns", oldID, entity.ID)
	}
	return nil
}

func (s ImportExportStore) mergeItems(ctx context.Context, tx *gorm.DB, ownerUserID string, manifest PortableManifest, state *mergeExecutionState) error {
	for _, entity := range manifest.Items {
		decision, create, err := state.shouldCreate("items", entity.ID)
		if err != nil {
			return err
		}
		oldID := entity.ID
		if !create {
			if decision.Action == "merge_missing_fields" {
				var existing dbmodels.ItemEntity
				if err := mergeMissingFieldsIntoExisting(ctx, tx, "item", decision.ExistingID, &existing, entity, decision.Provenance); err != nil {
					return err
				}
				state.mapper.mapID("items", oldID, existing.ID)
			}
			continue
		}
		entity.ID = ""
		entity.OwnerUserID = ownerUserID
		if decision.Action == "rename_imported" {
			entity.Name = s.importName(ctx, tx, "items", ownerUserID, entity.Name)
		}
		mergeAttachProvenance(&entity, decision.Provenance)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return fmt.Errorf("merge item %s: %w", decision.Label, err)
		}
		state.mapper.mapID("items", oldID, entity.ID)
	}
	return nil
}

func (s ImportExportStore) mergeSpells(ctx context.Context, tx *gorm.DB, ownerUserID string, manifest PortableManifest, state *mergeExecutionState) error {
	for _, entity := range manifest.Spells {
		decision, create, err := state.shouldCreate("spells", entity.ID)
		if err != nil {
			return err
		}
		oldID := entity.ID
		if !create {
			if decision.Action == "merge_missing_fields" {
				var existing dbmodels.SpellEntity
				if err := mergeMissingFieldsIntoExisting(ctx, tx, "spell", decision.ExistingID, &existing, entity, decision.Provenance); err != nil {
					return err
				}
				state.mapper.mapID("spells", oldID, existing.ID)
			}
			continue
		}
		entity.ID = ""
		entity.OwnerUserID = ownerUserID
		if decision.Action == "rename_imported" {
			entity.Name = s.importName(ctx, tx, "spells", ownerUserID, entity.Name)
		}
		mergeAttachProvenance(&entity, decision.Provenance)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return fmt.Errorf("merge spell %s: %w", decision.Label, err)
		}
		state.mapper.mapID("spells", oldID, entity.ID)
	}
	for _, entity := range manifest.SpellScaling {
		var err error
		entity.SpellID, err = requireMergeRemap(state.mapper, "spells", entity.SpellID)
		if err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.SpellActions {
		oldID := entity.ID
		entity.ID = ""
		var err error
		entity.SpellID, err = requireMergeRemap(state.mapper, "spells", entity.SpellID)
		if err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
		state.mapper.mapID("spellActions", oldID, entity.ID)
	}
	for _, entity := range manifest.SpellRollParts {
		entity.ID = ""
		var err error
		entity.SpellActionID, err = requireMergeRemap(state.mapper, "spellActions", entity.SpellActionID)
		if err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	return nil
}

func (s ImportExportStore) mergeActionTemplates(ctx context.Context, tx *gorm.DB, ownerUserID string, manifest PortableManifest, state *mergeExecutionState) error {
	for _, entity := range manifest.ActionTemplates {
		oldID := entity.ID
		entity.ID = ""
		entity.OwnerUserID = ownerUserID
		entity.IconAssetID = state.mapper.remapPtr("assets", entity.IconAssetID)
		entity.Name = s.importName(ctx, tx, "action_templates", ownerUserID, entity.Name)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
		state.mapper.mapID("actionTemplates", oldID, entity.ID)
	}
	for _, entity := range manifest.ActionRollParts {
		entity.ID = ""
		var err error
		entity.ActionTemplateID, err = requireMergeRemap(state.mapper, "actionTemplates", entity.ActionTemplateID)
		if err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	return nil
}

func (s ImportExportStore) mergeCreatures(ctx context.Context, tx *gorm.DB, ownerUserID string, manifest PortableManifest, state *mergeExecutionState) error {
	for _, entity := range manifest.NPCs {
		decision, create, err := state.shouldCreate("creatures", entity.ID)
		if err != nil {
			return err
		}
		oldID := entity.ID
		if !create {
			if decision.Action == "merge_missing_fields" {
				var existing dbmodels.CreatureEntity
				if err := mergeMissingFieldsIntoExisting(ctx, tx, "npc", decision.ExistingID, &existing, entity, decision.Provenance); err != nil {
					return err
				}
				state.mapper.mapID("creatures", oldID, existing.ID)
			}
			continue
		}
		entity.ID = ""
		entity.OwnerUserID = ownerUserID
		entity.ImageAssetID = state.mapper.remapPtr("assets", entity.ImageAssetID)
		if decision.Action == "rename_imported" {
			entity.Name = s.importName(ctx, tx, "creatures", ownerUserID, entity.Name)
		}
		mergeAttachProvenance(&entity, decision.Provenance)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return fmt.Errorf("merge NPC %s: %w", decision.Label, err)
		}
		state.mapper.mapID("creatures", oldID, entity.ID)
	}
	return mergeCreatureChildren(ctx, tx, manifest, state)
}

func mergeCreatureChildren(ctx context.Context, tx *gorm.DB, manifest PortableManifest, state *mergeExecutionState) error {
	for _, entity := range manifest.CreatureActions {
		oldID := entity.ID
		entity.ID = ""
		var err error
		entity.CreatureID, err = requireMergeRemap(state.mapper, "creatures", entity.CreatureID)
		if err != nil {
			return err
		}
		entity.SourceTemplateID = state.mapper.remapPtr("actionTemplates", entity.SourceTemplateID)
		entity.IconAssetID = state.mapper.remapPtr("assets", entity.IconAssetID)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
		state.mapper.mapID("creatureActions", oldID, entity.ID)
	}
	for _, entity := range manifest.CreatureRollParts {
		entity.ID = ""
		var err error
		entity.CreatureActionID, err = requireMergeRemap(state.mapper, "creatureActions", entity.CreatureActionID)
		if err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.Spellcasting {
		var err error
		entity.CreatureID, err = requireMergeRemap(state.mapper, "creatures", entity.CreatureID)
		if err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.CreatureSpells {
		entity.ID = ""
		var err error
		entity.CreatureID, err = requireMergeRemap(state.mapper, "creatures", entity.CreatureID)
		if err != nil {
			return err
		}
		entity.SpellID = state.mapper.remapPtr("spells", entity.SpellID)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	return nil
}

func (s ImportExportStore) mergePlayers(ctx context.Context, tx *gorm.DB, ownerUserID string, manifest PortableManifest, state *mergeExecutionState) error {
	for _, entity := range manifest.Players {
		decision, create, err := state.shouldCreate("players", entity.ID)
		if err != nil {
			return err
		}
		oldID := entity.ID
		if !create {
			if decision.Action == "merge_missing_fields" {
				var existing dbmodels.PlayerEntity
				if err := mergeMissingFieldsIntoExisting(ctx, tx, "player", decision.ExistingID, &existing, entity, decision.Provenance); err != nil {
					return err
				}
				state.mapper.mapID("players", oldID, existing.ID)
			}
			continue
		}
		entity.ID = ""
		entity.OwnerUserID = ownerUserID
		entity.CampaignID = state.mapper.remapPtr("campaigns", entity.CampaignID)
		entity.ImageAssetID = state.mapper.remapPtr("assets", entity.ImageAssetID)
		if decision.Action == "rename_imported" {
			entity.CharacterName = s.importName(ctx, tx, "players", ownerUserID, entity.CharacterName)
		}
		mergeAttachProvenance(&entity, decision.Provenance)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return fmt.Errorf("merge player %s: %w", decision.Label, err)
		}
		state.mapper.mapID("players", oldID, entity.ID)
	}
	return nil
}
