package httpapi

import (
	"context"
	"io"
	"log/slog"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"
	"time"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/config"
	"bludm/backend/internal/rulesets"
	"bludm/backend/internal/store"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func TestMCPManagementCampaignAndPlayerWorkflow(t *testing.T) {
	database, stores := newImportExportArchiveTestStores(t)
	ctx := context.Background()
	owner, err := stores.Auth.CreateUser(ctx, uniqueArchiveEmail("mcp-management"), "hash")
	requireArchiveNoError(t, err)
	secret := apiTokenPrefix + strings.Repeat("p", 32)
	expiresAt := time.Now().Add(time.Hour)
	_, err = stores.Auth.CreateScopedAPIToken(ctx, store.APITokenCreateInput{
		UserID: owner.ID, Name: "MCP manager", TokenHash: hashToken(secret),
		TokenPrefix: secret[:displayedTokenLength], Scopes: appdomain.ScopeStrings([]appdomain.Scope{
			appdomain.ScopeCampaignsRead, appdomain.ScopeCampaignsWrite,
			appdomain.ScopePartyRead, appdomain.ScopePartyWrite,
		}), CampaignRestrictionMode: "all", AuthenticationVersion: 2, ExpiresAt: &expiresAt,
	})
	requireArchiveNoError(t, err)

	server := New(config.Config{
		PublicAppURL: "http://example.test",
		MCP: config.MCPConfig{
			MaxRequestBytes: 1 << 20, ToolExecutionTimeout: 10 * time.Second,
			ReadRequestsPerMinute: 200, WriteRequestsPerMinute: 200,
			GenerationRequestsPerMinute: 200,
		},
	}, nil, database, slog.New(slog.NewTextHandler(io.Discard, nil)))
	httpServer := httptest.NewServer(server.Routes())
	t.Cleanup(httpServer.Close)
	session := connectMCPHTTP(t, httpServer.URL+"/mcp", secret)
	defer session.Close()

	first := createManagedCampaign(t, session, "Ash Coast", "2024", "management-campaign-a")
	if first.EncounterRuleset != rulesets.Encounter2024 ||
		!slices.Equal(first.AllowedStandardSources, []string{rulesets.Source2024}) {
		t.Fatalf("create_campaign did not resolve the 2024 ruleset: %+v", first)
	}
	replayed := createManagedCampaign(t, session, "Ash Coast", "2024", "management-campaign-a")
	if replayed.ID != first.ID || !replayed.IdempotencyReplay {
		t.Fatalf("create_campaign retry was not replayed: %+v", replayed)
	}
	second := createManagedCampaign(t, session, "Glass March", "2014", "management-campaign-b")

	updatedResult := callMCPTool(t, session, "update_campaign", map[string]any{
		"campaignId": first.ID,
		"campaign": map[string]any{
			"idempotencyKey": "management-campaign-update", "expectedUpdatedAt": first.UpdatedAt,
			"encounterRuleset": "2014",
		},
	})
	if updatedResult.IsError {
		t.Fatalf("update_campaign returned an error: %+v", updatedResult)
	}
	var updatedCampaign appdomain.CampaignWriteResult
	decodeMCPStructured(t, updatedResult, &updatedCampaign)
	if updatedCampaign.EncounterRuleset != rulesets.Encounter2014 ||
		!slices.Contains(updatedCampaign.AllowedStandardSources, rulesets.Source2014) {
		t.Fatalf("update_campaign did not switch rulesets safely: %+v", updatedCampaign)
	}

	createdResult := callMCPTool(t, session, "create_player", map[string]any{
		"campaignId": first.ID,
		"player": map[string]any{
			"idempotencyKey": "management-player-create", "characterName": "Tamsin",
			"playerName": "Rory", "armorClass": 16, "maxHitPoints": 31,
			"characterSheet": map[string]any{"level": 4, "class": "Ranger"},
		},
	})
	if createdResult.IsError {
		t.Fatalf("create_player returned an error: %+v", createdResult)
	}
	var player appdomain.PlayerWriteResult
	decodeMCPStructured(t, createdResult, &player)
	if player.CampaignID != first.ID || player.CurrentHitPoints != 31 {
		t.Fatalf("create_player returned the wrong assignment or HP: %+v", player)
	}

	listedResult := callMCPTool(t, session, "list_players", map[string]any{"limit": 10})
	if listedResult.IsError {
		t.Fatalf("list_players returned an error: %+v", listedResult)
	}
	var listed struct {
		Players []appdomain.PartySummary `json:"players"`
	}
	decodeMCPStructured(t, listedResult, &listed)
	if len(listed.Players) != 1 || listed.Players[0].CampaignID != first.ID {
		t.Fatalf("all-player discovery omitted campaign assignments: %+v", listed.Players)
	}

	updateResult := callMCPTool(t, session, "update_player", map[string]any{
		"campaignId": first.ID, "playerId": player.ID,
		"player": map[string]any{
			"idempotencyKey": "management-player-update", "expectedUpdatedAt": player.UpdatedAt,
			"characterName": "Tamsin Vale", "armorClass": 17,
		},
	})
	if updateResult.IsError {
		t.Fatalf("update_player returned an error: %+v", updateResult)
	}
	decodeMCPStructured(t, updateResult, &player)
	if player.CharacterName != "Tamsin Vale" || player.ArmorClass != 17 {
		t.Fatalf("update_player did not retain the requested edits: %+v", player)
	}

	moveResult := callMCPTool(t, session, "move_player", map[string]any{
		"campaignId": first.ID, "playerId": player.ID,
		"move": map[string]any{
			"idempotencyKey": "management-player-move", "expectedUpdatedAt": player.UpdatedAt,
			"destinationCampaignId": second.ID,
		},
	})
	if moveResult.IsError {
		t.Fatalf("move_player returned an error: %+v", moveResult)
	}
	decodeMCPStructured(t, moveResult, &player)
	if player.CampaignID != second.ID {
		t.Fatalf("move_player did not update the campaign assignment: %+v", player)
	}

	cloneResult := callMCPTool(t, session, "clone_player", map[string]any{
		"campaignId": second.ID, "playerId": player.ID,
		"clone": map[string]any{
			"idempotencyKey": "management-player-clone", "expectedUpdatedAt": player.UpdatedAt,
		},
	})
	if cloneResult.IsError {
		t.Fatalf("clone_player returned an error: %+v", cloneResult)
	}
	var clone appdomain.PlayerWriteResult
	decodeMCPStructured(t, cloneResult, &clone)
	if clone.ID == player.ID || clone.CharacterName != "Tamsin Vale Copy" || clone.CampaignID != second.ID {
		t.Fatalf("clone_player was not deterministic or assignment-preserving: %+v", clone)
	}
	cloneReplay := callMCPTool(t, session, "clone_player", map[string]any{
		"campaignId": second.ID, "playerId": player.ID,
		"clone": map[string]any{
			"idempotencyKey": "management-player-clone", "expectedUpdatedAt": player.UpdatedAt,
		},
	})
	var replayedClone appdomain.PlayerWriteResult
	decodeMCPStructured(t, cloneReplay, &replayedClone)
	if replayedClone.ID != clone.ID || !replayedClone.IdempotencyReplay {
		t.Fatalf("clone_player retry created another record: %+v", replayedClone)
	}

	unassignResult := callMCPTool(t, session, "move_player", map[string]any{
		"campaignId": second.ID, "playerId": clone.ID,
		"move": map[string]any{
			"idempotencyKey": "management-player-unassign", "expectedUpdatedAt": clone.UpdatedAt,
			"destinationCampaignId": "",
		},
	})
	if unassignResult.IsError {
		t.Fatalf("move_player to Unassigned returned an error: %+v", unassignResult)
	}
	decodeMCPStructured(t, unassignResult, &clone)
	if clone.CampaignID != "" {
		t.Fatalf("move_player did not clear the campaign assignment: %+v", clone)
	}
	readUnassigned := callMCPTool(t, session, "get_player", map[string]any{
		"campaignId": "", "playerId": clone.ID,
	})
	if readUnassigned.IsError {
		t.Fatalf("get_player could not read an Unassigned character: %+v", readUnassigned)
	}
}

func createManagedCampaign(
	t *testing.T,
	session *mcp.ClientSession,
	name string,
	ruleset string,
	idempotencyKey string,
) appdomain.CampaignWriteResult {
	t.Helper()
	result := callMCPTool(t, session, "create_campaign", map[string]any{
		"campaign": map[string]any{
			"idempotencyKey": idempotencyKey, "name": name, "encounterRuleset": ruleset,
		},
	})
	if result.IsError {
		t.Fatalf("create_campaign returned an error: %+v", result)
	}
	var campaign appdomain.CampaignWriteResult
	decodeMCPStructured(t, result, &campaign)
	return campaign
}
