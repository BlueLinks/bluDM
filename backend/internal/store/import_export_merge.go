package store

import (
	"context"
	"fmt"
)

func (s ImportExportStore) PlanMerge(ctx context.Context, input MergePlanInput) (MergePlan, error) {
	if err := ValidatePortableManifest(input.Manifest); err != nil {
		return MergePlan{}, err
	}
	graph := BuildDependencyGraph(input.Manifest)
	verification := VerifyArchive(input.Manifest, input.Assets)
	plan := MergePlan{
		Mode:     "merge",
		Ready:    false,
		Graph:    graph,
		Policies: mergePolicyMatrix(),
		DependencyImpact: MergeDependencyImpact{
			Objects:            graph.Counts.Objects,
			RequiredObjects:    graph.Counts.RequiredObjects,
			OptionalObjects:    graph.Counts.OptionalObjects,
			InternalRecords:    graph.Projection.Counts.InternalRecords,
			Assets:             graph.Counts.Assets,
			StandardReferences: graph.Counts.StandardReferences,
			MissingRequired:    graph.Audit.MissingRequired,
		},
	}
	plan.Summary.Assets = len(input.Manifest.Assets)
	plan.Summary.StandardReferences = graph.Counts.StandardReferences

	if !verification.ArchiveValid {
		for _, message := range verification.Messages {
			plan.addBlocker(MergePlanConflict{
				Severity:                 "danger",
				Message:                  message,
				Code:                     "archive_validation_failed",
				SuggestedDefaultDecision: "block_unsupported_shape",
			})
		}
	}
	if graph.Audit.MissingRequired > 0 {
		plan.addBlocker(MergePlanConflict{
			Severity:                 "danger",
			Message:                  "The archive dependency graph is missing required records.",
			Code:                     "missing_required_dependency",
			AffectedDependencies:     graph.Audit.MissingRequired,
			SuggestedDefaultDecision: "block_missing_dependency",
		})
	}
	if input.Manifest.Version != ImportExportVersion {
		plan.addBlocker(MergePlanConflict{
			Severity:                 "danger",
			Message:                  fmt.Sprintf("Merge preview only supports archive version %d.", ImportExportVersion),
			Code:                     "unsupported_archive_version",
			SuggestedDefaultDecision: "block_unsupported_shape",
		})
	}
	if len(input.Manifest.ActionTemplates) > 0 {
		plan.addBlocker(MergePlanConflict{
			Severity:                    "danger",
			Message:                     "This archive includes standalone action templates. Merge execution does not support planner-approved action template writes yet.",
			Code:                        "unsupported_action_templates",
			AffectedInternalRecordCount: len(input.Manifest.ActionTemplates),
			SuggestedDefaultDecision:    "block_unsupported_shape",
		})
	}

	candidates := mergeCandidates(input.Manifest, input.TargetCampaignID)
	projected := projectedNodesByRawID(input.Manifest, graph.Projection)
	for index := range candidates {
		if node, ok := projected[candidates[index].ProjectedNodeID]; ok {
			candidates[index].ProjectedNodeID = node.ID
		}
	}

	existing, err := s.existingMergeRecords(ctx, input.OwnerUserID, candidates)
	if err != nil {
		return MergePlan{}, err
	}
	plan.planEntityDecisions(ctx, s, input.Manifest, candidates, existing, graph.Projection)
	if err := s.planAssetDecisions(ctx, input.OwnerUserID, input.Manifest, input.Assets, &plan); err != nil {
		return MergePlan{}, err
	}
	if err := s.planStandardReferenceDecisions(ctx, graph, &plan); err != nil {
		return MergePlan{}, err
	}
	plan.sort()
	plan.Summary.Conflicts = len(plan.Conflicts)
	plan.Summary.Warnings = len(plan.Warnings)
	plan.Summary.UnsupportedOperations = len(plan.UnsupportedOperations)
	plan.Ready = len(plan.Blockers) == 0 && plan.Summary.Block == 0
	return plan, nil
}

