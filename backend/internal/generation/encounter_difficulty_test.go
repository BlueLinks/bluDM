package generation

import (
	"fmt"
	"reflect"
	"strings"
	"testing"

	"bludm/backend/internal/models"
)

func TestDifficultyThresholdsAndPartySizeAdjustments(t *testing.T) {
	enemy := EncounterEnemy{Creature: models.Creature{ID: "enemy", Name: "Enemy", XP: 100}, Quantity: 2}
	for partySize := 1; partySize <= 8; partySize++ {
		t.Run(fmt.Sprintf("party_%d", partySize), func(t *testing.T) {
			players := testPlayers(partySize, 4)
			result := EvaluateEncounter(players, []EncounterEnemy{enemy}, "medium")
			if result.Thresholds.Easy != 125*partySize || result.Thresholds.Medium != 250*partySize ||
				result.Thresholds.Hard != 375*partySize || result.Thresholds.Deadly != 500*partySize {
				t.Fatalf("unexpected level-four thresholds: %+v", result.Thresholds)
			}
			expectedMultiplier, expectedAdjustment := 1.5, 0
			switch {
			case partySize < 3:
				expectedMultiplier, expectedAdjustment = 2, 1
			case partySize >= 6:
				expectedMultiplier, expectedAdjustment = 1, -1
			}
			if result.BaseMultiplier != 1.5 || result.Multiplier != expectedMultiplier ||
				result.PartySizeAdjustment != expectedAdjustment ||
				result.AdjustedXP != int(200*expectedMultiplier) {
				t.Fatalf("unexpected party-size evidence: %+v", result)
			}
		})
	}
}

func TestDifficultyMixedLevelBoundariesAndTargetBands(t *testing.T) {
	players := append(testPlayers(1, 1), testPlayers(1, 20)...)
	thresholds := EvaluateEncounter(players, nil, "easy").Thresholds
	if thresholds != (Thresholds{Easy: 2825, Medium: 5750, Hard: 8575, Deadly: 12800}) {
		t.Fatalf("level boundaries were not accumulated exactly: %+v", thresholds)
	}
	levelFourParty := testPlayers(4, 4)
	cases := []struct {
		requested string
		xp        int
		wantLabel string
		minimum   int
		maximum   int
	}{
		{"easy", 500, "Easy", 500, 1000},
		{"medium", 1000, "Medium", 1000, 1500},
		{"hard", 1500, "Hard", 1500, 2000},
		{"deadly", 2000, "Deadly", 2000, 3000},
		{"deadly", 3000, "Over Deadly", 2000, 3000},
	}
	for _, test := range cases {
		t.Run(test.requested+"_"+test.wantLabel, func(t *testing.T) {
			result := EvaluateEncounter(levelFourParty, []EncounterEnemy{{
				Creature: models.Creature{XP: test.xp}, Quantity: 1,
			}}, test.requested)
			if result.ActualDifficulty != test.wantLabel || result.TargetMinimum != test.minimum ||
				result.TargetMaximum != test.maximum || result.WithinTarget != (test.wantLabel != "Over Deadly") {
				t.Fatalf("unexpected target evidence: %+v", result)
			}
		})
	}
}

func TestDifficultyEnemyGroupMultipliersAndZeroXPWarnings(t *testing.T) {
	cases := []struct {
		count int
		want  float64
	}{{1, 1}, {2, 1.5}, {3, 2}, {6, 2}, {7, 2.5}, {10, 2.5}, {11, 3}, {14, 3}, {15, 4}}
	for _, test := range cases {
		result := EvaluateEncounter(testPlayers(4, 5), []EncounterEnemy{{
			Creature: models.Creature{XP: 10}, Quantity: test.count,
		}}, "easy")
		if result.BaseMultiplier != test.want || result.EnemyCount != test.count {
			t.Fatalf("count %d produced %+v", test.count, result)
		}
	}
	zero := EvaluateEncounter(testPlayers(4, 4), []EncounterEnemy{{
		Creature: models.Creature{XP: 0}, Quantity: 2,
	}}, "easy")
	if zero.RawXP != 0 || !warningContains(zero.Warnings, "zero-XP") {
		t.Fatalf("zero-XP evidence was not explicit: %+v", zero)
	}
}

