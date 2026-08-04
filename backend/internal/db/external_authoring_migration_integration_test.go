package db

import (
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/lib/pq"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestExternalAuthoringMigrationPreservesLegacyTokenSafety(t *testing.T) {
	databaseURL := strings.TrimSpace(os.Getenv("BLUDM_TEST_DATABASE_URL"))
	if databaseURL == "" {
		t.Skip("BLUDM_TEST_DATABASE_URL is not configured")
	}
	database, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, err := database.DB()
	if err != nil {
		t.Fatal(err)
	}
	sqlDB.SetMaxOpenConns(1)
	schema := fmt.Sprintf("external_authoring_migration_%d", time.Now().UnixNano())
	if err := database.Exec("create schema " + schema).Error; err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := database.Exec("drop schema " + schema + " cascade").Error; err != nil {
			t.Errorf("drop migration test schema: %v", err)
		}
	}()
	if err := database.Exec("set search_path to " + schema + ",public").Error; err != nil {
		t.Fatal(err)
	}
	legacySchema := `
create table users (id uuid primary key);
create table campaigns (id uuid primary key);
create table api_tokens (
  id uuid primary key,
  user_id uuid not null,
  name text not null,
  token_hash text not null,
  token_prefix text not null,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create table creature_actions (id uuid primary key);
create table action_templates (id uuid primary key);
create table encounters (id uuid primary key);
insert into users (id) values ('00000000-0000-0000-0000-000000000001');
insert into campaigns (id) values ('00000000-0000-0000-0000-000000000002');
insert into api_tokens (id, user_id, name, token_hash, token_prefix)
values (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'legacy bridge', 'hash', 'bludm_v1_legacy'
);
insert into creature_actions (id) values ('00000000-0000-0000-0000-000000000004');
insert into action_templates (id) values ('00000000-0000-0000-0000-000000000005');
insert into encounters (id) values ('00000000-0000-0000-0000-000000000006');
`
	if err := database.Exec(legacySchema).Error; err != nil {
		t.Fatal(err)
	}
	migration, err := os.ReadFile("../../migrations/002_external_authoring.sql")
	if err != nil {
		t.Fatal(err)
	}
	if err := database.Exec(string(migration)).Error; err != nil {
		t.Fatal(err)
	}
	if err := database.Exec(string(migration)).Error; err != nil {
		t.Fatalf("forward migration is not restart-safe: %v", err)
	}
	var token struct {
		Scopes                  pq.StringArray `gorm:"type:text[]"`
		CampaignRestrictionMode string
		AuthenticationVersion   int
		RevokedAt               *time.Time
	}
	if err := database.Table("api_tokens").
		Where("id = ?", "00000000-0000-0000-0000-000000000003").
		Take(&token).Error; err != nil {
		t.Fatal(err)
	}
	if len(token.Scopes) != 0 || token.CampaignRestrictionMode != "legacy_all" ||
		token.AuthenticationVersion != 1 || token.RevokedAt != nil {
		t.Fatalf("legacy token silently gained authority: %+v", token)
	}
	var tokenCampaignCount int64
	if err := database.Table("api_token_campaigns").Count(&tokenCampaignCount).Error; err != nil {
		t.Fatal(err)
	}
	if tokenCampaignCount != 0 {
		t.Fatalf("legacy token unexpectedly received campaign grants: %d", tokenCampaignCount)
	}
	var actionSection, templateSection string
	if err := database.Table("creature_actions").Select("display_section").Scan(&actionSection).Error; err != nil {
		t.Fatal(err)
	}
	if err := database.Table("action_templates").Select("display_section").Scan(&templateSection).Error; err != nil {
		t.Fatal(err)
	}
	if actionSection != "action" || templateSection != "action" {
		t.Fatalf("existing action sections were guessed: action=%q template=%q", actionSection, templateSection)
	}
	var revision int
	if err := database.Table("encounters").Select("revision").Scan(&revision).Error; err != nil {
		t.Fatal(err)
	}
	if revision != 1 {
		t.Fatalf("existing encounter received an unsafe revision default: %d", revision)
	}
}
