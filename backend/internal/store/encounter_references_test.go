package store

import (
	"context"
	"testing"
)

func TestEncounterReferenceProjectionRespectsExplicitOverrides(t *testing.T) {
	if got := currentOrOverride("Renamed guard", "Guard", "Veteran"); got != "Renamed guard" {
		t.Fatalf("custom name changed to %q", got)
	}
	if got := currentOrOverride("Guard", "Guard", "Veteran"); got != "Veteran" {
		t.Fatalf("reference name stayed stale: %q", got)
	}
	if got := currentStatOrOverride(17, 15, 18); got != 17 {
		t.Fatalf("custom AC changed to %d", got)
	}
	if got := currentStatOrOverride(15, 15, 18); got != 18 {
		t.Fatalf("reference AC stayed stale: %d", got)
	}
	if got := currentEncounterHP(20, 20, 28); got != 28 {
		t.Fatalf("full health did not follow new max: %d", got)
	}
	if got := currentEncounterHP(8, 20, 28); got != 8 {
		t.Fatalf("damaged combatant lost current HP: %d", got)
	}
}

func TestSavedEncounterReferencesFollowSourcesButRunSnapshotStaysFixed(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()
	owner, err := stores.Auth.CreateUser(ctx, uniqueEmail("encounter-refs"), "hash")
	requireNoError(t, err)
	campaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Reference Campaign"})
	requireNoError(t, err)
	player, err := stores.Players.Create(ctx, owner.ID, PlayerInput{
		CampaignID: campaign.ID, CharacterName: "Edda", ArmorClass: 15, MaxHitPoints: 20,
		CharacterSheet: map[string]any{"level": 4},
	})
	requireNoError(t, err)
	creature, err := stores.Creatures.Create(ctx, owner.ID, CreatureInput{
		Name: "Guard", ArmorClass: 13, HitPoints: 11, XP: 25,
	})
	requireNoError(t, err)
	encounter, err := stores.Campaigns.CreateEncounter(ctx, owner.ID, campaign.ID, CampaignEncounterInput{Name: "Linked Encounter"})
	requireNoError(t, err)
	_, err = stores.Encounters.AddCombatant(ctx, owner.ID, encounter.ID, EncounterCombatantInput{
		SourceType: "player", PlayerID: player.ID, Side: "player", DisplayName: "Edda",
		ArmorClass: 15, MaxHitPoints: 20, CurrentHitPoints: 20,
		Snapshot: map[string]any{"player": map[string]any{
			"characterName": "Edda", "armorClass": 15, "maxHitPoints": 20,
			"characterSheet": map[string]any{"level": 4},
		}},
	})
	requireNoError(t, err)
	_, err = stores.Encounters.AddCombatant(ctx, owner.ID, encounter.ID, EncounterCombatantInput{
		SourceType: "creature", CreatureID: creature.ID, Side: "enemy", DisplayName: "Guard",
		ArmorClass: 13, MaxHitPoints: 11, CurrentHitPoints: 11,
		Snapshot: map[string]any{"creature": map[string]any{
			"name": "Guard", "armorClass": 13, "hitPoints": 11, "xp": 25,
		}},
	})
	requireNoError(t, err)

	_, err = stores.Players.Update(ctx, owner.ID, player.ID, PlayerInput{
		CampaignID: campaign.ID, CharacterName: "Edda the Brave", ArmorClass: 17, MaxHitPoints: 24,
		CharacterSheet: map[string]any{"level": 5},
	})
	requireNoError(t, err)
	_, err = stores.Creatures.Update(ctx, owner.ID, creature.ID, CreatureInput{
		Name: "Veteran", ArmorClass: 16, HitPoints: 25, XP: 100,
	})
	requireNoError(t, err)

	stored, err := stores.Encounters.Combatants(ctx, owner.ID, encounter.ID)
	requireNoError(t, err)
	if stored[0].DisplayName != "Edda" || stored[1].DisplayName != "Guard" {
		t.Fatalf("historical snapshots were overwritten: %+v", stored)
	}
	resolved, err := stores.Encounters.ResolvedCombatants(ctx, owner.ID, encounter.ID)
	requireNoError(t, err)
	if resolved[0].DisplayName != "Edda the Brave" || resolved[0].ArmorClass != 17 || resolved[0].MaxHitPoints != 24 {
		t.Fatalf("player reference was stale: %+v", resolved[0])
	}
	if resolved[1].DisplayName != "Veteran" || resolved[1].ArmorClass != 16 || resolved[1].MaxHitPoints != 25 || resolved[1].Snapshot["xp"] != 100 {
		t.Fatalf("creature reference was stale: %+v", resolved[1])
	}

	run, err := stores.Runs.StartEncounter(ctx, owner.ID, encounter.ID, true)
	requireNoError(t, err)
	if run.Combatants[1].DisplayName != "Veteran" || run.Combatants[1].MaxHitPoints != 25 {
		t.Fatalf("new run did not use current creature: %+v", run.Combatants[1])
	}
	_, err = stores.Creatures.Update(ctx, owner.ID, creature.ID, CreatureInput{
		Name: "Champion", ArmorClass: 18, HitPoints: 40, XP: 200,
	})
	requireNoError(t, err)
	stillRunning, err := stores.Runs.ByID(ctx, owner.ID, run.ID)
	requireNoError(t, err)
	if stillRunning.Combatants[1].DisplayName != "Veteran" || stillRunning.Combatants[1].MaxHitPoints != 25 {
		t.Fatalf("active run changed after source edit: %+v", stillRunning.Combatants[1])
	}
}
