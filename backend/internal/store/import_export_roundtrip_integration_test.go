package store

import (
	"context"
	"testing"

	dbmodels "bludm/backend/internal/db"

	"gorm.io/gorm"
)

type importExportRoundTripFixture struct {
	SourceUserID string
	Campaign     dbmodels.CampaignEntity
	Asset        dbmodels.UploadedAssetEntity
	NPC          dbmodels.CreatureEntity
	Player       dbmodels.PlayerEntity
	Item         dbmodels.ItemEntity
	Spell        dbmodels.SpellEntity
	Encounter    dbmodels.EncounterEntity
	Shop         dbmodels.CampaignLocationEntity
	Dungeon      dbmodels.CampaignLocationEntity
	Room         dbmodels.CampaignLocationEntity
	Map          dbmodels.CampaignMapEntity
	Journey      dbmodels.CampaignJourneyEntity
	RollTable    dbmodels.RollTableEntity
}

func TestImportExportRoundTripSupportedBundles(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()
	source, err := stores.Auth.CreateUser(ctx, uniqueEmail("roundtrip-source"), "hash")
	requireNoError(t, err)
	fixture := seedImportExportRoundTripFixture(t, stores, source.ID)

	cases := []struct {
		name      string
		bundle    string
		campaigns []string
		objects   []string
	}{
		{name: "Everything", bundle: "everything"},
		{name: "Campaign", bundle: "campaign", campaigns: []string{fixture.Campaign.ID}},
		{name: "Dungeon", bundle: "dungeon", objects: []string{fixture.Dungeon.ID}},
		{name: "Shop", bundle: "shop", objects: []string{fixture.Shop.ID}},
		{name: "Encounter", bundle: "encounter", objects: []string{fixture.Encounter.ID}},
		{name: "NPC", bundle: "npc", objects: []string{fixture.NPC.ID}},
		{name: "Player", bundle: "player", objects: []string{fixture.Player.ID}},
		{name: "Item", bundle: "item", objects: []string{fixture.Item.ID}},
		{name: "Spell", bundle: "spell", objects: []string{fixture.Spell.ID}},
		{name: "Map", bundle: "map", objects: []string{fixture.Map.ID}},
		{name: "Journey", bundle: "journey", objects: []string{fixture.Journey.ID}},
		{name: "RollTable", bundle: "roll-table", objects: []string{fixture.RollTable.ID}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			target, err := stores.Auth.CreateUser(ctx, uniqueEmail("roundtrip-target-"+tc.bundle), "hash")
			requireNoError(t, err)

			pkg, err := stores.ImportExport.Export(ctx, source.ID, ExportOptions{
				BundleType:           tc.bundle,
				CampaignIDs:          tc.campaigns,
				ObjectIDs:            tc.objects,
				IncludeAssets:        true,
				IncludeDungeonStudio: true,
				IncludePlayers:       true,
			})
			requireNoError(t, err)
			if len(pkg.Manifest.DependencyGraph.Nodes) == 0 {
				t.Fatalf("expected %s export to include dependency graph nodes", tc.bundle)
			}

			result, err := stores.ImportExport.CloneImport(ctx, target.ID, pkg.Manifest, assetDataByPath(pkg.Assets))
			requireNoError(t, err)
			if len(result.Counts) == 0 {
				t.Fatalf("expected %s import counts", tc.bundle)
			}
			verifyRoundTripRelationshipMatrix(t, stores, target.ID, pkg.Manifest)
		})
	}
}

func TestMergeImportCreatesObjectAndReusesAssetByHash(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()
	source, err := stores.Auth.CreateUser(ctx, uniqueEmail("merge-source-asset"), "hash")
	requireNoError(t, err)
	target, err := stores.Auth.CreateUser(ctx, uniqueEmail("merge-target-asset"), "hash")
	requireNoError(t, err)
	fixture := seedImportExportRoundTripFixture(t, stores, source.ID)
	existingAsset := dbmodels.UploadedAssetEntity{OwnerUserID: target.ID, Filename: "existing-spire.png", ContentType: fixture.Asset.ContentType, ByteSize: fixture.Asset.ByteSize, Data: fixture.Asset.Data}
	requireNoError(t, stores.db.Create(&existingAsset).Error)

	pkg, err := stores.ImportExport.Export(ctx, source.ID, ExportOptions{BundleType: "npc", ObjectIDs: []string{fixture.NPC.ID}, IncludeAssets: true})
	requireNoError(t, err)
	result, plan, err := stores.ImportExport.MergeImport(ctx, target.ID, pkg.Manifest, assetDataByPath(pkg.Assets))
	requireNoError(t, err)

	if result.Counts["npcs"] != 1 || len(plan.AssetMatches) != 1 {
		t.Fatalf("expected merged NPC with asset reuse, result=%+v plan=%+v", result, plan)
	}
	if !plan.Ready {
		t.Fatalf("expected executable merge plan, got %+v", plan.Summary)
	}
	var creatures []dbmodels.CreatureEntity
	requireNoError(t, stores.db.Where("owner_user_id = ?", target.ID).Find(&creatures).Error)
	if len(creatures) != 1 || creatures[0].ImageAssetID == nil || *creatures[0].ImageAssetID != existingAsset.ID {
		t.Fatalf("expected merged creature to reuse existing asset, got %+v", creatures)
	}
	requireTableCountForWhere(t, stores.db, "uploaded_assets", "owner_user_id = ?", []any{target.ID}, 1)
}

