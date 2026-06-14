package store

import (
	"context"
	"testing"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"
)

func TestRunPersistenceRegressions(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()

	owner, err := stores.Auth.CreateUser(ctx, uniqueEmail("run-regression"), "hash")
	requireNoError(t, err)
	campaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Regression Campaign"})
	requireNoError(t, err)
	assetID, err := stores.Assets.Create(ctx, owner.ID, "hero.png", "image/png", 4, []byte("data"))
	requireNoError(t, err)
	player, err := stores.Players.Create(ctx, owner.ID, PlayerInput{
		CampaignID:         campaign.ID,
		CharacterName:      "Edda",
		PlayerName:         "Blue",
		AvatarAssetID:      assetID,
		ArmorClass:         15,
		MaxHitPoints:       22,
		ExperiencePoints:   100,
		TemporaryHitPoints: 3,
		CharacterSheet: map[string]any{
			"spellSlots":          map[string]any{"1": 4},
			"spellSlotsRemaining": map[string]any{"1": 3},
		},
	})
	requireNoError(t, err)
	creature, err := stores.Creatures.Create(ctx, owner.ID, CreatureInput{
		Name:       "Training Skeleton",
		ArmorClass: 12,
		HitPoints:  13,
		StatBlock: map[string]any{
			"damageResistances": []any{"piercing"},
		},
	})
	requireNoError(t, err)
	encounter, err := stores.Campaigns.CreateEncounter(ctx, owner.ID, campaign.ID, CampaignEncounterInput{Name: "Regression Encounter"})
	requireNoError(t, err)
	_, err = stores.Encounters.AddCombatant(ctx, owner.ID, encounter.ID, EncounterCombatantInput{
		SourceType:       "player",
		PlayerID:         player.ID,
		Side:             "player",
		DisplayName:      player.CharacterName,
		ArmorClass:       player.ArmorClass,
		MaxHitPoints:     player.MaxHitPoints,
		CurrentHitPoints: player.CurrentHitPoints,
		Snapshot: map[string]any{
			"player": map[string]any{
				"characterSheet": player.CharacterSheet,
			},
		},
	})
	requireNoError(t, err)
	_, err = stores.Encounters.AddCombatant(ctx, owner.ID, encounter.ID, EncounterCombatantInput{
		SourceType:       "creature",
		CreatureID:       creature.ID,
		Side:             "enemy",
		DisplayName:      creature.Name,
		ArmorClass:       creature.ArmorClass,
		MaxHitPoints:     creature.HitPoints,
		CurrentHitPoints: creature.HitPoints,
		Snapshot: map[string]any{
			"creature": map[string]any{
				"statBlock": creature.StatBlock,
			},
		},
	})
	requireNoError(t, err)

	run, err := stores.Runs.StartEncounter(ctx, owner.ID, encounter.ID, false)
	requireNoError(t, err)
	if len(run.Combatants) != 2 {
		t.Fatalf("expected two run combatants, got %d", len(run.Combatants))
	}
	playerCombatant := combatantBySource(t, run.Combatants, "player")
	enemyCombatant := combatantBySource(t, run.Combatants, "creature")
	if playerCombatant.AvatarURL != "/api/assets/"+assetID {
		t.Fatalf("expected player avatar asset URL to be snapshotted, got %q", playerCombatant.AvatarURL)
	}
	if len(run.SpellSlots) != 1 || run.SpellSlots[0].MaxSlots != 4 || run.SpellSlots[0].RemainingSlots != 3 {
		t.Fatalf("expected clamped level-one spell slot snapshot, got %+v", run.SpellSlots)
	}

	requireNoError(t, stores.Runs.SetInitiatives(ctx, map[string]int{
		playerCombatant.ID: 12,
		enemyCombatant.ID:  18,
	}))
	requireNoError(t, stores.Runs.SortInitiative(ctx, run.ID))
	ordered, err := stores.Runs.CombatantsForRun(ctx, run.ID)
	requireNoError(t, err)
	if ordered[0].ID != enemyCombatant.ID || ordered[1].ID != playerCombatant.ID {
		t.Fatalf("expected initiative order enemy then player, got %+v", ordered)
	}

	enemyCombatant.CurrentHitPoints = 6
	enemyCombatant.TemporaryHitPoints = 2
	enemyCombatant.DamageTaken = 7
	playerCombatant.DamageDealt = 7
	payload := map[string]any{
		"undoable":     true,
		"targetBefore": map[string]any{"id": enemyCombatant.ID, "currentHitPoints": 13},
	}
	requireNoError(t, stores.Runs.SaveHPChangeAndLog(ctx, run.ID, "damage_resolved", playerCombatant.ID, enemyCombatant.ID, enemyCombatant, playerCombatant, payload))
	enemyAfter, err := stores.Runs.CombatantByID(ctx, run.ID, enemyCombatant.ID)
	requireNoError(t, err)
	if enemyAfter.CurrentHitPoints != 6 || enemyAfter.TemporaryHitPoints != 2 || enemyAfter.DamageTaken != 7 {
		t.Fatalf("expected HP and damage meter persistence, got %+v", enemyAfter)
	}
	events, err := stores.Runs.CombatLogEventsForRun(ctx, run.ID, 5)
	requireNoError(t, err)
	if len(events) != 1 || events[0].EventType != "damage_resolved" || events[0].Payload["undoable"] != true {
		t.Fatalf("expected undoable combat log event, got %+v", events)
	}

	playerCombatant.DeathSaveSuccesses = 3
	playerCombatant.Stable = true
	requireNoError(t, stores.Runs.UpdateDeathSave(ctx, playerCombatant))
	playerCombatant.CurrentHitPoints = 8
	playerCombatant.TemporaryHitPoints = 1
	_, err = stores.Runs.UpdateCombatant(ctx, playerCombatant.ID, RunCombatantUpdate{
		DisplayName:          playerCombatant.DisplayName,
		ColorLabel:           playerCombatant.ColorLabel,
		AvatarURL:            playerCombatant.AvatarURL,
		Initiative:           playerCombatant.Initiative,
		InitiativeSet:        true,
		TemporaryHitPoints:   playerCombatant.TemporaryHitPoints,
		CurrentHitPoints:     playerCombatant.CurrentHitPoints,
		ArmorClassBonus:      playerCombatant.ArmorClassBonus,
		MaxHitPointsModifier: playerCombatant.MaxHitPointsModifier,
		Conditions:           playerCombatant.Conditions,
		Defeated:             playerCombatant.Defeated,
	})
	requireNoError(t, err)
	requireNoError(t, stores.db.WithContext(ctx).
		Model(&dbmodels.EncounterRunSpellSlotEntity{}).
		Where("encounter_run_id = ? and combatant_id = ? and spell_level = ?", run.ID, playerCombatant.ID, 1).
		Update("remaining_slots", 1).Error)

	run, err = stores.Runs.ByID(ctx, owner.ID, run.ID)
	requireNoError(t, err)
	summary := map[string]any{
		"xpAwards":        map[string]any{player.ID: 50},
		"lootPool":        []any{"silver ring"},
		"lootAssignments": map[string]any{player.ID: []any{"silver ring"}},
	}
	requireNoError(t, stores.Runs.EndRun(ctx, run, summary, map[string]int{player.ID: 50}))

	ended, err := stores.Runs.ByID(ctx, owner.ID, run.ID)
	requireNoError(t, err)
	if ended.Status != "ended" || ended.EndedAt == nil {
		t.Fatalf("expected ended run with ended timestamp, got %+v", ended)
	}
	if ended.Summary["lootPool"] == nil || ended.Summary["lootAssignments"] == nil {
		t.Fatalf("expected loot summary to persist, got %+v", ended.Summary)
	}
	completed, err := stores.Encounters.ByID(ctx, owner.ID, encounter.ID)
	requireNoError(t, err)
	if completed.Status != "completed" {
		t.Fatalf("expected source encounter to be completed, got %q", completed.Status)
	}
	updatedPlayer, err := stores.Players.ByID(ctx, owner.ID, player.ID)
	requireNoError(t, err)
	if updatedPlayer.CurrentHitPoints != 8 || updatedPlayer.TemporaryHitPoints != 1 {
		t.Fatalf("expected player HP to persist from run, got %+v", updatedPlayer)
	}
	if updatedPlayer.ExperiencePoints != 150 {
		t.Fatalf("expected XP award to persist, got %d", updatedPlayer.ExperiencePoints)
	}
	remaining := updatedPlayer.CharacterSheet["spellSlotsRemaining"].(map[string]any)
	if remaining["1"] != float64(1) && remaining["1"] != 1 {
		t.Fatalf("expected remaining spell slot to persist, got %+v", remaining)
	}
}

