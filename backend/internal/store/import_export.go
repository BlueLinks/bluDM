package store

import (
	"context"
	"time"

	dbmodels "bludm/backend/internal/db"

	"gorm.io/gorm"
)

const ImportExportFormat = "bludm.campaign-export"
const ImportExportVersion = 1

type ImportExportStore struct {
	db *gorm.DB
}

type ExportOptions struct {
	BundleType           string
	CampaignIDs          []string
	ObjectIDs            []string
	IncludeAssets        bool
	IncludeDungeonStudio bool
	IncludePlayers       bool
}

type ExportAsset struct {
	ID          string `json:"id"`
	Filename    string `json:"filename"`
	ContentType string `json:"contentType"`
	ByteSize    int64  `json:"byteSize"`
	SHA256      string `json:"sha256,omitempty"`
	Path        string `json:"path"`
}

type ExportAssetFile struct {
	Asset ExportAsset
	Data  []byte
}

type PortableManifest struct {
	Format           string    `json:"format"`
	Version          int       `json:"version"`
	ExportedAt       time.Time `json:"exportedAt"`
	SourceAppVersion string    `json:"sourceAppVersion"`
	BundleType       string    `json:"bundleType"`

	Campaigns []dbmodels.CampaignEntity `json:"campaigns"`

	Players []dbmodels.PlayerEntity `json:"players"`

	NPCs              []dbmodels.CreatureEntity                    `json:"npcs"`
	CreatureLinks     []dbmodels.CampaignCreatureEntity            `json:"creatureLinks"`
	CreatureActions   []dbmodels.CreatureActionEntity              `json:"creatureActions"`
	CreatureRollParts []dbmodels.CreatureActionRollPartEntity      `json:"creatureRollParts"`
	Spellcasting      []dbmodels.CreatureSpellcastingProfileEntity `json:"spellcasting"`
	CreatureSpells    []dbmodels.CreatureSpellEntity               `json:"creatureSpells"`
	Spells            []dbmodels.SpellEntity                       `json:"spells"`
	SpellScaling      []dbmodels.SpellProjectileScalingEntity      `json:"spellScaling"`
	SpellActions      []dbmodels.SpellActionEntity                 `json:"spellActions"`
	SpellRollParts    []dbmodels.SpellActionRollPartEntity         `json:"spellRollParts"`
	Items             []dbmodels.ItemEntity                        `json:"items"`
	ActionTemplates   []dbmodels.ActionTemplateEntity              `json:"actionTemplates"`
	ActionRollParts   []dbmodels.ActionTemplateRollPartEntity      `json:"actionRollParts"`
	Encounters        []dbmodels.EncounterEntity                   `json:"encounters"`
	Combatants        []dbmodels.EncounterCombatantEntity          `json:"combatants"`
	Runs              []dbmodels.EncounterRunEntity                `json:"runs"`
	RunCombatants     []dbmodels.EncounterRunCombatantEntity       `json:"runCombatants"`
	RunSpellSlots     []dbmodels.EncounterRunSpellSlotEntity       `json:"runSpellSlots"`
	RunEffects        []dbmodels.EncounterRunActiveEffectEntity    `json:"runEffects"`
	RunAlerts         []dbmodels.EncounterRunAlertEntity           `json:"runAlerts"`
	CombatLog         []dbmodels.CombatLogEventEntity              `json:"combatLog"`
	Locations         []dbmodels.CampaignLocationEntity            `json:"locations"`
	LocationLinks     []dbmodels.CampaignLocationLinkEntity        `json:"locationLinks"`
	NPCLocationLinks  []dbmodels.CampaignNpcLocationLinkEntity     `json:"npcLocationLinks"`
	LocationStock     []dbmodels.CampaignLocationStockEntity       `json:"locationStock"`
	Maps              []dbmodels.CampaignMapEntity                 `json:"maps"`
	MapPins           []dbmodels.CampaignMapPinEntity              `json:"mapPins"`
	Journeys          []dbmodels.CampaignJourneyEntity             `json:"journeys"`
	RollTables        []dbmodels.RollTableEntity                   `json:"rollTables"`
	RollTableRows     []dbmodels.RollTableRowEntity                `json:"rollTableRows"`
	Assets            []ExportAsset                                `json:"assets"`
	References        map[string]any                               `json:"references"`
	DependencyGraph   DependencyGraph                              `json:"dependencyGraph"`
	ExportStats       ExportPlanStats                              `json:"exportStats"`
}

type ExportPackage struct {
	Manifest PortableManifest
	Assets   []ExportAssetFile
	Stats    ExportPlanStats
}

