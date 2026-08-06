package app

import (
	"strings"
	"testing"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/generation"
	"bludm/backend/internal/models"
)

func TestDifficultyFromStoredRosterIncludesPreservedEnemies(t *testing.T) {
	players := []models.Player{{
		CharacterName: "Ari",
		CharacterSheet: map[string]any{
			"level": 4,
		},
	}}
	creatureID := "wolf"
	combatants := []dbmodels.EncounterCombatantEntity{
		{
			SourceType: "creature", CreatureID: &creatureID, Side: "enemy",
			DisplayName: "Wolf", Snapshot: dbmodels.JSONMap{"xp": float64(50)},
		},
		{
			SourceType: "inline", Side: "enemy", DisplayName: "Snare",
			Snapshot: dbmodels.JSONMap{"xp": 100},
		},
		{
			SourceType: "inline", Side: "ally", DisplayName: "Guard",
			Snapshot: dbmodels.JSONMap{},
		},
	}

	evidence := difficultyFromStoredRoster(
		players, combatants, "medium", generation.DifficultyRuleset,
	)

	if evidence.RawXP != 150 || evidence.EnemyCount != 2 {
		t.Fatalf("expected the final roster in evidence, got %+v", evidence)
	}
	if evidence.RequestedDifficulty != "Medium" {
		t.Fatalf("expected requested target to be retained, got %+v", evidence)
	}
	if !warningsContain(evidence.Warnings, "not included") {
		t.Fatalf("expected explicit ally budgeting warning, got %v", evidence.Warnings)
	}
}

func warningsContain(warnings []string, fragment string) bool {
	for _, warning := range warnings {
		if strings.Contains(warning, fragment) {
			return true
		}
	}
	return false
}