func TestMergeImportRenamesNameCollision(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()
	source, err := stores.Auth.CreateUser(ctx, uniqueEmail("merge-source-rename"), "hash")
	requireNoError(t, err)
	target, err := stores.Auth.CreateUser(ctx, uniqueEmail("merge-target-rename"), "hash")
	requireNoError(t, err)
	item := dbmodels.ItemEntity{OwnerUserID: source.ID, Name: "Blue Lantern", Category: "gear", Data: dbmodels.JSONMap{"rarity": "rare"}}
	requireNoError(t, stores.db.Create(&item).Error)
	requireNoError(t, stores.db.Create(&dbmodels.ItemEntity{OwnerUserID: target.ID, Name: "Blue Lantern", Category: "gear", Data: dbmodels.JSONMap{"rarity": "common"}}).Error)

	pkg, err := stores.ImportExport.Export(ctx, source.ID, ExportOptions{BundleType: "item", ObjectIDs: []string{item.ID}})
	requireNoError(t, err)
	_, plan, err := stores.ImportExport.MergeImport(ctx, target.ID, pkg.Manifest, assetDataByPath(pkg.Assets))
	requireNoError(t, err)

	if plan.Summary.Rename != 1 {
		t.Fatalf("expected rename decision, got %+v", plan.Summary)
	}
	if !plan.Ready {
		t.Fatalf("expected executable rename plan, got %+v", plan.Summary)
	}
	var names []string
	requireNoError(t, stores.db.Model(&dbmodels.ItemEntity{}).Where("owner_user_id = ?", target.ID).Order("name asc").Pluck("name", &names).Error)
	if len(names) != 2 || names[1] != "Blue Lantern (Imported 2)" {
		t.Fatalf("expected renamed imported item, got %+v", names)
	}
}

func TestMergeImportSkipsRepeatedExactItem(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()
	source, err := stores.Auth.CreateUser(ctx, uniqueEmail("merge-source-repeat"), "hash")
	requireNoError(t, err)
	target, err := stores.Auth.CreateUser(ctx, uniqueEmail("merge-target-repeat"), "hash")
	requireNoError(t, err)
	item := dbmodels.ItemEntity{OwnerUserID: source.ID, Name: "Moon Key", Category: "gear", Data: dbmodels.JSONMap{"uses": 1}}
	requireNoError(t, stores.db.Create(&item).Error)
	pkg, err := stores.ImportExport.Export(ctx, source.ID, ExportOptions{BundleType: "item", ObjectIDs: []string{item.ID}})
	requireNoError(t, err)

	_, _, err = stores.ImportExport.MergeImport(ctx, target.ID, pkg.Manifest, assetDataByPath(pkg.Assets))
	requireNoError(t, err)
	_, plan, err := stores.ImportExport.MergeImport(ctx, target.ID, pkg.Manifest, assetDataByPath(pkg.Assets))
	requireNoError(t, err)

	if plan.Summary.Reuse != 1 {
		t.Fatalf("expected exact item reuse on repeated merge, got %+v", plan.Summary)
	}
	if !plan.Ready {
		t.Fatalf("expected executable reuse plan, got %+v", plan.Summary)
	}
	requireTableCountForWhere(t, stores.db, "items", "owner_user_id = ?", []any{target.ID}, 1)
}

