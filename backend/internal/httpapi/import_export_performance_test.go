package httpapi

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"testing"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/store"
)

func TestDeterministicArchiveFixturesAndPerformanceThresholds(t *testing.T) {
	cases := []struct {
		name      string
		fixture   deterministicArchiveFixtureConfig
		threshold time.Duration
	}{
		{name: "Medium", fixture: deterministicMediumArchiveFixture(), threshold: 2 * time.Second},
		{name: "Large", fixture: deterministicLargeArchiveFixture(), threshold: 4 * time.Second},
		{name: "Maximum", fixture: deterministicMaximumArchiveFixture(), threshold: 8 * time.Second},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			manifest, assets := buildDeterministicArchiveFixture(tc.fixture)
			started := time.Now()
			graphStarted := time.Now()
			manifest.DependencyGraph = store.BuildDependencyGraph(manifest)
			graphDuration := time.Since(graphStarted)
			zipStarted := time.Now()
			zipData, err := buildImportExportZip(store.ExportPackage{Manifest: manifest, Assets: assets})
			requireArchiveNoError(t, err)
			zipDuration := time.Since(zipStarted)
			parseStarted := time.Now()
			parsed, parsedAssets, err := parseImportExportZip(zipData)
			requireArchiveNoError(t, err)
			parseDuration := time.Since(parseStarted)
			verifyStarted := time.Now()
			verification := store.VerifyArchive(parsed, parsedAssets)
			verifyDuration := time.Since(verifyStarted)
			totalDuration := time.Since(started)

			if !verification.ArchiveValid || !verification.AssetsVerified || !verification.DependenciesComplete {
				t.Fatalf("expected verified deterministic archive, got %+v", verification)
			}
			if totalDuration > tc.threshold {
				t.Fatalf(
					"%s archive pipeline exceeded %s: total=%s graph=%s zip=%s parse=%s verify=%s",
					tc.name,
					tc.threshold,
					totalDuration,
					graphDuration,
					zipDuration,
					parseDuration,
					verifyDuration,
				)
			}
			t.Logf(
				"%s archive pipeline: total=%s graph=%s zip=%s parse=%s verify=%s size=%d nodes=%d edges=%d",
				tc.name,
				totalDuration,
				graphDuration,
				zipDuration,
				parseDuration,
				verifyDuration,
				len(zipData),
				len(parsed.DependencyGraph.Nodes),
				len(parsed.DependencyGraph.Edges),
			)
		})
	}
}

func TestEdgeCaseArchiveFixtureVerifies(t *testing.T) {
	manifest, assets := buildDeterministicArchiveFixture(deterministicEdgeCaseArchiveFixture())
	manifest.DependencyGraph = store.BuildDependencyGraph(manifest)
	zipData, err := buildImportExportZip(store.ExportPackage{Manifest: manifest, Assets: assets})
	requireArchiveNoError(t, err)
	parsed, parsedAssets, err := parseImportExportZip(zipData)
	requireArchiveNoError(t, err)
	verification := store.VerifyArchive(parsed, parsedAssets)
	if !verification.ArchiveValid || !verification.AssetsVerified {
		t.Fatalf("expected edge-case archive to verify, got %+v", verification)
	}
	if len(parsed.Locations) == 0 || len(parsed.Maps) == 0 || len(parsed.References) == 0 {
		t.Fatalf("expected edge-case fixture to include locations, maps, and standard references")
	}
}

func BenchmarkImportExportArchivePipelineLarge(b *testing.B) {
	manifest, assets := buildDeterministicArchiveFixture(deterministicLargeArchiveFixture())
	for b.Loop() {
		manifest.DependencyGraph = store.BuildDependencyGraph(manifest)
		zipData, err := buildImportExportZip(store.ExportPackage{Manifest: manifest, Assets: assets})
		if err != nil {
			b.Fatal(err)
		}
		parsed, parsedAssets, err := parseImportExportZip(zipData)
		if err != nil {
			b.Fatal(err)
		}
		if verification := store.VerifyArchive(parsed, parsedAssets); !verification.ArchiveValid {
			b.Fatalf("expected verified archive, got %+v", verification)
		}
	}
}

