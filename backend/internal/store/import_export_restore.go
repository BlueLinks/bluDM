package store

import (
	"context"
	"errors"
	"sort"

	dbmodels "bludm/backend/internal/db"

	"gorm.io/gorm"
)

func (s ImportExportStore) RestoreReadiness(ctx context.Context, ownerUserID string, manifest PortableManifest, assets map[string][]byte) (RestoreReadiness, error) {
	verification := VerifyArchive(manifest, assets)
	databaseSafe, err := s.restoreTargetSafe(ctx, ownerUserID)
	if err != nil {
		return RestoreReadiness{}, err
	}
	readiness := RestoreReadiness{
		ArchiveValid:         verification.ArchiveValid && verification.ManifestValid && verification.GraphValid,
		DatabaseSafe:         databaseSafe,
		DependenciesComplete: verification.DependenciesComplete,
		AssetsVerified:       verification.AssetsVerified,
		Messages:             []string{},
	}
	if !readiness.ArchiveValid {
		readiness.Messages = append(readiness.Messages, "Archive validation has errors.")
	}
	if !readiness.DatabaseSafe {
		readiness.Messages = append(readiness.Messages, "Restore requires an account with no existing portable data.")
	}
	if !readiness.DependenciesComplete {
		readiness.Messages = append(readiness.Messages, "The dependency graph has missing required records.")
	}
	if !readiness.AssetsVerified {
		readiness.Messages = append(readiness.Messages, "One or more asset files failed verification.")
	}
	readiness.Ready = readiness.ArchiveValid && readiness.DatabaseSafe && readiness.DependenciesComplete && readiness.AssetsVerified
	if readiness.Ready {
		readiness.Messages = append(readiness.Messages, "Ready to restore into this account.")
	}
	return readiness, nil
}

func (s ImportExportStore) RestoreImport(ctx context.Context, ownerUserID string, manifest PortableManifest, assets map[string][]byte) (CloneImportResult, error) {
	if err := ValidatePortableManifest(manifest); err != nil {
		return CloneImportResult{}, err
	}
	readiness, err := s.RestoreReadiness(ctx, ownerUserID, manifest, assets)
	if err != nil {
		return CloneImportResult{}, err
	}
	if !readiness.Ready {
		return CloneImportResult{}, errors.New("restore target is not ready")
	}
	result := CloneImportResult{Counts: map[string]int{}}
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if safe, err := s.restoreTargetSafeInTx(ctx, tx, ownerUserID); err != nil {
			return err
		} else if !safe {
			return errors.New("restore target is not empty")
		}
		if err := restoreAssets(ctx, tx, ownerUserID, manifest, assets); err != nil {
			return err
		}
		if err := restoreOwnerEntities(ctx, tx, ownerUserID, manifest); err != nil {
			return err
		}
		if err := restoreCampaignRelationships(ctx, tx, manifest); err != nil {
			return err
		}
		result.CampaignIDs = idsFrom(manifest.Campaigns, func(entity dbmodels.CampaignEntity) string { return entity.ID })
		result.Counts = manifestCounts(manifest)
		return nil
	})
	return result, err
}

