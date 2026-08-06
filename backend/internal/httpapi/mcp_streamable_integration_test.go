package httpapi

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/config"
	"bludm/backend/internal/generation"
	"bludm/backend/internal/rulesets"
	"bludm/backend/internal/store"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func TestMCPStreamableHTTPAgentEncounterWorkflow(t *testing.T) {
	database, stores := newImportExportArchiveTestStores(t)
	ctx := context.Background()
	owner, err := stores.Auth.CreateUser(ctx, uniqueArchiveEmail("mcp-agent"), "hash")
	requireArchiveNoError(t, err)
	campaign, err := stores.Campaigns.Create(ctx, owner.ID, store.CampaignInput{
		Name: "MCP Campaign", AllowedStandardSources: []string{rulesets.Source2024},
		EncounterRuleset: rulesets.Encounter2024,
	})
	requireArchiveNoError(t, err)
	player, err := stores.Players.Create(ctx, owner.ID, store.PlayerInput{
		CampaignID: campaign.ID, CharacterName: "Tamsin", ArmorClass: 16, MaxHitPoints: 31,
		CharacterSheet: map[string]any{"level": 4},
	})
	requireArchiveNoError(t, err)
	creature, err := stores.Creatures.Create(ctx, owner.ID, store.CreatureInput{
		Name: "Agent Test Wolf", Size: "Medium", CreatureType: "Beast", ArmorClass: 13,
		HitPoints: 11, HitDice: "2d8+2", ChallengeRating: "1/4", XP: 50,
		StatBlock: map[string]any{
			"abilityScores": map[string]any{
				"str": 12, "dex": 15, "con": 12, "int": 3, "wis": 12, "cha": 6,
			},
			"speed": map[string]any{"walk": 40},
		},
	})
	requireArchiveNoError(t, err)
	var standardCreatureID string
	requireArchiveNoError(t, database.Raw(`
		insert into standard_creatures (
			source_key, slug, name, size, creature_type, armor_class,
			hit_points, hit_dice, challenge_rating, xp, source_label
		) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		returning id
	`,
		rulesets.Source2024, "agent-test-standard-wolf", "Agent Test Standard Wolf",
		"Medium", "Beast", 13, 11, "2d8+2", "1/4", 50, "SRD 5.2.1",
	).Scan(&standardCreatureID).Error)

	secret := apiTokenPrefix + strings.Repeat("m", 32)
	expiresAt := time.Now().Add(time.Hour)
	_, err = stores.Auth.CreateScopedAPIToken(ctx, store.APITokenCreateInput{
		UserID: owner.ID, Name: "MCP test agent", TokenHash: hashToken(secret),
		TokenPrefix: secret[:displayedTokenLength], Scopes: appdomain.ScopeStrings([]appdomain.Scope{
			appdomain.ScopeCampaignsRead, appdomain.ScopePartyRead, appdomain.ScopeLibraryRead,
			appdomain.ScopeEncountersRead, appdomain.ScopeEncountersWrite, appdomain.ScopeGenerationRun,
		}), CampaignRestrictionMode: "selected", AllowedCampaignIDs: []string{campaign.ID},
		AuthenticationVersion: 2, ExpiresAt: &expiresAt,
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
	assertMCPProtocolNegotiation(t, httpServer.URL+"/mcp", secret, "2025-11-25")

	session := connectMCPHTTP(t, httpServer.URL+"/mcp", secret)
	defer session.Close()
	if version := session.InitializeResult().ProtocolVersion; version != "2026-07-28" {
		t.Fatalf("current MCP discovery negotiated %q, want 2026-07-28", version)
	}

	listed := callMCPTool(t, session, "list_campaigns", map[string]any{"limit": 10})
	if listed.IsError {
		t.Fatalf("list_campaigns returned an error: %+v", listed)
	}
	var campaigns struct {
		Campaigns []struct {
			ID string `json:"id"`
		} `json:"campaigns"`
	}
	decodeMCPStructured(t, listed, &campaigns)
	if len(campaigns.Campaigns) != 1 || campaigns.Campaigns[0].ID != campaign.ID {
		t.Fatalf("campaign discovery did not respect token grants: %+v", campaigns)
	}
	invalid := callMCPTool(t, session, "list_campaigns", map[string]any{"unexpected": true})
	if !invalid.IsError {
		t.Fatalf("MCP accepted an unknown input field: %+v", invalid)
	}
	var invalidBody struct {
		Error struct {
			Code appdomain.ErrorCode `json:"code"`
		} `json:"error"`
	}
	decodeMCPStructured(t, invalid, &invalidBody)
	if invalidBody.Error.Code != appdomain.CodeValidation {
		t.Fatalf("invalid MCP input was not actionable: %+v", invalidBody)
	}

	contextResult := callMCPTool(t, session, "get_campaign_context", map[string]any{
		"campaignId": campaign.ID,
	})
	if contextResult.IsError {
		t.Fatalf("get_campaign_context returned an error: %+v", contextResult)
	}
	creatureResult := callMCPTool(t, session, "search_creatures", map[string]any{
		"campaignId": campaign.ID, "query": "Agent Test Wolf", "limit": 10,
	})
	if creatureResult.IsError {
		t.Fatalf("search_creatures returned an error: %+v", creatureResult)
	}
	evaluatedResult := callMCPTool(t, session, "evaluate_encounter", map[string]any{
		"campaignId": campaign.ID, "allCampaignPlayers": true,
		"requestedDifficulty": "medium",
		"enemies":             []map[string]any{{"creatureId": creature.ID, "quantity": 1}},
	})
	if evaluatedResult.IsError {
		t.Fatalf("evaluate_encounter returned an error: %+v", evaluatedResult)
	}
	var evaluated generation.DifficultyEvidence
	decodeMCPStructured(t, evaluatedResult, &evaluated)
	if evaluated.Ruleset != rulesets.Encounter2024 ||
		evaluated.RequestedDifficulty != "Moderate" || evaluated.Thresholds.Moderate != 375 {
		t.Fatalf("MCP evaluation did not use the actual campaign party and 2024 rules: %+v", evaluated)
	}

	createdResult := callMCPTool(t, session, "create_generated_encounter", map[string]any{
		"campaignId": campaign.ID, "idempotencyKey": "mcp-agent-create-1",
		"name": "The Wolf Crossing", "playerIds": []string{player.ID}, "seed": 41,
		"requiredCreatureIds": []string{standardCreatureID},
		"options": map[string]any{
			"archetype": "beasts", "challenge": "medium", "enemyCount": 1,
		},
	})
	if createdResult.IsError {
		t.Fatalf("create_generated_encounter returned an error: %+v", createdResult)
	}
	var created appdomain.EncounterAuthoringResult
	decodeMCPStructured(t, createdResult, &created)
	if created.Encounter.ID == "" || created.Revision != 1 || created.Encounter.Status != "planned" {
		t.Fatalf("MCP creation was not a durable planned revision-1 encounter: %+v", created)
	}
	if created.DifficultyEvidence.RequestedDifficulty == "" ||
		created.DifficultyEvidence.ActualDifficulty == "" ||
		created.DifficultyEvidence.RawXP == 0 ||
		created.DifficultyEvidence.Ruleset != rulesets.Encounter2024 ||
		created.Encounter.DifficultyRuleset != rulesets.Encounter2024 {
		t.Fatalf("MCP generation omitted server-side difficulty evidence: %+v", created)
	}

	restResponse := serveExternalJSON(
		t, server, secret, http.MethodGet,
		"/api/external/v1/campaigns/"+campaign.ID+"/encounters/"+created.Encounter.ID, nil,
	)
	if restResponse.Code != http.StatusOK {
		t.Fatalf("REST could not read MCP-authored encounter: %d %s", restResponse.Code, restResponse.Body.String())
	}
	var readback appdomain.EncounterDetails
	requireArchiveNoError(t, json.Unmarshal(restResponse.Body.Bytes(), &readback))
	if readback.Encounter.ID != created.Encounter.ID || readback.Encounter.Revision != 1 {
		t.Fatalf("REST and MCP did not share the same application state: %+v", readback)
	}
	if readback.DifficultyEvidence.Ruleset != rulesets.Encounter2024 {
		t.Fatalf("get_encounter did not retain the persisted ruleset: %+v", readback)
	}
	foundStandardCreature := false
	foundPlayer := false
	for _, combatant := range readback.Combatants {
		if combatant.PlayerID == player.ID {
			foundPlayer = true
			if combatant.SourceType != "player" || combatant.Side != "player" {
				t.Fatalf("MCP-generated player was not usable by initiative setup: %+v", combatant)
			}
		}
		if combatant.Snapshot["standardCreatureId"] != standardCreatureID {
			continue
		}
		foundStandardCreature = true
		if combatant.CreatureID != "" {
			t.Fatalf("standard creature populated the custom creature foreign key: %+v", combatant)
		}
	}
	if !foundStandardCreature {
		t.Fatalf("generated standard creature reference was not persisted: %+v", readback.Combatants)
	}
	if !foundPlayer {
		t.Fatalf("generated encounter omitted the selected player: %+v", readback.Combatants)
	}

	authoredResult := callMCPTool(t, session, "create_encounter", map[string]any{
		"campaignId": campaign.ID,
		"encounter": map[string]any{
			"idempotencyKey": "mcp-authored-player-roster-1",
			"name":           "The Authored Wolf Crossing",
			"combatants": []map[string]any{
				{"sourceType": "player", "playerId": player.ID, "side": "ally"},
				{"sourceType": "creature", "creatureId": creature.ID, "side": "enemy"},
			},
		},
	})
	if authoredResult.IsError {
		t.Fatalf("create_encounter returned an error: %+v", authoredResult)
	}
	var authored appdomain.EncounterWriteResult
	decodeMCPStructured(t, authoredResult, &authored)
	authoredReadResult := callMCPTool(t, session, "get_encounter", map[string]any{
		"campaignId": campaign.ID, "encounterId": authored.ID,
	})
	if authoredReadResult.IsError {
		t.Fatalf("get_encounter returned an error: %+v", authoredReadResult)
	}
	var authoredReadback appdomain.EncounterDetails
	decodeMCPStructured(t, authoredReadResult, &authoredReadback)
	if len(authoredReadback.Combatants) != 2 {
		t.Fatalf("authored encounter roster was incomplete: %+v", authoredReadback.Combatants)
	}
	authoredPlayerFound := false
	for _, combatant := range authoredReadback.Combatants {
		if combatant.PlayerID == player.ID {
			authoredPlayerFound = true
			if combatant.Side != "player" {
				t.Fatalf("MCP-authored player was not usable by initiative setup: %+v", combatant)
			}
		}
	}
	if !authoredPlayerFound {
		t.Fatalf("authored encounter omitted the selected player: %+v", authoredReadback.Combatants)
	}

	// Simulate an encounter created before player/ally sides were normalized.
	requireArchiveNoError(t, database.Table("encounter_combatants").
		Where("encounter_id = ? and player_id = ?", authored.ID, player.ID).
		Update("side", "ally").Error)
	legacyReadResult := callMCPTool(t, session, "get_encounter", map[string]any{
		"campaignId": campaign.ID, "encounterId": authored.ID,
	})
	if legacyReadResult.IsError {
		t.Fatalf("get_encounter could not read a legacy roster: %+v", legacyReadResult)
	}
	var legacyReadback appdomain.EncounterDetails
	decodeMCPStructured(t, legacyReadResult, &legacyReadback)
	for _, combatant := range legacyReadback.Combatants {
		if combatant.PlayerID == player.ID && combatant.Side != "player" {
			t.Fatalf("legacy MCP player side was not normalized on read: %+v", combatant)
		}
	}
	run, err := stores.Runs.StartEncounter(ctx, owner.ID, authored.ID, true)
	requireArchiveNoError(t, err)
	for _, combatant := range run.Combatants {
		if combatant.PlayerID == player.ID && combatant.Side != "player" {
			t.Fatalf("MCP-authored player was missing from the initiative player group: %+v", combatant)
		}
	}

	replayedResult := callMCPTool(t, session, "create_generated_encounter", map[string]any{
		"campaignId": campaign.ID, "idempotencyKey": "mcp-agent-create-1",
		"name": "The Wolf Crossing", "playerIds": []string{player.ID}, "seed": 41,
		"requiredCreatureIds": []string{standardCreatureID},
		"options": map[string]any{
			"archetype": "beasts", "challenge": "medium", "enemyCount": 1,
		},
	})
	var replayed appdomain.EncounterAuthoringResult
	decodeMCPStructured(t, replayedResult, &replayed)
	if replayed.Encounter.ID != created.Encounter.ID || !replayed.IdempotencyReplay {
		t.Fatalf("MCP idempotency retry was not replayed: %+v", replayed)
	}

	regeneratedResult := callMCPTool(t, session, "regenerate_encounter", map[string]any{
		"campaignId": campaign.ID, "encounterId": created.Encounter.ID,
		"idempotencyKey": "mcp-agent-regenerate-1", "expectedRevision": 1, "seed": 43,
		"requiredCreatureIds": []string{standardCreatureID},
		"options": map[string]any{
			"archetype": "beasts", "challenge": "medium", "enemyCount": 1,
		},
	})
	if regeneratedResult.IsError {
		t.Fatalf("regenerate_encounter returned an error: %+v", regeneratedResult)
	}
	var regenerated appdomain.EncounterAuthoringResult
	decodeMCPStructured(t, regeneratedResult, &regenerated)
	if regenerated.Encounter.ID != created.Encounter.ID || regenerated.Revision != 2 {
		t.Fatalf("MCP regeneration did not preserve encounter identity: %+v", regenerated)
	}

	revisionsResult := callMCPTool(t, session, "list_encounter_revisions", map[string]any{
		"campaignId": campaign.ID, "encounterId": created.Encounter.ID,
	})
	var revisions struct {
		Revisions []struct {
			Revision int `json:"revision"`
		} `json:"revisions"`
	}
	decodeMCPStructured(t, revisionsResult, &revisions)
	if len(revisions.Revisions) != 2 || revisions.Revisions[0].Revision != 2 ||
		revisions.Revisions[1].Revision != 1 {
		t.Fatalf("MCP revision history was incomplete: %+v", revisions)
	}

	var auditCount int64
	requireArchiveNoError(t, database.Table("external_audit_records").
		Where("operation in ?", []string{
			"list_campaigns", "get_campaign_context", "search_creatures",
			"evaluate_encounter",
			"create_generated_encounter", "regenerate_encounter", "list_encounter_revisions",
		}).Count(&auditCount).Error)
	if auditCount < 8 {
		t.Fatalf("expected an MCP audit record for every call, got %d", auditCount)
	}

	legacySecret := apiTokenPrefix + strings.Repeat("l", 32)
	_, err = stores.Auth.CreateScopedAPIToken(ctx, store.APITokenCreateInput{
		UserID: owner.ID, Name: "Migrated legacy token", TokenHash: hashToken(legacySecret),
		TokenPrefix: legacySecret[:displayedTokenLength], AuthenticationVersion: 1,
		CampaignRestrictionMode: "legacy_all", ExpiresAt: &expiresAt,
	})
	requireArchiveNoError(t, err)
	legacySession := connectMCPHTTP(t, httpServer.URL+"/mcp", legacySecret)
	defer legacySession.Close()
	if result := callMCPTool(t, legacySession, "list_campaigns", map[string]any{}); result.IsError {
		t.Fatalf("legacy token lost its existing read access: %+v", result)
	}
	denied := callMCPTool(t, legacySession, "create_generated_encounter", map[string]any{
		"campaignId": campaign.ID, "idempotencyKey": "legacy-write-denied",
		"playerIds": []string{player.ID}, "requiredCreatureIds": []string{creature.ID},
		"options": map[string]any{
			"archetype": "monsters", "challenge": "medium", "enemyCount": 1,
		},
	})
	if !denied.IsError {
		t.Fatalf("legacy token silently gained MCP write access: %+v", denied)
	}
	var deniedBody struct {
		Error struct {
			Code appdomain.ErrorCode `json:"code"`
		} `json:"error"`
	}
	decodeMCPStructured(t, denied, &deniedBody)
	if deniedBody.Error.Code != appdomain.CodeForbidden {
		t.Fatalf("legacy MCP write denial was not machine-readable: %+v", deniedBody)
	}
}

func assertMCPProtocolNegotiation(t *testing.T, endpoint, token, protocolVersion string) {
	t.Helper()
	body := `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"` +
		protocolVersion + `","capabilities":{},"clientInfo":{"name":"protocol-contract","version":"1.0.0"}}}`
	request, err := http.NewRequestWithContext(
		context.Background(), http.MethodPost, endpoint, strings.NewReader(body),
	)
	if err != nil {
		t.Fatal(err)
	}
	request.Header.Set("Authorization", "Bearer "+token)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept", "application/json, text/event-stream")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatalf("initialize MCP %s: %v", protocolVersion, err)
	}
	defer response.Body.Close()
	encoded, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("initialize MCP %s returned %d: %s", protocolVersion, response.StatusCode, encoded)
	}
	message := encoded
	for _, line := range strings.Split(string(encoded), "\n") {
		if strings.HasPrefix(line, "data:") {
			message = []byte(strings.TrimSpace(strings.TrimPrefix(line, "data:")))
			break
		}
	}
	var initialized struct {
		Result struct {
			ProtocolVersion string `json:"protocolVersion"`
		} `json:"result"`
	}
	if err := json.Unmarshal(message, &initialized); err != nil {
		t.Fatalf("decode MCP %s initialize response %q: %v", protocolVersion, message, err)
	}
	if initialized.Result.ProtocolVersion != protocolVersion {
		t.Fatalf(
			"MCP protocol negotiation returned %q, want %q",
			initialized.Result.ProtocolVersion, protocolVersion,
		)
	}
}

