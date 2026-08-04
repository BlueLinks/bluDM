package httpapi

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"testing"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/store"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestZipArchiveRoundTripSupportedBundles(t *testing.T) {
	db, stores := newImportExportArchiveTestStores(t)
	ctx := context.Background()
	source, err := stores.Auth.CreateUser(ctx, uniqueArchiveEmail("archive-source"), "hash")
	requireArchiveNoError(t, err)
	fixture := seedArchiveRoundTripFixture(t, db, source.ID)

	cases := []struct {
		name      string
		bundle    string
		campaigns []string
		objects   []string
	}{
		{name: "Everything", bundle: "everything"},
		{name: "Campaign", bundle: "campaign", campaigns: []string{fixture.campaignID}},
		{name: "Dungeon", bundle: "dungeon", objects: []string{fixture.dungeonID}},
		{name: "Shop", bundle: "shop", objects: []string{fixture.shopID}},
		{name: "Encounter", bundle: "encounter", objects: []string{fixture.encounterID}},
		{name: "NPC", bundle: "npc", objects: []string{fixture.npcID}},
		{name: "Player", bundle: "player", objects: []string{fixture.playerID}},
		{name: "Item", bundle: "item", objects: []string{fixture.itemID}},
		{name: "Spell", bundle: "spell", objects: []string{fixture.spellID}},
		{name: "Map", bundle: "map", objects: []string{fixture.mapID}},
		{name: "Journey", bundle: "journey", objects: []string{fixture.journeyID}},
		{name: "RollTable", bundle: "roll-table", objects: []string{fixture.rollTableID}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			target, err := stores.Auth.CreateUser(ctx, uniqueArchiveEmail("archive-target-"+tc.bundle), "hash")
			requireArchiveNoError(t, err)
			pkg, err := stores.ImportExport.Export(ctx, source.ID, store.ExportOptions{
				BundleType:           tc.bundle,
				CampaignIDs:          tc.campaigns,
				ObjectIDs:            tc.objects,
				IncludeAssets:        true,
				IncludeDungeonStudio: true,
				IncludePlayers:       true,
			})
			requireArchiveNoError(t, err)
			zipData, err := buildImportExportZip(pkg)
			requireArchiveNoError(t, err)
			archivePath := t.TempDir() + "/" + tc.bundle + ".zip"
			requireArchiveNoError(t, os.WriteFile(archivePath, zipData, 0o600))
			diskData, err := os.ReadFile(archivePath)
			requireArchiveNoError(t, err)
			manifest, assets, err := parseImportExportZip(diskData)
			requireArchiveNoError(t, err)
			preview, err := stores.ImportExport.Preview(ctx, target.ID, manifest, assets, int64(len(diskData)))
			requireArchiveNoError(t, err)
			if !preview.Verification.ArchiveValid || !preview.Verification.AssetsVerified {
				t.Fatalf("expected verified archive preview, got %+v", preview.Verification)
			}
			if len(preview.DependencyGraph.Nodes) == 0 {
				t.Fatal("expected preview dependency graph")
			}
			result, err := stores.ImportExport.CloneImport(ctx, target.ID, manifest, assets)
			requireArchiveNoError(t, err)
			if len(result.Counts) == 0 {
				t.Fatal("expected clone import counts")
			}
			if len(manifest.Assets) > 0 {
				var assetCount int64
				requireArchiveNoError(t, db.Table("uploaded_assets").Where("owner_user_id = ?", target.ID).Count(&assetCount).Error)
				if assetCount == 0 {
					t.Fatal("expected imported assets")
				}
			}
		})
	}
}