func TestAuthSessionExpiryRegression(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()

	user, err := stores.Auth.CreateUser(ctx, uniqueEmail("session-regression"), "hash")
	requireNoError(t, err)
	requireNoError(t, stores.Auth.StartSession(ctx, user.ID, "active-token", time.Now().Add(time.Hour)))
	requireNoError(t, stores.Auth.StartSession(ctx, user.ID, "expired-token", time.Now().Add(-time.Hour)))

	activeUser, err := stores.Auth.UserBySessionToken(ctx, "active-token")
	requireNoError(t, err)
	if activeUser.ID != user.ID {
		t.Fatalf("expected active session to resolve user %s, got %s", user.ID, activeUser.ID)
	}
	if _, err := stores.Auth.UserBySessionToken(ctx, "expired-token"); !IsNotFound(err) {
		t.Fatalf("expected expired session to be rejected, got %v", err)
	}
}

func TestDemoFixtureSeedsOwnedPlayers(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()

	user, err := stores.Auth.CreateUser(ctx, uniqueEmail("demo-fixture"), "hash")
	requireNoError(t, err)
	campaignID, err := stores.Demo.SeedFixture(ctx, user.ID)
	requireNoError(t, err)

	players, err := stores.Players.List(ctx, user.ID)
	requireNoError(t, err)
	if len(players) != 3 {
		t.Fatalf("expected demo fixture to seed 3 owned players, got %d", len(players))
	}
	for _, player := range players {
		if player.CampaignID != campaignID {
			t.Fatalf("expected player %s to belong to campaign %s, got %s", player.CharacterName, campaignID, player.CampaignID)
		}
	}
	creatures, err := stores.Campaigns.Creatures(ctx, user.ID, campaignID)
	requireNoError(t, err)
	if len(creatures) != 2 {
		t.Fatalf("expected demo fixture to link 2 friendly NPCs, got %d", len(creatures))
	}
}

func combatantBySource(t *testing.T, combatants []models.EncounterRunCombatant, sourceType string) models.EncounterRunCombatant {
	t.Helper()
	for _, combatant := range combatants {
		if combatant.SourceType == sourceType {
			return combatant
		}
	}
	t.Fatalf("expected %s combatant in %+v", sourceType, combatants)
	return models.EncounterRunCombatant{}
}
