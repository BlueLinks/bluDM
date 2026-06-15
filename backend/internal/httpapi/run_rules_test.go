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

func TestApplyDamageDefenseNormalizesTypesAndKeepsMinimums(t *testing.T) {
	defenses := damageDefenseRequest{
		Resistances:     []string{" Fire ", "cold"},
		Vulnerabilities: []string{"radiant"},
		Immunities:      []string{"poison"},
	}

	if got := applyDamageDefense(1, "fire", defenses); got != 0 {
		t.Fatalf("resistance should round 1 damage down to 0, got %d", got)
	}
	if got := applyDamageDefense(7, "RADIANT", defenses); got != 14 {
		t.Fatalf("vulnerability should double normalized damage type, got %d", got)
	}
	if got := applyDamageDefense(99, " poison ", defenses); got != 0 {
		t.Fatalf("immunity should ignore surrounding spaces, got %d", got)
	}
}

func TestDefensesForCombatantReadsNestedSnapshots(t *testing.T) {
	combatant := models.EncounterRunCombatant{
		Snapshot: map[string]any{
			"creature": map[string]any{
				"statBlock": map[string]any{
					"damageVulnerabilities": []any{"radiant"},
					"damageResistances":     []any{"fire", "cold"},
					"damageImmunities":      []any{"poison"},
				},
			},
		},
	}

	defenses := defensesForCombatant(combatant)
	if !hasString(defenses.Vulnerabilities, "radiant") {
		t.Fatalf("expected vulnerability from nested stat block, got %+v", defenses)
	}
	if !hasString(defenses.Resistances, "fire") || !hasString(defenses.Resistances, "cold") {
		t.Fatalf("expected resistances from nested stat block, got %+v", defenses)
	}
	if !hasString(defenses.Immunities, "poison") {
		t.Fatalf("expected immunity from nested stat block, got %+v", defenses)
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

	combatant = models.EncounterRunCombatant{MaxHitPoints: 0, MaxHitPointsModifier: -10}
	if got := effectiveMaxHitPoints(combatant); got != 1 {
		t.Fatalf("effectiveMaxHitPoints() minimum = %d, want 1", got)
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

func TestSpellEffectAmountScalesAboveBaseSlot(t *testing.T) {
	roll := models.SpellActionRollPart{
		FixedValue:        5,
		ScalingType:       "spell_level",
		ScalingFromLevel:  2,
		ScalingFixedValue: 5,
		ScalingStepSize:   1,
	}

	if got := spellEffectAmount(roll, 2, 0); got != 5 {
		t.Fatalf("spellEffectAmount(level 2) = %d, want base 5", got)
	}
	if got := spellEffectAmount(roll, 3, 0); got != 10 {
		t.Fatalf("spellEffectAmount(level 3) = %d, want one scaling step", got)
	}
	if got := spellEffectAmount(roll, 4, 0); got != 15 {
		t.Fatalf("spellEffectAmount(level 4) = %d, want two scaling steps", got)
	}
}

func TestActionRollTotalDoublesDiceAndModifierOnCriticalHit(t *testing.T) {
	part := models.ActionRollPart{
		DiceCount:  1,
		DieSize:    8,
		FixedValue: 3,
	}
	rolls := []int{5, 7}
	rolled := actionRollTotal(part, true, func(_, _ int) int {
		next := rolls[0]
		rolls = rolls[1:]
		return next
	})

	if rolled.RolledValue != 5 {
		t.Fatalf("rolled value = %d, want 5", rolled.RolledValue)
	}
	if rolled.CriticalRolledValue != 7 {
		t.Fatalf("critical rolled value = %d, want 7", rolled.CriticalRolledValue)
	}
	if rolled.Total != 18 {
		t.Fatalf("critical total = %d, want dice and fixed modifier doubled to 18", rolled.Total)
	}
}

func TestActionRollTotalClampsNegativeDamage(t *testing.T) {
	part := models.ActionRollPart{DiceCount: 1, DieSize: 4, FixedValue: -10}

	rolled := actionRollTotal(part, false, func(_, _ int) int { return 2 })

	if rolled.Total != 0 {
		t.Fatalf("negative total should clamp to 0, got %d", rolled.Total)
	}
}

func hasString(values []string, want string) bool {
	for _, value := range values {
		if value == want {
			return true
		}
	}
	return false
}