func (plan *MergePlan) planEntityDecisions(ctx context.Context, store ImportExportStore, manifest PortableManifest, candidates []mergeCandidate, existing map[string][]existingMergeRecord, view DependencyGraphView) {
	framework := newMergeEntityFramework()
	for _, candidate := range candidates {
		key := mergeExistingKey(candidate)
		records := existing[key]
		var idMatch *existingMergeRecord
		var nameMatches []existingMergeRecord
		for index := range records {
			record := records[index]
			if record.ID == candidate.ImportedID {
				idMatch = &records[index]
				break
			}
			nameMatches = append(nameMatches, record)
		}
		if idMatch != nil {
			exact := idMatch.Fingerprint == candidate.Fingerprint
			fieldDiffs := []MergeFieldDiff{}
			if framework.supportsFieldMerge(candidate.Kind) {
				if existingEntity, err := store.loadMergeExistingEntity(ctx, candidate.Kind, idMatch.ID); err == nil {
					fieldDiffs = framework.fieldDiffs(candidate.Kind, existingEntity, candidate.Payload)
				}
			}
			match := MergeEntityMatch{
				ImportedID: candidate.ImportedID,
				ExistingID: idMatch.ID,
				Kind:       candidate.Kind,
				Label:      candidate.Label,
				MatchType:  "stable_id",
				Exact:      exact,
			}
			plan.EntityMatches = append(plan.EntityMatches, match)
			if exact {
				if candidateDependencyImpact(candidate, view).InternalRecords > 0 {
					decision := unsupportedChildCollectionDecision(candidate, view, manifest)
					plan.addDecision(decision)
					plan.addConflict(candidateConflict(candidate, view, "danger", decision.Code, "Merge does not reconcile child collections into existing objects yet.", decision.Action))
					continue
				}
				plan.addDecision(candidateDecision(candidate, view, MergePlanDecision{
					ImportedID:  candidate.ImportedID,
					ExistingID:  idMatch.ID,
					Kind:        candidate.Kind,
					Label:       candidate.Label,
					Action:      "skip_exact_duplicate",
					Code:        "exact_duplicate",
					MatchedRule: "stable_id_and_fingerprint",
					Reasons:     []string{"An existing object with the same ID and content already exists."},
					FieldDiffs:  fieldDiffs,
					Provenance:  mergeDecisionProvenance(manifest, candidate.ImportedID),
				}))
				continue
			}
			if len(fieldDiffs) > 0 && mergeOnlyAddedFields(fieldDiffs) && framework.supportsFieldMerge(candidate.Kind) && candidateDependencyImpact(candidate, view).InternalRecords == 0 {
				decision := candidateDecision(candidate, view, MergePlanDecision{
					ImportedID:  candidate.ImportedID,
					ExistingID:  idMatch.ID,
					Kind:        candidate.Kind,
					Label:       candidate.Label,
					Action:      "merge_missing_fields",
					Code:        "field_level_merge",
					MatchedRule: "stable_id_and_missing_fields",
					Reasons:     []string{"The existing object is missing fields that are present in the imported object."},
					FieldDiffs:  fieldDiffs,
					Provenance:  mergeDecisionProvenance(manifest, candidate.ImportedID),
				})
				plan.addDecision(decision)
				continue
			}
			decision := candidateDecision(candidate, view, MergePlanDecision{
				ImportedID:  candidate.ImportedID,
				ExistingID:  idMatch.ID,
				Kind:        candidate.Kind,
				Label:       candidate.Label,
				Action:      "block_destructive_replace",
				Severity:    "danger",
				Code:        "identity_collision",
				MatchedRule: "stable_id",
				Reasons:     []string{"An existing object has the same ID but different content. Merge does not replace existing objects yet."},
				FieldDiffs:  fieldDiffs,
				Provenance:  mergeDecisionProvenance(manifest, candidate.ImportedID),
			})
			plan.addDecision(decision)
			plan.addConflict(candidateConflict(candidate, view, "danger", "identity_collision", "Existing object has the same ID but different content.", decision.Action))
			continue
		}
		if len(nameMatches) == 0 {
			plan.addDecision(candidateDecision(candidate, view, MergePlanDecision{
				ImportedID:  candidate.ImportedID,
				Kind:        candidate.Kind,
				Label:       candidate.Label,
				Action:      "create",
				Code:        "new_object",
				MatchedRule: "no_match",
				Reasons:     []string{"No existing object matched this imported object."},
				Provenance:  mergeDecisionProvenance(manifest, candidate.ImportedID),
			}))
			continue
		}
		firstMatch := nameMatches[0]
		exact := firstMatch.Fingerprint == candidate.Fingerprint
		plan.EntityMatches = append(plan.EntityMatches, MergeEntityMatch{
			ImportedID: candidate.ImportedID,
			ExistingID: firstMatch.ID,
			Kind:       candidate.Kind,
			Label:      candidate.Label,
			MatchType:  "name",
			Exact:      exact,
		})
		if exact && candidate.AllowNameReuse {
			if candidateDependencyImpact(candidate, view).InternalRecords > 0 {
				decision := unsupportedChildCollectionDecision(candidate, view, manifest)
				decision.ExistingID = firstMatch.ID
				plan.addDecision(decision)
				plan.addConflict(candidateConflict(candidate, view, "danger", decision.Code, "Merge does not reconcile child collections into existing objects yet.", decision.Action))
				continue
			}
			plan.addDecision(candidateDecision(candidate, view, MergePlanDecision{
				ImportedID:  candidate.ImportedID,
				ExistingID:  firstMatch.ID,
				Kind:        candidate.Kind,
				Label:       candidate.Label,
				Action:      "reuse_existing",
				Code:        "exact_duplicate",
				MatchedRule: "name_context_and_fingerprint",
				Reasons:     []string{"An existing object with the same name and content can be reused."},
				Provenance:  mergeDecisionProvenance(manifest, candidate.ImportedID),
			}))
			continue
		}
		action := "rename_imported"
		code := "name_collision"
		reason := "An existing object has this name. The imported object would be renamed instead of overwriting."
		if candidate.Kind == "player" {
			reason = "An existing player has this character name. Player data is never overwritten automatically."
		}
		decision := candidateDecision(candidate, view, MergePlanDecision{
			ImportedID:  candidate.ImportedID,
			ExistingID:  firstMatch.ID,
			Kind:        candidate.Kind,
			Label:       candidate.Label,
			Action:      action,
			Severity:    "warning",
			Code:        code,
			MatchedRule: "name_parent_context",
			Reasons:     []string{reason},
			Provenance:  mergeDecisionProvenance(manifest, candidate.ImportedID),
		})
		plan.addDecision(decision)
		plan.addConflict(candidateConflict(candidate, view, "warning", code, reason, action))
	}
}

func unsupportedChildCollectionDecision(candidate mergeCandidate, view DependencyGraphView, manifest PortableManifest) MergePlanDecision {
	return candidateDecision(candidate, view, MergePlanDecision{
		ImportedID:  candidate.ImportedID,
		ExistingID:  candidate.ImportedID,
		Kind:        candidate.Kind,
		Label:       candidate.Label,
		Action:      "block_child_collection_merge",
		Severity:    "danger",
		Code:        "unsupported_child_collection_merge",
		MatchedRule: "existing_object_with_internal_records",
		Reasons:     []string{"The existing object can be matched, but this archive also contains child records. Merge currently creates child records only when creating a new parent object."},
		Provenance:  mergeDecisionProvenance(manifest, candidate.ImportedID),
	})
}

func mergeOnlyAddedFields(diffs []MergeFieldDiff) bool {
	hasAdded := false
	for _, diff := range diffs {
		if diff.Status == "same" {
			continue
		}
		if diff.Status != "added" {
			return false
		}
		hasAdded = true
	}
	return hasAdded
}
