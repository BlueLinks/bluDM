package store

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"
	"testing"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestStoreOwnershipBoundaries(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()

	owner, err := stores.Auth.CreateUser(ctx, uniqueEmail("owner"), "hash")
	requireNoError(t, err)
	other, err := stores.Auth.CreateUser(ctx, uniqueEmail("other"), "hash")
	requireNoError(t, err)

	campaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Owned Campaign"})
	requireNoError(t, err)
	assetID, err := stores.Assets.Create(ctx, owner.ID, "avatar.png", "image/png", 4, []byte("data"))
	requireNoError(t, err)
	creature, err := stores.Creatures.Create(ctx, owner.ID, CreatureInput{Name: "Owned Creature", ArmorClass: 12, HitPoints: 8, StatBlock: map[string]any{}})
	requireNoError(t, err)
	player, err := stores.Players.Create(ctx, owner.ID, PlayerInput{
		CampaignID:       campaign.ID,
		CharacterName:    "Owned Hero",
		PlayerName:       "Player",
		ArmorClass:       14,
		MaxHitPoints:     10,
		CharacterSheet:   map[string]any{},
		ExperiencePoints: 1,
	})
	requireNoError(t, err)
	spell, err := stores.Spells.Create(ctx, owner.ID, SpellInput{Name: "Owned Spell", Components: map[string]any{}, Mechanics: map[string]any{}})
	requireNoError(t, err)
	action, err := stores.Actions.CreateTemplate(ctx, owner.ID, ActionInput{Name: "Owned Action", ActionType: "melee_weapon"})
	requireNoError(t, err)
	item, err := stores.Items.Create(ctx, owner.ID, ItemInput{Name: "Owned Item", Data: map[string]any{}, Damage: map[string]any{}, ArmorClass: map[string]any{}})
	requireNoError(t, err)
	encounter, err := stores.Campaigns.CreateEncounter(ctx, owner.ID, campaign.ID, CampaignEncounterInput{Name: "Owned Encounter"})
	requireNoError(t, err)
	run, err := stores.Runs.StartEncounter(ctx, owner.ID, encounter.ID, false)
	requireNoError(t, err)
	table, err := stores.RollTables.Create(ctx, owner.ID, campaign.ID, RollTableInput{
		Name:          "Owned Table",
		Category:      "custom",
		DieExpression: "1d1",
		Rows:          []RollTableRowInput{{MinRoll: 1, MaxRoll: 1, Label: "Only", ResultText: "Result"}},
	})
	requireNoError(t, err)
	location, err := stores.Travel.CreateLocation(ctx, owner.ID, campaign.ID, LocationInput{Name: "Owned Location"})
	requireNoError(t, err)
	journey, err := stores.Travel.CreateJourney(ctx, owner.ID, campaign.ID, JourneyInput{
		Name:           "Owned Journey",
		Origin:         "A",
		Destination:    "B",
		Distance:       1,
		DistanceUnit:   "miles",
		Terrain:        "road",
		Pace:           "normal",
		Weather:        models.TravelWeather{},
		RouteInputMode: "route",
	})
	requireNoError(t, err)
	_, err = stores.Spellcasts.UpsertProfile(ctx, owner.ID, creature.ID, SpellcastingInput{
		SpellcastingAbility: "int",
		CasterLevel:         1,
		Slots:               map[string]any{},
		Spells:              []CreatureSpellInput{{SpellID: spell.ID, LibrarySource: "user", SpellLevel: spell.Level, Prepared: true}},
	})
	requireNoError(t, err)

	tests := []struct {
		name string
		call func() error
	}{
		{name: "campaign", call: func() error { _, err := stores.Campaigns.ByID(ctx, other.ID, campaign.ID); return err }},
		{name: "asset", call: func() error { _, err := stores.Assets.DataByID(ctx, other.ID, assetID); return err }},
		{name: "creature", call: func() error { _, err := stores.Creatures.ByID(ctx, other.ID, creature.ID); return err }},
		{name: "player", call: func() error { _, err := stores.Players.ByID(ctx, other.ID, player.ID); return err }},
		{name: "spell", call: func() error { _, err := stores.Spells.ByID(ctx, other.ID, spell.ID, "user"); return err }},
		{name: "spellcasting", call: func() error { _, err := stores.Spellcasts.Profile(ctx, other.ID, creature.ID); return err }},
		{name: "action template", call: func() error { _, err := stores.Actions.TemplateByID(ctx, other.ID, action.ID); return err }},
		{name: "item", call: func() error { _, err := stores.Items.ByID(ctx, other.ID, item.ID); return err }},
		{name: "encounter", call: func() error { _, err := stores.Encounters.ByID(ctx, other.ID, encounter.ID); return err }},
		{name: "run", call: func() error { _, err := stores.Runs.ByID(ctx, other.ID, run.ID); return err }},
		{name: "roll table", call: func() error { _, err := stores.RollTables.ByID(ctx, other.ID, campaign.ID, table.ID); return err }},
		{name: "location", call: func() error {
			_, err := stores.Travel.UpdateLocation(ctx, other.ID, campaign.ID, location.ID, LocationInput{Name: "Nope"})
			return err
		}},
		{name: "journey", call: func() error {
			_, err := stores.Travel.UpdateJourney(ctx, other.ID, campaign.ID, journey.ID, JourneyInput{Name: "Nope"})
			return err
		}},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if err := test.call(); !errors.Is(err, ErrNotFound) {
				t.Fatalf("expected ErrNotFound for cross-user %s access, got %v", test.name, err)
			}
		})
	}
}

