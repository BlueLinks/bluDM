package store

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"

	dbmodels "bludm/backend/internal/db"
)

func ValidatePortableManifest(manifest PortableManifest) error {
	if manifest.Format != ImportExportFormat {
		return errors.New("unsupported import format")
	}
	if manifest.Version != ImportExportVersion {
		return fmt.Errorf("unsupported import version %d", manifest.Version)
	}
	if normalizeBundleType(manifest.BundleType) == "" {
		return errors.New("unsupported bundle type")
	}
	if err := validateUniqueManifestIDs(manifest); err != nil {
		return err
	}
	return nil
}

func validateUniqueManifestIDs(manifest PortableManifest) error {
	check := func(kind string, ids []string) error {
		seen := map[string]struct{}{}
		for _, id := range ids {
			if id == "" {
				continue
			}
			if _, exists := seen[id]; exists {
				return fmt.Errorf("manifest contains duplicate %s IDs", kind)
			}
			seen[id] = struct{}{}
		}
		return nil
	}
	checks := []struct {
		kind string
		ids  []string
	}{
		{"campaign", rawIDsFrom(manifest.Campaigns, func(entity dbmodels.CampaignEntity) string { return entity.ID })},
		{"player", rawIDsFrom(manifest.Players, func(entity dbmodels.PlayerEntity) string { return entity.ID })},
		{"npc", rawIDsFrom(manifest.NPCs, func(entity dbmodels.CreatureEntity) string { return entity.ID })},
		{"spell", rawIDsFrom(manifest.Spells, func(entity dbmodels.SpellEntity) string { return entity.ID })},
		{"item", rawIDsFrom(manifest.Items, func(entity dbmodels.ItemEntity) string { return entity.ID })},
		{"encounter", rawIDsFrom(manifest.Encounters, func(entity dbmodels.EncounterEntity) string { return entity.ID })},
		{"combatant", rawIDsFrom(manifest.Combatants, func(entity dbmodels.EncounterCombatantEntity) string { return entity.ID })},
		{"run", rawIDsFrom(manifest.Runs, func(entity dbmodels.EncounterRunEntity) string { return entity.ID })},
		{"run combatant", rawIDsFrom(manifest.RunCombatants, func(entity dbmodels.EncounterRunCombatantEntity) string { return entity.ID })},
		{"location", rawIDsFrom(manifest.Locations, func(entity dbmodels.CampaignLocationEntity) string { return entity.ID })},
		{"map", rawIDsFrom(manifest.Maps, func(entity dbmodels.CampaignMapEntity) string { return entity.ID })},
		{"roll table", rawIDsFrom(manifest.RollTables, func(entity dbmodels.RollTableEntity) string { return entity.ID })},
		{"asset", rawIDsFrom(manifest.Assets, func(entity ExportAsset) string { return entity.ID })},
	}
	for _, item := range checks {
		if err := check(item.kind, item.ids); err != nil {
			return err
		}
	}
	return nil
}

func (s ImportExportStore) exportCampaignIDs(ctx context.Context, ownerUserID, bundleType string, requested []string) ([]string, error) {
	if bundleType == "everything" && len(requested) == 0 {
		var campaigns []dbmodels.CampaignEntity
		if err := s.db.WithContext(ctx).
			Select("id").
			Where("owner_user_id = ? and archived_at is null", ownerUserID).
			Order("updated_at desc").
			Find(&campaigns).Error; err != nil {
			return nil, err
		}
		ids := make([]string, 0, len(campaigns))
		for _, campaign := range campaigns {
			ids = append(ids, campaign.ID)
		}
		return ids, nil
	}
	ids := uniqueNonEmpty(requested)
	if bundleType == "campaign" && len(ids) == 0 {
		return nil, errors.New("at least one campaign is required")
	}
	if len(ids) == 0 {
		return ids, nil
	}
	var count int64
	if err := s.db.WithContext(ctx).Model(&dbmodels.CampaignEntity{}).
		Where("id in ? and owner_user_id = ? and archived_at is null", ids, ownerUserID).
		Count(&count).Error; err != nil {
		return nil, err
	}
	if count != int64(len(ids)) {
		return nil, ErrNotFound
	}
	return ids, nil
}

func (s ImportExportStore) exportCampaignOwned(ctx context.Context, _ string, campaignIDs []string, manifest *PortableManifest) error {
	if err := s.findWhere(ctx, &manifest.Encounters, "campaign_id in ?", campaignIDs); err != nil {
		return err
	}
	if err := s.exportEncounterChildren(ctx, idsFrom(manifest.Encounters, func(entity dbmodels.EncounterEntity) string { return entity.ID }), manifest); err != nil {
		return err
	}
	return s.exportCampaignWorld(ctx, campaignIDs, manifest)
}

