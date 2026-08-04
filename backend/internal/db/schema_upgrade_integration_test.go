package db

import (
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestAutoMigrateUpgradesInitialSQLSchema(t *testing.T) {
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
	schema := fmt.Sprintf("initial_schema_upgrade_%d", time.Now().UnixNano())
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

	initialSchema, err := os.ReadFile("../../migrations/001_initial.sql")
	if err != nil {
		t.Fatal(err)
	}
	if err := database.Exec(string(initialSchema)).Error; err != nil {
		t.Fatal(err)
	}
	for run := 1; run <= 2; run++ {
		if err := database.AutoMigrate(schemaEntities()...); err != nil {
			t.Fatalf("AutoMigrate run %d failed: %v", run, err)
		}
	}

	for _, table := range []string{"users", "sessions", "authoring_previews"} {
		var uniqueConstraints int64
		if err := database.Raw(`
select count(*)
from pg_constraint
where contype = 'u' and conrelid = ?::regclass
`, table).Scan(&uniqueConstraints).Error; err != nil {
			t.Fatal(err)
		}
		if uniqueConstraints != 1 {
			t.Fatalf("%s has %d unique constraints, want 1", table, uniqueConstraints)
		}
	}

	var identity, nullable string
	if err := database.Raw(`
select is_identity, is_nullable
from information_schema.columns
where table_schema = current_schema()
  and table_name = 'combat_log_events'
  and column_name = 'sequence'
`).Row().Scan(&identity, &nullable); err != nil {
		t.Fatal(err)
	}
	if identity != "YES" || nullable != "NO" {
		t.Fatalf("combat log sequence changed: identity=%s nullable=%s", identity, nullable)
	}
}