func TestDeleteUserRemovesOwnedData(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()

	owner, err := stores.Auth.CreateUser(ctx, uniqueEmail("delete-owner"), "hash")
	requireNoError(t, err)
	other, err := stores.Auth.CreateUser(ctx, uniqueEmail("delete-other"), "hash")
	requireNoError(t, err)

	campaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Delete Me"})
	requireNoError(t, err)
	_, err = stores.Campaigns.Create(ctx, other.ID, CampaignInput{Name: "Keep Me"})
	requireNoError(t, err)

	assetID, err := stores.Assets.Create(ctx, owner.ID, "avatar.png", "image/png", 4, []byte("data"))
	requireNoError(t, err)
	creature, err := stores.Creatures.Create(ctx, owner.ID, CreatureInput{Name: "Delete Creature", ArmorClass: 12, HitPoints: 8, StatBlock: map[string]any{}})
	requireNoError(t, err)
	player, err := stores.Players.Create(ctx, owner.ID, PlayerInput{
		CampaignID:       campaign.ID,
		CharacterName:    "Delete Hero",
		PlayerName:       "Player",
		ArmorClass:       14,
		MaxHitPoints:     10,
		CharacterSheet:   map[string]any{},
		ExperiencePoints: 1,
	})
	requireNoError(t, err)
	spell, err := stores.Spells.Create(ctx, owner.ID, SpellInput{Name: "Delete Spell", Components: map[string]any{}, Mechanics: map[string]any{}})
	requireNoError(t, err)
	_, err = stores.Actions.CreateTemplate(ctx, owner.ID, ActionInput{Name: "Delete Action", ActionType: "melee_weapon"})
	requireNoError(t, err)
	_, err = stores.Items.Create(ctx, owner.ID, ItemInput{Name: "Delete Item", Data: map[string]any{}, Damage: map[string]any{}, ArmorClass: map[string]any{}})
	requireNoError(t, err)
	encounter, err := stores.Campaigns.CreateEncounter(ctx, owner.ID, campaign.ID, CampaignEncounterInput{Name: "Delete Encounter"})
	requireNoError(t, err)
	_, err = stores.Runs.StartEncounter(ctx, owner.ID, encounter.ID, false)
	requireNoError(t, err)
	_, err = stores.RollTables.Create(ctx, owner.ID, campaign.ID, RollTableInput{
		Name:          "Delete Table",
		Category:      "custom",
		DieExpression: "1d1",
		Rows:          []RollTableRowInput{{MinRoll: 1, MaxRoll: 1, Label: "Only", ResultText: "Result"}},
	})
	requireNoError(t, err)
	_, err = stores.Travel.CreateLocation(ctx, owner.ID, campaign.ID, LocationInput{Name: "Delete Location"})
	requireNoError(t, err)
	_, err = stores.Travel.CreateJourney(ctx, owner.ID, campaign.ID, JourneyInput{
		Name:           "Delete Journey",
		Origin:         "A",
		Destination:    "B",
		Distance:       1,
		DistanceUnit:   "miles",
		Terrain:        "road",
		Pace:           "normal",
		Weather:        models.TravelWeather{},
		RouteInputMode: "route",
	})
	requireNoError(t, err)
	_, err = stores.Spellcasts.UpsertProfile(ctx, owner.ID, creature.ID, SpellcastingInput{
		SpellcastingAbility: "int",
		CasterLevel:         1,
		Slots:               map[string]any{},
		Spells:              []CreatureSpellInput{{SpellID: spell.ID, LibrarySource: "user", SpellLevel: spell.Level, Prepared: true}},
	})
	requireNoError(t, err)
	requireNoError(t, stores.Auth.StartSession(ctx, owner.ID, "token-hash", time.Now().Add(time.Hour)))
	requireNoError(t, stores.Auth.LinkOAuthIdentity(ctx, owner.ID, "discord", OAuthIdentityInput{
		Subject:       "discord-user",
		Email:         owner.Email,
		EmailVerified: true,
	}))
	requireNoError(t, stores.Auth.CreateOAuthState(ctx, OAuthStateInput{
		StateHash:    "state-hash",
		Provider:     "discord",
		Nonce:        "nonce",
		PKCEVerifier: "verifier",
		Purpose:      "login",
		UserID:       owner.ID,
		ReturnTo:     "/account",
		ExpiresAt:    time.Now().Add(time.Hour),
	}))

	requireNoError(t, stores.Auth.DeleteUser(ctx, owner.ID))

	for _, table := range []string{
		"sessions",
		"auth_identities",
		"oauth_states",
		"uploaded_assets",
		"creatures",
		"creature_spellcasting_profiles",
		"creature_spells",
		"players",
		"spells",
		"action_templates",
		"items",
		"encounters",
		"encounter_combatants",
		"encounter_runs",
		"encounter_run_combatants",
		"encounter_run_spell_slots",
		"roll_tables",
		"roll_table_rows",
		"campaign_locations",
		"campaign_journeys",
		"campaign_creatures",
	} {
		requireTableCount(t, stores.db, table, 0)
	}

	requireTableCountForWhere(t, stores.db, "users", "id = ?", []any{owner.ID}, 0)
	requireTableCountForWhere(t, stores.db, "users", "id = ?", []any{other.ID}, 1)
	requireTableCountForWhere(t, stores.db, "campaigns", "owner_user_id = ?", []any{owner.ID}, 0)
	requireTableCountForWhere(t, stores.db, "campaigns", "owner_user_id = ?", []any{other.ID}, 1)
	requireTableCountForWhere(t, stores.db, "uploaded_assets", "id = ?", []any{assetID}, 0)
	requireTableCountForWhere(t, stores.db, "players", "id = ?", []any{player.ID}, 0)
}