type ImportPreview struct {
	BundleType       string               `json:"bundleType"`
	Version          int                  `json:"version"`
	ExportedAt       time.Time            `json:"exportedAt"`
	SourceAppVersion string               `json:"sourceAppVersion"`
	Counts           map[string]int       `json:"counts"`
	Summary          ImportPreviewSummary `json:"summary"`
	Verification     ArchiveVerification  `json:"verification"`
	RestoreReadiness RestoreReadiness     `json:"restoreReadiness"`
	Warnings         []string             `json:"warnings"`
	Unsupported      []string             `json:"unsupported"`
	Conflicts        []ImportConflict     `json:"conflicts"`
	EstimatedBytes   int64                `json:"estimatedBytes"`
	DependencyGraph  DependencyGraph      `json:"dependencyGraph"`
	MergePlan        *MergePlan           `json:"mergePlan,omitempty"`
	Manifest         *PortableManifest    `json:"-"`
}

type ImportPreviewSummary struct {
	Entities           []DependencyGraphViewNode  `json:"entities"`
	Groups             []DependencyGraphViewGroup `json:"groups"`
	InternalRecords    int                        `json:"internalRecords"`
	Assets             int                        `json:"assets"`
	StandardReferences int                        `json:"standardReferences"`
	RootObjects        int                        `json:"rootObjects"`
}

type ArchiveVerification struct {
	ArchiveValid         bool     `json:"archiveValid"`
	ManifestValid        bool     `json:"manifestValid"`
	GraphValid           bool     `json:"graphValid"`
	InternalRecordsValid bool     `json:"internalRecordsValid"`
	LogicalFilesValid    bool     `json:"logicalFilesValid"`
	AssetsVerified       bool     `json:"assetsVerified"`
	DependenciesComplete bool     `json:"dependenciesComplete"`
	StandardReferencesOK bool     `json:"standardReferencesOk"`
	UnsupportedFuture    bool     `json:"unsupportedFuture"`
	DuplicateEntities    bool     `json:"duplicateEntities"`
	OrphanedGraphNodes   int      `json:"orphanedGraphNodes"`
	MissingRequired      int      `json:"missingRequired"`
	UnexpectedCycles     int      `json:"unexpectedCycles"`
	Messages             []string `json:"messages"`
}

type RestoreReadiness struct {
	ArchiveValid         bool     `json:"archiveValid"`
	DatabaseSafe         bool     `json:"databaseSafe"`
	DependenciesComplete bool     `json:"dependenciesComplete"`
	AssetsVerified       bool     `json:"assetsVerified"`
	Ready                bool     `json:"ready"`
	Messages             []string `json:"messages"`
}

type ImportConflict struct {
	Kind       string   `json:"kind"`
	Name       string   `json:"name"`
	Severity   string   `json:"severity"`
	Default    string   `json:"default"`
	Options    []string `json:"options"`
	Blocking   bool     `json:"blocking"`
	ImportedID string   `json:"importedId,omitempty"`
	EntityID   string   `json:"entityId,omitempty"`
	EntityKind string   `json:"entityKind,omitempty"`
	Message    string   `json:"message,omitempty"`
	Impact     string   `json:"impact,omitempty"`
}

type CloneImportResult struct {
	CampaignIDs []string       `json:"campaignIds"`
	Counts      map[string]int `json:"counts"`
}

func (s ImportExportStore) Export(ctx context.Context, ownerUserID string, options ExportOptions) (ExportPackage, error) {
	plan, err := s.PlanExport(ctx, ownerUserID, options)
	if err != nil {
		return ExportPackage{}, err
	}
	manifest, assets, stats := ManifestFromExportPlan(plan)
	return ExportPackage{Manifest: manifest, Assets: assets, Stats: stats}, nil
}

func (s ImportExportStore) Preview(ctx context.Context, ownerUserID string, manifest PortableManifest, assets map[string][]byte, estimatedBytes int64) (ImportPreview, error) {
	if err := ValidatePortableManifest(manifest); err != nil {
		return ImportPreview{}, err
	}
	verification := VerifyArchive(manifest, assets)
	restoreReadiness, err := s.RestoreReadiness(ctx, ownerUserID, manifest, assets)
	if err != nil {
		return ImportPreview{}, err
	}
	preview := ImportPreview{
		BundleType:       manifest.BundleType,
		Version:          manifest.Version,
		ExportedAt:       manifest.ExportedAt,
		SourceAppVersion: manifest.SourceAppVersion,
		Counts:           manifestCounts(manifest),
		Verification:     verification,
		RestoreReadiness: restoreReadiness,
		Warnings:         []string{},
		Unsupported:      unsupportedForManifest(manifest),
		EstimatedBytes:   estimatedBytes,
		DependencyGraph:  BuildDependencyGraph(manifest),
	}
	preview.Summary = importPreviewSummary(preview.DependencyGraph.Projection)
	preview.Warnings = append(preview.Warnings, preview.DependencyGraph.Warnings...)
	preview.Conflicts = s.detectConflicts(ctx, ownerUserID, manifest)
	if len(manifest.Assets) == 0 {
		preview.Warnings = append(preview.Warnings, "No uploaded assets were included in this bundle.")
	}
	return preview, nil
}
