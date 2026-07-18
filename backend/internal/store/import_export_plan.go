package store

import (
	"context"
	"errors"
	"time"

	dbmodels "bludm/backend/internal/db"
)

type ExportPlan struct {
	BundleType        string
	Graph             DependencyGraph
	CandidateManifest PortableManifest
	Assets            []ExportAssetFile
	Stats             ExportPlanStats
}

type ExportPlanStats struct {
	Source                   string `json:"source"`
	BundleType               string `json:"bundleType"`
	NodeCount                int    `json:"nodeCount"`
	EdgeCount                int    `json:"edgeCount"`
	ReverseEdgeCount         int    `json:"reverseEdgeCount"`
	RootCount                int    `json:"rootCount"`
	WarningCount             int    `json:"warningCount"`
	GraphTraversalMillis     int64  `json:"graphTraversalMillis"`
	ManifestGenerationMillis int64  `json:"manifestGenerationMillis"`
	ZipGenerationMillis      int64  `json:"zipGenerationMillis,omitempty"`
}

func (s ImportExportStore) PlanExport(ctx context.Context, ownerUserID string, options ExportOptions) (ExportPlan, error) {
	candidate, err := s.buildExportCandidateManifest(ctx, ownerUserID, options)
	if err != nil {
		return ExportPlan{}, err
	}
	if err := s.exportLibraryChildren(ctx, &candidate); err != nil {
		return ExportPlan{}, err
	}
	assets, err := s.exportAssets(ctx, ownerUserID, options.IncludeAssets, candidate.BundleType, &candidate)
	if err != nil {
		return ExportPlan{}, err
	}
	graphStart := time.Now()
	graph := BuildDependencyGraph(candidate)
	stats := ExportPlanStats{
		Source:               "live-database",
		BundleType:           candidate.BundleType,
		NodeCount:            len(graph.Nodes),
		EdgeCount:            len(graph.Edges),
		ReverseEdgeCount:     len(graph.ReverseEdges),
		RootCount:            len(graph.Roots),
		WarningCount:         len(graph.Warnings),
		GraphTraversalMillis: time.Since(graphStart).Milliseconds(),
	}
	return ExportPlan{
		BundleType:        candidate.BundleType,
		Graph:             graph,
		CandidateManifest: candidate,
		Assets:            assets,
		Stats:             stats,
	}, nil
}