type deterministicArchiveFixtureConfig struct {
	campaigns             int
	npcsPerCampaign       int
	playersPerCampaign    int
	itemsPerCampaign      int
	spellsPerCampaign     int
	shopsPerCampaign      int
	dungeonsPerCampaign   int
	roomsPerDungeon       int
	mapsPerCampaign       int
	encountersPerCampaign int
	journeysPerCampaign   int
	rollTablesPerCampaign int
	rowsPerRollTable      int
	assetsPerCampaign     int
	includeEdgeCases      bool
}

func deterministicMediumArchiveFixture() deterministicArchiveFixtureConfig {
	return deterministicArchiveFixtureConfig{
		campaigns: 1, npcsPerCampaign: 3, playersPerCampaign: 2, itemsPerCampaign: 3,
		spellsPerCampaign: 2, shopsPerCampaign: 1, dungeonsPerCampaign: 1, roomsPerDungeon: 2,
		mapsPerCampaign: 1, encountersPerCampaign: 2, journeysPerCampaign: 1, rollTablesPerCampaign: 1,
		rowsPerRollTable: 3, assetsPerCampaign: 3,
	}
}

func deterministicLargeArchiveFixture() deterministicArchiveFixtureConfig {
	return deterministicArchiveFixtureConfig{
		campaigns: 3, npcsPerCampaign: 6, playersPerCampaign: 3, itemsPerCampaign: 6,
		spellsPerCampaign: 4, shopsPerCampaign: 2, dungeonsPerCampaign: 2, roomsPerDungeon: 4,
		mapsPerCampaign: 3, encountersPerCampaign: 5, journeysPerCampaign: 2, rollTablesPerCampaign: 2,
		rowsPerRollTable: 6, assetsPerCampaign: 8,
	}
}

func deterministicMaximumArchiveFixture() deterministicArchiveFixtureConfig {
	return deterministicArchiveFixtureConfig{
		campaigns: 6, npcsPerCampaign: 8, playersPerCampaign: 4, itemsPerCampaign: 8,
		spellsPerCampaign: 5, shopsPerCampaign: 3, dungeonsPerCampaign: 3, roomsPerDungeon: 5,
		mapsPerCampaign: 4, encountersPerCampaign: 8, journeysPerCampaign: 3, rollTablesPerCampaign: 3,
		rowsPerRollTable: 8, assetsPerCampaign: 12,
	}
}

func deterministicEdgeCaseArchiveFixture() deterministicArchiveFixtureConfig {
	config := deterministicMediumArchiveFixture()
	config.includeEdgeCases = true
	return config
}

