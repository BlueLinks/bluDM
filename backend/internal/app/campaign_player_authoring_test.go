package app

import (
	"context"
	"slices"
	"testing"

	"bludm/backend/internal/rulesets"
)

func TestCampaignManagementNormalizesFriendlyRulesets(t *testing.T) {
	input, warnings, err := normalizeCampaignCreate(CampaignCreateCommand{
		Name: "Ash Coast", EncounterRuleset: "2024",
	})
	if err != nil {
		t.Fatal(err)
	}
	if input.EncounterRuleset != rulesets.Encounter2024 ||
		!slices.Equal(input.AllowedStandardSources, []string{rulesets.Source2024}) ||
		len(warnings) != 0 {
		t.Fatalf("unexpected normalized campaign: %+v warnings=%v", input, warnings)
	}
}

func TestSelectedCampaignCredentialsCannotCreateGlobalRecords(t *testing.T) {
	service := NewService(nil, "")
	ctx := WithPrincipal(context.Background(), Principal{
		UserID: "user", Scopes: []Scope{ScopeCampaignsWrite, ScopePartyWrite},
		CampaignRestrictionMode: "selected", AllowedCampaignIDs: []string{"campaign-a"},
	})
	if _, err := service.CreateCampaign(ctx, CampaignCreateCommand{}); ErrorInfo(err).Code != CodeForbidden {
		t.Fatalf("selected credential created a campaign: %v", err)
	}
	if _, err := service.CreatePlayer(ctx, "", PlayerCreateCommand{}); ErrorInfo(err).Code != CodeForbidden {
		t.Fatalf("selected credential created an Unassigned player: %v", err)
	}
}