func ManifestFromExportPlan(plan ExportPlan) (PortableManifest, []ExportAssetFile, ExportPlanStats) {
	started := time.Now()
	manifest := plan.CandidateManifest
	included := graphNodeSet(plan.Graph)
	manifest.Campaigns = filterByGraph(manifest.Campaigns, included, func(entity dbmodels.CampaignEntity) string { return nodeID("campaign", entity.ID) })
	manifest.Players = filterByGraph(manifest.Players, included, func(entity dbmodels.PlayerEntity) string { return nodeID("player", entity.ID) })
	manifest.NPCs = filterByGraph(manifest.NPCs, included, func(entity dbmodels.CreatureEntity) string { return nodeID("npc", entity.ID) })
	manifest.CreatureLinks = filterByGraph(manifest.CreatureLinks, included, func(entity dbmodels.CampaignCreatureEntity) string {
		return nodeID("creatureLink", entity.CampaignID+":"+entity.CreatureID)
	})
	manifest.CreatureActions = filterByGraph(manifest.CreatureActions, included, func(entity dbmodels.CreatureActionEntity) string { return nodeID("creatureAction", entity.ID) })
	manifest.CreatureRollParts = filterByGraph(manifest.CreatureRollParts, included, func(entity dbmodels.CreatureActionRollPartEntity) string {
		return nodeID("creatureRollPart", entity.ID)
	})
	manifest.Spellcasting = filterByGraph(manifest.Spellcasting, included, func(entity dbmodels.CreatureSpellcastingProfileEntity) string {
		return nodeID("spellcasting", entity.CreatureID)
	})
	manifest.CreatureSpells = filterByGraph(manifest.CreatureSpells, included, func(entity dbmodels.CreatureSpellEntity) string { return nodeID("creatureSpell", entity.ID) })
	manifest.Spells = filterByGraph(manifest.Spells, included, func(entity dbmodels.SpellEntity) string { return nodeID("spell", entity.ID) })
	manifest.SpellScaling = filterByGraph(manifest.SpellScaling, included, func(entity dbmodels.SpellProjectileScalingEntity) string {
		return nodeID("spellScaling", entity.SpellID)
	})
	manifest.SpellActions = filterByGraph(manifest.SpellActions, included, func(entity dbmodels.SpellActionEntity) string { return nodeID("spellAction", entity.ID) })
	manifest.SpellRollParts = filterByGraph(manifest.SpellRollParts, included, func(entity dbmodels.SpellActionRollPartEntity) string { return nodeID("spellRollPart", entity.ID) })
	manifest.Items = filterByGraph(manifest.Items, included, func(entity dbmodels.ItemEntity) string { return nodeID("item", entity.ID) })
	manifest.ActionTemplates = filterByGraph(manifest.ActionTemplates, included, func(entity dbmodels.ActionTemplateEntity) string { return nodeID("actionTemplate", entity.ID) })
	manifest.ActionRollParts = filterByGraph(manifest.ActionRollParts, included, func(entity dbmodels.ActionTemplateRollPartEntity) string {
		return nodeID("actionRollPart", entity.ID)
	})
	manifest.Encounters = filterByGraph(manifest.Encounters, included, func(entity dbmodels.EncounterEntity) string { return nodeID("encounter", entity.ID) })
	manifest.Combatants = filterByGraph(manifest.Combatants, included, func(entity dbmodels.EncounterCombatantEntity) string { return nodeID("combatant", entity.ID) })
	manifest.Runs = filterByGraph(manifest.Runs, included, func(entity dbmodels.EncounterRunEntity) string { return nodeID("run", entity.ID) })
	manifest.RunCombatants = filterByGraph(manifest.RunCombatants, included, func(entity dbmodels.EncounterRunCombatantEntity) string { return nodeID("runCombatant", entity.ID) })
	manifest.RunSpellSlots = filterByGraph(manifest.RunSpellSlots, included, func(entity dbmodels.EncounterRunSpellSlotEntity) string { return nodeID("runSpellSlot", entity.ID) })
	manifest.RunEffects = filterByGraph(manifest.RunEffects, included, func(entity dbmodels.EncounterRunActiveEffectEntity) string { return nodeID("runEffect", entity.ID) })
	manifest.RunAlerts = filterByGraph(manifest.RunAlerts, included, func(entity dbmodels.EncounterRunAlertEntity) string { return nodeID("runAlert", entity.ID) })
	manifest.CombatLog = filterByGraph(manifest.CombatLog, included, func(entity dbmodels.CombatLogEventEntity) string { return nodeID("combatLog", entity.ID) })
	manifest.Locations = filterByGraph(manifest.Locations, included, func(entity dbmodels.CampaignLocationEntity) string { return nodeID("location", entity.ID) })
	manifest.LocationLinks = filterByGraph(manifest.LocationLinks, included, func(entity dbmodels.CampaignLocationLinkEntity) string { return nodeID("locationLink", entity.ID) })
	manifest.NPCLocationLinks = filterByGraph(manifest.NPCLocationLinks, included, func(entity dbmodels.CampaignNpcLocationLinkEntity) string {
		return nodeID("npcLocationLink", entity.ID)
	})
	manifest.LocationStock = filterByGraph(manifest.LocationStock, included, func(entity dbmodels.CampaignLocationStockEntity) string { return nodeID("locationStock", entity.ID) })
	manifest.Maps = filterByGraph(manifest.Maps, included, func(entity dbmodels.CampaignMapEntity) string { return nodeID("map", entity.ID) })
	manifest.MapPins = filterByGraph(manifest.MapPins, included, func(entity dbmodels.CampaignMapPinEntity) string { return nodeID("mapPin", entity.ID) })
	manifest.Journeys = filterByGraph(manifest.Journeys, included, func(entity dbmodels.CampaignJourneyEntity) string { return nodeID("journey", entity.ID) })
	manifest.RollTables = filterByGraph(manifest.RollTables, included, func(entity dbmodels.RollTableEntity) string { return nodeID("rollTable", entity.ID) })
	manifest.RollTableRows = filterByGraph(manifest.RollTableRows, included, func(entity dbmodels.RollTableRowEntity) string { return nodeID("rollTableRow", entity.ID) })
	manifest.Assets = filterByGraph(manifest.Assets, included, func(entity ExportAsset) string { return nodeID("asset", entity.ID) })
	assets := filterByGraph(plan.Assets, included, func(file ExportAssetFile) string { return nodeID("asset", file.Asset.ID) })
	manifest.DependencyGraph = plan.Graph
	stats := plan.Stats
	stats.ManifestGenerationMillis = time.Since(started).Milliseconds()
	manifest.ExportStats = stats
	return manifest, assets, stats
}