func buildDeterministicArchiveFixture(config deterministicArchiveFixtureConfig) (store.PortableManifest, []store.ExportAssetFile) {
	manifest := store.PortableManifest{
		Format:           store.ImportExportFormat,
		Version:          store.ImportExportVersion,
		ExportedAt:       time.Date(2026, 7, 6, 12, 0, 0, 0, time.UTC),
		SourceAppVersion: "test",
		BundleType:       "everything",
		References: map[string]any{
			"standardSpells":    []string{"fireball"},
			"standardCreatures": []string{"bandit"},
		},
	}
	assets := []store.ExportAssetFile{}
	for campaignIndex := range config.campaigns {
		campaignID := fixtureID("campaign", campaignIndex, 0)
		manifest.Campaigns = append(manifest.Campaigns, dbmodels.CampaignEntity{
			ID:          campaignID,
			OwnerUserID: "source-user",
			Name:        fmt.Sprintf("Archive Campaign %02d", campaignIndex),
			Description: "Deterministic import/export fixture",
		})
		campaignAssetIDs := []string{}
		for assetIndex := range config.assetsPerCampaign {
			asset, file := deterministicAsset(campaignIndex, assetIndex)
			campaignAssetIDs = append(campaignAssetIDs, asset.ID)
			manifest.Assets = append(manifest.Assets, asset)
			assets = append(assets, file)
		}
		for itemIndex := range config.itemsPerCampaign {
			manifest.Items = append(manifest.Items, dbmodels.ItemEntity{
				ID:          fixtureID("item", campaignIndex, itemIndex),
				OwnerUserID: "source-user",
				Name:        fmt.Sprintf("Fixture Item %02d-%02d", campaignIndex, itemIndex),
				Category:    "gear",
				Data:        dbmodels.JSONMap{"price": itemIndex + 1},
			})
		}
		for spellIndex := range config.spellsPerCampaign {
			manifest.Spells = append(manifest.Spells, dbmodels.SpellEntity{
				ID:          fixtureID("spell", campaignIndex, spellIndex),
				OwnerUserID: "source-user",
				Name:        fmt.Sprintf("Fixture Spell %02d-%02d", campaignIndex, spellIndex),
				Level:       spellIndex % 5,
				School:      "evocation",
				Components:  dbmodels.JSONMap{"v": true},
				Mechanics:   dbmodels.JSONMap{},
			})
		}
		for npcIndex := range config.npcsPerCampaign {
			assetID := campaignAssetIDs[npcIndex%len(campaignAssetIDs)]
			npcID := fixtureID("npc", campaignIndex, npcIndex)
			manifest.NPCs = append(manifest.NPCs, dbmodels.CreatureEntity{
				ID:           npcID,
				OwnerUserID:  "source-user",
				Name:         fmt.Sprintf("Fixture NPC %02d-%02d", campaignIndex, npcIndex),
				Size:         "Medium",
				CreatureType: "humanoid",
				ArmorClass:   12 + npcIndex%4,
				HitPoints:    10 + npcIndex,
				ImageAssetID: &assetID,
				StatBlock:    dbmodels.JSONMap{},
			})
			manifest.CreatureLinks = append(manifest.CreatureLinks, dbmodels.CampaignCreatureEntity{
				CampaignID: campaignID,
				CreatureID: npcID,
			})
			if len(manifest.Spells) > 0 {
				spellID := manifest.Spells[npcIndex%len(manifest.Spells)].ID
				manifest.CreatureSpells = append(manifest.CreatureSpells, dbmodels.CreatureSpellEntity{
					ID:            fixtureID("creature-spell", campaignIndex, npcIndex),
					CreatureID:    npcID,
					LibrarySource: "user",
					SpellID:       &spellID,
				})
			}
		}
		for playerIndex := range config.playersPerCampaign {
			assetID := campaignAssetIDs[playerIndex%len(campaignAssetIDs)]
			manifest.Players = append(manifest.Players, dbmodels.PlayerEntity{
				ID:               fixtureID("player", campaignIndex, playerIndex),
				OwnerUserID:      "source-user",
				CampaignID:       &campaignID,
				CharacterName:    fmt.Sprintf("Fixture Hero %02d-%02d", campaignIndex, playerIndex),
				PlayerName:       "Fixture Player",
				ArmorClass:       14,
				MaxHitPoints:     18,
				CurrentHitPoints: 18,
				CharacterSheet:   dbmodels.JSONMap{},
				ImageAssetID:     &assetID,
			})
		}
		locationIDs := []string{}
		for shopIndex := range config.shopsPerCampaign {
			shopID := fixtureID("shop", campaignIndex, shopIndex)
			locationIDs = append(locationIDs, shopID)
			manifest.Locations = append(manifest.Locations, dbmodels.CampaignLocationEntity{
				ID:           shopID,
				CampaignID:   campaignID,
				Name:         fmt.Sprintf("Fixture Shop %02d-%02d", campaignIndex, shopIndex),
				LocationType: "shop",
				MapAnchor:    dbmodels.JSONMap{},
			})
			if len(manifest.Items) > 0 {
				itemID := manifest.Items[(campaignIndex*config.itemsPerCampaign+shopIndex)%len(manifest.Items)].ID
				manifest.LocationStock = append(manifest.LocationStock, dbmodels.CampaignLocationStockEntity{
					ID:            fixtureID("stock", campaignIndex, shopIndex),
					CampaignID:    campaignID,
					LocationID:    shopID,
					ItemID:        itemID,
					LibrarySource: "user",
					Quantity:      shopIndex + 1,
				})
			}
		}
		for dungeonIndex := range config.dungeonsPerCampaign {
			dungeonID := fixtureID("dungeon", campaignIndex, dungeonIndex)
			locationIDs = append(locationIDs, dungeonID)
			manifest.Locations = append(manifest.Locations, dbmodels.CampaignLocationEntity{
				ID:           dungeonID,
				CampaignID:   campaignID,
				Name:         fmt.Sprintf("Fixture Dungeon %02d-%02d", campaignIndex, dungeonIndex),
				LocationType: "dungeon",
				MapAnchor:    dbmodels.JSONMap{},
			})
			for roomIndex := range config.roomsPerDungeon {
				roomID := fixtureID(fmt.Sprintf("room-%02d", dungeonIndex), campaignIndex, roomIndex)
				locationIDs = append(locationIDs, roomID)
				manifest.Locations = append(manifest.Locations, dbmodels.CampaignLocationEntity{
					ID:               roomID,
					CampaignID:       campaignID,
					ParentLocationID: &dungeonID,
					Name:             fmt.Sprintf("Fixture Room %02d-%02d-%02d", campaignIndex, dungeonIndex, roomIndex),
					LocationType:     "room",
					MapAnchor:        dbmodels.JSONMap{},
				})
			}
		}
		for mapIndex := range config.mapsPerCampaign {
			locationID := locationIDs[mapIndex%len(locationIDs)]
			assetID := campaignAssetIDs[mapIndex%len(campaignAssetIDs)]
			mapID := fixtureID("map", campaignIndex, mapIndex)
			manifest.Maps = append(manifest.Maps, dbmodels.CampaignMapEntity{
				ID:               mapID,
				CampaignID:       campaignID,
				ParentLocationID: &locationID,
				Name:             fmt.Sprintf("Fixture Map %02d-%02d", campaignIndex, mapIndex),
				MapType:          "regional",
				Mode:             "image",
				ImageAssetID:     &assetID,
				Metadata:         dbmodels.JSONMap{"fixture": true},
			})
			manifest.MapPins = append(manifest.MapPins, dbmodels.CampaignMapPinEntity{
				ID:         fixtureID("pin", campaignIndex, mapIndex),
				CampaignID: campaignID,
				MapID:      mapID,
				LocationID: locationID,
				X:          float64(10 + mapIndex),
				Y:          float64(20 + mapIndex),
				Metadata:   dbmodels.JSONMap{},
			})
		}
		for encounterIndex := range config.encountersPerCampaign {
			locationID := locationIDs[encounterIndex%len(locationIDs)]
			assetID := campaignAssetIDs[encounterIndex%len(campaignAssetIDs)]
			encounterID := fixtureID("encounter", campaignIndex, encounterIndex)
			manifest.Encounters = append(manifest.Encounters, dbmodels.EncounterEntity{
				ID:                encounterID,
				CampaignID:        campaignID,
				Name:              fmt.Sprintf("Fixture Encounter %02d-%02d", campaignIndex, encounterIndex),
				LocationID:        &locationID,
				BackgroundAssetID: &assetID,
			})
			if len(manifest.NPCs) > 0 {
				creatureID := manifest.NPCs[(campaignIndex*config.npcsPerCampaign+encounterIndex)%len(manifest.NPCs)].ID
				manifest.Combatants = append(manifest.Combatants, dbmodels.EncounterCombatantEntity{
					ID:          fixtureID("combatant", campaignIndex, encounterIndex),
					EncounterID: encounterID,
					SourceType:  "creature",
					CreatureID:  &creatureID,
					Side:        "enemy",
					DisplayName: "Fixture Combatant",
					Snapshot:    dbmodels.JSONMap{},
				})
			}
		}
		for journeyIndex := range config.journeysPerCampaign {
			manifest.Journeys = append(manifest.Journeys, dbmodels.CampaignJourneyEntity{
				ID:             fixtureID("journey", campaignIndex, journeyIndex),
				CampaignID:     campaignID,
				Name:           fmt.Sprintf("Fixture Journey %02d-%02d", campaignIndex, journeyIndex),
				Origin:         "A",
				Destination:    "B",
				Distance:       float64(12 + journeyIndex),
				DistanceUnit:   "miles",
				Terrain:        "road",
				Pace:           "normal",
				Weather:        dbmodels.JSONMap{},
				RouteInputMode: "route",
			})
		}
		for tableIndex := range config.rollTablesPerCampaign {
			tableID := fixtureID("roll-table", campaignIndex, tableIndex)
			manifest.RollTables = append(manifest.RollTables, dbmodels.RollTableEntity{
				ID:            tableID,
				CampaignID:    &campaignID,
				Source:        "campaign",
				Name:          fmt.Sprintf("Fixture Roll Table %02d-%02d", campaignIndex, tableIndex),
				Category:      "travel",
				DieExpression: fmt.Sprintf("1d%d", config.rowsPerRollTable),
			})
			for rowIndex := range config.rowsPerRollTable {
				manifest.RollTableRows = append(manifest.RollTableRows, dbmodels.RollTableRowEntity{
					ID:         fixtureID(fmt.Sprintf("roll-row-%02d", tableIndex), campaignIndex, rowIndex),
					TableID:    tableID,
					MinRoll:    rowIndex + 1,
					MaxRoll:    rowIndex + 1,
					Label:      fmt.Sprintf("Row %02d", rowIndex),
					ResultText: "Deterministic result",
				})
			}
		}
	}
	if config.includeEdgeCases {
		addDeterministicEdgeCases(&manifest)
	}
	return manifest, assets
}