func TestZipArchiveRestoreRoundTripSupportedBundles(t *testing.T) {
	cases := archiveBundleCases(archiveFixtureIDs{})
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			sourceDB, sourceStores := newImportExportArchiveTestStores(t)
			ctx := context.Background()
			source, err := sourceStores.Auth.CreateUser(ctx, uniqueArchiveEmail("restore-source-"+tc.bundle), "hash")
			requireArchiveNoError(t, err)
			fixture := seedArchiveRoundTripFixture(t, sourceDB, source.ID)
			tc = tc.withFixture(fixture)
			pkg, err := sourceStores.ImportExport.Export(ctx, source.ID, store.ExportOptions{
				BundleType:           tc.bundle,
				CampaignIDs:          tc.campaigns,
				ObjectIDs:            tc.objects,
				IncludeAssets:        true,
				IncludeDungeonStudio: true,
				IncludePlayers:       true,
			})
			requireArchiveNoError(t, err)
			zipData, err := buildImportExportZip(pkg)
			requireArchiveNoError(t, err)
			archivePath := t.TempDir() + "/" + tc.bundle + "-restore.zip"
			requireArchiveNoError(t, os.WriteFile(archivePath, zipData, 0o600))
			diskData, err := os.ReadFile(archivePath)
			requireArchiveNoError(t, err)
			manifest, assets, err := parseImportExportZip(diskData)
			requireArchiveNoError(t, err)

			targetDB, targetStores := newImportExportArchiveTestStores(t)
			dirty, err := targetStores.Auth.CreateUser(ctx, uniqueArchiveEmail("restore-dirty-"+tc.bundle), "hash")
			requireArchiveNoError(t, err)
			_, err = targetStores.Campaigns.Create(ctx, dirty.ID, store.CampaignInput{Name: "Existing"})
			requireArchiveNoError(t, err)
			if _, err := targetStores.ImportExport.RestoreImport(ctx, dirty.ID, manifest, assets); err == nil {
				t.Fatal("expected restore to reject account with existing data")
			}

			target, err := targetStores.Auth.CreateUser(ctx, uniqueArchiveEmail("restore-target-"+tc.bundle), "hash")
			requireArchiveNoError(t, err)
			preview, err := targetStores.ImportExport.Preview(ctx, target.ID, manifest, assets, int64(len(diskData)))
			requireArchiveNoError(t, err)
			if !preview.Verification.ArchiveValid || !preview.RestoreReadiness.Ready {
				t.Fatalf("expected verified restore-ready preview, got verification=%+v readiness=%+v", preview.Verification, preview.RestoreReadiness)
			}
			result, err := targetStores.ImportExport.RestoreImport(ctx, target.ID, manifest, assets)
			requireArchiveNoError(t, err)
			if len(result.Counts) == 0 {
				t.Fatal("expected restore counts")
			}
			verifyRestoreManifestRows(t, targetDB, target.ID, manifest)
		})
	}
}

func TestRestoreImportRollsBackOnWriteFailure(t *testing.T) {
	sourceDB, sourceStores := newImportExportArchiveTestStores(t)
	ctx := context.Background()
	source, err := sourceStores.Auth.CreateUser(ctx, uniqueArchiveEmail("restore-rollback-source"), "hash")
	requireArchiveNoError(t, err)
	fixture := seedArchiveRoundTripFixture(t, sourceDB, source.ID)
	pkg, err := sourceStores.ImportExport.Export(ctx, source.ID, store.ExportOptions{
		BundleType:     "campaign",
		CampaignIDs:    []string{fixture.campaignID},
		IncludeAssets:  true,
		IncludePlayers: true,
	})
	requireArchiveNoError(t, err)
	zipData, err := buildImportExportZip(pkg)
	requireArchiveNoError(t, err)
	manifest, assets, err := parseImportExportZip(zipData)
	requireArchiveNoError(t, err)
	if len(manifest.Assets) == 0 {
		t.Fatal("expected rollback fixture asset")
	}

	targetDB, targetStores := newImportExportArchiveTestStores(t)
	target, err := targetStores.Auth.CreateUser(ctx, uniqueArchiveEmail("restore-rollback-target"), "hash")
	requireArchiveNoError(t, err)
	other, err := targetStores.Auth.CreateUser(ctx, uniqueArchiveEmail("restore-rollback-other"), "hash")
	requireArchiveNoError(t, err)
	conflict := dbmodels.UploadedAssetEntity{
		ID:          manifest.Assets[0].ID,
		OwnerUserID: other.ID,
		Filename:    "conflict.png",
		ContentType: "image/png",
		ByteSize:    1,
		Data:        []byte("x"),
	}
	requireArchiveNoError(t, targetDB.Create(&conflict).Error)
	if _, err := targetStores.ImportExport.RestoreImport(ctx, target.ID, manifest, assets); err == nil {
		t.Fatal("expected restore to fail on duplicate preserved asset ID")
	}
	var campaignCount int64
	requireArchiveNoError(t, targetDB.Model(&dbmodels.CampaignEntity{}).Where("owner_user_id = ?", target.ID).Count(&campaignCount).Error)
	if campaignCount != 0 {
		t.Fatalf("expected rollback to leave no target campaigns, got %d", campaignCount)
	}
}

