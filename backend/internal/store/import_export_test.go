package store

import (
	"slices"
	"strings"
	"testing"

	dbmodels "bludm/backend/internal/db"
)

func TestValidatePortableManifestRejectsDuplicateObjectIDs(t *testing.T) {
	manifest := PortableManifest{
		Format:     ImportExportFormat,
		Version:    ImportExportVersion,
		BundleType: "npc",
		NPCs: []dbmodels.CreatureEntity{
			{ID: "creature-1", Name: "Mirror Knight"},
			{ID: "creature-1", Name: "Mirror Knight Copy"},
		},
	}

	if err := ValidatePortableManifest(manifest); err == nil {
		t.Fatal("expected duplicate object IDs to be rejected")
	}
}

func TestBuildDependencyGraphSummarizesRelationships(t *testing.T) {
	assetID := "asset-1"
	standardSpellID := "standard-spell-1"
	manifest := PortableManifest{
		Format:     ImportExportFormat,
		Version:    ImportExportVersion,
		BundleType: "campaign",
		Campaigns:  []dbmodels.CampaignEntity{{ID: "campaign-1", Name: "Ash Coast"}},
		Players: []dbmodels.PlayerEntity{
			{ID: "player-1", CampaignID: stringPointer("campaign-1"), CharacterName: "Mira"},
		},
		NPCs: []dbmodels.CreatureEntity{
			{ID: "npc-1", Name: "Glass Witch", ImageAssetID: &assetID},
		},
		CreatureLinks: []dbmodels.CampaignCreatureEntity{
			{CampaignID: "campaign-1", CreatureID: "npc-1"},
		},
		CreatureSpells: []dbmodels.CreatureSpellEntity{
			{ID: "creature-spell-1", CreatureID: "npc-1", LibrarySource: "standard", StandardSpellID: &standardSpellID},
		},
		Assets: []ExportAsset{{ID: assetID, Filename: "witch.png", ContentType: "image/png"}},
	}

	graph := BuildDependencyGraph(manifest)

	if graph.Counts.Assets != 1 || graph.Counts.StandardReferences != 1 {
		t.Fatalf("expected asset and standard reference counts, got %+v", graph.Counts)
	}
	if !slices.Contains(graph.Roots, "campaign:campaign-1") {
		t.Fatalf("expected campaign root, got %+v", graph.Roots)
	}
	if len(graph.Audit.Errors) != 0 {
		t.Fatalf("expected clean audit, got %+v", graph.Audit.Errors)
	}
	if !slices.Contains(graph.Order, "player:player-1") {
		t.Fatalf("expected traversal order to include player dependency, got %+v", graph.Order)
	}
	if len(graph.ReverseEdges) == 0 {
		t.Fatal("expected reverse dependency edges")
	}
	if graph.Projection.Counts.Objects == 0 {
		t.Fatal("expected user-facing projection")
	}
}