func seedImportExportRoundTripFixture(t *testing.T, stores *Stores, ownerUserID string) importExportRoundTripFixture {
	t.Helper()
	db := stores.db
	asset := dbmodels.UploadedAssetEntity{
		OwnerUserID: ownerUserID,
		Filename:    "spire.png",
		ContentType: "image/png",
		ByteSize:    7,
		Data:        []byte("pngdata"),
	}
	requireNoError(t, db.Create(&asset).Error)
	campaign := dbmodels.CampaignEntity{OwnerUserID: ownerUserID, Name: "Round Trip Coast", Description: "Fixture campaign"}
	requireNoError(t, db.Create(&campaign).Error)
	npc := dbmodels.CreatureEntity{
		OwnerUserID:     ownerUserID,
		Name:            "Glass Witch",
		Size:            "Medium",
		CreatureType:    "humanoid",
		ArmorClass:      13,
		HitPoints:       22,
		ChallengeRating: "1",
		ImageAssetID:    &asset.ID,
		StatBlock:       dbmodels.JSONMap{},
	}
	requireNoError(t, db.Create(&npc).Error)
	item := dbmodels.ItemEntity{OwnerUserID: ownerUserID, Name: "Blue Lantern", Category: "wondrous", Data: dbmodels.JSONMap{}}
	requireNoError(t, db.Create(&item).Error)
	spell := dbmodels.SpellEntity{
		OwnerUserID: ownerUserID,
		Name:        "Ash Spark",
		Level:       1,
		School:      "evocation",
		Components:  dbmodels.JSONMap{"v": true},
		Mechanics:   dbmodels.JSONMap{},
	}
	requireNoError(t, db.Create(&spell).Error)
	player := dbmodels.PlayerEntity{
		OwnerUserID:      ownerUserID,
		CampaignID:       &campaign.ID,
		CharacterName:    "Mira",
		PlayerName:       "Blue",
		ArmorClass:       15,
		MaxHitPoints:     18,
		CurrentHitPoints: 18,
		CharacterSheet:   dbmodels.JSONMap{},
		ImageAssetID:     &asset.ID,
	}
	requireNoError(t, db.Create(&player).Error)
	requireNoError(t, db.Create(&dbmodels.CampaignCreatureEntity{
		CampaignID:  campaign.ID,
		CreatureID:  npc.ID,
		Disposition: "hostile",
	}).Error)
	shop := dbmodels.CampaignLocationEntity{CampaignID: campaign.ID, Name: "Moth & Mortar", LocationType: "shop", MapAnchor: dbmodels.JSONMap{}}
	dungeon := dbmodels.CampaignLocationEntity{CampaignID: campaign.ID, Name: "Wave Echo Cave", LocationType: "dungeon", MapAnchor: dbmodels.JSONMap{}}
	requireNoError(t, db.Create(&shop).Error)
	requireNoError(t, db.Create(&dungeon).Error)
	room := dbmodels.CampaignLocationEntity{
		CampaignID:       campaign.ID,
		ParentLocationID: &dungeon.ID,
		Name:             "Collapsed Hall",
		LocationType:     "room",
		MapAnchor:        dbmodels.JSONMap{},
		CustomTypeLabel:  "",
		Tags:             nil,
		SortOrder:        1,
		Status:           "active",
	}
	requireNoError(t, db.Create(&room).Error)
	requireNoError(t, db.Create(&dbmodels.CampaignLocationStockEntity{
		CampaignID:    campaign.ID,
		LocationID:    shop.ID,
		ItemID:        item.ID,
		LibrarySource: "user",
		Quantity:      3,
		Availability:  "in-stock",
	}).Error)
	requireNoError(t, db.Create(&dbmodels.CampaignNpcLocationLinkEntity{
		CampaignID: campaign.ID,
		CreatureID: npc.ID,
		LocationID: shop.ID,
		LinkType:   "frequents",
		Visibility: "dm",
	}).Error)
	campaignMap := dbmodels.CampaignMapEntity{
		CampaignID:       campaign.ID,
		ParentLocationID: &dungeon.ID,
		Name:             "Cave Map",
		MapType:          "dungeon",
		Mode:             "image",
		ImageAssetID:     &asset.ID,
		Metadata:         dbmodels.JSONMap{"studio": true},
	}
	requireNoError(t, db.Create(&campaignMap).Error)
	requireNoError(t, db.Create(&dbmodels.CampaignMapPinEntity{
		CampaignID: campaign.ID,
		MapID:      campaignMap.ID,
		LocationID: room.ID,
		X:          25,
		Y:          40,
		State:      "active",
		Visibility: "dm",
		Metadata:   dbmodels.JSONMap{},
	}).Error)
	encounter := dbmodels.EncounterEntity{
		CampaignID:        campaign.ID,
		Name:              "Bridge Fight",
		Status:            "planned",
		LocationID:        &room.ID,
		BackgroundAssetID: &asset.ID,
	}
	requireNoError(t, db.Create(&encounter).Error)
	requireNoError(t, db.Create(&dbmodels.EncounterCombatantEntity{
		EncounterID:      encounter.ID,
		SourceType:       "creature",
		CreatureID:       &npc.ID,
		Side:             "enemy",
		DisplayName:      npc.Name,
		ArmorClass:       13,
		MaxHitPoints:     22,
		CurrentHitPoints: 22,
		Snapshot:         dbmodels.JSONMap{},
	}).Error)
	requireNoError(t, db.Create(&dbmodels.EncounterCombatantEntity{
		EncounterID:      encounter.ID,
		SourceType:       "player",
		PlayerID:         &player.ID,
		Side:             "player",
		DisplayName:      player.CharacterName,
		ArmorClass:       15,
		MaxHitPoints:     18,
		CurrentHitPoints: 18,
		Snapshot:         dbmodels.JSONMap{},
	}).Error)
	journey := dbmodels.CampaignJourneyEntity{
		CampaignID:            campaign.ID,
		Name:                  "Road to Ash Bridge",
		Origin:                "Black Spire",
		Destination:           "Ash Bridge",
		Distance:              14,
		DistanceUnit:          "miles",
		Terrain:               "forest",
		Pace:                  "normal",
		EncounterDistanceFeet: intPointer(120),
		Weather:               dbmodels.JSONMap{"temperature": "cold"},
		RouteInputMode:        "route",
	}
	requireNoError(t, db.Create(&journey).Error)
	rollTable := dbmodels.RollTableEntity{
		CampaignID:    &campaign.ID,
		Source:        "campaign",
		Name:          "Road Complications",
		Category:      "travel",
		DieExpression: "1d6",
	}
	requireNoError(t, db.Create(&rollTable).Error)
	requireNoError(t, db.Create(&dbmodels.RollTableRowEntity{
		TableID:    rollTable.ID,
		MinRoll:    1,
		MaxRoll:    1,
		Label:      "Broken bridge",
		ResultText: "The bridge is out.",
	}).Error)

	return importExportRoundTripFixture{
		SourceUserID: ownerUserID,
		Campaign:     campaign,
		Asset:        asset,
		NPC:          npc,
		Player:       player,
		Item:         item,
		Spell:        spell,
		Encounter:    encounter,
		Shop:         shop,
		Dungeon:      dungeon,
		Room:         room,
		Map:          campaignMap,
		Journey:      journey,
		RollTable:    rollTable,
	}
}

