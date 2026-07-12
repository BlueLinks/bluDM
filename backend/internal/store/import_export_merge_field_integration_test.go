package store

import (
	"context"
	"slices"
	"testing"

	dbmodels "bludm/backend/internal/db"
)

func TestMergeFrameworkPoliciesCoverExportableFieldMergeKinds(t *testing.T) {
	framework := newMergeEntityFramework()
	want := []string{"campaign", "encounter", "npc", "item", "spell", "player", "location", "shop", "dungeon", "map", "journey", "roll table"}
	for _, kind := range want {
		if !framework.supportsFieldMerge(kind) {
			t.Fatalf("expected %s to support field merge", kind)
		}
		if !slices.ContainsFunc(mergePolicyMatrix(), func(policy MergePolicy) bool {
			return policy.Kind == kind && policy.FieldLevelMerge && policy.Provenance && !policy.ChildMerge && !policy.DestructiveOverwrite
		}) {
			t.Fatalf("expected policy for %s to advertise field merge/provenance without executable child merge", kind)
		}
	}
}

func TestMergeImportMergesMissingItemFieldsAndRecordsProvenance(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()
	source, err := stores.Auth.CreateUser(ctx, uniqueEmail("merge-source-fields"), "hash")
	requireNoError(t, err)
	target, err := stores.Auth.CreateUser(ctx, uniqueEmail("merge-target-fields"), "hash")
	requireNoError(t, err)
	item := dbmodels.ItemEntity{
		OwnerUserID: source.ID,
		Name:        "Storm Glass",
		Category:    "wondrous",
		Rarity:      "rare",
		ValueAmount: 250,
		Description: "A glass charm that clouds before dangerous weather.",
		Properties:  []string{"requires attunement"},
		Data:        dbmodels.JSONMap{"origin": "Archive of Salt"},
		Damage:      dbmodels.JSONMap{},
		ArmorClass:  dbmodels.JSONMap{},
		ValueUnit:   "gp",
		ItemType:    "charm",
		Weight:      0.5,
		Attunement:  true,
	}
	requireNoError(t, stores.db.Create(&item).Error)
	pkg, err := stores.ImportExport.Export(ctx, source.ID, ExportOptions{BundleType: "item", ObjectIDs: []string{item.ID}})
	requireNoError(t, err)
	requireNoError(t, stores.db.Delete(&item).Error)

	existing := dbmodels.ItemEntity{
		ID:          item.ID,
		OwnerUserID: target.ID,
		Name:        item.Name,
		Category:    item.Category,
		ValueUnit:   "gp",
		Data:        dbmodels.JSONMap{},
		Damage:      dbmodels.JSONMap{},
		ArmorClass:  dbmodels.JSONMap{},
	}
	requireNoError(t, stores.db.Create(&existing).Error)

	_, plan, err := stores.ImportExport.MergeImport(ctx, target.ID, pkg.Manifest, assetDataByPath(pkg.Assets))
	requireNoError(t, err)

	if !plan.Ready || plan.Summary.Update != 1 {
		t.Fatalf("expected ready missing-field merge plan, got ready=%v summary=%+v", plan.Ready, plan.Summary)
	}
	if len(plan.Decisions) != 1 || plan.Decisions[0].Action != "merge_missing_fields" {
		t.Fatalf("expected merge_missing_fields decision, got %+v", plan.Decisions)
	}
	if len(plan.Decisions[0].FieldDiffs) == 0 {
		t.Fatalf("expected field diffs on merge decision, got %+v", plan.Decisions[0])
	}
	if plan.Decisions[0].Provenance == nil || plan.Decisions[0].Provenance.ImportMode != "merge" {
		t.Fatalf("expected merge provenance on decision, got %+v", plan.Decisions[0].Provenance)
	}

	var merged dbmodels.ItemEntity
	requireNoError(t, stores.db.First(&merged, "id = ? and owner_user_id = ?", item.ID, target.ID).Error)
	if merged.Rarity != item.Rarity || merged.ValueAmount != item.ValueAmount || merged.Description != item.Description || !merged.Attunement {
		t.Fatalf("expected missing scalar fields to merge, got %+v", merged)
	}
	if merged.Data["origin"] != "Archive of Salt" {
		t.Fatalf("expected missing JSON data to merge, got %+v", merged.Data)
	}
	if _, ok := merged.Data["mergeProvenance"]; !ok {
		t.Fatalf("expected provenance in merged item data, got %+v", merged.Data)
	}
	requireTableCountForWhere(t, stores.db, "items", "owner_user_id = ?", []any{target.ID}, 1)
}

