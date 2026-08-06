package store

import (
	"context"
	"testing"

	dbmodels "bludm/backend/internal/db"
)

func TestClonePlayerNameIsDeterministic(t *testing.T) {
	if got, want := clonePlayerName("  Marlowe  "), "Marlowe Copy"; got != want {
		t.Fatalf("clonePlayerName() = %q, want %q", got, want)
	}
}

func TestMoveAndClonePlayerPreserveSingleCampaignAssignment(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()

	owner, err := stores.Auth.CreateUser(ctx, uniqueEmail("player-actions"), "hash")
	requireNoError(t, err)
	campaignA, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Campaign A"})
	requireNoError(t, err)
	campaignB, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Campaign B"})
	requireNoError(t, err)
	player, err := stores.Players.Create(ctx, owner.ID, PlayerInput{
		CampaignID:            campaignA.ID,
		CharacterName:         "Marlowe",
		PlayerName:            "Rory",
		ArmorClass:            16,
		MaxHitPoints:          27,
		TemporaryHitPoints:    4,
		TemporaryMaxHitPoints: 6,
		ExperiencePoints:      900,
		CharacterSheet:        map[string]any{"className": "Bard", "level": 3.0},
	})
	requireNoError(t, err)
	requireNoError(t, stores.db.WithContext(ctx).Model(&dbmodels.PlayerEntity{}).
		Where("id = ?", player.ID).Update("current_hit_points", 13).Error)

	moved, err := stores.Players.Move(ctx, owner.ID, player.ID, campaignB.ID)
	requireNoError(t, err)
	if moved.CampaignID != campaignB.ID || moved.CampaignName != campaignB.Name {
		t.Fatalf("moved player campaign = %q (%q), want %q (%q)", moved.CampaignID, moved.CampaignName, campaignB.ID, campaignB.Name)
	}
	playersA, err := stores.Campaigns.Players(ctx, owner.ID, campaignA.ID)
	requireNoError(t, err)
	playersB, err := stores.Campaigns.Players(ctx, owner.ID, campaignB.ID)
	requireNoError(t, err)
	if len(playersA) != 0 || len(playersB) != 1 {
		t.Fatalf("campaign player counts after move = %d, %d; want 0, 1", len(playersA), len(playersB))
	}

	clone, err := stores.Players.Clone(ctx, owner.ID, player.ID)
	requireNoError(t, err)
	if clone.ID == player.ID {
		t.Fatal("clone reused the source player ID")
	}
	if clone.CharacterName != "Marlowe Copy" {
		t.Fatalf("clone character name = %q, want %q", clone.CharacterName, "Marlowe Copy")
	}
	if clone.CampaignID != campaignB.ID || clone.CampaignName != campaignB.Name {
		t.Fatalf("clone campaign = %q (%q), want %q (%q)", clone.CampaignID, clone.CampaignName, campaignB.ID, campaignB.Name)
	}
	if clone.CurrentHitPoints != 13 || clone.MaxHitPoints != 27 || clone.TemporaryHitPoints != 4 {
		t.Fatalf("clone hit points = current %d, max %d, temp %d; want 13, 27, 4", clone.CurrentHitPoints, clone.MaxHitPoints, clone.TemporaryHitPoints)
	}
	playersB, err = stores.Campaigns.Players(ctx, owner.ID, campaignB.ID)
	requireNoError(t, err)
	if len(playersB) != 2 {
		t.Fatalf("campaign B player count after clone = %d, want 2", len(playersB))
	}

	unassigned, err := stores.Players.Move(ctx, owner.ID, clone.ID, "")
	requireNoError(t, err)
	if unassigned.CampaignID != "" || unassigned.CampaignName != "" {
		t.Fatalf("unassigned player campaign = %q (%q), want empty", unassigned.CampaignID, unassigned.CampaignName)
	}
	playersB, err = stores.Campaigns.Players(ctx, owner.ID, campaignB.ID)
	requireNoError(t, err)
	if len(playersB) != 1 {
		t.Fatalf("campaign B player count after unassigning clone = %d, want 1", len(playersB))
	}
}