func assetDataByPath(files []ExportAssetFile) map[string][]byte {
	data := map[string][]byte{}
	for _, file := range files {
		data[file.Asset.Path] = file.Data
	}
	return data
}

func verifyRoundTripRelationshipMatrix(t *testing.T, stores *Stores, targetUserID string, manifest PortableManifest) {
	t.Helper()
	db := stores.db
	requireOwnedCount(t, db, "campaigns", targetUserID, len(manifest.Campaigns))
	requireOwnedCount(t, db, "uploaded_assets", targetUserID, len(manifest.Assets))
	requireOwnedCount(t, db, "creatures", targetUserID, len(manifest.NPCs))
	requireOwnedCount(t, db, "players", targetUserID, len(manifest.Players))
	requireOwnedCount(t, db, "items", targetUserID, len(manifest.Items))
	requireOwnedCount(t, db, "spells", targetUserID, len(manifest.Spells))

	campaignIDs := targetCampaignIDs(t, db, targetUserID)
	requireCampaignCount(t, db, "campaign_locations", campaignIDs, len(manifest.Locations))
	requireCampaignCount(t, db, "campaign_location_stock", campaignIDs, len(manifest.LocationStock))
	requireCampaignCount(t, db, "campaign_npc_location_links", campaignIDs, len(manifest.NPCLocationLinks))
	requireCampaignCount(t, db, "campaign_maps", campaignIDs, len(manifest.Maps))
	requireCampaignCount(t, db, "campaign_map_pins", campaignIDs, len(manifest.MapPins))
	requireCampaignCount(t, db, "campaign_journeys", campaignIDs, len(manifest.Journeys))
	requireCampaignCount(t, db, "encounters", campaignIDs, len(manifest.Encounters))

	if len(manifest.RollTables) > 0 {
		requireTableCountForWhere(t, db, "roll_tables", "campaign_id in ?", []any{campaignIDs}, int64(len(manifest.RollTables)))
	}
	if len(manifest.RollTableRows) > 0 {
		var tableIDs []string
		requireNoError(t, db.Table("roll_tables").Where("campaign_id in ?", campaignIDs).Pluck("id", &tableIDs).Error)
		requireTableCountForWhere(t, db, "roll_table_rows", "table_id in ?", []any{tableIDs}, int64(len(manifest.RollTableRows)))
	}

	if len(manifest.Locations) > 0 {
		requireNoOriginalValues(t, db, "campaign_locations", "campaign_id in ?", []any{campaignIDs}, "id", idsFrom(manifest.Locations, func(entity dbmodels.CampaignLocationEntity) string { return entity.ID }))
		requireNoOriginalValues(t, db, "campaign_locations", "campaign_id in ?", []any{campaignIDs}, "parent_location_id", idsFrom(manifest.Locations, func(entity dbmodels.CampaignLocationEntity) string { return entity.ID }))
	}
	if len(manifest.Campaigns) > 0 {
		requireNoOriginalValues(t, db, "campaigns", "owner_user_id = ?", []any{targetUserID}, "id", idsFrom(manifest.Campaigns, func(entity dbmodels.CampaignEntity) string { return entity.ID }))
	}
	if len(manifest.Players) > 0 {
		requireNoOriginalValues(t, db, "players", "owner_user_id = ?", []any{targetUserID}, "id", idsFrom(manifest.Players, func(entity dbmodels.PlayerEntity) string { return entity.ID }))
	}
	if len(manifest.NPCs) > 0 {
		requireNoOriginalValues(t, db, "creatures", "owner_user_id = ?", []any{targetUserID}, "id", idsFrom(manifest.NPCs, func(entity dbmodels.CreatureEntity) string { return entity.ID }))
	}
	if len(manifest.Maps) > 0 {
		requireNoOriginalValues(t, db, "campaign_maps", "campaign_id in ?", []any{campaignIDs}, "id", idsFrom(manifest.Maps, func(entity dbmodels.CampaignMapEntity) string { return entity.ID }))
		requireNoOriginalValues(t, db, "campaign_map_pins", "campaign_id in ?", []any{campaignIDs}, "map_id", idsFrom(manifest.Maps, func(entity dbmodels.CampaignMapEntity) string { return entity.ID }))
	}
	if len(manifest.Encounters) > 0 {
		requireNoOriginalValues(t, db, "encounters", "campaign_id in ?", []any{campaignIDs}, "id", idsFrom(manifest.Encounters, func(entity dbmodels.EncounterEntity) string { return entity.ID }))
		requireNoOriginalValues(t, db, "encounter_combatants", "encounter_id in (select id from encounters where campaign_id in ?)", []any{campaignIDs}, "encounter_id", idsFrom(manifest.Encounters, func(entity dbmodels.EncounterEntity) string { return entity.ID }))
	}
	if len(manifest.RollTables) > 0 {
		requireNoOriginalValues(t, db, "roll_tables", "campaign_id in ?", []any{campaignIDs}, "id", idsFrom(manifest.RollTables, func(entity dbmodels.RollTableEntity) string { return entity.ID }))
		requireNoOriginalValues(t, db, "roll_table_rows", "table_id in (select id from roll_tables where campaign_id in ?)", []any{campaignIDs}, "table_id", idsFrom(manifest.RollTables, func(entity dbmodels.RollTableEntity) string { return entity.ID }))
	}
}