func TestMergeImportMergesMissingCampaignScopedMetadataFields(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()
	owner, err := stores.Auth.CreateUser(ctx, uniqueEmail("merge-scoped-fields"), "hash")
	requireNoError(t, err)
	campaignID := "11111111-1111-4111-8111-111111111111"
	campaign := dbmodels.CampaignEntity{ID: campaignID, OwnerUserID: owner.ID, Name: "Ash Coast", Description: "Known coast"}
	requireNoError(t, stores.db.Create(&campaign).Error)

	cases := []struct {
		name       string
		manifest   func() PortableManifest
		seedSparse func()
		assert     func()
	}{
		{
			name: "encounter",
			manifest: func() PortableManifest {
				return mergeFieldTestManifest(campaign, "encounter", func(manifest *PortableManifest) {
					manifest.Encounters = []dbmodels.EncounterEntity{{
						ID:          "22222222-2222-4222-8222-222222222222",
						CampaignID:  campaignID,
						Name:        "Bridge Ambush",
						Description: "Bandits wait below the old stones.",
						Status:      "planned",
						Metadata:    dbmodels.JSONMap{"danger": "high"},
					}}
				})
			},
			seedSparse: func() {
				requireNoError(t, stores.db.Create(&dbmodels.EncounterEntity{
					ID:         "22222222-2222-4222-8222-222222222222",
					CampaignID: campaignID,
					Name:       "Bridge Ambush",
					Status:     "planned",
					Metadata:   dbmodels.JSONMap{},
				}).Error)
			},
			assert: func() {
				var merged dbmodels.EncounterEntity
				requireNoError(t, stores.db.First(&merged, "id = ?", "22222222-2222-4222-8222-222222222222").Error)
				if merged.Description == "" || merged.Metadata["danger"] != "high" || merged.Metadata["mergeProvenance"] == nil {
					t.Fatalf("expected encounter metadata merge with provenance, got %+v", merged)
				}
			},
		},
		{
			name: "shop",
			manifest: func() PortableManifest {
				return mergeFieldTestManifest(campaign, "shop", func(manifest *PortableManifest) {
					manifest.Locations = []dbmodels.CampaignLocationEntity{{
						ID:           "33333333-3333-4333-8333-333333333333",
						CampaignID:   campaignID,
						Name:         "Moth & Mortar",
						LocationType: "shop",
						Summary:      "A cramped apothecary with blue-glass shelves.",
						Status:       "active",
						MapAnchor:    dbmodels.JSONMap{"aisle": "east"},
					}}
				})
			},
			seedSparse: func() {
				requireNoError(t, stores.db.Create(&dbmodels.CampaignLocationEntity{
					ID:           "33333333-3333-4333-8333-333333333333",
					CampaignID:   campaignID,
					Name:         "Moth & Mortar",
					LocationType: "shop",
					Status:       "active",
					MapAnchor:    dbmodels.JSONMap{},
				}).Error)
			},
			assert: func() {
				var merged dbmodels.CampaignLocationEntity
				requireNoError(t, stores.db.First(&merged, "id = ?", "33333333-3333-4333-8333-333333333333").Error)
				if merged.Summary == "" || merged.MapAnchor["aisle"] != "east" || merged.MapAnchor["mergeProvenance"] == nil {
					t.Fatalf("expected shop metadata merge with provenance, got %+v", merged)
				}
			},
		},
		{
			name: "map",
			manifest: func() PortableManifest {
				return mergeFieldTestManifest(campaign, "map", func(manifest *PortableManifest) {
					manifest.Maps = []dbmodels.CampaignMapEntity{{
						ID:                    "44444444-4444-4444-8444-444444444444",
						CampaignID:            campaignID,
						Name:                  "Cave Map",
						Description:           "A rough charcoal plan of the lower tunnels.",
						MapType:               "custom",
						Mode:                  "blank",
						Width:                 1000,
						Height:                700,
						ScaleDistancePerPixel: 1,
						ScaleDistanceUnit:     "miles",
						Metadata:              dbmodels.JSONMap{"grid": "hex"},
					}}
				})
			},
			seedSparse: func() {
				requireNoError(t, stores.db.Create(&dbmodels.CampaignMapEntity{
					ID:                    "44444444-4444-4444-8444-444444444444",
					CampaignID:            campaignID,
					Name:                  "Cave Map",
					MapType:               "custom",
					Mode:                  "blank",
					Width:                 1000,
					Height:                700,
					ScaleDistancePerPixel: 1,
					ScaleDistanceUnit:     "miles",
					Metadata:              dbmodels.JSONMap{},
				}).Error)
			},
			assert: func() {
				var merged dbmodels.CampaignMapEntity
				requireNoError(t, stores.db.First(&merged, "id = ?", "44444444-4444-4444-8444-444444444444").Error)
				if merged.Description == "" || merged.Metadata["grid"] != "hex" || merged.Metadata["mergeProvenance"] == nil {
					t.Fatalf("expected map metadata merge with provenance, got %+v", merged)
				}
			},
		},
		{
			name: "journey",
			manifest: func() PortableManifest {
				return mergeFieldTestManifest(campaign, "journey", func(manifest *PortableManifest) {
					manifest.Journeys = []dbmodels.CampaignJourneyEntity{{
						ID:                    "55555555-5555-4555-8555-555555555555",
						CampaignID:            campaignID,
						Name:                  "Road to Ash Bridge",
						Origin:                "Black Spire",
						Destination:           "Ash Bridge",
						DistanceUnit:          "miles",
						Terrain:               "forest",
						Pace:                  "normal",
						Weather:               dbmodels.JSONMap{"rain": "silver"},
						RouteInputMode:        "route",
						EncounterDistanceFeet: nil,
					}}
				})
			},
			seedSparse: func() {
				requireNoError(t, stores.db.Create(&dbmodels.CampaignJourneyEntity{
					ID:             "55555555-5555-4555-8555-555555555555",
					CampaignID:     campaignID,
					Name:           "Road to Ash Bridge",
					DistanceUnit:   "miles",
					Terrain:        "forest",
					Pace:           "normal",
					Weather:        dbmodels.JSONMap{},
					RouteInputMode: "route",
				}).Error)
			},
			assert: func() {
				var merged dbmodels.CampaignJourneyEntity
				requireNoError(t, stores.db.First(&merged, "id = ?", "55555555-5555-4555-8555-555555555555").Error)
				if merged.Origin == "" || merged.Destination == "" || merged.Weather["rain"] != "silver" || merged.Weather["mergeProvenance"] == nil {
					t.Fatalf("expected journey metadata merge with provenance, got %+v", merged)
				}
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			tc.seedSparse()
			_, plan, err := stores.ImportExport.MergeImport(ctx, owner.ID, tc.manifest(), nil)
			requireNoError(t, err)
			if !plan.Ready || plan.Summary.Update != 1 {
				t.Fatalf("expected ready metadata merge, got ready=%v summary=%+v decisions=%+v", plan.Ready, plan.Summary, plan.Decisions)
			}
			if !slices.ContainsFunc(plan.Decisions, func(decision MergePlanDecision) bool {
				return decision.Action == "merge_missing_fields" && len(decision.FieldDiffs) > 0 && decision.Provenance != nil
			}) {
				t.Fatalf("expected field merge decision with diffs/provenance, got %+v", plan.Decisions)
			}
			tc.assert()
		})
	}
}

func mergeFieldTestManifest(campaign dbmodels.CampaignEntity, bundleType string, configure func(*PortableManifest)) PortableManifest {
	manifest := PortableManifest{
		Format:     ImportExportFormat,
		Version:    ImportExportVersion,
		BundleType: bundleType,
		Campaigns:  []dbmodels.CampaignEntity{campaign},
	}
	configure(&manifest)
	return manifest
}
