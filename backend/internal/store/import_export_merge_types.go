package store

import "time"

type MergePlanInput struct {
	OwnerUserID      string
	TargetCampaignID string
	Manifest         PortableManifest
	Assets           map[string][]byte
}

type MergePlan struct {
	Mode                  string                `json:"mode"`
	Ready                 bool                  `json:"ready"`
	Summary               MergePlanSummary      `json:"summary"`
	Decisions             []MergePlanDecision   `json:"decisions"`
	Blockers              []MergePlanConflict   `json:"blockers"`
	Warnings              []string              `json:"warnings"`
	Conflicts             []MergePlanConflict   `json:"conflicts"`
	EntityMatches         []MergeEntityMatch    `json:"entityMatches"`
	AssetMatches          []MergeAssetMatch     `json:"assetMatches"`
	DependencyImpact      MergeDependencyImpact `json:"dependencyImpact"`
	Policies              []MergePolicy         `json:"policies"`
	PlannedCreates        []MergePlanDecision   `json:"plannedCreates"`
	PlannedSkips          []MergePlanDecision   `json:"plannedSkips"`
	PlannedRenames        []MergePlanDecision   `json:"plannedRenames"`
	PlannedReuses         []MergePlanDecision   `json:"plannedReuses"`
	BlockedReplaces       []MergePlanDecision   `json:"blockedReplaces"`
	UnsupportedOperations []MergePlanDecision   `json:"unsupportedOperations"`
	Graph                 DependencyGraph       `json:"dependencyGraph"`
}

type MergePlanDecision struct {
	ImportedID       string                `json:"importedId"`
	ExistingID       string                `json:"existingId,omitempty"`
	Kind             string                `json:"kind"`
	Label            string                `json:"label"`
	Action           string                `json:"action"`
	Severity         string                `json:"severity,omitempty"`
	Code             string                `json:"code,omitempty"`
	Confidence       string                `json:"confidence"`
	MatchedRule      string                `json:"matchedRule"`
	ParentContext    string                `json:"parentContext,omitempty"`
	UserDecision     string                `json:"userDecision,omitempty"`
	FieldDiffs       []MergeFieldDiff      `json:"fieldDiffs,omitempty"`
	Provenance       *MergeProvenance      `json:"provenance,omitempty"`
	DependencyImpact MergeDependencyImpact `json:"dependencyImpact"`
	Reasons          []string              `json:"reasons"`
}

type MergeFieldDiff struct {
	Field          string `json:"field"`
	Existing       any    `json:"existing,omitempty"`
	Imported       any    `json:"imported,omitempty"`
	Status         string `json:"status"`
	Recommendation string `json:"recommendation"`
}

type MergeProvenance struct {
	ArchiveFingerprint string    `json:"archiveFingerprint"`
	ArchiveVersion     int       `json:"archiveVersion"`
	ImportedAt         time.Time `json:"importedAt"`
	ImportMode         string    `json:"importMode"`
	OriginalExportedID string    `json:"originalExportedId,omitempty"`
	MergeLineage       []string  `json:"mergeLineage,omitempty"`
	ImportBatchID      string    `json:"importBatchId"`
}

type MergePlanSummary struct {
	Create                int `json:"create"`
	Update                int `json:"update"`
	Skip                  int `json:"skip"`
	Rename                int `json:"rename"`
	Block                 int `json:"block"`
	Reuse                 int `json:"reuse"`
	Warnings              int `json:"warnings"`
	Conflicts             int `json:"conflicts"`
	Assets                int `json:"assets"`
	StandardReferences    int `json:"standardReferences"`
	UnsupportedOperations int `json:"unsupportedOperations"`
}

type MergePlanConflict struct {
	Severity                    string `json:"severity"`
	Message                     string `json:"message"`
	Code                        string `json:"code"`
	ImportedID                  string `json:"importedId,omitempty"`
	EntityID                    string `json:"entityId,omitempty"`
	EntityKind                  string `json:"entityKind,omitempty"`
	AffectedDependencies        int    `json:"affectedDependencies"`
	AffectedInternalRecordCount int    `json:"affectedInternalRecordCount"`
	SuggestedDefaultDecision    string `json:"suggestedDefaultDecision"`
}

type MergeEntityMatch struct {
	ImportedID string `json:"importedId"`
	ExistingID string `json:"existingId"`
	Kind       string `json:"kind"`
	Label      string `json:"label"`
	MatchType  string `json:"matchType"`
	Exact      bool   `json:"exact"`
}

type MergeAssetMatch struct {
	ImportedID string `json:"importedId"`
	ExistingID string `json:"existingId,omitempty"`
	Filename   string `json:"filename"`
	SHA256     string `json:"sha256,omitempty"`
	MatchType  string `json:"matchType"`
	Action     string `json:"action"`
}

type MergeDependencyImpact struct {
	Objects            int `json:"objects"`
	RequiredObjects    int `json:"requiredObjects"`
	OptionalObjects    int `json:"optionalObjects"`
	InternalRecords    int `json:"internalRecords"`
	Assets             int `json:"assets"`
	StandardReferences int `json:"standardReferences"`
	MissingRequired    int `json:"missingRequired"`
}

type MergePolicy struct {
	Kind                 string `json:"kind"`
	Create               bool   `json:"create"`
	ReuseExisting        bool   `json:"reuseExisting"`
	SkipExactDuplicate   bool   `json:"skipExactDuplicate"`
	RenameImported       bool   `json:"renameImported"`
	FieldLevelMerge      bool   `json:"fieldLevelMerge"`
	Provenance           bool   `json:"provenance"`
	ChildMerge           bool   `json:"childMerge"`
	ReplaceExisting      bool   `json:"replaceExisting"`
	MergeChildren        bool   `json:"mergeChildren"`
	DestructiveOverwrite bool   `json:"destructiveOverwrite"`
}

type mergeCandidate struct {
	Kind            string
	ImportedID      string
	Label           string
	CampaignID      string
	ProjectedNodeID string
	Fingerprint     string
	AllowNameReuse  bool
	Payload         any
}

type existingMergeRecord struct {
	ID          string
	Label       string
	CampaignID  string
	Fingerprint string
}
