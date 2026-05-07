package httpapi

import (
	"testing"

	"bludm/backend/internal/models"
)

func TestApplyDamageDefense(t *testing.T) {
	tests := []struct {
		name     string
		amount   int
		kind     string
		defenses damageDefenseRequest
		want     int
	}{
		{name: "normal", amount: 10, kind: "fire", want: 10},
		{name: "resistance", amount: 11, kind: "fire", defenses: damageDefenseRequest{Resistances: []string{"fire"}}, want: 5},
		{name: "vulnerability", amount: 10, kind: "cold", defenses: damageDefenseRequest{Vulnerabilities: []string{"Cold"}}, want: 20},
		{name: "immunity wins", amount: 10, kind: "poison", defenses: damageDefenseRequest{Immunities: []string{"poison"}, Vulnerabilities: []string{"poison"}}, want: 0},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := applyDamageDefense(test.amount, test.kind, test.defenses); got != test.want {
				t.Fatalf("applyDamageDefense() = %d, want %d", got, test.want)
			}
		})
	}
}

func TestEffectiveArmorClassAndMaxHP(t *testing.T) {
	combatant := models.EncounterRunCombatant{
		ArmorClass:           12,
		ArmorClassBonus:      2,
		MaxHitPoints:         20,
		MaxHitPointsModifier: 5,
	}
	if got := effectiveArmorClass(combatant); got != 14 {
		t.Fatalf("effectiveArmorClass() = %d, want 14", got)
	}
	if got := effectiveMaxHitPoints(combatant); got != 25 {
		t.Fatalf("effectiveMaxHitPoints() = %d, want 25", got)
	}

	combatant.ArmorClassOverride = 18
	combatant.MaxHitPointsOverride = 30
	if got := effectiveArmorClass(combatant); got != 18 {
		t.Fatalf("effectiveArmorClass() with override = %d, want 18", got)
	}
	if got := effectiveMaxHitPoints(combatant); got != 30 {
		t.Fatalf("effectiveMaxHitPoints() with override = %d, want 30", got)
	}
}

func TestAbilityModFromSnapshot(t *testing.T) {
	snapshot := map[string]any{
		"creature": map[string]any{
			"statBlock": map[string]any{
				"abilityScores": map[string]any{
					"dex": float64(16),
					"str": float64(8),
				},
			},
		},
	}
	if got := abilityModFromSnapshot(snapshot, "dex"); got != 3 {
		t.Fatalf("abilityModFromSnapshot(dex) = %d, want 3", got)
	}
	if got := abilityModFromSnapshot(snapshot, "str"); got != -1 {
		t.Fatalf("abilityModFromSnapshot(str) = %d, want -1", got)
	}
}

func TestNormalizeSide(t *testing.T) {
	if got := normalizeSide("friendly"); got != "friendly" {
		t.Fatalf("normalizeSide(friendly) = %q, want friendly", got)
	}
	if got := normalizeSide("player"); got != "player" {
		t.Fatalf("normalizeSide(player) = %q, want player", got)
	}
	if got := normalizeSide("nonsense"); got != "enemy" {
		t.Fatalf("normalizeSide(nonsense) = %q, want enemy", got)
	}
}
