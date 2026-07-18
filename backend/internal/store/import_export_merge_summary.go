package store

import (
	"sort"
	"strings"
)

func candidateConflict(candidate mergeCandidate, view DependencyGraphView, severity, code, message, decision string) MergePlanConflict {
	impact := candidateDependencyImpact(candidate, view)
	entityID := candidate.ProjectedNodeID
	entityKind := candidate.Kind
	for _, node := range view.Nodes {
		if node.ID == candidate.ProjectedNodeID {
			entityKind = node.Kind
			break
		}
	}
	return MergePlanConflict{
		Severity:                    severity,
		Message:                     titleWords(candidate.Kind) + ": " + candidate.Label + ". " + message,
		Code:                        code,
		ImportedID:                  candidate.ImportedID,
		EntityID:                    entityID,
		EntityKind:                  entityKind,
		AffectedInternalRecordCount: impact.InternalRecords,
		SuggestedDefaultDecision:    decision,
	}
}

func candidateDecision(candidate mergeCandidate, view DependencyGraphView, decision MergePlanDecision) MergePlanDecision {
	if decision.Confidence == "" {
		decision.Confidence = "high"
	}
	if decision.MatchedRule == "" {
		decision.MatchedRule = decision.Code
	}
	decision.ParentContext = candidate.CampaignID
	decision.DependencyImpact = candidateDependencyImpact(candidate, view)
	return decision
}

func candidateDependencyImpact(candidate mergeCandidate, view DependencyGraphView) MergeDependencyImpact {
	for _, node := range view.Nodes {
		if node.ID == candidate.ProjectedNodeID {
			return MergeDependencyImpact{
				Objects:         1,
				RequiredObjects: 1,
				InternalRecords: node.InternalRecords,
			}
		}
	}
	return MergeDependencyImpact{Objects: 1, RequiredObjects: 1}
}

func (plan *MergePlan) addDecision(decision MergePlanDecision) {
	if decision.Confidence == "" {
		decision.Confidence = "high"
	}
	if decision.MatchedRule == "" {
		decision.MatchedRule = decision.Code
	}
	plan.Decisions = append(plan.Decisions, decision)
	switch decision.Action {
	case "create":
		plan.Summary.Create++
		plan.PlannedCreates = append(plan.PlannedCreates, decision)
	case "merge_missing_fields":
		plan.Summary.Update++
		plan.PlannedReuses = append(plan.PlannedReuses, decision)
	case "reuse_existing", "reuse_asset_by_hash", "keep_standard_reference":
		plan.Summary.Reuse++
		plan.PlannedReuses = append(plan.PlannedReuses, decision)
	case "skip_exact_duplicate":
		plan.Summary.Skip++
		plan.PlannedSkips = append(plan.PlannedSkips, decision)
	case "rename_imported":
		plan.Summary.Rename++
		plan.PlannedRenames = append(plan.PlannedRenames, decision)
	case "block_destructive_replace", "block_missing_dependency":
		plan.Summary.Block++
		plan.BlockedReplaces = append(plan.BlockedReplaces, decision)
	default:
		if strings.HasPrefix(decision.Action, "block_") {
			plan.Summary.Block++
			plan.UnsupportedOperations = append(plan.UnsupportedOperations, decision)
		}
	}
}

func (plan *MergePlan) addConflict(conflict MergePlanConflict) {
	plan.Conflicts = append(plan.Conflicts, conflict)
}

func (plan *MergePlan) addBlocker(blocker MergePlanConflict) {
	plan.Blockers = append(plan.Blockers, blocker)
	plan.Conflicts = append(plan.Conflicts, blocker)
	plan.Summary.Block++
}

