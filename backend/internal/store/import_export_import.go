package store

import (
	dbmodels "bludm/backend/internal/db"
	"context"
	"gorm.io/gorm"
)

func (s ImportExportStore) CloneImport(ctx context.Context, ownerUserID string, manifest PortableManifest, assets map[string][]byte) (CloneImportResult, error) {
	if err := ValidatePortableManifest(manifest); err != nil {
		return CloneImportResult{}, err
	}
	result := CloneImportResult{Counts: map[string]int{}}
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		idMapper := newCloneIDMapper()
		mapID := idMapper.mapID
		remap := idMapper.remap
		requireRemap := idMapper.requireRemap
		remapPtr := idMapper.remapPtr

		for _, asset := range manifest.Assets {
			data := assets[asset.Path]
			if len(data) == 0 {
				continue
			}
			entity := dbmodels.UploadedAssetEntity{
				OwnerUserID: ownerUserID,
				Filename:    asset.Filename,
				ContentType: asset.ContentType,
				ByteSize:    int64(len(data)),
				Data:        data,
			}
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
			mapID("assets", asset.ID, entity.ID)
		}

		for _, entity := range manifest.Campaigns {
			oldID := entity.ID
			entity.ID = ""
			entity.OwnerUserID = ownerUserID
			entity.Name = s.importName(ctx, tx, "campaigns", ownerUserID, entity.Name)
			entity.ArchivedAt = nil
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
			mapID("campaigns", oldID, entity.ID)
			result.CampaignIDs = append(result.CampaignIDs, entity.ID)
		}

		for _, entity := range manifest.Items {
			oldID := entity.ID
			entity.ID = ""
			entity.OwnerUserID = ownerUserID
			entity.Name = s.importName(ctx, tx, "items", ownerUserID, entity.Name)
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
			mapID("items", oldID, entity.ID)
		}

		for _, entity := range manifest.Spells {
			oldID := entity.ID
			entity.ID = ""
			entity.OwnerUserID = ownerUserID
			entity.Name = s.importName(ctx, tx, "spells", ownerUserID, entity.Name)
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
			mapID("spells", oldID, entity.ID)
		}
		for _, entity := range manifest.SpellScaling {
			var err error
			entity.SpellID, err = requireRemap("spells", entity.SpellID)
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
			entity.SpellID, err = requireRemap("spells", entity.SpellID)
			if err != nil {
				return err
			}
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
			mapID("spellActions", oldID, entity.ID)
		}
		for _, entity := range manifest.SpellRollParts {
			entity.ID = ""
			var err error
			entity.SpellActionID, err = requireRemap("spellActions", entity.SpellActionID)
			if err != nil {
				return err
			}
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
		}

		for _, entity := range manifest.ActionTemplates {
			oldID := entity.ID
			entity.ID = ""
			entity.OwnerUserID = ownerUserID
			entity.IconAssetID = remapPtr("assets", entity.IconAssetID)
			entity.Name = s.importName(ctx, tx, "action_templates", ownerUserID, entity.Name)
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
			mapID("actionTemplates", oldID, entity.ID)
		}
		for _, entity := range manifest.ActionRollParts {
			entity.ID = ""
			var err error
			entity.ActionTemplateID, err = requireRemap("actionTemplates", entity.ActionTemplateID)
			if err != nil {
				return err
			}
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
		}

		for _, entity := range manifest.NPCs {
			oldID := entity.ID
			entity.ID = ""
			entity.OwnerUserID = ownerUserID
			entity.ImageAssetID = remapPtr("assets", entity.ImageAssetID)
			entity.Name = s.importName(ctx, tx, "creatures", ownerUserID, entity.Name)
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
			mapID("creatures", oldID, entity.ID)
		}
		for _, entity := range manifest.CreatureActions {
			oldID := entity.ID
			entity.ID = ""
			var err error
			entity.CreatureID, err = requireRemap("creatures", entity.CreatureID)
			if err != nil {
				return err
			}
			entity.SourceTemplateID = remapPtr("actionTemplates", entity.SourceTemplateID)
			entity.IconAssetID = remapPtr("assets", entity.IconAssetID)
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
			mapID("creatureActions", oldID, entity.ID)
		}
		for _, entity := range manifest.CreatureRollParts {
			entity.ID = ""
			var err error
			entity.CreatureActionID, err = requireRemap("creatureActions", entity.CreatureActionID)
			if err != nil {
				return err
			}
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
		}
		for _, entity := range manifest.Spellcasting {
			var err error
			entity.CreatureID, err = requireRemap("creatures", entity.CreatureID)
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
			entity.CreatureID, err = requireRemap("creatures", entity.CreatureID)
			if err != nil {
				return err
			}
			entity.SpellID = remapPtr("spells", entity.SpellID)
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
		}

		for _, entity := range manifest.Players {
			oldID := entity.ID
			entity.ID = ""
			entity.OwnerUserID = ownerUserID
			entity.CampaignID = remapPtr("campaigns", entity.CampaignID)
			entity.ImageAssetID = remapPtr("assets", entity.ImageAssetID)
			entity.CharacterName = s.importName(ctx, tx, "players", ownerUserID, entity.CharacterName)
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
			mapID("players", oldID, entity.ID)
		}

		for _, entity := range manifest.CreatureLinks {
			var err error
			entity.CampaignID, err = requireRemap("campaigns", entity.CampaignID)
			if err != nil {
				return err
			}
			entity.CreatureID, err = requireRemap("creatures", entity.CreatureID)
			if err != nil {
				return err
			}
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
		}

		for _, entity := range manifest.Locations {
			oldID := entity.ID
			entity.ID = ""
			var err error
			entity.CampaignID, err = requireRemap("campaigns", entity.CampaignID)
			if err != nil {
				return err
			}
			entity.ParentLocationID = nil
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
			mapID("locations", oldID, entity.ID)
		}
		for _, entity := range manifest.Locations {
			if entity.ParentLocationID == nil {
				continue
			}
			newParentID := remap("locations", *entity.ParentLocationID)
			if newParentID == "" {
				continue
			}
			if err := tx.WithContext(ctx).Model(&dbmodels.CampaignLocationEntity{}).
				Where("id = ?", remap("locations", entity.ID)).
				Update("parent_location_id", newParentID).Error; err != nil {
				return err
			}
		}
		for _, entity := range manifest.LocationLinks {
			entity.ID = ""
			var err error
			entity.CampaignID, err = requireRemap("campaigns", entity.CampaignID)
			if err != nil {
				return err
			}
			entity.SourceLocationID, err = requireRemap("locations", entity.SourceLocationID)
			if err != nil {
				return err
			}
			entity.TargetLocationID, err = requireRemap("locations", entity.TargetLocationID)
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
			entity.CampaignID, err = requireRemap("campaigns", entity.CampaignID)
			if err != nil {
				return err
			}
			entity.CreatureID, err = requireRemap("creatures", entity.CreatureID)
			if err != nil {
				return err
			}
			entity.LocationID, err = requireRemap("locations", entity.LocationID)
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
			entity.CampaignID, err = requireRemap("campaigns", entity.CampaignID)
			if err != nil {
				return err
			}
			entity.LocationID, err = requireRemap("locations", entity.LocationID)
			if err != nil {
				return err
			}
			if entity.LibrarySource == "user" {
				entity.ItemID, err = requireRemap("items", entity.ItemID)
				if err != nil {
					return err
				}
			}
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
		}

		for _, entity := range manifest.Maps {
			oldID := entity.ID
			entity.ID = ""
			var err error
			entity.CampaignID, err = requireRemap("campaigns", entity.CampaignID)
			if err != nil {
				return err
			}
			entity.ParentLocationID = remapPtr("locations", entity.ParentLocationID)
			entity.ImageAssetID = remapPtr("assets", entity.ImageAssetID)
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
			mapID("maps", oldID, entity.ID)
		}
		for _, entity := range manifest.MapPins {
			entity.ID = ""
			var err error
			entity.CampaignID, err = requireRemap("campaigns", entity.CampaignID)
			if err != nil {
				return err
			}
			entity.MapID, err = requireRemap("maps", entity.MapID)
			if err != nil {
				return err
			}
			entity.LocationID, err = requireRemap("locations", entity.LocationID)
			if err != nil {
				return err
			}
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
		}
		for _, entity := range manifest.Journeys {
			entity.ID = ""
			var err error
			entity.CampaignID, err = requireRemap("campaigns", entity.CampaignID)
			if err != nil {
				return err
			}
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
		}

		for _, entity := range manifest.Encounters {
			oldID := entity.ID
			entity.ID = ""
			var err error
			entity.CampaignID, err = requireRemap("campaigns", entity.CampaignID)
			if err != nil {
				return err
			}
			entity.LocationID = remapPtr("locations", entity.LocationID)
			entity.BackgroundAssetID = remapPtr("assets", entity.BackgroundAssetID)
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
			mapID("encounters", oldID, entity.ID)
		}
		for _, entity := range manifest.Combatants {
			oldID := entity.ID
			entity.ID = ""
			var err error
			entity.EncounterID, err = requireRemap("encounters", entity.EncounterID)
			if err != nil {
				return err
			}
			entity.PlayerID = remapPtr("players", entity.PlayerID)
			entity.CreatureID = remapPtr("creatures", entity.CreatureID)
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
			mapID("combatants", oldID, entity.ID)
		}
		for _, entity := range manifest.Runs {
			oldID := entity.ID
			entity.ID = ""
			var err error
			entity.EncounterID, err = requireRemap("encounters", entity.EncounterID)
			if err != nil {
				return err
			}
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
			mapID("runs", oldID, entity.ID)
		}
		for _, entity := range manifest.RunCombatants {
			oldID := entity.ID
			entity.ID = ""
			var err error
			entity.EncounterRunID, err = requireRemap("runs", entity.EncounterRunID)
			if err != nil {
				return err
			}
			entity.SourceCombatantID = remapPtr("combatants", entity.SourceCombatantID)
			entity.PlayerID = remapPtr("players", entity.PlayerID)
			entity.CreatureID = remapPtr("creatures", entity.CreatureID)
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
			mapID("runCombatants", oldID, entity.ID)
		}
		for _, entity := range manifest.RunSpellSlots {
			entity.ID = ""
			var err error
			entity.EncounterRunID, err = requireRemap("runs", entity.EncounterRunID)
			if err != nil {
				return err
			}
			entity.CombatantID, err = requireRemap("runCombatants", entity.CombatantID)
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
			entity.EncounterRunID, err = requireRemap("runs", entity.EncounterRunID)
			if err != nil {
				return err
			}
			entity.CasterID, err = requireRemap("runCombatants", entity.CasterID)
			if err != nil {
				return err
			}
			entity.TargetID, err = requireRemap("runCombatants", entity.TargetID)
			if err != nil {
				return err
			}
			entity.SpellID = remapPtr("spells", entity.SpellID)
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
		}
		for _, entity := range manifest.RunAlerts {
			entity.ID = ""
			var err error
			entity.EncounterRunID, err = requireRemap("runs", entity.EncounterRunID)
			if err != nil {
				return err
			}
			entity.ActorID = remapPtr("runCombatants", entity.ActorID)
			entity.TargetID = remapPtr("runCombatants", entity.TargetID)
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
		}
		for _, entity := range manifest.CombatLog {
			entity.ID = ""
			var err error
			entity.EncounterRunID, err = requireRemap("runs", entity.EncounterRunID)
			if err != nil {
				return err
			}
			entity.ActorID = remapPtr("runCombatants", entity.ActorID)
			entity.TargetID = remapPtr("runCombatants", entity.TargetID)
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
		}

		for _, entity := range manifest.RollTables {
			oldID := entity.ID
			entity.ID = ""
			entity.CampaignID = remapPtr("campaigns", entity.CampaignID)
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
			mapID("rollTables", oldID, entity.ID)
		}
		for _, entity := range manifest.RollTableRows {
			entity.ID = ""
			var err error
			entity.TableID, err = requireRemap("rollTables", entity.TableID)
			if err != nil {
				return err
			}
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
		}
		result.Counts = manifestCounts(manifest)
		return nil
	})
	return result, err
}
