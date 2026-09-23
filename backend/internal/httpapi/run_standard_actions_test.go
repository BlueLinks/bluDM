package httpapi

import (
	"testing"

	"bludm/backend/internal/models"
)

func TestStandardRunActionResolvesDireWolfBiteFromActorSnapshot(t *testing.T) {
	wolf := models.EncounterRunCombatant{
		SourceType: "creature",
		Snapshot: map[string]any{
			"standardCreatureId": "dire-wolf",
			"creature": map[string]any{"statBlock": map[string]any{
				"specialAbilities": []any{map[string]any{"name": "Pack Tactics"}},
				"actions": []any{
					map[string]any{"name": "Multiattack", "description": "The wolf makes two attacks."},
					map[string]any{
						"name": "Bite", "attackBonus": float64(5),
						"description": "Melee Weapon Attack: +5 to hit, reach 5 ft.",
						"damage":      []any{map[string]any{"damageDice": "2d6+3", "damageType": "Piercing"}},
					},
				},
			}},
		},
	}

	action, ok := standardRunAction(wolf, "standard:actions:1")
	if !ok || action.Name != "Bite" || action.AttackModifier != 5 || action.ActionType != "melee_weapon" {
		t.Fatalf("expected Dire Wolf Bite attack, got %+v, ok=%v", action, ok)
	}
	if len(action.Rolls) != 1 || action.Rolls[0].DiceCount != 2 || action.Rolls[0].DieSize != 6 || action.Rolls[0].FixedValue != 3 {
		t.Fatalf("expected 2d6+3 Bite damage, got %+v", action.Rolls)
	}
	for _, id := range []string{"standard:specialAbilities:0", "standard:actions:0", "standard:actions:9"} {
		if _, ok := standardRunAction(wolf, id); ok {
			t.Fatalf("%s must not resolve as an attack", id)
		}
	}
	wolf.Snapshot = map[string]any{"creature": wolf.Snapshot["creature"]}
	if _, ok := standardRunAction(wolf, "standard:actions:1"); ok {
		t.Fatal("an unreferenced snapshot must not resolve an SRD action")
	}
}

func TestStandardRunActionParsesSpacedSRDDamage(t *testing.T) {
	rolls := standardActionRolls([]any{map[string]any{"damageDice": "1d10 + 3", "damageType": "Piercing"}})
	if len(rolls) != 1 || rolls[0].DiceCount != 1 || rolls[0].DieSize != 10 || rolls[0].FixedValue != 3 {
		t.Fatalf("expected 1d10+3 roll, got %+v", rolls)
	}
}