type bearerRoundTripper struct {
	token string
	base  http.RoundTripper
}

func (transport bearerRoundTripper) RoundTrip(request *http.Request) (*http.Response, error) {
	cloned := request.Clone(request.Context())
	cloned.Header.Set("Authorization", "Bearer "+transport.token)
	return transport.base.RoundTrip(cloned)
}

func connectMCPHTTP(t *testing.T, endpoint, token string) *mcp.ClientSession {
	t.Helper()
	client := mcp.NewClient(&mcp.Implementation{Name: "bluDM agent evaluation", Version: "1.0.0"}, nil)
	session, err := client.Connect(context.Background(), &mcp.StreamableClientTransport{
		Endpoint: endpoint,
		HTTPClient: &http.Client{Transport: bearerRoundTripper{
			token: token, base: http.DefaultTransport,
		}},
		DisableStandaloneSSE: true,
	}, nil)
	if err != nil {
		t.Fatalf("connect to Streamable HTTP MCP: %v", err)
	}
	return session
}

func callMCPTool(
	t *testing.T,
	session *mcp.ClientSession,
	name string,
	arguments map[string]any,
) *mcp.CallToolResult {
	t.Helper()
	result, err := session.CallTool(context.Background(), &mcp.CallToolParams{
		Name: name, Arguments: arguments,
	})
	if err != nil {
		t.Fatalf("call MCP tool %s: %v", name, err)
	}
	return result
}

func decodeMCPStructured(t *testing.T, result *mcp.CallToolResult, target any) {
	t.Helper()
	encoded, err := json.Marshal(result.StructuredContent)
	if err != nil {
		t.Fatalf("encode MCP structured content: %v", err)
	}
	if err := json.Unmarshal(encoded, target); err != nil {
		t.Fatalf("decode MCP structured content %s: %v", encoded, err)
	}
}