type archiveFixtureIDs struct {
	campaignID  string
	assetID     string
	npcID       string
	playerID    string
	itemID      string
	spellID     string
	encounterID string
	shopID      string
	dungeonID   string
	roomID      string
	mapID       string
	journeyID   string
	rollTableID string
}

type archiveBundleCase struct {
	name      string
	bundle    string
	campaigns []string
	objects   []string
}

func archiveBundleCases(fixture archiveFixtureIDs) []archiveBundleCase {
	return []archiveBundleCase{
		{name: "Everything", bundle: "everything"},
		{name: "Campaign", bundle: "campaign", campaigns: []string{fixture.campaignID}},
		{name: "Dungeon", bundle: "dungeon", objects: []string{fixture.dungeonID}},
		{name: "Shop", bundle: "shop", objects: []string{fixture.shopID}},
		{name: "Encounter", bundle: "encounter", objects: []string{fixture.encounterID}},
		{name: "NPC", bundle: "npc", objects: []string{fixture.npcID}},
		{name: "Player", bundle: "player", objects: []string{fixture.playerID}},
		{name: "Item", bundle: "item", objects: []string{fixture.itemID}},
		{name: "Spell", bundle: "spell", objects: []string{fixture.spellID}},
		{name: "Map", bundle: "map", objects: []string{fixture.mapID}},
		{name: "Journey", bundle: "journey", objects: []string{fixture.journeyID}},
		{name: "RollTable", bundle: "roll-table", objects: []string{fixture.rollTableID}},
	}
}

func (tc archiveBundleCase) withFixture(fixture archiveFixtureIDs) archiveBundleCase {
	for _, candidate := range archiveBundleCases(fixture) {
		if candidate.bundle == tc.bundle {
			return candidate
		}
	}
	return tc
}