func (s ImportExportStore) exportEncounterChildren(ctx context.Context, encounterIDs []string, manifest *PortableManifest) error {
	if len(encounterIDs) == 0 {
		return nil
	}
	if err := s.findWhere(ctx, &manifest.Combatants, "encounter_id in ?", encounterIDs); err != nil {
		return err
	}
	if err := s.findWhere(ctx, &manifest.Runs, "encounter_id in ?", encounterIDs); err != nil {
		return err
	}
	runIDs := idsFrom(manifest.Runs, func(entity dbmodels.EncounterRunEntity) string { return entity.ID })
	if len(runIDs) > 0 {
		if err := s.findWhere(ctx, &manifest.RunCombatants, "encounter_run_id in ?", runIDs); err != nil {
			return err
		}
		if err := s.findWhere(ctx, &manifest.RunSpellSlots, "encounter_run_id in ?", runIDs); err != nil {
			return err
		}
		if err := s.findWhere(ctx, &manifest.RunEffects, "encounter_run_id in ?", runIDs); err != nil {
			return err
		}
		if err := s.findWhere(ctx, &manifest.RunAlerts, "encounter_run_id in ?", runIDs); err != nil {
			return err
		}
		if err := s.findWhere(ctx, &manifest.CombatLog, "encounter_run_id in ?", runIDs); err != nil {
			return err
		}
	}
	return nil
}

func (s ImportExportStore) exportCampaignWorld(ctx context.Context, campaignIDs []string, manifest *PortableManifest) error {
	if err := s.findWhere(ctx, &manifest.Locations, "campaign_id in ?", campaignIDs); err != nil {
		return err
	}
	if err := s.findWhere(ctx, &manifest.LocationLinks, "campaign_id in ?", campaignIDs); err != nil {
		return err
	}
	if err := s.findWhere(ctx, &manifest.NPCLocationLinks, "campaign_id in ?", campaignIDs); err != nil {
		return err
	}
	if err := s.findWhere(ctx, &manifest.LocationStock, "campaign_id in ?", campaignIDs); err != nil {
		return err
	}
	if err := s.findWhere(ctx, &manifest.Maps, "campaign_id in ?", campaignIDs); err != nil {
		return err
	}
	if err := s.findWhere(ctx, &manifest.MapPins, "campaign_id in ?", campaignIDs); err != nil {
		return err
	}
	if err := s.findWhere(ctx, &manifest.Journeys, "campaign_id in ?", campaignIDs); err != nil {
		return err
	}
	if err := s.findWhere(ctx, &manifest.RollTables, "campaign_id in ?", campaignIDs); err != nil {
		return err
	}
	tableIDs := idsFrom(manifest.RollTables, func(entity dbmodels.RollTableEntity) string { return entity.ID })
	if len(tableIDs) > 0 {
		if err := s.findWhere(ctx, &manifest.RollTableRows, "table_id in ?", tableIDs); err != nil {
			return err
		}
	}
	return nil
}

func (s ImportExportStore) exportReferencedLibraries(ctx context.Context, ownerUserID string, campaignIDs []string, manifest *PortableManifest) error {
	creatureIDs := stringSet{}
	for _, link := range manifest.CreatureLinks {
		creatureIDs.add(link.CreatureID)
	}
	for _, link := range manifest.NPCLocationLinks {
		creatureIDs.add(link.CreatureID)
	}
	var links []dbmodels.CampaignCreatureEntity
	if err := s.findWhere(ctx, &links, "campaign_id in ?", campaignIDs); err != nil {
		return err
	}
	manifest.CreatureLinks = mergeByID(manifest.CreatureLinks, links, func(entity dbmodels.CampaignCreatureEntity) string {
		return entity.CampaignID + ":" + entity.CreatureID
	})
	for _, link := range links {
		creatureIDs.add(link.CreatureID)
	}
	for _, combatant := range manifest.Combatants {
		if combatant.CreatureID != nil {
			creatureIDs.add(*combatant.CreatureID)
		}
	}
	for _, combatant := range manifest.RunCombatants {
		if combatant.CreatureID != nil {
			creatureIDs.add(*combatant.CreatureID)
		}
	}
	if ids := creatureIDs.values(); len(ids) > 0 {
		if err := s.findWhere(ctx, &manifest.NPCs, "id in ? and owner_user_id = ?", ids, ownerUserID); err != nil {
			return err
		}
	}
	itemIDs := stringSet{}
	for _, stock := range manifest.LocationStock {
		if stock.LibrarySource == "user" {
			itemIDs.add(stock.ItemID)
		}
	}
	if ids := itemIDs.values(); len(ids) > 0 {
		if err := s.findWhere(ctx, &manifest.Items, "id in ? and owner_user_id = ?", ids, ownerUserID); err != nil {
			return err
		}
	}
	return nil
}

