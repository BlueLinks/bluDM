package app

import (
	"context"
	"reflect"
	"testing"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/generation"
)

func TestNormalizeBodyConstraintsPreservesOmittedRange(t *testing.T) {
	options, err := normalizeBodyConstraints(
		generation.EncounterOptions{EnemyCount: 4}, GenerateEncounterCommand{},
	)
	if err != nil {
		t.Fatal(err)
	}
	if options.EnemyCount != 4 {
		t.Fatalf("omitted range changed enemy count to %d", options.EnemyCount)
	}
}

func TestNormalizeGenerateEncounterCommandProducesStableEffectiveInput(t *testing.T) {
	key := "stable-generation-key"
	defaults, err := normalizeGenerateEncounterCommand(GenerateEncounterCommand{
		IdempotencyKey: key,
	})
	if err != nil {
		t.Fatal(err)
	}
	explicit, err := normalizeGenerateEncounterCommand(GenerateEncounterCommand{
		IdempotencyKey: key,
		Options: generation.EncounterOptions{
			Archetype: "monsters", Challenge: "medium", EnemyCount: 1,
			Terrain: "location-theme",
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(defaults, explicit) {
		t.Fatalf("equivalent generator inputs normalized differently:\n%+v\n%+v", defaults, explicit)
	}
	for name, command := range map[string]GenerateEncounterCommand{
		"difficulty": {Options: generation.EncounterOptions{Challenge: "impossible"}},
		"archetype":  {Options: generation.EncounterOptions{Archetype: "invented"}},
		"enemy count": {Options: generation.EncounterOptions{
			EnemyCount: 7,
		}},
	} {
		t.Run(name, func(t *testing.T) {
			if _, err := normalizeGenerateEncounterCommand(command); ErrorInfo(err).Code != CodeValidation {
				t.Fatalf("invalid generator input was accepted: %v", err)
			}
		})
	}
}

func TestIdempotencyKeyContractRejectsWeakKeys(t *testing.T) {
	for _, key := range []string{"", "short", " padded-key ", string(make([]byte, 257))} {
		_, _, err := idempotencyReplay[map[string]any](
			context.Background(), nil, Principal{}, "test", key, "hash",
		)
		if ErrorInfo(err).Code != CodeValidation {
			t.Fatalf("weak idempotency key %q was accepted: %v", key, err)
		}
	}
}

func TestNormalizeBodyConstraintsValidatesAndClampsExplicitRange(t *testing.T) {
	options, err := normalizeBodyConstraints(
		generation.EncounterOptions{EnemyCount: 1},
		GenerateEncounterCommand{MinimumEnemyBodies: 3, MaximumEnemyBodies: 5},
	)
	if err != nil {
		t.Fatal(err)
	}
	if options.EnemyCount != 3 {
		t.Fatalf("expected explicit floor to clamp count, got %d", options.EnemyCount)
	}
	_, err = normalizeBodyConstraints(
		generation.EncounterOptions{EnemyCount: 2},
		GenerateEncounterCommand{MinimumEnemyBodies: 5, MaximumEnemyBodies: 3},
	)
	if ErrorInfo(err).Code != CodeValidation {
		t.Fatalf("expected invalid range validation error, got %v", err)
	}
}

func TestApplyCombatantPatchPreservesProvenance(t *testing.T) {
	entity := dbmodels.EncounterCombatantEntity{
		ID: "combatant-1", Side: "enemy", DisplayName: "Wolf", ArmorClass: 13,
		MaxHitPoints: 11, CurrentHitPoints: 11,
		Snapshot: dbmodels.JSONMap{"authoringOrigin": "generator", "seed": 17},
	}
	name := "Dire Wolf"
	hp := 8
	if err := applyCombatantPatch(&entity, EncounterCombatantPatchCommand{
		CombatantID: entity.ID, DisplayName: &name, CurrentHitPoints: &hp,
	}); err != nil {
		t.Fatal(err)
	}
	if entity.DisplayName != name || entity.CurrentHitPoints != hp {
		t.Fatalf("targeted fields were not patched: %+v", entity)
	}
	if entity.Snapshot["authoringOrigin"] != "generator" || entity.Snapshot["seed"] != 17 {
		t.Fatalf("generator provenance was lost: %+v", entity.Snapshot)
	}
}