func seedArchiveRoundTripFixture(t *testing.T, db *gorm.DB, ownerUserID string) archiveFixtureIDs {
	t.Helper()
	asset := dbmodels.UploadedAssetEntity{OwnerUserID: ownerUserID, Filename: "archive.png", ContentType: "image/png", ByteSize: 4, Data: []byte("data")}
	requireArchiveNoError(t, db.Create(&asset).Error)
	campaign := dbmodels.CampaignEntity{OwnerUserID: ownerUserID, Name: "Archive Coast", Description: "Archive fixture"}
	requireArchiveNoError(t, db.Create(&campaign).Error)
	npc := dbmodels.CreatureEntity{OwnerUserID: ownerUserID, Name: "Archive Scout", Size: "Medium", CreatureType: "humanoid", ArmorClass: 12, HitPoints: 9, ImageAssetID: &asset.ID, StatBlock: dbmodels.JSONMap{}}
	item := dbmodels.ItemEntity{OwnerUserID: ownerUserID, Name: "Archive Key", Category: "gear", Data: dbmodels.JSONMap{}}
	spell := dbmodels.SpellEntity{OwnerUserID: ownerUserID, Name: "Archive Light", Level: 0, School: "evocation", Components: dbmodels.JSONMap{}, Mechanics: dbmodels.JSONMap{}}
	requireArchiveNoError(t, db.Create(&npc).Error)
	requireArchiveNoError(t, db.Create(&item).Error)
	requireArchiveNoError(t, db.Create(&spell).Error)
	player := dbmodels.PlayerEntity{OwnerUserID: ownerUserID, CampaignID: &campaign.ID, CharacterName: "Archivist", PlayerName: "QA", ArmorClass: 14, MaxHitPoints: 12, CurrentHitPoints: 12, CharacterSheet: dbmodels.JSONMap{}, ImageAssetID: &asset.ID}
	requireArchiveNoError(t, db.Create(&player).Error)
	requireArchiveNoError(t, db.Create(&dbmodels.CampaignCreatureEntity{CampaignID: campaign.ID, CreatureID: npc.ID, Disposition: "neutral"}).Error)
	shop := dbmodels.CampaignLocationEntity{CampaignID: campaign.ID, Name: "Archive Shop", LocationType: "shop", MapAnchor: dbmodels.JSONMap{}}
	dungeon := dbmodels.CampaignLocationEntity{CampaignID: campaign.ID, Name: "Archive Dungeon", LocationType: "dungeon", MapAnchor: dbmodels.JSONMap{}}
	requireArchiveNoError(t, db.Create(&shop).Error)
	requireArchiveNoError(t, db.Create(&dungeon).Error)
	room := dbmodels.CampaignLocationEntity{CampaignID: campaign.ID, ParentLocationID: &dungeon.ID, Name: "Archive Room", LocationType: "room", MapAnchor: dbmodels.JSONMap{}}
	requireArchiveNoError(t, db.Create(&room).Error)
	requireArchiveNoError(t, db.Create(&dbmodels.CampaignLocationStockEntity{CampaignID: campaign.ID, LocationID: shop.ID, ItemID: item.ID, LibrarySource: "user", Quantity: 1}).Error)
	campaignMap := dbmodels.CampaignMapEntity{CampaignID: campaign.ID, ParentLocationID: &dungeon.ID, Name: "Archive Map", MapType: "dungeon", Mode: "image", ImageAssetID: &asset.ID, Metadata: dbmodels.JSONMap{"studio": true}}
	requireArchiveNoError(t, db.Create(&campaignMap).Error)
	requireArchiveNoError(t, db.Create(&dbmodels.CampaignMapPinEntity{CampaignID: campaign.ID, MapID: campaignMap.ID, LocationID: room.ID, X: 1, Y: 2, Metadata: dbmodels.JSONMap{}}).Error)
	encounter := dbmodels.EncounterEntity{CampaignID: campaign.ID, Name: "Archive Encounter", LocationID: &room.ID, BackgroundAssetID: &asset.ID}
	requireArchiveNoError(t, db.Create(&encounter).Error)
	requireArchiveNoError(t, db.Create(&dbmodels.EncounterCombatantEntity{EncounterID: encounter.ID, SourceType: "creature", CreatureID: &npc.ID, Side: "enemy", DisplayName: npc.Name, Snapshot: dbmodels.JSONMap{}}).Error)
	journey := dbmodels.CampaignJourneyEntity{CampaignID: campaign.ID, Name: "Archive Road", Origin: "A", Destination: "B", Distance: 5, DistanceUnit: "miles", Terrain: "road", Pace: "normal", Weather: dbmodels.JSONMap{}, RouteInputMode: "route"}
	requireArchiveNoError(t, db.Create(&journey).Error)
	rollTable := dbmodels.RollTableEntity{CampaignID: &campaign.ID, Source: "campaign", Name: "Archive Table", Category: "custom", DieExpression: "1d6"}
	requireArchiveNoError(t, db.Create(&rollTable).Error)
	requireArchiveNoError(t, db.Create(&dbmodels.RollTableRowEntity{TableID: rollTable.ID, MinRoll: 1, MaxRoll: 1, Label: "One", ResultText: "Result"}).Error)
	return archiveFixtureIDs{campaignID: campaign.ID, assetID: asset.ID, npcID: npc.ID, playerID: player.ID, itemID: item.ID, spellID: spell.ID, encounterID: encounter.ID, shopID: shop.ID, dungeonID: dungeon.ID, roomID: room.ID, mapID: campaignMap.ID, journeyID: journey.ID, rollTableID: rollTable.ID}
}