func TestStartEncounterSetsStartedAt(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()

	owner, err := stores.Auth.CreateUser(ctx, uniqueEmail("run-owner"), "hash")
	requireNoError(t, err)
	campaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Run Campaign"})
	requireNoError(t, err)
	encounter, err := stores.Campaigns.CreateEncounter(ctx, owner.ID, campaign.ID, CampaignEncounterInput{Name: "Run Encounter"})
	requireNoError(t, err)

	run, err := stores.Runs.StartEncounter(ctx, owner.ID, encounter.ID, false)
	requireNoError(t, err)
	if run.StartedAt.IsZero() {
		t.Fatal("expected encounter run started_at to be set")
	}

	var entity dbmodels.EncounterRunEntity
	requireNoError(t, stores.db.WithContext(ctx).Where("id = ?", run.ID).First(&entity).Error)
	if entity.StartedAt.IsZero() {
		t.Fatal("expected persisted encounter run started_at to be set")
	}
}

func newIntegrationStores(t *testing.T) *Stores {
	t.Helper()
	databaseURL := os.Getenv("BLUDM_TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("set BLUDM_TEST_DATABASE_URL to run store integration tests")
	}

	admin, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	requireNoError(t, err)
	schemaName := fmt.Sprintf("store_test_%d", time.Now().UnixNano())
	requireNoError(t, admin.Exec(`create extension if not exists pgcrypto`).Error)
	requireNoError(t, admin.Exec(`create schema `+schemaName).Error)
	t.Cleanup(func() {
		_ = admin.Exec(`drop schema if exists ` + schemaName + ` cascade`).Error
	})

	db, err := gorm.Open(postgres.Open(databaseURLWithSearchPath(t, databaseURL, schemaName)), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: false,
	})
	requireNoError(t, err)
	requireNoError(t, db.AutoMigrate(testSchemaEntities()...))
	requireNoError(t, ensureTestStandardReferenceTables(db))
	return New(db)
}