func (s ImportExportStore) buildExportCandidateManifest(ctx context.Context, ownerUserID string, options ExportOptions) (PortableManifest, error) {
	bundleType := normalizeBundleType(options.BundleType)
	if bundleType == "" {
		return PortableManifest{}, errors.New("unsupported bundle type")
	}
	manifest := newPortableManifest(bundleType)
	switch bundleType {
	case "everything", "campaign":
		if err := s.exportCampaignBundleCandidates(ctx, ownerUserID, options, &manifest); err != nil {
			return PortableManifest{}, err
		}
	case "npc":
		if err := s.exportNPCBundle(ctx, ownerUserID, options.ObjectIDs, &manifest); err != nil {
			return PortableManifest{}, err
		}
	case "player":
		if err := s.exportPlayerBundle(ctx, ownerUserID, options.ObjectIDs, &manifest); err != nil {
			return PortableManifest{}, err
		}
	case "item":
		if err := s.exportItemBundle(ctx, ownerUserID, options.ObjectIDs, &manifest); err != nil {
			return PortableManifest{}, err
		}
	case "spell":
		if err := s.exportSpellBundle(ctx, ownerUserID, options.ObjectIDs, &manifest); err != nil {
			return PortableManifest{}, err
		}
	case "encounter":
		if err := s.exportEncounterBundle(ctx, ownerUserID, options.ObjectIDs, &manifest); err != nil {
			return PortableManifest{}, err
		}
	case "map":
		if err := s.exportMapBundle(ctx, ownerUserID, options.ObjectIDs, &manifest); err != nil {
			return PortableManifest{}, err
		}
	case "shop":
		if err := s.exportLocationKindBundle(ctx, ownerUserID, options.ObjectIDs, "shop", &manifest); err != nil {
			return PortableManifest{}, err
		}
	case "dungeon":
		if err := s.exportLocationKindBundle(ctx, ownerUserID, options.ObjectIDs, "dungeon", &manifest); err != nil {
			return PortableManifest{}, err
		}
	case "journey":
		if err := s.exportJourneyBundle(ctx, ownerUserID, options.ObjectIDs, &manifest); err != nil {
			return PortableManifest{}, err
		}
	case "roll-table":
		if err := s.exportRollTableBundle(ctx, ownerUserID, options.ObjectIDs, &manifest); err != nil {
			return PortableManifest{}, err
		}
	case "custom":
		return PortableManifest{}, errors.New("custom bundle export is not supported yet")
	}
	return manifest, nil
}

func newPortableManifest(bundleType string) PortableManifest {
	return PortableManifest{
		Format:           ImportExportFormat,
		Version:          ImportExportVersion,
		ExportedAt:       time.Now().UTC(),
		SourceAppVersion: "local",
		BundleType:       bundleType,
		References: map[string]any{
			"standardSources": []string{},
			"standardEntries": []string{},
		},
	}
}

func (s ImportExportStore) exportCampaignBundleCandidates(ctx context.Context, ownerUserID string, options ExportOptions, manifest *PortableManifest) error {
	campaignIDs, err := s.exportCampaignIDs(ctx, ownerUserID, manifest.BundleType, options.CampaignIDs)
	if err != nil {
		return err
	}
	if len(campaignIDs) > 0 {
		if err := s.findWhere(ctx, &manifest.Campaigns, "id in ? and owner_user_id = ? and archived_at is null", campaignIDs, ownerUserID); err != nil {
			return err
		}
		if options.IncludePlayers || manifest.BundleType == "everything" || manifest.BundleType == "campaign" {
			if err := s.findWhere(ctx, &manifest.Players, "owner_user_id = ? and campaign_id in ?", ownerUserID, campaignIDs); err != nil {
				return err
			}
		}
		if err := s.exportCampaignOwned(ctx, ownerUserID, campaignIDs, manifest); err != nil {
			return err
		}
	}
	if manifest.BundleType == "everything" {
		if err := s.findWhere(ctx, &manifest.Players, "owner_user_id = ?", ownerUserID); err != nil {
			return err
		}
		if err := s.findWhere(ctx, &manifest.NPCs, "owner_user_id = ?", ownerUserID); err != nil {
			return err
		}
		if err := s.findWhere(ctx, &manifest.Spells, "owner_user_id = ?", ownerUserID); err != nil {
			return err
		}
		if err := s.findWhere(ctx, &manifest.Items, "owner_user_id = ?", ownerUserID); err != nil {
			return err
		}
		return s.findWhere(ctx, &manifest.ActionTemplates, "owner_user_id = ?", ownerUserID)
	}
	if len(campaignIDs) > 0 {
		return s.exportReferencedLibraries(ctx, ownerUserID, campaignIDs, manifest)
	}
	return nil
}

func graphNodeSet(graph DependencyGraph) map[string]bool {
	included := map[string]bool{}
	for _, id := range graph.Order {
		included[id] = true
	}
	for _, root := range graph.Roots {
		included[root] = true
	}
	if len(included) == 0 {
		for _, node := range graph.Nodes {
			included[node.ID] = true
		}
	}
	return included
}

func filterByGraph[T any](items []T, included map[string]bool, id func(T) string) []T {
	filtered := items[:0]
	for _, item := range items {
		if included[id(item)] {
			filtered = append(filtered, item)
		}
	}
	return filtered
}