func (plan *MergePlan) sort() {
	sortMergeDecisions(plan.Decisions)
	sortMergeDecisions(plan.PlannedCreates)
	sortMergeDecisions(plan.PlannedSkips)
	sortMergeDecisions(plan.PlannedRenames)
	sortMergeDecisions(plan.PlannedReuses)
	sortMergeDecisions(plan.BlockedReplaces)
	sortMergeDecisions(plan.UnsupportedOperations)
	sort.Slice(plan.Conflicts, func(i, j int) bool {
		left := plan.Conflicts[i]
		right := plan.Conflicts[j]
		if left.Code != right.Code {
			return left.Code < right.Code
		}
		if left.Message != right.Message {
			return left.Message < right.Message
		}
		return left.ImportedID < right.ImportedID
	})
	sort.Slice(plan.EntityMatches, func(i, j int) bool {
		left := plan.EntityMatches[i]
		right := plan.EntityMatches[j]
		if left.Kind != right.Kind {
			return left.Kind < right.Kind
		}
		if left.Label != right.Label {
			return left.Label < right.Label
		}
		return left.ImportedID < right.ImportedID
	})
	sort.Slice(plan.AssetMatches, func(i, j int) bool {
		left := plan.AssetMatches[i]
		right := plan.AssetMatches[j]
		if left.Filename != right.Filename {
			return left.Filename < right.Filename
		}
		return left.ImportedID < right.ImportedID
	})
}

func sortMergeDecisions(decisions []MergePlanDecision) {
	sort.Slice(decisions, func(i, j int) bool {
		left := decisions[i]
		right := decisions[j]
		if left.Kind != right.Kind {
			return left.Kind < right.Kind
		}
		if left.Label != right.Label {
			return left.Label < right.Label
		}
		if left.ImportedID != right.ImportedID {
			return left.ImportedID < right.ImportedID
		}
		return left.Action < right.Action
	})
}

func mergePolicyMatrix() []MergePolicy {
	return []MergePolicy{
		{Kind: "campaign", Create: true, ReuseExisting: true, SkipExactDuplicate: true, RenameImported: true, FieldLevelMerge: true, Provenance: true},
		{Kind: "player", Create: true, ReuseExisting: true, SkipExactDuplicate: true, RenameImported: true, FieldLevelMerge: true, Provenance: true},
		{Kind: "npc", Create: true, ReuseExisting: true, SkipExactDuplicate: true, RenameImported: true, FieldLevelMerge: true, Provenance: true},
		{Kind: "item", Create: true, ReuseExisting: true, SkipExactDuplicate: true, RenameImported: true, FieldLevelMerge: true, Provenance: true},
		{Kind: "spell", Create: true, ReuseExisting: true, SkipExactDuplicate: true, RenameImported: true, FieldLevelMerge: true, Provenance: true},
		{Kind: "shop", Create: true, ReuseExisting: true, SkipExactDuplicate: true, RenameImported: true, FieldLevelMerge: true, Provenance: true},
		{Kind: "dungeon", Create: true, ReuseExisting: true, SkipExactDuplicate: true, RenameImported: true, FieldLevelMerge: true, Provenance: true},
		{Kind: "location", Create: true, ReuseExisting: true, SkipExactDuplicate: true, RenameImported: true, FieldLevelMerge: true, Provenance: true},
		{Kind: "map", Create: true, ReuseExisting: true, SkipExactDuplicate: true, RenameImported: true, FieldLevelMerge: true, Provenance: true},
		{Kind: "encounter", Create: true, ReuseExisting: true, SkipExactDuplicate: true, RenameImported: true, FieldLevelMerge: true, Provenance: true},
		{Kind: "journey", Create: true, ReuseExisting: true, SkipExactDuplicate: true, RenameImported: true, FieldLevelMerge: true, Provenance: true},
		{Kind: "roll table", Create: true, ReuseExisting: true, SkipExactDuplicate: true, RenameImported: true, FieldLevelMerge: true, Provenance: true},
		{Kind: "asset", Create: true, ReuseExisting: true, SkipExactDuplicate: true, RenameImported: true, Provenance: true},
		{Kind: "standard reference", Create: true, ReuseExisting: true, SkipExactDuplicate: true, RenameImported: true},
	}
}