func restoreAssets(ctx context.Context, tx *gorm.DB, ownerUserID string, manifest PortableManifest, assets map[string][]byte) error {
	for _, asset := range manifest.Assets {
		data := assets[asset.Path]
		if len(data) == 0 {
			continue
		}
		entity := dbmodels.UploadedAssetEntity{
			ID:          asset.ID,
			OwnerUserID: ownerUserID,
			Filename:    asset.Filename,
			ContentType: asset.ContentType,
			ByteSize:    int64(len(data)),
			Data:        data,
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	return nil
}

func restoreOwnerEntities(ctx context.Context, tx *gorm.DB, ownerUserID string, manifest PortableManifest) error {
	for _, entity := range manifest.Campaigns {
		entity.OwnerUserID = ownerUserID
		entity.ArchivedAt = nil
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.Items {
		entity.OwnerUserID = ownerUserID
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.Spells {
		entity.OwnerUserID = ownerUserID
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.SpellScaling {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.SpellActions {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.SpellRollParts {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.ActionTemplates {
		entity.OwnerUserID = ownerUserID
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.ActionRollParts {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.NPCs {
		entity.OwnerUserID = ownerUserID
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.CreatureActions {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.CreatureRollParts {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.Spellcasting {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.CreatureSpells {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.Players {
		entity.OwnerUserID = ownerUserID
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	return nil
}

func restoreCampaignRelationships(ctx context.Context, tx *gorm.DB, manifest PortableManifest) error {
	for _, entity := range manifest.CreatureLinks {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range restoreLocationOrder(manifest.Locations) {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.LocationLinks {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.NPCLocationLinks {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.LocationStock {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.Maps {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.MapPins {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.Journeys {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.Encounters {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.Combatants {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.Runs {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.RunCombatants {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.RunSpellSlots {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.RunEffects {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.RunAlerts {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.CombatLog {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.RollTables {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	for _, entity := range manifest.RollTableRows {
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	return nil
}

func restoreLocationOrder(locations []dbmodels.CampaignLocationEntity) []dbmodels.CampaignLocationEntity {
	ordered := append([]dbmodels.CampaignLocationEntity(nil), locations...)
	byID := map[string]dbmodels.CampaignLocationEntity{}
	for _, location := range ordered {
		byID[location.ID] = location
	}
	depthCache := map[string]int{}
	visiting := map[string]bool{}
	var depth func(dbmodels.CampaignLocationEntity) int
	depth = func(location dbmodels.CampaignLocationEntity) int {
		if cached, ok := depthCache[location.ID]; ok {
			return cached
		}
		if visiting[location.ID] {
			return 0
		}
		visiting[location.ID] = true
		defer delete(visiting, location.ID)
		if location.ParentLocationID == nil || *location.ParentLocationID == "" {
			depthCache[location.ID] = 0
			return 0
		}
		parent, ok := byID[*location.ParentLocationID]
		if !ok {
			depthCache[location.ID] = 0
			return 0
		}
		value := depth(parent) + 1
		depthCache[location.ID] = value
		return value
	}
	sort.SliceStable(ordered, func(i, j int) bool {
		leftDepth := depth(ordered[i])
		rightDepth := depth(ordered[j])
		if leftDepth == rightDepth {
			return ordered[i].ID < ordered[j].ID
		}
		return leftDepth < rightDepth
	})
	return ordered
}

func (s ImportExportStore) restoreTargetSafe(ctx context.Context, ownerUserID string) (bool, error) {
	return s.restoreTargetSafeInTx(ctx, s.db, ownerUserID)
}

func (s ImportExportStore) restoreTargetSafeInTx(ctx context.Context, tx *gorm.DB, ownerUserID string) (bool, error) {
	checks := []struct {
		table string
		where string
		args  []any
	}{
		{table: "campaigns", where: "owner_user_id = ?", args: []any{ownerUserID}},
		{table: "uploaded_assets", where: "owner_user_id = ?", args: []any{ownerUserID}},
		{table: "creatures", where: "owner_user_id = ?", args: []any{ownerUserID}},
		{table: "players", where: "owner_user_id = ?", args: []any{ownerUserID}},
		{table: "items", where: "owner_user_id = ?", args: []any{ownerUserID}},
		{table: "spells", where: "owner_user_id = ?", args: []any{ownerUserID}},
		{table: "action_templates", where: "owner_user_id = ?", args: []any{ownerUserID}},
	}
	for _, check := range checks {
		var count int64
		if err := tx.WithContext(ctx).Table(check.table).Where(check.where, check.args...).Count(&count).Error; err != nil {
			return false, err
		}
		if count > 0 {
			return false, nil
		}
	}
	return true, nil
}
