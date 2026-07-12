package store

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"strings"

	dbmodels "bludm/backend/internal/db"
)

func (s ImportExportStore) planAssetDecisions(ctx context.Context, ownerUserID string, manifest PortableManifest, assets map[string][]byte, plan *MergePlan) error {
	existing, err := s.existingAssetsByHash(ctx, ownerUserID)
	if err != nil {
		return err
	}
	existingByFilename, err := s.existingAssetsByFilename(ctx, ownerUserID)
	if err != nil {
		return err
	}
	for _, asset := range manifest.Assets {
		hash := strings.TrimSpace(asset.SHA256)
		if hash == "" {
			if data, ok := assets[asset.Path]; ok {
				sum := sha256.Sum256(data)
				hash = hex.EncodeToString(sum[:])
			}
		}
		if hash != "" {
			if match, ok := existing[hash]; ok {
				plan.AssetMatches = append(plan.AssetMatches, MergeAssetMatch{ImportedID: asset.ID, ExistingID: match.ID, Filename: asset.Filename, SHA256: hash, MatchType: "sha256", Action: "reuse_asset_by_hash"})
				plan.addDecision(MergePlanDecision{ImportedID: asset.ID, ExistingID: match.ID, Kind: "asset", Label: asset.Filename, Action: "reuse_asset_by_hash", Code: "asset_hash_match", MatchedRule: "sha256", DependencyImpact: MergeDependencyImpact{Assets: 1}, Reasons: []string{"An existing asset has the same SHA-256 hash."}, Provenance: mergeDecisionProvenance(manifest, asset.ID)})
				continue
			}
		}
		if match, ok := existingByFilename[strings.ToLower(strings.TrimSpace(asset.Filename))]; ok && match.Fingerprint != hash {
			decision := MergePlanDecision{
				ImportedID:       asset.ID,
				ExistingID:       match.ID,
				Kind:             "asset",
				Label:            asset.Filename,
				Action:           "rename_imported",
				Severity:         "warning",
				Code:             "asset_filename_collision",
				MatchedRule:      "filename_different_hash",
				DependencyImpact: MergeDependencyImpact{Assets: 1},
				Reasons:          []string{"An existing asset uses this filename with different content. The imported asset would keep its bytes and receive a distinct name."},
				Provenance:       mergeDecisionProvenance(manifest, asset.ID),
			}
			plan.addDecision(decision)
			plan.addConflict(MergePlanConflict{Severity: "warning", Message: "Asset filename collision: " + asset.Filename, Code: "asset_filename_collision", ImportedID: asset.ID, EntityKind: "asset", SuggestedDefaultDecision: decision.Action})
			continue
		}
		plan.addDecision(MergePlanDecision{ImportedID: asset.ID, Kind: "asset", Label: asset.Filename, Action: "create", Code: "new_asset", MatchedRule: "no_hash_match", DependencyImpact: MergeDependencyImpact{Assets: 1}, Reasons: []string{"No existing asset matched this imported asset."}, Provenance: mergeDecisionProvenance(manifest, asset.ID)})
	}
	return nil
}

func (s ImportExportStore) planStandardReferenceDecisions(ctx context.Context, graph DependencyGraph, plan *MergePlan) error {
	for _, node := range graph.Nodes {
		if !node.Standard {
			continue
		}
		decision := MergePlanDecision{
			ImportedID:       strings.TrimPrefix(node.ID, node.Kind+":"),
			Kind:             node.Kind,
			Label:            node.Label,
			Action:           "keep_standard_reference",
			Code:             "standard_reference",
			MatchedRule:      "standard_reference",
			DependencyImpact: MergeDependencyImpact{StandardReferences: 1},
			Reasons:          []string{"Standard references are not imported; merge keeps the local standard-library reference."},
			Provenance:       mergeDecisionProvenanceForReference(node.ID),
		}
		if s.db != nil && node.Kind == "standard spell" {
			var count int64
			if err := s.db.WithContext(ctx).Table("standard_spells").Where("id = ?", strings.TrimPrefix(node.ID, "standardSpell:")).Count(&count).Error; err != nil {
				return err
			}
			if count == 0 {
				decision.Action = "block_missing_dependency"
				decision.Severity = "danger"
				decision.Code = "incompatible_standard_reference"
				decision.Reasons = []string{"The referenced standard spell is not available in this database."}
				plan.addConflict(MergePlanConflict{Severity: "danger", Message: "Missing standard reference: " + node.Label, Code: "incompatible_standard_reference", ImportedID: decision.ImportedID, EntityKind: node.Kind, SuggestedDefaultDecision: decision.Action})
			}
		}
		plan.addDecision(decision)
	}
	return nil
}

func (s ImportExportStore) existingAssetsByHash(ctx context.Context, ownerUserID string) (map[string]existingMergeRecord, error) {
	result := map[string]existingMergeRecord{}
	if s.db == nil {
		return result, nil
	}
	var entities []dbmodels.UploadedAssetEntity
	if err := s.db.WithContext(ctx).Where("owner_user_id = ?", ownerUserID).Find(&entities).Error; err != nil {
		return nil, err
	}
	for _, entity := range entities {
		sum := sha256.Sum256(entity.Data)
		result[hex.EncodeToString(sum[:])] = existingMergeRecord{ID: entity.ID}
	}
	return result, nil
}

func (s ImportExportStore) existingAssetsByFilename(ctx context.Context, ownerUserID string) (map[string]existingMergeRecord, error) {
	result := map[string]existingMergeRecord{}
	if s.db == nil {
		return result, nil
	}
	var entities []dbmodels.UploadedAssetEntity
	if err := s.db.WithContext(ctx).Where("owner_user_id = ?", ownerUserID).Find(&entities).Error; err != nil {
		return nil, err
	}
	for _, entity := range entities {
		sum := sha256.Sum256(entity.Data)
		result[strings.ToLower(strings.TrimSpace(entity.Filename))] = existingMergeRecord{ID: entity.ID, Fingerprint: hex.EncodeToString(sum[:])}
	}
	return result, nil
}
