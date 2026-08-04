package app

import (
	"testing"

	"bludm/backend/internal/generation"
	"bludm/backend/internal/models"
)

func TestBrowserPreviewFingerprintMatchesSubmittedRoster(t *testing.T) {
	preview := generation.EncounterPreview{Enemies: []generation.EncounterEnemy{
		{Creature: models.Creature{ID: "wolf"}, Quantity: 2, Side: "enemy"},
		{Creature: models.Creature{ID: "bear"}, Quantity: 1, Side: "enemy", RolledHP: true},
	}}
	submitted := []EncounterCombatantCommand{
		{SourceType: "player", PlayerID: "player-1", Side: "ally"},
		{SourceType: "creature", CreatureID: "bear", Side: "enemy", RolledHP: true},
		{SourceType: "creature", CreatureID: "wolf", Side: "enemy"},
		{SourceType: "creature", CreatureID: "wolf", Side: "enemy"},
		{SourceType: "creature", CreatureID: "ally", Side: "ally"},
	}
	fingerprint := EncounterPreviewFingerprint(preview)
	if fingerprint == "" || fingerprint != authoredEnemyRosterFingerprint(submitted) {
		t.Fatalf("preview and submitted roster fingerprints differ: %s %s",
			fingerprint, authoredEnemyRosterFingerprint(submitted))
	}
	submitted[3].CreatureID = "different-wolf"
	if fingerprint == authoredEnemyRosterFingerprint(submitted) {
		t.Fatal("a changed browser roster retained the accepted preview fingerprint")
	}
}