func Test2024ModerateBudgetUsesRawXPWithoutMultipliers(t *testing.T) {
	players := testPlayers(5, 4)
	result := EvaluateEncounterForRuleset(
		DifficultyRuleset2024,
		players,
		[]EncounterEnemy{{Creature: models.Creature{XP: 300}, Quantity: 5}},
		"medium",
	)
	if result.Thresholds.Moderate != 1875 || result.XPBudget != 1875 {
		t.Fatalf("five level-four characters should have a 1,875 XP Moderate budget: %+v", result)
	}
	if result.RawXP != 1500 || result.XPSpent != 1500 || result.AdjustedXP != 1500 ||
		result.Multiplier != 1 || result.BaseMultiplier != 1 || result.PartySizeAdjustment != 0 {
		t.Fatalf("2024 evaluation applied a 2014 adjustment: %+v", result)
	}
	if result.ActualDifficulty != "Moderate" || result.RequestedDifficulty != "Moderate" ||
		!result.WithinTarget || result.Ruleset != DifficultyRuleset2024 {
		t.Fatalf("unexpected 2024 difficulty evidence: %+v", result)
	}

	legacy := EvaluateEncounter(
		players,
		[]EncounterEnemy{{Creature: models.Creature{XP: 300}, Quantity: 5}},
		"medium",
	)
	if legacy.AdjustedXP != 3000 || legacy.Multiplier != 2 ||
		legacy.Ruleset != DifficultyRuleset || legacy.ActualDifficulty != "Deadly" {
		t.Fatalf("equivalent 2014 encounter changed behavior: %+v", legacy)
	}
}

func Test2024GeneratorSelectsRosterWithinRequestedBudget(t *testing.T) {
	creatures := []models.Creature{
		{ID: "one", Name: "Goblin One", CreatureType: "goblin", XP: 100},
		{ID: "two", Name: "Goblin Two", CreatureType: "goblin", XP: 250},
		{ID: "three", Name: "Goblin Three", CreatureType: "goblin", XP: 500},
		{ID: "four", Name: "Goblin Four", CreatureType: "goblin", XP: 625},
	}
	preview := GenerateEncounterForRuleset(
		DifficultyRuleset2024,
		creatures,
		nil,
		EncounterOptions{Archetype: "monsters", Challenge: "moderate", EnemyCount: 3},
		testPlayers(5, 4),
		91,
	)
	if !preview.DifficultyEvidence.WithinTarget ||
		preview.DifficultyEvidence.ActualDifficulty != "Moderate" ||
		preview.DifficultyEvidence.XPSpent > 1875 {
		t.Fatalf("2024 generator missed an available Moderate budget: %+v", preview)
	}
}

func TestGeneratorBossMinionSparseAndHazardEvidence(t *testing.T) {
	creatures := []models.Creature{
		{ID: "minion", Name: "Ash Minion", CreatureType: "undead", XP: 25},
		{ID: "boss", Name: "Ash Wight", CreatureType: "undead", XP: 700},
	}
	options := EncounterOptions{
		Archetype: "undead", Challenge: "medium", EnemyCount: 3,
		IncludeBoss: true, IncludeMinions: true, IncludeHazards: true,
	}
	first := GenerateEncounter(creatures, nil, options, testPlayers(4, 4), 71)
	second := GenerateEncounter(creatures, nil, options, testPlayers(4, 4), 71)
	if !reflect.DeepEqual(first, second) {
		t.Fatal("same seed and normalized inputs did not produce the same encounter")
	}
	if len(first.Enemies) != 2 || first.Enemies[0].Creature.ID != "boss" ||
		first.Enemies[0].Quantity != 1 || first.Enemies[1].Creature.ID != "minion" ||
		first.Enemies[1].Quantity != 2 {
		t.Fatalf("boss/minion preferences did not change roster construction: %+v", first.Enemies)
	}
	if !warningContains(first.DifficultyEvidence.Warnings, "Hazards were requested") ||
		!warningContains(first.DifficultyEvidence.Warnings, "sparse") {
		t.Fatalf("hazard and confidence limits were not explicit: %+v", first.DifficultyEvidence)
	}
	twoBody := GenerateEncounter(creatures, nil, EncounterOptions{
		Archetype: "undead", Challenge: "easy", EnemyCount: 2,
		IncludeBoss: true, IncludeMinions: true,
	}, testPlayers(4, 4), 72)
	if twoBody.DifficultyEvidence.EnemyCount != 2 || len(twoBody.Enemies) != 2 ||
		twoBody.Enemies[0].Creature.ID != "boss" {
		t.Fatalf("two-body boss/minion request changed body count or dropped the boss: %+v", twoBody)
	}
}

func TestCreatureMatchingDeduplicatesNamesAndPrefersUserContent(t *testing.T) {
	standard := models.Creature{ID: "standard", Name: "Wight", CreatureType: "undead", LibrarySource: "standard"}
	custom := models.Creature{ID: "custom", Name: "WIGHT", CreatureType: "undead", LibrarySource: "user"}
	matched := matchingCreatures([]models.Creature{standard, custom}, []string{"undead"})
	if len(matched) != 1 || matched[0].ID != custom.ID {
		t.Fatalf("duplicate visible names were not deterministically reconciled: %+v", matched)
	}
}

func testPlayers(count, level int) []models.Player {
	players := make([]models.Player, count)
	for index := range players {
		players[index] = models.Player{
			ID: fmt.Sprintf("player-%d", index), CharacterSheet: map[string]any{"level": level},
		}
	}
	return players
}

func warningContains(warnings []string, text string) bool {
	for _, warning := range warnings {
		if strings.Contains(warning, text) {
			return true
		}
	}
	return false
}