func verifyRestoreManifestRows(t *testing.T, db *gorm.DB, ownerUserID string, manifest store.PortableManifest) {
	t.Helper()
	verifyOwnerIDs(t, db, "campaigns", ownerUserID, idsFromArchive(manifest.Campaigns, func(entity dbmodels.CampaignEntity) string { return entity.ID }))
	verifyOwnerIDs(t, db, "uploaded_assets", ownerUserID, idsFromArchive(manifest.Assets, func(entity store.ExportAsset) string { return entity.ID }))
	verifyOwnerIDs(t, db, "creatures", ownerUserID, idsFromArchive(manifest.NPCs, func(entity dbmodels.CreatureEntity) string { return entity.ID }))
	verifyOwnerIDs(t, db, "players", ownerUserID, idsFromArchive(manifest.Players, func(entity dbmodels.PlayerEntity) string { return entity.ID }))
	verifyOwnerIDs(t, db, "items", ownerUserID, idsFromArchive(manifest.Items, func(entity dbmodels.ItemEntity) string { return entity.ID }))
	verifyOwnerIDs(t, db, "spells", ownerUserID, idsFromArchive(manifest.Spells, func(entity dbmodels.SpellEntity) string { return entity.ID }))
	verifyTableIDs(t, db, "campaign_locations", idsFromArchive(manifest.Locations, func(entity dbmodels.CampaignLocationEntity) string { return entity.ID }))
	verifyTableIDs(t, db, "campaign_maps", idsFromArchive(manifest.Maps, func(entity dbmodels.CampaignMapEntity) string { return entity.ID }))
	verifyTableIDs(t, db, "campaign_map_pins", idsFromArchive(manifest.MapPins, func(entity dbmodels.CampaignMapPinEntity) string { return entity.ID }))
	verifyTableIDs(t, db, "encounters", idsFromArchive(manifest.Encounters, func(entity dbmodels.EncounterEntity) string { return entity.ID }))
	verifyTableIDs(t, db, "encounter_combatants", idsFromArchive(manifest.Combatants, func(entity dbmodels.EncounterCombatantEntity) string { return entity.ID }))
	verifyTableIDs(t, db, "campaign_journeys", idsFromArchive(manifest.Journeys, func(entity dbmodels.CampaignJourneyEntity) string { return entity.ID }))
	verifyTableIDs(t, db, "roll_tables", idsFromArchive(manifest.RollTables, func(entity dbmodels.RollTableEntity) string { return entity.ID }))
	verifyTableIDs(t, db, "roll_table_rows", idsFromArchive(manifest.RollTableRows, func(entity dbmodels.RollTableRowEntity) string { return entity.ID }))
	if len(manifest.DependencyGraph.Nodes) == 0 {
		t.Fatal("expected restored archive to retain graph metadata in manifest")
	}
}

func verifyOwnerIDs(t *testing.T, db *gorm.DB, tableName, ownerUserID string, ids []string) {
	t.Helper()
	if len(ids) == 0 {
		return
	}
	var count int64
	requireArchiveNoError(t, db.Table(tableName).Where("owner_user_id = ? and id in ?", ownerUserID, ids).Count(&count).Error)
	if count != int64(len(ids)) {
		t.Fatalf("expected %d restored %s rows owned by target, got %d", len(ids), tableName, count)
	}
}

func verifyTableIDs(t *testing.T, db *gorm.DB, tableName string, ids []string) {
	t.Helper()
	if len(ids) == 0 {
		return
	}
	var count int64
	requireArchiveNoError(t, db.Table(tableName).Where("id in ?", ids).Count(&count).Error)
	if count != int64(len(ids)) {
		t.Fatalf("expected %d restored %s rows, got %d", len(ids), tableName, count)
	}
}

