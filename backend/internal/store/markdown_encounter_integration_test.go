package store

import (
	"context"
	"testing"
	"time"
)

func TestMarkdownEncounterImportCreatesAndUpdatesAtomically(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()
	owner, err := stores.Auth.CreateUser(ctx, uniqueEmail("markdown-owner"), "hash")
	requireNoError(t, err)
	campaign, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Vault Campaign"})
	requireNoError(t, err)

	first, err := stores.Encounters.ImportMarkdown(ctx, owner.ID, campaign.ID, []MarkdownEncounterImportInput{
		{
			SourceKey:  "locations/camp.md#hungry-wolves",
			SourcePath: "locations/camp.md",
			BlockID:    "hungry-wolves",
			Encounter: EncounterInput{
				Name:   "Hungry Wolves",
				Status: "planned",
			},
			Combatants: []EncounterCombatantInput{
				{
					SourceType:       "creature",
					Side:             "enemy",
					DisplayName:      "Wolf",
					ArmorClass:       13,
					MaxHitPoints:     11,
					CurrentHitPoints: 11,
					Snapshot:         map[string]any{"markdown": map[string]any{"inline": true}},
				},
			},
		},
	})
	requireNoError(t, err)
	if len(first) != 1 || first[0].Operation != "create" || len(first[0].Encounter.Combatants) != 1 {
		t.Fatalf("unexpected first import: %+v", first)
	}
	encounterID := first[0].Encounter.ID

	second, err := stores.Encounters.ImportMarkdown(ctx, owner.ID, campaign.ID, []MarkdownEncounterImportInput{
		{
			SourceKey:  "locations/camp.md#hungry-wolves",
			SourcePath: "locations/camp.md",
			BlockID:    "hungry-wolves",
			Encounter: EncounterInput{
				Name:        "Hungry Scavengers",
				Description: "The wolves can be driven away with food.",
				Status:      "planned",
			},
			Combatants: []EncounterCombatantInput{
				{
					SourceType:       "creature",
					Side:             "enemy",
					DisplayName:      "Dire Wolf",
					ArmorClass:       14,
					MaxHitPoints:     37,
					CurrentHitPoints: 37,
					Snapshot:         map[string]any{"markdown": map[string]any{"inline": true}},
				},
			},
		},
	})
	requireNoError(t, err)
	if len(second) != 1 || second[0].Operation != "update" {
		t.Fatalf("unexpected second import: %+v", second)
	}
	if second[0].Encounter.ID != encounterID || second[0].Encounter.Name != "Hungry Scavengers" {
		t.Fatalf("expected stable updated encounter, got %+v", second[0].Encounter)
	}
	if len(second[0].Encounter.Combatants) != 1 || second[0].Encounter.Combatants[0].DisplayName != "Dire Wolf" {
		t.Fatalf("expected roster replacement, got %+v", second[0].Encounter.Combatants)
	}
}

func TestAPITokensStoreOnlyHashesAndEnforceExpiry(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()
	owner, err := stores.Auth.CreateUser(ctx, uniqueEmail("token-owner"), "hash")
	requireNoError(t, err)

	expiresAt := time.Now().Add(time.Hour)
	token, err := stores.Auth.CreateAPIToken(
		ctx,
		owner.ID,
		"Vault bridge",
		"hashed-secret",
		"bludm_v1_example",
		&expiresAt,
	)
	requireNoError(t, err)
	if token.TokenPrefix != "bludm_v1_example" {
		t.Fatalf("unexpected token prefix: %+v", token)
	}
	authenticated, err := stores.Auth.UserByAPITokenHash(ctx, "hashed-secret")
	requireNoError(t, err)
	if authenticated.ID != owner.ID {
		t.Fatalf("expected token owner, got %+v", authenticated)
	}
	legacyAuthentication, err := stores.Auth.AuthenticateAPIToken(ctx, "hashed-secret")
	requireNoError(t, err)
	if legacyAuthentication.Token.AuthenticationVersion != 1 ||
		legacyAuthentication.Token.CampaignRestrictionMode != "legacy_all" ||
		len(legacyAuthentication.Token.Scopes) != 0 {
		t.Fatalf("existing-style token silently gained scoped access: %+v", legacyAuthentication.Token)
	}

	expired := time.Now().Add(-time.Hour)
	_, err = stores.Auth.CreateAPIToken(
		ctx,
		owner.ID,
		"Expired bridge",
		"expired-hash",
		"bludm_v1_expired",
		&expired,
	)
	requireNoError(t, err)
	if _, err := stores.Auth.UserByAPITokenHash(ctx, "expired-hash"); !IsNotFound(err) {
		t.Fatalf("expected expired token to be rejected, got %v", err)
	}
}

func TestScopedAPITokensKeepCampaignRestrictionsAndSoftRevocation(t *testing.T) {
	stores := newIntegrationStores(t)
	ctx := context.Background()
	owner, err := stores.Auth.CreateUser(ctx, uniqueEmail("scoped-token-owner"), "hash")
	requireNoError(t, err)
	allowed, err := stores.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Allowed"})
	requireNoError(t, err)

	expiresAt := time.Now().Add(time.Hour)
	token, err := stores.Auth.CreateScopedAPIToken(ctx, APITokenCreateInput{
		UserID: owner.ID, Name: "Encounter builder", TokenHash: "scoped-token-hash",
		TokenPrefix: "bludm_v1_scoped", Scopes: []string{"campaigns:read", "encounters:write"},
		CampaignRestrictionMode: "selected", AllowedCampaignIDs: []string{allowed.ID},
		AuthenticationVersion: 2, ExpiresAt: &expiresAt,
	})
	requireNoError(t, err)
	if token.AuthenticationVersion != 2 || len(token.AllowedCampaignIDs) != 1 ||
		token.AllowedCampaignIDs[0] != allowed.ID {
		t.Fatalf("unexpected scoped token: %+v", token)
	}
	authenticated, err := stores.Auth.AuthenticateAPIToken(ctx, "scoped-token-hash")
	requireNoError(t, err)
	if len(authenticated.Token.Scopes) != 2 ||
		authenticated.Token.CampaignRestrictionMode != "selected" {
		t.Fatalf("unexpected authentication result: %+v", authenticated.Token)
	}
	requireNoError(t, stores.Auth.DeleteAPIToken(ctx, owner.ID, token.ID))
	if _, err := stores.Auth.AuthenticateAPIToken(ctx, "scoped-token-hash"); !IsNotFound(err) {
		t.Fatalf("expected revoked token to be denied, got %v", err)
	}
}