func databaseURLWithSearchPath(t *testing.T, databaseURL, schemaName string) string {
	t.Helper()
	parsed, err := url.Parse(databaseURL)
	requireNoError(t, err)
	query := parsed.Query()
	query.Set("search_path", schemaName+",public")
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func testSchemaEntities() []any {
	return []any{
		&dbmodels.UserEntity{},
		&dbmodels.AuthIdentityEntity{},
		&dbmodels.OAuthStateEntity{},
		&dbmodels.SessionEntity{},
		&dbmodels.APITokenEntity{},
		&dbmodels.CampaignEntity{},
		&dbmodels.UploadedAssetEntity{},
		&dbmodels.CreatureEntity{},
		&dbmodels.SpellEntity{},
		&dbmodels.SpellProjectileScalingEntity{},
		&dbmodels.SpellActionEntity{},
		&dbmodels.SpellActionRollPartEntity{},
		&dbmodels.ActionTemplateEntity{},
		&dbmodels.ActionTemplateRollPartEntity{},
		&dbmodels.CreatureActionEntity{},
		&dbmodels.CreatureActionRollPartEntity{},
		&dbmodels.CreatureSpellcastingProfileEntity{},
		&dbmodels.CreatureSpellEntity{},
		&dbmodels.PlayerEntity{},
		&dbmodels.CampaignCreatureEntity{},
		&dbmodels.EncounterEntity{},
		&dbmodels.EncounterCombatantEntity{},
		&dbmodels.EncounterRunEntity{},
		&dbmodels.EncounterRunCombatantEntity{},
		&dbmodels.EncounterRunSpellSlotEntity{},
		&dbmodels.EncounterRunActiveEffectEntity{},
		&dbmodels.EncounterRunAlertEntity{},
		&dbmodels.CombatLogEventEntity{},
		&dbmodels.ItemEntity{},
		&dbmodels.CampaignLocationEntity{},
		&dbmodels.CampaignLocationLinkEntity{},
		&dbmodels.CampaignNpcLocationLinkEntity{},
		&dbmodels.CampaignLocationStockEntity{},
		&dbmodels.CampaignMapEntity{},
		&dbmodels.CampaignMapPinEntity{},
		&dbmodels.CampaignJourneyEntity{},
		&dbmodels.RollTableEntity{},
		&dbmodels.RollTableRowEntity{},
		&dbmodels.ImportExportHistoryEntity{},
	}
}

func ensureTestStandardReferenceTables(db *gorm.DB) error {
	statements := []string{
		`create table if not exists standard_sources (
			source_key text primary key,
			label text not null default '',
			ruleset text not null default '',
			license_name text not null default '',
			source_url text not null default '',
			attribution text not null default '',
			created_at timestamptz not null default now(),
			updated_at timestamptz not null default now()
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
			created_at timestamptz not null default now(),
			updated_at timestamptz not null default now()
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

func uniqueEmail(prefix string) string {
	return fmt.Sprintf("%s-%d@example.test", prefix, time.Now().UnixNano())
}

func requireNoError(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatal(err)
	}
}

func requireTableCount(t *testing.T, db *gorm.DB, table string, want int64) {
	t.Helper()
	requireTableCountForWhere(t, db, table, "1 = 1", nil, want)
}

func requireTableCountForWhere(t *testing.T, db *gorm.DB, table, where string, args []any, want int64) {
	t.Helper()
	var got int64
	requireNoError(t, db.Table(table).Where(where, args...).Count(&got).Error)
	if got != want {
		t.Fatalf("expected %s count %d, got %d", table, want, got)
	}
}