func idsFromArchive[T any](values []T, id func(T) string) []string {
	ids := make([]string, 0, len(values))
	for _, value := range values {
		if raw := id(value); raw != "" {
			ids = append(ids, raw)
		}
	}
	return ids
}

func newImportExportArchiveTestStores(t *testing.T) (*gorm.DB, *store.Stores) {
	t.Helper()
	databaseURL := os.Getenv("BLUDM_TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("set BLUDM_TEST_DATABASE_URL to run archive round-trip integration tests")
	}
	admin, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	requireArchiveNoError(t, err)
	schemaName := fmt.Sprintf("archive_test_%d", time.Now().UnixNano())
	requireArchiveNoError(t, admin.Exec(`create extension if not exists pgcrypto`).Error)
	requireArchiveNoError(t, admin.Exec(`create schema `+schemaName).Error)
	t.Cleanup(func() {
		_ = admin.Exec(`drop schema if exists ` + schemaName + ` cascade`).Error
	})
	db, err := gorm.Open(postgres.Open(databaseURLWithArchiveSearchPath(t, databaseURL, schemaName)), &gorm.Config{})
	requireArchiveNoError(t, err)
	requireArchiveNoError(t, db.AutoMigrate(archiveTestSchemaEntities()...))
	requireArchiveNoError(t, ensureArchiveTestStandardReferenceTables(db))
	return db, store.New(db)
}

