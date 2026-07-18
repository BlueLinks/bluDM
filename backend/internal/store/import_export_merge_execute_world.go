package store

import (
	"context"
	"fmt"
	"strings"

	dbmodels "bludm/backend/internal/db"

	"gorm.io/gorm"
)

func (s ImportExportStore) mergeCampaignWorld(ctx context.Context, tx *gorm.DB, manifest PortableManifest, state *mergeExecutionState) error {
	for _, entity := range manifest.CreatureLinks {
		var err error
		entity.CampaignID, err = requireMergeRemap(state.mapper, "campaigns", entity.CampaignID)
		if err != nil {
			return err
		}
		entity.CreatureID, err = requireMergeRemap(state.mapper, "creatures", entity.CreatureID)
		if err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	if err := s.mergeLocations(ctx, tx, manifest, state); err != nil {
		return err
	}
	if err := mergeLocationInternals(ctx, tx, manifest, state); err != nil {
		return err
	}
	if err := s.mergeMaps(ctx, tx, manifest, state); err != nil {
		return err
	}
	return s.mergeJourneys(ctx, tx, manifest, state)
}

func (s ImportExportStore) mergeLocations(ctx context.Context, tx *gorm.DB, manifest PortableManifest, state *mergeExecutionState) error {
	for _, entity := range manifest.Locations {
		kind := mergeExecutionKind(locationGraphKind(entity.LocationType))
		decision, create, err := state.shouldCreate(kind, entity.ID)
		if err != nil {
			return err
		}
		oldID := entity.ID
		if !create {
			if decision.Action == "merge_missing_fields" {
				var existing dbmodels.CampaignLocationEntity
				if err := mergeMissingFieldsIntoExisting(ctx, tx, locationGraphKind(entity.LocationType), decision.ExistingID, &existing, entity, decision.Provenance); err != nil {
					return err
				}
				state.mapper.mapID("locations", oldID, existing.ID)
			}
			continue
		}
		entity.ID = ""
		entity.ParentLocationID = nil
		entity.CampaignID, err = requireMergeRemap(state.mapper, "campaigns", entity.CampaignID)
		if err != nil {
			return err
		}
		if decision.Action == "rename_imported" {
			entity.Name = s.importCampaignScopedName(ctx, tx, "campaign_locations", entity.CampaignID, entity.Name)
		}
		mergeAttachProvenance(&entity, decision.Provenance)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return fmt.Errorf("merge location %s: %w", decision.Label, err)
		}
		state.mapper.mapID("locations", oldID, entity.ID)
	}
	for _, entity := range manifest.Locations {
		if entity.ParentLocationID == nil {
			continue
		}
		newParentID := state.mapper.remap("locations", *entity.ParentLocationID)
		if newParentID == "" {
			continue
		}
		if err := tx.WithContext(ctx).Model(&dbmodels.CampaignLocationEntity{}).
			Where("id = ?", state.mapper.remap("locations", entity.ID)).
			Update("parent_location_id", newParentID).Error; err != nil {
			return err
		}
	}
	return nil
}