func requireOwnedCount(t *testing.T, db *gorm.DB, table string, ownerUserID string, want int) {
	t.Helper()
	requireTableCountForWhere(t, db, table, "owner_user_id = ?", []any{ownerUserID}, int64(want))
}

func requireCampaignCount(t *testing.T, db *gorm.DB, table string, campaignIDs []string, want int) {
	t.Helper()
	if want == 0 {
		return
	}
	if len(campaignIDs) == 0 {
		t.Fatalf("expected campaign IDs before checking %s", table)
	}
	requireTableCountForWhere(t, db, table, "campaign_id in ?", []any{campaignIDs}, int64(want))
}

func targetCampaignIDs(t *testing.T, db *gorm.DB, ownerUserID string) []string {
	t.Helper()
	var ids []string
	requireNoError(t, db.Table("campaigns").Where("owner_user_id = ?", ownerUserID).Pluck("id", &ids).Error)
	return ids
}

func requireNoOriginalValues(t *testing.T, db *gorm.DB, table string, baseWhere string, baseArgs []any, column string, originals []string) {
	t.Helper()
	if len(originals) == 0 {
		return
	}
	where := baseWhere + " and " + column + " in ?"
	args := append([]any{}, baseArgs...)
	args = append(args, originals)
	requireTableCountForWhere(t, db, table, where, args, 0)
}

func intPointer(value int) *int {
	return &value
}