func TestDependencyGraphProjectionHidesInternalRecords(t *testing.T) {
	manifest := PortableManifest{
		Format:     ImportExportFormat,
		Version:    ImportExportVersion,
		BundleType: "campaign",
		Campaigns:  []dbmodels.CampaignEntity{{ID: "campaign-1", Name: "Ash Coast"}},
		Encounters: []dbmodels.EncounterEntity{{ID: "encounter-1", CampaignID: "campaign-1", Name: "Bridge Fight"}},
		Combatants: []dbmodels.EncounterCombatantEntity{{
			ID:          "combatant-1",
			EncounterID: "encounter-1",
			DisplayName: "Bandit",
		}},
		Locations: []dbmodels.CampaignLocationEntity{{
			ID:           "shop-1",
			CampaignID:   "campaign-1",
			Name:         "Moth & Mortar",
			LocationType: "shop",
		}, {
			ID:           "dungeon-1",
			CampaignID:   "campaign-1",
			Name:         "Wave Echo Cave",
			LocationType: "dungeon",
		}, {
			ID:               "room-1",
			CampaignID:       "campaign-1",
			ParentLocationID: stringPointer("dungeon-1"),
			Name:             "Collapsed Hall",
			LocationType:     "room",
		}},
		LocationStock: []dbmodels.CampaignLocationStockEntity{{
			ID:            "stock-1",
			CampaignID:    "campaign-1",
			LocationID:    "shop-1",
			ItemID:        "item-1",
			LibrarySource: "user",
		}},
		Items: []dbmodels.ItemEntity{{ID: "item-1", Name: "Healing Potion"}},
	}

	graph := BuildDependencyGraph(manifest)

	if !slices.ContainsFunc(graph.Nodes, func(node DependencyGraphNode) bool {
		return node.Kind == "combatant" || node.Kind == "location stock"
	}) {
		t.Fatal("expected raw graph to retain internal records")
	}
	if slices.ContainsFunc(graph.Projection.Nodes, func(node DependencyGraphViewNode) bool {
		return node.Kind == "combatant" || node.Kind == "location stock" || node.Kind == "dungeon area"
	}) {
		t.Fatalf("expected projection to hide internal records, got %+v", graph.Projection.Nodes)
	}
	if !slices.ContainsFunc(graph.Projection.Nodes, func(node DependencyGraphViewNode) bool {
		return node.Kind == "shop" && node.InternalRecords > 0
	}) {
		t.Fatalf("expected shop projection with grouped internal records, got %+v", graph.Projection.Nodes)
	}
	if !slices.ContainsFunc(graph.Projection.Nodes, func(node DependencyGraphViewNode) bool {
		return node.Kind == "dungeon" && node.InternalRecords > 0
	}) {
		t.Fatalf("expected dungeon projection with grouped rooms, got %+v", graph.Projection.Nodes)
	}
	for _, node := range graph.Projection.Nodes {
		if strings.Contains(node.ID, "campaign-1") || strings.Contains(node.ID, "shop-1") {
			t.Fatalf("expected projection IDs to avoid raw IDs, got %q", node.ID)
		}
	}
}

func TestShopAndDungeonBundlesUseLocationRootsWithCampaignContext(t *testing.T) {
	manifest := PortableManifest{
		Format:     ImportExportFormat,
		Version:    ImportExportVersion,
		BundleType: "shop",
		Campaigns:  []dbmodels.CampaignEntity{{ID: "campaign-1", Name: "Ash Coast"}},
		Locations: []dbmodels.CampaignLocationEntity{{
			ID:           "shop-1",
			CampaignID:   "campaign-1",
			Name:         "Moth & Mortar",
			LocationType: "shop",
		}},
	}

	graph := BuildDependencyGraph(manifest)

	if !slices.Contains(graph.Roots, "campaign:campaign-1") || !slices.Contains(graph.Roots, "location:shop-1") {
		t.Fatalf("expected shop and parent campaign roots, got %+v", graph.Roots)
	}
	if !slices.ContainsFunc(graph.Projection.Nodes, func(node DependencyGraphViewNode) bool {
		return node.Kind == "shop" && node.Root
	}) {
		t.Fatalf("expected projected shop root, got %+v", graph.Projection.Nodes)
	}

	manifest.BundleType = "dungeon"
	manifest.Locations[0].ID = "dungeon-1"
	manifest.Locations[0].Name = "Wave Echo Cave"
	manifest.Locations[0].LocationType = "dungeon"
	graph = BuildDependencyGraph(manifest)
	if !slices.Contains(graph.Roots, "campaign:campaign-1") || !slices.Contains(graph.Roots, "location:dungeon-1") {
		t.Fatalf("expected dungeon and parent campaign roots, got %+v", graph.Roots)
	}
	if !slices.ContainsFunc(graph.Projection.Nodes, func(node DependencyGraphViewNode) bool {
		return node.Kind == "dungeon" && node.Root
	}) {
		t.Fatalf("expected projected dungeon root, got %+v", graph.Projection.Nodes)
	}
}

