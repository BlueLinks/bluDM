package store

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"

	dbmodels "bludm/backend/internal/db"

	"gorm.io/gorm"
)

type mergeExecutionState struct {
	plan    MergePlan
	actions map[string]map[string]MergePlanDecision
	mapper  cloneIDMapper
}

func (s ImportExportStore) MergeImport(ctx context.Context, ownerUserID string, manifest PortableManifest, assets map[string][]byte) (CloneImportResult, MergePlan, error) {
	if err := ValidatePortableManifest(manifest); err != nil {
		return CloneImportResult{}, MergePlan{}, err
	}
	result := CloneImportResult{Counts: map[string]int{}}
	var plan MergePlan
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		txStore := ImportExportStore{db: tx}
		var err error
		plan, err = txStore.PlanMerge(ctx, MergePlanInput{OwnerUserID: ownerUserID, Manifest: manifest, Assets: assets})
		if err != nil {
			return err
		}
		state, err := newMergeExecutionState(plan)
		if err != nil {
			return err
		}
		if err := txStore.mergeAssets(ctx, tx, ownerUserID, manifest, assets, state); err != nil {
			return err
		}
		if err := txStore.mergeOwnerEntities(ctx, tx, ownerUserID, manifest, state); err != nil {
			return err
		}
		if err := txStore.mergeCampaignWorld(ctx, tx, manifest, state); err != nil {
			return err
		}
		if err := txStore.mergeEncountersAndRuns(ctx, tx, manifest, state); err != nil {
			return err
		}
		if err := txStore.mergeRollTables(ctx, tx, manifest, state); err != nil {
			return err
		}
		result.CampaignIDs = state.createdIDs("campaigns")
		result.Counts = manifestCounts(manifest)
		return nil
	})
	return result, plan, err
}

func newMergeExecutionState(plan MergePlan) (*mergeExecutionState, error) {
	if len(plan.Blockers) > 0 {
		return nil, fmt.Errorf("merge planner blocked execution: %s", plan.Blockers[0].Message)
	}
	state := &mergeExecutionState{plan: plan, actions: map[string]map[string]MergePlanDecision{}, mapper: newCloneIDMapper()}
	for _, decision := range plan.Decisions {
		if !mergeExecutionActionAllowed(decision.Action) {
			return nil, fmt.Errorf("merge planner decision %s is not executable for %s", decision.Action, decision.Label)
		}
		if decision.Severity == "danger" || strings.HasPrefix(decision.Action, "block_") {
			return nil, fmt.Errorf("merge planner blocked %s: %s", decision.Label, decision.Action)
		}
		if mergeWouldMergeChildren(decision) {
			return nil, fmt.Errorf("merge planner blocked child collection merge for %s", decision.Label)
		}
		key := mergeExecutionKind(decision.Kind)
		if state.actions[key] == nil {
			state.actions[key] = map[string]MergePlanDecision{}
		}
		state.actions[key][decision.ImportedID] = decision
		if mergeDecisionReusesExisting(decision) {
			state.mapper.mapID(key, decision.ImportedID, decision.ExistingID)
		}
	}
	return state, nil
}

func mergeExecutionActionAllowed(action string) bool {
	switch action {
	case "create", "rename_imported", "reuse_existing", "skip_exact_duplicate", "reuse_asset_by_hash", "keep_standard_reference", "merge_missing_fields":
		return true
	default:
		return false
	}
}

func mergeDecisionReusesExisting(decision MergePlanDecision) bool {
	return (decision.Action == "reuse_existing" || decision.Action == "skip_exact_duplicate" || decision.Action == "reuse_asset_by_hash" || decision.Action == "merge_missing_fields") && strings.TrimSpace(decision.ExistingID) != ""
}

