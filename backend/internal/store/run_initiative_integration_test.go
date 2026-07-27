package store

import (
	"context"
	"errors"
	"testing"
)

func TestRunInitiativeMustBeResolvedBeforeBegin(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()

	owner, err := stores.Auth.CreateUser(ctx, uniqueEmail("initiative-guard"), "hash")
	requireNoError(t, err)
	campaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Initiative Campaign"})
	requireNoError(t, err)
	encounter, err := stores.Campaigns.CreateEncounter(
		ctx,
		owner.ID,
		campaign.ID,
		CampaignEncounterInput{Name: "Initiative Encounter"},
	)
	requireNoError(t, err)
	for _, input := range []EncounterCombatantInput{
		{
			SourceType:       "player",
			Side:             "player",
			DisplayName:      "Manual Hero",
			ArmorClass:       15,
			MaxHitPoints:     20,
			CurrentHitPoints: 20,
		},
		{
			SourceType:       "creature",
			Side:             "enemy",
			DisplayName:      "Generated Foe",
			ArmorClass:       12,
			MaxHitPoints:     8,
			CurrentHitPoints: 8,
		},
	} {
		_, err = stores.Encounters.AddCombatant(ctx, owner.ID, encounter.ID, input)
		requireNoError(t, err)
	}

	run, err := stores.Runs.StartEncounter(ctx, owner.ID, encounter.ID, false)
	requireNoError(t, err)
	if err := stores.Runs.Begin(ctx, run.ID); !errors.Is(err, ErrUnresolvedInitiative) {
		t.Fatalf("expected unresolved initiative error, got %v", err)
	}
	unchanged, err := stores.Runs.ByID(ctx, owner.ID, run.ID)
	requireNoError(t, err)
	if unchanged.Status != "setup" || unchanged.CurrentRound != 0 {
		t.Fatalf("expected rejected begin to leave setup run unchanged, got %+v", unchanged)
	}

	first, second := run.Combatants[0], run.Combatants[1]
	requireNoError(t, stores.Runs.SetInitiatives(ctx, map[string]int{
		first.ID:  0,
		second.ID: -2,
	}))
	requireNoError(t, stores.Runs.ClearInitiatives(ctx, run.ID))
	cleared, err := stores.Runs.ByID(ctx, owner.ID, run.ID)
	requireNoError(t, err)
	for _, combatant := range cleared.Combatants {
		if combatant.InitiativeSet {
			t.Fatalf("expected %s initiative to be unresolved after clear", combatant.DisplayName)
		}
	}
	if err := stores.Runs.Begin(ctx, run.ID); !errors.Is(err, ErrUnresolvedInitiative) {
		t.Fatalf("expected clear initiative to block begin, got %v", err)
	}

	requireNoError(t, stores.Runs.SetInitiatives(ctx, map[string]int{
		first.ID:  10,
		second.ID: 10,
	}))
	requireNoError(t, stores.Runs.ReorderInitiative(ctx, run.ID, []string{second.ID, first.ID}))
	requireNoError(t, stores.Runs.Begin(ctx, run.ID))

	active, err := stores.Runs.ByID(ctx, owner.ID, run.ID)
	requireNoError(t, err)
	if active.Status != "active" || active.CurrentRound != 1 {
		t.Fatalf("expected resolved run to begin round one, got %+v", active)
	}
	if active.Combatants[0].ID != second.ID || active.Combatants[1].ID != first.ID {
		t.Fatalf("expected explicit tie order to survive begin, got %+v", active.Combatants)
	}
}