func TestJourneyAndRollTableBundlesUseObjectRootsWithCampaignContext(t *testing.T) {
	campaignID := "campaign-1"
	manifest := PortableManifest{
		Format:     ImportExportFormat,
		Version:    ImportExportVersion,
		BundleType: "journey",
		Campaigns:  []dbmodels.CampaignEntity{{ID: campaignID, Name: "Ash Coast"}},
		Journeys: []dbmodels.CampaignJourneyEntity{{
			ID:          "journey-1",
			CampaignID:  campaignID,
			Name:        "Road to Ash Bridge",
			Origin:      "Black Spire",
			Destination: "Ash Bridge",
		}},
	}

	graph := BuildDependencyGraph(manifest)

	if !slices.Contains(graph.Roots, "campaign:campaign-1") || !slices.Contains(graph.Roots, "journey:journey-1") {
		t.Fatalf("expected journey and parent campaign roots, got %+v", graph.Roots)
	}
	if !slices.ContainsFunc(graph.Projection.Nodes, func(node DependencyGraphViewNode) bool {
		return node.Kind == "journey" && node.Root
	}) {
		t.Fatalf("expected projected journey root, got %+v", graph.Projection.Nodes)
	}

	manifest.BundleType = "roll-table"
	manifest.Journeys = nil
	manifest.RollTables = []dbmodels.RollTableEntity{{
		ID:            "table-1",
		CampaignID:    stringPointer(campaignID),
		Source:        "campaign",
		Name:          "Road Complications",
		DieExpression: "1d6",
	}}
	manifest.RollTableRows = []dbmodels.RollTableRowEntity{{
		ID:         "row-1",
		TableID:    "table-1",
		MinRoll:    1,
		MaxRoll:    1,
		Label:      "Broken bridge",
		ResultText: "The bridge is out.",
	}}
	graph = BuildDependencyGraph(manifest)
	if !slices.Contains(graph.Roots, "campaign:campaign-1") || !slices.Contains(graph.Roots, "rollTable:table-1") {
		t.Fatalf("expected roll table and parent campaign roots, got %+v", graph.Roots)
	}
	if !slices.ContainsFunc(graph.Projection.Nodes, func(node DependencyGraphViewNode) bool {
		return node.Kind == "roll table" && node.Root && node.InternalRecords == 1
	}) {
		t.Fatalf("expected projected roll table root with grouped row, got %+v", graph.Projection.Nodes)
	}
}

func TestAuditDependencyGraphReportsMissingRequiredDependencies(t *testing.T) {
	manifest := PortableManifest{
		Format:     ImportExportFormat,
		Version:    ImportExportVersion,
		BundleType: "encounter",
		Encounters: []dbmodels.EncounterEntity{
			{ID: "encounter-1", CampaignID: "campaign-1", Name: "Broken Bridge"},
		},
	}

	graph := BuildDependencyGraph(manifest)

	if graph.Audit.MissingRequired == 0 {
		t.Fatal("expected missing required dependency")
	}
	if graph.Counts.Missing == 0 {
		t.Fatal("expected missing node count")
	}
}

func TestManifestFromExportPlanUsesGraphReachability(t *testing.T) {
	candidate := PortableManifest{
		Format:     ImportExportFormat,
		Version:    ImportExportVersion,
		BundleType: "campaign",
		Campaigns: []dbmodels.CampaignEntity{
			{ID: "campaign-1", Name: "Included"},
			{ID: "campaign-2", Name: "Unreachable"},
		},
		Players: []dbmodels.PlayerEntity{
			{ID: "player-1", CampaignID: stringPointer("campaign-1"), CharacterName: "Included"},
			{ID: "player-2", CampaignID: stringPointer("campaign-2"), CharacterName: "Unreachable"},
		},
	}
	graph := DependencyGraph{
		Roots: []string{"campaign:campaign-1"},
		Order: []string{"campaign:campaign-1", "player:player-1"},
		Nodes: []DependencyGraphNode{
			{ID: "campaign:campaign-1", Kind: "campaign", Label: "Included"},
			{ID: "player:player-1", Kind: "player", Label: "Included"},
		},
	}

	manifest, _, stats := ManifestFromExportPlan(ExportPlan{
		BundleType:        "campaign",
		Graph:             graph,
		CandidateManifest: candidate,
		Stats:             ExportPlanStats{Source: "live-database", BundleType: "campaign"},
	})

	if len(manifest.Campaigns) != 1 || manifest.Campaigns[0].ID != "campaign-1" {
		t.Fatalf("expected graph-filtered campaigns, got %+v", manifest.Campaigns)
	}
	if len(manifest.Players) != 1 || manifest.Players[0].ID != "player-1" {
		t.Fatalf("expected graph-filtered players, got %+v", manifest.Players)
	}
	if stats.Source != "live-database" {
		t.Fatalf("expected plan stats to survive manifest generation, got %+v", stats)
	}
}