func mergeLocationInternals(ctx context.Context, tx *gorm.DB, manifest PortableManifest, state *mergeExecutionState) error {
	for _, entity := range manifest.LocationLinks {
		entity.ID = ""
		var err error
		entity.CampaignID, err = requireMergeRemap(state.mapper, "campaigns", entity.CampaignID)
		if err != nil {
			return err
		}
		entity.SourceLocationID, err = requireMergeRemap(state.mapper, "locations", entity.SourceLocationID)
		if err != nil {
			return err
		}
		entity.TargetLocationID, err = requireMergeRemap(state.mapper, "locations", entity.TargetLocationID)
		if err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.NPCLocationLinks {
		entity.ID = ""
		var err error
		entity.CampaignID, err = requireMergeRemap(state.mapper, "campaigns", entity.CampaignID)
		if err != nil {
			return err
		}
		entity.CreatureID, err = requireMergeRemap(state.mapper, "creatures", entity.CreatureID)
		if err != nil {
			return err
		}
		entity.LocationID, err = requireMergeRemap(state.mapper, "locations", entity.LocationID)
		if err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.LocationStock {
		entity.ID = ""
		var err error
		entity.CampaignID, err = requireMergeRemap(state.mapper, "campaigns", entity.CampaignID)
		if err != nil {
			return err
		}
		entity.LocationID, err = requireMergeRemap(state.mapper, "locations", entity.LocationID)
		if err != nil {
			return err
		}
		if entity.LibrarySource == "user" {
			entity.ItemID, err = requireMergeRemap(state.mapper, "items", entity.ItemID)
			if err != nil {
				return err
			}
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	return nil
}

func (s ImportExportStore) mergeMaps(ctx context.Context, tx *gorm.DB, manifest PortableManifest, state *mergeExecutionState) error {
	for _, entity := range manifest.Maps {
		decision, create, err := state.shouldCreate("maps", entity.ID)
		if err != nil {
			return err
		}
		oldID := entity.ID
		if !create {
			if decision.Action == "merge_missing_fields" {
				var existing dbmodels.CampaignMapEntity
				if err := mergeMissingFieldsIntoExisting(ctx, tx, "map", decision.ExistingID, &existing, entity, decision.Provenance); err != nil {
					return err
				}
				state.mapper.mapID("maps", oldID, existing.ID)
			}
			continue
		}
		entity.ID = ""
		entity.CampaignID, err = requireMergeRemap(state.mapper, "campaigns", entity.CampaignID)
		if err != nil {
			return err
		}
		entity.ParentLocationID = state.mapper.remapPtr("locations", entity.ParentLocationID)
		entity.ImageAssetID = state.mapper.remapPtr("assets", entity.ImageAssetID)
		if decision.Action == "rename_imported" {
			entity.Name = s.importCampaignScopedName(ctx, tx, "campaign_maps", entity.CampaignID, entity.Name)
		}
		mergeAttachProvenance(&entity, decision.Provenance)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return fmt.Errorf("merge map %s: %w", decision.Label, err)
		}
		state.mapper.mapID("maps", oldID, entity.ID)
	}
	for _, entity := range manifest.MapPins {
		entity.ID = ""
		var err error
		entity.CampaignID, err = requireMergeRemap(state.mapper, "campaigns", entity.CampaignID)
		if err != nil {
			return err
		}
		entity.MapID, err = requireMergeRemap(state.mapper, "maps", entity.MapID)
		if err != nil {
			return err
		}
		entity.LocationID, err = requireMergeRemap(state.mapper, "locations", entity.LocationID)
		if err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	return nil
}

func (s ImportExportStore) mergeJourneys(ctx context.Context, tx *gorm.DB, manifest PortableManifest, state *mergeExecutionState) error {
	for _, entity := range manifest.Journeys {
		decision, create, err := state.shouldCreate("journey", entity.ID)
		if err != nil {
			return err
		}
		oldID := entity.ID
		if !create {
			if decision.Action == "merge_missing_fields" {
				var existing dbmodels.CampaignJourneyEntity
				if err := mergeMissingFieldsIntoExisting(ctx, tx, "journey", decision.ExistingID, &existing, entity, decision.Provenance); err != nil {
					return err
				}
				state.mapper.mapID("journeys", oldID, existing.ID)
			}
			continue
		}
		entity.ID = ""
		entity.CampaignID, err = requireMergeRemap(state.mapper, "campaigns", entity.CampaignID)
		if err != nil {
			return err
		}
		if decision.Action == "rename_imported" {
			entity.Name = s.importCampaignScopedName(ctx, tx, "campaign_journeys", entity.CampaignID, entity.Name)
		}
		mergeAttachProvenance(&entity, decision.Provenance)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return fmt.Errorf("merge journey %s: %w", decision.Label, err)
		}
	}
	return nil
}

func (s ImportExportStore) importCampaignScopedName(ctx context.Context, tx *gorm.DB, table, campaignID, name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		name = "Imported"
	}
	var count int64
	if err := tx.WithContext(ctx).Table(table).Where("campaign_id = ? and lower(name) = lower(?)", campaignID, name).Count(&count).Error; err != nil || count == 0 {
		return name
	}
	for index := 2; index < 1000; index++ {
		candidate := fmt.Sprintf("%s (Imported %d)", name, index)
		count = 0
		if err := tx.WithContext(ctx).Table(table).Where("campaign_id = ? and lower(name) = lower(?)", campaignID, candidate).Count(&count).Error; err == nil && count == 0 {
			return candidate
		}
	}
	return name + " (Imported)"
}