func addDeterministicEdgeCases(manifest *store.PortableManifest) {
	campaignID := manifest.Campaigns[0].ID
	emptyShopID := "edge-empty-shop"
	emptyDungeonID := "edge-empty-dungeon"
	manifest.Locations = append(manifest.Locations,
		dbmodels.CampaignLocationEntity{ID: emptyShopID, CampaignID: campaignID, Name: "Duplicate Name", LocationType: "shop", MapAnchor: dbmodels.JSONMap{}},
		dbmodels.CampaignLocationEntity{ID: emptyDungeonID, CampaignID: campaignID, Name: "Duplicate Name", LocationType: "dungeon", MapAnchor: dbmodels.JSONMap{}},
	)
	manifest.Maps = append(manifest.Maps, dbmodels.CampaignMapEntity{
		ID:         "edge-map-without-image",
		CampaignID: campaignID,
		Name:       "Map Without Image",
		MapType:    "regional",
		Mode:       "grid",
		Metadata:   dbmodels.JSONMap{"edge": true},
	})
	manifest.NPCs = append(manifest.NPCs, dbmodels.CreatureEntity{
		ID:           "edge-standard-linked-npc",
		OwnerUserID:  "source-user",
		Name:         "Standard Linked NPC",
		Size:         "Medium",
		CreatureType: "humanoid",
		ArmorClass:   11,
		HitPoints:    7,
		StatBlock:    dbmodels.JSONMap{},
	})
	standardSpellID := "fireball"
	manifest.CreatureSpells = append(manifest.CreatureSpells, dbmodels.CreatureSpellEntity{
		ID:              "edge-standard-spell-link",
		CreatureID:      "edge-standard-linked-npc",
		LibrarySource:   "standard",
		StandardSpellID: &standardSpellID,
	})
}

func deterministicAsset(campaignIndex, assetIndex int) (store.ExportAsset, store.ExportAssetFile) {
	id := fixtureID("asset", campaignIndex, assetIndex)
	data := []byte(fmt.Sprintf("asset-%02d-%02d", campaignIndex, assetIndex))
	sum := sha256.Sum256(data)
	asset := store.ExportAsset{
		ID:          id,
		Filename:    id + ".png",
		ContentType: "image/png",
		ByteSize:    int64(len(data)),
		SHA256:      hex.EncodeToString(sum[:]),
		Path:        "assets/" + id + ".png",
	}
	return asset, store.ExportAssetFile{Asset: asset, Data: data}
}

func fixtureID(kind string, campaignIndex, objectIndex int) string {
	return fmt.Sprintf("%s-%02d-%02d", kind, campaignIndex, objectIndex)
}
