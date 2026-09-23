package app

import (
	"testing"

	"bludm/backend/internal/generation"
	"bludm/backend/internal/models"
	"bludm/backend/internal/rulesets"
)

func TestEncounterDifficultyInputsSupportLegacyNestedSnapshots(t *testing.T) {
	combatants := []models.EncounterCombatant{
		{
			SourceType: "player", PlayerID: "player-1", DisplayName: "Ari",
			Snapshot: map[string]any{
				"player": map[string]any{
					"characterSheet": map[string]any{"level": float64(4)},
				},
			},
		},
	}
	for index := 0; index < 4; index++ {
		combatants = append(combatants, models.EncounterCombatant{
			SourceType: "creature", Side: "enemy", DisplayName: "Skeleton",
			Snapshot: map[string]any{
				"creature": map[string]any{"xp": float64(50)},
			},
		})
	}

	players, enemies := encounterDifficultyInputs(combatants)
	evidence := generation.EvaluateEncounterForRuleset(
		rulesets.Encounter2014, players, enemies, "",
	)

	if len(players) != 1 || integerFromAny(players[0].CharacterSheet["level"]) != 4 {
		t.Fatalf("legacy player level was not extracted: %+v", players)
	}
	if evidence.RawXP != 200 || evidence.AdjustedXP != 500 {
		t.Fatalf("legacy enemy XP was not extracted: %+v", evidence)
	}
	if evidence.Multiplier != 2.5 || evidence.PartySizeAdjustment != 1 {
		t.Fatalf("2014 multiplier behavior changed: %+v", evidence)
	}
}

func TestEvaluateStoredEncounterDifficultyReturnsDisplayLabel(t *testing.T) {
	combatants := []models.EncounterCombatant{
		{
			SourceType: "player",
			Snapshot: map[string]any{
				"player": map[string]any{
					"characterSheet": map[string]any{"level": float64(4)},
				},
			},
		},
		{
			SourceType: "creature", Side: "enemy", DisplayName: "Ogre",
			Snapshot: map[string]any{
				"creature": map[string]any{"xp": float64(600)},
			},
		},
	}

	evidence := EvaluateStoredEncounterDifficulty(rulesets.Encounter2014, combatants)
	if evidence.ActualDifficulty != "Over Deadly" {
		t.Fatalf("difficulty label = %q, want Over Deadly", evidence.ActualDifficulty)
	}
}

func TestEvaluateStoredEncounterDifficultyFallsBackToCampaignParty(t *testing.T) {
	party := []models.Player{{CharacterSheet: map[string]any{"level": float64(4)}}}
	combatants := []models.EncounterCombatant{
		{
			SourceType: "creature", Side: "enemy", DisplayName: "Goblin",
			Snapshot: map[string]any{
				"creature": map[string]any{"xp": float64(50)},
			},
		},
	}

	evidence := EvaluateStoredEncounterDifficultyForParty(
		rulesets.Encounter2014,
		combatants,
		party,
	)
	if evidence.ActualDifficulty != "Trivial" {
		t.Fatalf("difficulty label = %q, want Trivial", evidence.ActualDifficulty)
	}
}

func TestEvaluateStoredEncounterDifficultyWithoutPartyIsUnrated(t *testing.T) {
	combatants := []models.EncounterCombatant{{
		SourceType: "creature", Side: "enemy", DisplayName: "Goblin",
		Snapshot: map[string]any{"creature": map[string]any{"xp": float64(50)}},
	}}
	evidence := EvaluateStoredEncounterDifficulty(rulesets.Encounter2014, combatants)
	if evidence.ActualDifficulty != "Unrated" {
		t.Fatalf("difficulty label = %q, want Unrated", evidence.ActualDifficulty)
	}
}
