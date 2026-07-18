package httpapi

import (
	"testing"

	"bludm/backend/internal/models"
)

func TestResolutionDamageAppliesDefensesPerComponent(t *testing.T) {
	components := []resolutionDamageComponentRequest{
		{ID: "fire", Amount: 10, DamageType: "fire"},
		{ID: "poison", Amount: 7, DamageType: "poison"},
		{ID: "cold", Amount: 4, DamageType: "cold"},
		{ID: "force", Amount: 3, DamageType: "force"},
	}
	raw, final, results, err := resolutionDamage(components, 1, damageDefenseRequest{
		Resistances:     []string{"fire"},
		Immunities:      []string{"poison"},
		Vulnerabilities: []string{"cold"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if raw != 24 || final != 16 {
		t.Fatalf("expected raw 24 and final 16, got raw %d final %d", raw, final)
	}
	want := []int{5, 0, 8, 3}
	for index, result := range results {
		if got := intFromAny(result["finalAmount"]); got != want[index] {
			t.Fatalf("component %d: expected %d, got %d", index, want[index], got)
		}
	}
}

func TestApplyResolutionTargetBlocksHealingAndAvoidsOvercounting(t *testing.T) {
	target := testResolutionCombatant("target", 8, 10)
	actor := testResolutionCombatant("actor", 10, 10)
	result, err := applyResolutionTarget(
		&target,
		&actor,
		resolutionTargetRequest{Healing: 6, DamageMultiplier: 1},
		damageDefenseRequest{},
		true,
	)
	if err != nil {
		t.Fatal(err)
	}
	if target.CurrentHitPoints != 8 || actor.HealingDone != 0 {
		t.Fatalf("expected blocked healing to leave state unchanged, got target %d actor healing %d", target.CurrentHitPoints, actor.HealingDone)
	}
	if blocked, _ := result["healingBlocked"].(bool); !blocked {
		t.Fatal("expected resolution result to report blocked healing")
	}
}

func TestApplyResolutionTargetCountsOnlyEffectiveHealing(t *testing.T) {
	target := testResolutionCombatant("target", 8, 10)
	actor := testResolutionCombatant("actor", 10, 10)
	result, err := applyResolutionTarget(
		&target,
		&actor,
		resolutionTargetRequest{Healing: 6, DamageMultiplier: 1},
		damageDefenseRequest{},
		false,
	)
	if err != nil {
		t.Fatal(err)
	}
	if target.HealingReceived != 2 || actor.HealingDone != 2 || intFromAny(result["healing"]) != 2 {
		t.Fatalf("expected only 2 effective healing, got target %d actor %d result %v", target.HealingReceived, actor.HealingDone, result["healing"])
	}
}

func TestApplyResolutionTargetUsesTemporaryHPBeforeNormalHP(t *testing.T) {
	target := testResolutionCombatant("target", 20, 20)
	target.TemporaryHitPoints = 6
	actor := testResolutionCombatant("actor", 20, 20)
	result, err := applyResolutionTarget(
		&target,
		&actor,
		resolutionTargetRequest{
			DamageMultiplier: 1,
			DamageComponents: []resolutionDamageComponentRequest{{Amount: 9, DamageType: "force"}},
		},
		damageDefenseRequest{},
		false,
	)
	if err != nil {
		t.Fatal(err)
	}
	if target.TemporaryHitPoints != 0 || target.CurrentHitPoints != 17 {
		t.Fatalf("expected 6 temp HP then 3 normal HP to absorb damage, got %+v", target)
	}
	if target.DamageTaken != 9 || actor.DamageDealt != 9 || intFromAny(result["finalDamage"]) != 9 {
		t.Fatalf("expected final damage metrics to record 9, got target %+v actor %+v result %+v", target, actor, result)
	}
}

func TestApplyResolutionTargetDoesNotStackLowerTemporaryHPWithoutReplacement(t *testing.T) {
	target := testResolutionCombatant("target", 10, 10)
	target.TemporaryHitPoints = 8
	lower := 3
	if _, err := applyResolutionTarget(
		&target,
		nil,
		resolutionTargetRequest{DamageMultiplier: 1, TemporaryHP: &lower, TemporaryHPMode: "max"},
		damageDefenseRequest{},
		false,
	); err != nil {
		t.Fatal(err)
	}
	if target.TemporaryHitPoints != 8 {
		t.Fatalf("expected higher temporary HP to remain, got %d", target.TemporaryHitPoints)
	}
	if _, err := applyResolutionTarget(
		&target,
		nil,
		resolutionTargetRequest{DamageMultiplier: 1, TemporaryHP: &lower, TemporaryHPMode: "replace"},
		damageDefenseRequest{},
		false,
	); err != nil {
		t.Fatal(err)
	}
	if target.TemporaryHitPoints != 3 {
		t.Fatalf("expected explicit replacement to set temporary HP to 3, got %d", target.TemporaryHitPoints)
	}
}

func TestApplyResolutionTargetHealingLeavesTemporaryHPAndRecoversTarget(t *testing.T) {
	target := testResolutionCombatant("target", 0, 10)
	target.TemporaryHitPoints = 2
	target.Defeated = true
	actor := testResolutionCombatant("actor", 10, 10)
	if _, err := applyResolutionTarget(
		&target,
		&actor,
		resolutionTargetRequest{DamageMultiplier: 1, Healing: 5},
		damageDefenseRequest{},
		false,
	); err != nil {
		t.Fatal(err)
	}
	if target.CurrentHitPoints != 5 || target.TemporaryHitPoints != 2 || target.Defeated {
		t.Fatalf("expected healing to recover HP without changing temporary HP, got %+v", target)
	}
}

func TestValidSaveOutcomeRejectsPendingResolution(t *testing.T) {
	if validSaveOutcome("pending") || validSaveOutcome("") {
		t.Fatal("expected unresolved save outcomes to be rejected")
	}
	if !validSaveOutcome(" Success ") || !validSaveOutcome("failure") {
		t.Fatal("expected completed save outcomes to be accepted")
	}
}

func testResolutionCombatant(id string, hp, maxHP int) models.EncounterRunCombatant {
	return models.EncounterRunCombatant{ID: id, DisplayName: id, CurrentHitPoints: hp, MaxHitPoints: maxHP}
}

func TestResolutionDamageAppliesSaveMultiplierBeforeDefense(t *testing.T) {
	_, final, _, err := resolutionDamage(
		[]resolutionDamageComponentRequest{{Amount: 9, DamageType: "fire"}},
		0.5,
		damageDefenseRequest{Resistances: []string{"fire"}},
	)
	if err != nil {
		t.Fatal(err)
	}
	if final != 2 {
		t.Fatalf("expected half then resistance to apply 2 damage, got %d", final)
	}
}

func TestResolutionDamageCanBypassDefenseAndKeepsRollMetadata(t *testing.T) {
	_, final, results, err := resolutionDamage(
		[]resolutionDamageComponentRequest{{
			ID: "fire", Amount: 12, DamageType: "fire", Formula: "1d8 + 4",
			RolledValue: 3, CriticalRolledValue: 5, Modifier: 4,
			CriticalBehavior: "double_dice", Mitigation: "ignore",
		}},
		1,
		damageDefenseRequest{Immunities: []string{"fire"}},
	)
	if err != nil {
		t.Fatal(err)
	}
	if final != 12 {
		t.Fatalf("expected ignored immunity to preserve 12 damage, got %d", final)
	}
	if results[0]["defense"] != "ignored" || intFromAny(results[0]["criticalRolledValue"]) != 5 {
		t.Fatalf("expected defense and critical roll metadata, got %+v", results[0])
	}
}