func databaseURLWithArchiveSearchPath(t *testing.T, databaseURL, schemaName string) string {
	t.Helper()
	parsed, err := url.Parse(databaseURL)
	requireArchiveNoError(t, err)
	query := parsed.Query()
	query.Set("search_path", schemaName+",public")
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func archiveTestSchemaEntities() []any {
	return []any{
		&dbmodels.UserEntity{}, &dbmodels.AuthIdentityEntity{}, &dbmodels.OAuthStateEntity{}, &dbmodels.SessionEntity{}, &dbmodels.APITokenEntity{},
		&dbmodels.OIDCSubjectLinkEntity{}, &dbmodels.CampaignEntity{}, &dbmodels.APITokenCampaignEntity{},
		&dbmodels.UploadedAssetEntity{}, &dbmodels.CreatureEntity{}, &dbmodels.SpellEntity{},
		&dbmodels.SpellProjectileScalingEntity{}, &dbmodels.SpellActionEntity{}, &dbmodels.SpellActionRollPartEntity{},
		&dbmodels.ActionTemplateEntity{}, &dbmodels.ActionTemplateRollPartEntity{}, &dbmodels.CreatureActionEntity{},
		&dbmodels.CreatureActionRollPartEntity{}, &dbmodels.CreatureSpellcastingProfileEntity{}, &dbmodels.CreatureSpellEntity{},
		&dbmodels.PlayerEntity{}, &dbmodels.CampaignCreatureEntity{}, &dbmodels.EncounterEntity{}, &dbmodels.EncounterCombatantEntity{},
		&dbmodels.EncounterRevisionEntity{}, &dbmodels.IdempotencyRecordEntity{}, &dbmodels.AuthoringPreviewEntity{},
		&dbmodels.ExternalAuditRecordEntity{},
		&dbmodels.EncounterRunEntity{}, &dbmodels.EncounterRunCombatantEntity{}, &dbmodels.EncounterRunSpellSlotEntity{},
		&dbmodels.EncounterRunActiveEffectEntity{}, &dbmodels.EncounterRunAlertEntity{}, &dbmodels.CombatLogEventEntity{},
		&dbmodels.ItemEntity{}, &dbmodels.CampaignLocationEntity{}, &dbmodels.CampaignLocationLinkEntity{},
		&dbmodels.CampaignNpcLocationLinkEntity{}, &dbmodels.CampaignLocationStockEntity{}, &dbmodels.CampaignMapEntity{},
		&dbmodels.CampaignMapPinEntity{}, &dbmodels.CampaignJourneyEntity{}, &dbmodels.RollTableEntity{},
		&dbmodels.RollTableRowEntity{}, &dbmodels.ImportExportHistoryEntity{},
	}
}

func ensureArchiveTestStandardReferenceTables(db *gorm.DB) error {
	statements := []string{
		`create table if not exists standard_sources (
			source_key text primary key,
			label text not null default '',
			ruleset text not null default '',
			license_name text not null default '',
			source_url text not null default '',
			attribution text not null default '',
			created_at timestamptz not null default now(), updated_at timestamptz not null default now()
		)`,
		`create table if not exists standard_library_entries (
			id uuid primary key default gen_random_uuid(),
			source_key text not null,
			category text not null,
			slug text not null,
			name text not null,
			summary text not null default '',
			description text not null default '',
			data jsonb not null default '{}'::jsonb,
			created_at timestamptz not null default now(), updated_at timestamptz not null default now()
		)`,
		`create table if not exists standard_creatures (
			id uuid primary key default gen_random_uuid(),
			source_key text not null default '',
			slug text not null default '',
			name text not null default '',
			description text not null default '',
			size text not null default '',
			creature_type text not null default '',
			alignment text not null default '',
			armor_class integer not null default 10,
			hit_points integer not null default 1,
			hit_dice text not null default '',
			challenge_rating text not null default '',
			xp integer not null default 0,
			avatar_url text not null default '',
			source_label text not null default '',
			source_url text not null default '',
			license_name text not null default '',
			stat_block jsonb not null default '{}'::jsonb,
			created_at timestamptz not null default now(),
			updated_at timestamptz not null default now()
		)`,
		`create table if not exists standard_spells (
			id uuid primary key default gen_random_uuid(),
			source_key text not null default '',
			slug text not null default '',
			name text not null default '',
			level integer not null default 0,
			school text not null default '',
			casting_time text not null default '',
			spell_range text not null default '',
			components jsonb not null default '{}'::jsonb,
			duration text not null default '',
			ritual boolean not null default false,
			concentration boolean not null default false,
			description text not null default '',
			higher_level text not null default '',
			source_note text not null default '',
			source_label text not null default '',
			source_url text not null default '',
			license_name text not null default '',
			mechanics jsonb not null default '{}'::jsonb,
			created_at timestamptz not null default now(),
			updated_at timestamptz not null default now()
		)`,
		`create table if not exists standard_spell_projectile_scaling (
			standard_spell_id uuid primary key,
			base_projectiles integer not null default 1,
			scaling_type text not null default 'none',
			scale_from_level integer not null default 0,
			additional_projectiles integer not null default 0,
			step_size integer not null default 1,
			description text not null default '',
			cantrip_scaling jsonb not null default '{}'::jsonb
		)`,
		`create table if not exists standard_spell_actions (
			id uuid primary key default gen_random_uuid(),
			standard_spell_id uuid not null,
			name text not null default '',
			sort_order integer not null default 0,
			action_type text not null default 'damage',
			save_ability text not null default '',
			successful_save_effect text not null default 'none',
			attack_modifier integer not null default 0,
			hit_special_event text not null default 'none',
			weapon_source text not null default '',
			attack_ability_override text not null default '',
			damage_ability_override text not null default '',
			damage_type_choice text not null default '',
			damage_type_options text[] not null default '{}'::text[]
		)`,
		`create table if not exists standard_spell_action_roll_parts (
			id uuid primary key default gen_random_uuid(),
			standard_spell_action_id uuid not null,
			sort_order integer not null default 0,
			roll_kind text not null default 'damage',
			damage_type text not null default '',
			magical boolean not null default false,
			dice_count integer not null default 1,
			die_size integer not null default 6,
			fixed_value integer not null default 0
		)`,
	}
	for _, statement := range statements {
		if err := db.Exec(statement).Error; err != nil {
			return err
		}
	}
	return nil
}

func uniqueArchiveEmail(prefix string) string {
	return fmt.Sprintf("%s-%d@example.test", prefix, time.Now().UnixNano())
}
