package app

import (
	"testing"

	"bludm/backend/internal/models"
)

func TestGeneratedCombatantStoresStandardCreatureReferenceInSnapshot(t *testing.T) {
	combatant, err := generatedCombatant(
		"encounter-1",
		models.Creature{
			ID: "standard-creature-1", Name: "Wolf", LibrarySource: "standard", XP: 50,
		},
		0,
		"batch-1",
		"generator-v1",
		42,
	)
	if err != nil {
		t.Fatalf("generatedCombatant() error = %v", err)
	}
	if combatant.CreatureID != nil {
		t.Fatalf("standard creature must not populate custom creature_id: %v", *combatant.CreatureID)
	}
	if combatant.Snapshot["standardCreatureId"] != "standard-creature-1" {
		t.Fatalf("standard creature reference missing from snapshot: %+v", combatant.Snapshot)
	}
	if integerFromAny(combatant.Snapshot["xp"]) != 50 {
		t.Fatalf("standard creature XP missing from snapshot: %+v", combatant.Snapshot)
	}
}

func TestGeneratedCombatantKeepsCustomCreatureForeignKey(t *testing.T) {
	combatant, err := generatedCombatant(
		"encounter-1",
		models.Creature{ID: "custom-creature-1", Name: "Wolf", LibrarySource: "user", XP: 50},
		0,
		"batch-1",
		"generator-v1",
		42,
	)
	if err != nil {
		t.Fatalf("generatedCombatant() error = %v", err)
	}
	if combatant.CreatureID == nil || *combatant.CreatureID != "custom-creature-1" {
		t.Fatalf("custom creature_id was not retained: %+v", combatant.CreatureID)
	}
	if _, ok := combatant.Snapshot["standardCreatureId"]; ok {
		t.Fatalf("custom creature was marked as standard: %+v", combatant.Snapshot)
	}
}
