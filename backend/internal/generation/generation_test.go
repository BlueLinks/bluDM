package generation

import (
	"reflect"
	"testing"

	"bludm/backend/internal/models"
)

func TestGenerateDungeonIsDeterministicAndEditable(t *testing.T) {
	settings := DefaultDungeonSettings()
	settings.Seed = "test-seed"
	settings.Width = 28
	settings.Height = 20
	settings.RoomCount = 5

	first := GenerateDungeon(settings)
	second := GenerateDungeon(settings)
	if !reflect.DeepEqual(first, second) {
		t.Fatal("expected identical documents for the same seed and settings")
	}
	if len(first.Rooms) == 0 || len(first.Layers[0].Cells) == 0 || len(first.Edges) == 0 {
		t.Fatalf("expected generated rooms, floors, and walls: %+v", first)
	}
	hasStairs, hasDressing := false, false
	for _, entity := range first.Entities {
		hasStairs = hasStairs || entity.Kind == "stairs"
		hasDressing = hasDressing || entity.Kind == "prop" || entity.Kind == "light"
	}
	if !hasStairs || !hasDressing {
		t.Fatalf("expected normal editable stairs and dressing entities: %+v", first.Entities)
	}
}

func TestGenerateEncounterUsesLibraryAndPartyInputs(t *testing.T) {
	creatures := []models.Creature{
		{ID: "goblin", Name: "Goblin", CreatureType: "goblinoid", XP: 50, LibrarySource: "standard"},
		{ID: "orc", Name: "Orc", CreatureType: "humanoid", XP: 100, LibrarySource: "standard"},
		{ID: "wolf", Name: "Wolf", CreatureType: "beast", XP: 50, LibrarySource: "standard"},
	}
	players := []models.Player{{ID: "player-1", CharacterSheet: map[string]any{"level": float64(3)}}}
	options := EncounterOptions{
		Archetype: "monsters", Challenge: "medium", EnemyCount: 3,
		IncludeMinions: true, Terrain: "dungeon",
	}
	first := GenerateEncounter(creatures, nil, options, players, 12)
	second := GenerateEncounter(creatures, nil, options, players, 12)
	if !reflect.DeepEqual(first, second) {
		t.Fatal("expected encounter preview to be deterministic for the same roll")
	}
	if first.Version != 1 || len(first.Enemies) == 0 || first.EstimatedXP == 0 {
		t.Fatalf("unexpected encounter preview: %+v", first)
	}
	for _, enemy := range first.Enemies {
		if enemy.Creature.Name != "Goblin" && enemy.Creature.Name != "Orc" {
			t.Fatalf("expected monster archetype matching, got %+v", enemy.Creature)
		}
	}
}