func TestGraphTraversalOrderIsDeterministic(t *testing.T) {
	graph := DependencyGraph{
		Roots: []string{"root:b", "root:a"},
		Edges: []DependencyGraphEdge{
			{From: "root:a", To: "child:c", Relation: "contains", Required: true},
			{From: "root:a", To: "child:b", Relation: "contains", Required: true},
		},
	}

	order := graphTraversalOrder(graph.Roots, graph.Edges)

	want := []string{"root:a", "child:b", "child:c", "root:b"}
	if !slices.Equal(order, want) {
		t.Fatalf("expected deterministic order %+v, got %+v", want, order)
	}
}

func TestValidatePortableManifestAllowsExpandedBundleTypes(t *testing.T) {
	for _, bundleType := range []string{"npc", "player", "item", "spell", "encounter", "map", "shop", "dungeon", "journey", "roll-table"} {
		manifest := PortableManifest{
			Format:     ImportExportFormat,
			Version:    ImportExportVersion,
			BundleType: bundleType,
		}
		if err := ValidatePortableManifest(manifest); err != nil {
			t.Fatalf("expected %s bundle to validate: %v", bundleType, err)
		}
	}
}

func TestVerifyArchiveReportsAssetHashMismatch(t *testing.T) {
	manifest := PortableManifest{
		Format:     ImportExportFormat,
		Version:    ImportExportVersion,
		BundleType: "npc",
		Assets: []ExportAsset{{
			ID:          "asset-1",
			Filename:    "portrait.png",
			ContentType: "image/png",
			ByteSize:    4,
			Path:        "assets/portrait.png",
			SHA256:      "0000000000000000000000000000000000000000000000000000000000000000",
		}},
	}

	verification := VerifyArchive(manifest, map[string][]byte{
		"assets/portrait.png": []byte("data"),
	})

	if verification.AssetsVerified {
		t.Fatalf("expected asset verification failure, got %+v", verification)
	}
	if !slices.ContainsFunc(verification.Messages, func(message string) bool {
		return strings.Contains(message, "hash does not match")
	}) {
		t.Fatalf("expected hash mismatch message, got %+v", verification.Messages)
	}
}

func TestPlanMergeBuildsExecutableDryRunPlan(t *testing.T) {
	manifest := PortableManifest{
		Format:     ImportExportFormat,
		Version:    ImportExportVersion,
		BundleType: "campaign",
		Campaigns:  []dbmodels.CampaignEntity{{ID: "campaign-1", Name: "Ash Coast"}},
	}
	plan, err := (ImportExportStore{}).PlanMerge(t.Context(), MergePlanInput{
		OwnerUserID: "user-1",
		Manifest:    manifest,
		Assets:      map[string][]byte{},
	})
	if err != nil {
		t.Fatalf("expected merge dry-run plan to validate: %v", err)
	}
	if !plan.Ready {
		t.Fatalf("expected merge plan to be executable, got %+v", plan)
	}
	if plan.Summary.Create != 1 || len(plan.PlannedCreates) != 1 {
		t.Fatalf("expected merge dry-run to plan one create, got %+v", plan)
	}
	if plan.Graph.Counts.Objects == 0 {
		t.Fatalf("expected merge plan to include graph context, got %+v", plan.Graph)
	}
}