func mergeWouldMergeChildren(decision MergePlanDecision) bool {
	if decision.Kind == "asset" || strings.HasPrefix(decision.Kind, "standard") {
		return false
	}
	return (decision.Action == "reuse_existing" || decision.Action == "skip_exact_duplicate") && decision.DependencyImpact.InternalRecords > 0
}

func mergeExecutionKind(kind string) string {
	switch kind {
	case "campaign":
		return "campaigns"
	case "player":
		return "players"
	case "npc":
		return "creatures"
	case "item":
		return "items"
	case "spell":
		return "spells"
	case "asset":
		return "assets"
	case "encounter":
		return "encounters"
	case "map":
		return "maps"
	case "shop", "dungeon", "settlement", "location":
		return "locations"
	case "roll table":
		return "rollTables"
	default:
		return kind
	}
}

func (state *mergeExecutionState) decision(kind, importedID string) (MergePlanDecision, error) {
	if decision, ok := state.actions[kind][importedID]; ok {
		return decision, nil
	}
	return MergePlanDecision{}, fmt.Errorf("missing merge planner decision for %s %s", kind, importedID)
}

func (state *mergeExecutionState) shouldCreate(kind, importedID string) (MergePlanDecision, bool, error) {
	decision, err := state.decision(kind, importedID)
	if err != nil {
		return MergePlanDecision{}, false, err
	}
	return decision, decision.Action == "create" || decision.Action == "rename_imported", nil
}

func (state *mergeExecutionState) createdIDs(kind string) []string {
	ids := []string{}
	for oldID, newID := range state.mapper.ids[kind] {
		if decision, ok := state.actions[kind][oldID]; ok && (decision.Action == "create" || decision.Action == "rename_imported") {
			ids = append(ids, newID)
		}
	}
	sort.Strings(ids)
	return ids
}

func (s ImportExportStore) mergeAssets(ctx context.Context, tx *gorm.DB, ownerUserID string, manifest PortableManifest, assets map[string][]byte, state *mergeExecutionState) error {
	for _, asset := range manifest.Assets {
		decision, create, err := state.shouldCreate("assets", asset.ID)
		if err != nil {
			return err
		}
		if !create {
			continue
		}
		data := assets[asset.Path]
		if len(data) == 0 {
			continue
		}
		filename := asset.Filename
		if decision.Action == "rename_imported" {
			filename = s.importAssetFilename(ctx, tx, ownerUserID, filename)
		}
		entity := dbmodels.UploadedAssetEntity{OwnerUserID: ownerUserID, Filename: filename, ContentType: asset.ContentType, ByteSize: int64(len(data)), Data: data}
		mergeAttachProvenance(&entity, decision.Provenance)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return fmt.Errorf("merge asset %s: %w", asset.Filename, err)
		}
		state.mapper.mapID("assets", asset.ID, entity.ID)
	}
	return nil
}

func (s ImportExportStore) importAssetFilename(ctx context.Context, tx *gorm.DB, ownerUserID, filename string) string {
	filename = strings.TrimSpace(filename)
	if filename == "" {
		filename = "imported-asset"
	}
	var count int64
	if err := tx.WithContext(ctx).Table("uploaded_assets").Where("owner_user_id = ? and lower(filename) = lower(?)", ownerUserID, filename).Count(&count).Error; err != nil || count == 0 {
		return filename
	}
	for index := 2; index < 1000; index++ {
		candidate := fmt.Sprintf("%s (Imported %d)", filename, index)
		count = 0
		if err := tx.WithContext(ctx).Table("uploaded_assets").Where("owner_user_id = ? and lower(filename) = lower(?)", ownerUserID, candidate).Count(&count).Error; err == nil && count == 0 {
			return candidate
		}
	}
	return filename + " (Imported)"
}

func requireMergeRemap(mapper cloneIDMapper, kind, oldID string) (string, error) {
	if mapped, err := mapper.requireRemap(kind, oldID); err == nil {
		return mapped, nil
	}
	return "", errors.New("merge planner did not approve required " + kind + " dependency")
}