func (s ImportExportStore) exportLibraryChildren(ctx context.Context, manifest *PortableManifest) error {
	creatureIDs := idsFrom(manifest.NPCs, func(entity dbmodels.CreatureEntity) string { return entity.ID })
	if len(creatureIDs) > 0 {
		if err := s.findWhere(ctx, &manifest.CreatureActions, "creature_id in ?", creatureIDs); err != nil {
			return err
		}
		if err := s.findWhere(ctx, &manifest.Spellcasting, "creature_id in ?", creatureIDs); err != nil {
			return err
		}
		if err := s.findWhere(ctx, &manifest.CreatureSpells, "creature_id in ?", creatureIDs); err != nil {
			return err
		}
	}
	creatureActionIDs := idsFrom(manifest.CreatureActions, func(entity dbmodels.CreatureActionEntity) string { return entity.ID })
	if len(creatureActionIDs) > 0 {
		if err := s.findWhere(ctx, &manifest.CreatureRollParts, "creature_action_id in ?", creatureActionIDs); err != nil {
			return err
		}
	}
	spellIDs := stringSet{}
	for _, spell := range manifest.Spells {
		spellIDs.add(spell.ID)
	}
	for _, creatureSpell := range manifest.CreatureSpells {
		if creatureSpell.LibrarySource == "user" && creatureSpell.SpellID != nil {
			spellIDs.add(*creatureSpell.SpellID)
		}
	}
	if ids := spellIDs.values(); len(ids) > 0 && len(manifest.Spells) == 0 {
		if err := s.findWhere(ctx, &manifest.Spells, "id in ?", ids); err != nil {
			return err
		}
	}
	spellIDs = stringSet{}
	for _, spell := range manifest.Spells {
		spellIDs.add(spell.ID)
	}
	if ids := spellIDs.values(); len(ids) > 0 {
		if err := s.findWhere(ctx, &manifest.SpellScaling, "spell_id in ?", ids); err != nil {
			return err
		}
		if err := s.findWhere(ctx, &manifest.SpellActions, "spell_id in ?", ids); err != nil {
			return err
		}
	}
	spellActionIDs := idsFrom(manifest.SpellActions, func(entity dbmodels.SpellActionEntity) string { return entity.ID })
	if len(spellActionIDs) > 0 {
		if err := s.findWhere(ctx, &manifest.SpellRollParts, "spell_action_id in ?", spellActionIDs); err != nil {
			return err
		}
	}
	templateIDs := idsFrom(manifest.ActionTemplates, func(entity dbmodels.ActionTemplateEntity) string { return entity.ID })
	for _, action := range manifest.CreatureActions {
		if action.SourceTemplateID != nil {
			templateIDs = append(templateIDs, *action.SourceTemplateID)
		}
	}
	templateIDs = uniqueNonEmpty(templateIDs)
	if len(templateIDs) > 0 {
		if len(manifest.ActionTemplates) == 0 {
			if err := s.findWhere(ctx, &manifest.ActionTemplates, "id in ?", templateIDs); err != nil {
				return err
			}
		}
		if err := s.findWhere(ctx, &manifest.ActionRollParts, "action_template_id in ?", templateIDs); err != nil {
			return err
		}
	}
	return nil
}

func (s ImportExportStore) exportAssets(ctx context.Context, ownerUserID string, includeAssets bool, bundleType string, manifest *PortableManifest) ([]ExportAssetFile, error) {
	if !includeAssets {
		return nil, nil
	}
	assetIDs := stringSet{}
	if bundleType == "everything" {
		var assets []dbmodels.UploadedAssetEntity
		if err := s.db.WithContext(ctx).Select("id").Where("owner_user_id = ?", ownerUserID).Find(&assets).Error; err != nil {
			return nil, err
		}
		for _, asset := range assets {
			assetIDs.add(asset.ID)
		}
	}
	for _, player := range manifest.Players {
		if player.ImageAssetID != nil {
			assetIDs.add(*player.ImageAssetID)
		}
	}
	for _, creature := range manifest.NPCs {
		if creature.ImageAssetID != nil {
			assetIDs.add(*creature.ImageAssetID)
		}
	}
	for _, action := range manifest.CreatureActions {
		if action.IconAssetID != nil {
			assetIDs.add(*action.IconAssetID)
		}
	}
	for _, template := range manifest.ActionTemplates {
		if template.IconAssetID != nil {
			assetIDs.add(*template.IconAssetID)
		}
	}
	for _, campaignMap := range manifest.Maps {
		if campaignMap.ImageAssetID != nil {
			assetIDs.add(*campaignMap.ImageAssetID)
		}
	}
	for _, encounter := range manifest.Encounters {
		if encounter.BackgroundAssetID != nil {
			assetIDs.add(*encounter.BackgroundAssetID)
		}
	}
	ids := assetIDs.values()
	if len(ids) == 0 {
		return nil, nil
	}
	var rows []dbmodels.UploadedAssetEntity
	if err := s.db.WithContext(ctx).Where("id in ? and owner_user_id = ?", ids, ownerUserID).Find(&rows).Error; err != nil {
		return nil, err
	}
	files := make([]ExportAssetFile, 0, len(rows))
	for index, row := range rows {
		path := fmt.Sprintf("assets/%03d-%s", index+1, safeAssetFilename(row.Filename))
		asset := ExportAsset{
			ID:          row.ID,
			Filename:    row.Filename,
			ContentType: row.ContentType,
			ByteSize:    row.ByteSize,
			SHA256:      assetSHA256(row.Data),
			Path:        path,
		}
		manifest.Assets = append(manifest.Assets, asset)
		files = append(files, ExportAssetFile{Asset: asset, Data: row.Data})
	}
	return files, nil
}

func assetSHA256(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}
