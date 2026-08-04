package httpapi

import (
	"context"
	"io"
	"log/slog"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/config"
	"bludm/backend/internal/generation"
	"bludm/backend/internal/store"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// TestMCPStreamableHTTPAdvancedAuthoringWorkflow is the executable counterpart
// to the connected-authoring, roll-table, journey, dungeon, recap, continuity,
// and shop-stock prompts in docs/mcp/agent-evals.md.
func TestMCPStreamableHTTPAdvancedAuthoringWorkflow(t *testing.T) {
	database, stores := newImportExportArchiveTestStores(t)
	ctx := context.Background()
	owner, err := stores.Auth.CreateUser(ctx, uniqueArchiveEmail("mcp-advanced"), "hash")
	requireArchiveNoError(t, err)
	campaign, err := stores.Campaigns.Create(ctx, owner.ID, store.CampaignInput{Name: "Advanced MCP Campaign"})
	requireArchiveNoError(t, err)
	item, err := stores.Items.Create(ctx, owner.ID, store.ItemInput{
		Name: "Silver Compass", Category: "adventuring-gear", ItemType: "tool",
		ValueAmount: 25, ValueUnit: "gp", Description: "Points toward the old road.",
	})
	requireArchiveNoError(t, err)

	secret := apiTokenPrefix + strings.Repeat("a", 32)
	expiresAt := time.Now().Add(time.Hour)
	_, err = stores.Auth.CreateScopedAPIToken(ctx, store.APITokenCreateInput{
		UserID: owner.ID, Name: "Advanced MCP writer", TokenHash: hashToken(secret),
		TokenPrefix: secret[:displayedTokenLength], Scopes: appdomain.ScopeStrings(appdomain.AllScopes),
		CampaignRestrictionMode: "selected", AllowedCampaignIDs: []string{campaign.ID},
		AuthenticationVersion: 2, ExpiresAt: &expiresAt,
	})
	requireArchiveNoError(t, err)

	server := New(config.Config{
		PublicAppURL: "http://example.test",
		MCP: config.MCPConfig{
			MaxRequestBytes: 1 << 20, ToolExecutionTimeout: 10 * time.Second,
			ReadRequestsPerMinute: 500, WriteRequestsPerMinute: 500,
			GenerationRequestsPerMinute: 500,
		},
	}, nil, database, slog.New(slog.NewTextHandler(io.Discard, nil)))
	httpServer := httptest.NewServer(server.Routes())
	t.Cleanup(httpServer.Close)
	session := connectMCPHTTP(t, httpServer.URL+"/mcp", secret)
	defer session.Close()

	createdRoot := callMCPTool(t, session, "create_location", map[string]any{
		"campaignId": campaign.ID,
		"location": map[string]any{
			"idempotencyKey": "advanced-location-root", "name": "Waystone Village",
			"locationType": "settlement", "summary": "A road-bound village.",
		},
	})
	assertMCPToolSuccess(t, "create_location", createdRoot)
	var root appdomain.LocationWriteResult
	decodeMCPStructured(t, createdRoot, &root)
	if root.ID == "" || root.AppURL == "" {
		t.Fatalf("created location omitted stable links: %+v", root)
	}

	updatedRootResult := callMCPTool(t, session, "update_location", map[string]any{
		"campaignId": campaign.ID, "locationId": root.ID,
		"location": map[string]any{
			"idempotencyKey": "advanced-location-update", "expectedUpdatedAt": root.UpdatedAt,
			"name": root.Name, "locationType": root.LocationType,
			"summary": "A road-bound village with a repaired waystone.",
		},
	})
	assertMCPToolSuccess(t, "update_location", updatedRootResult)
	var updatedRoot appdomain.LocationWriteResult
	decodeMCPStructured(t, updatedRootResult, &updatedRoot)
	if updatedRoot.Summary != "A road-bound village with a repaired waystone." {
		t.Fatalf("location update did not persist the reviewed fields: %+v", updatedRoot)
	}

	childResult := callMCPTool(t, session, "create_location", map[string]any{
		"campaignId": campaign.ID,
		"location": map[string]any{
			"idempotencyKey": "advanced-location-child", "parentLocationId": root.ID,
			"name": "Compass Shop", "locationType": "shop",
		},
	})
	assertMCPToolSuccess(t, "create_location child", childResult)
	var child appdomain.LocationWriteResult
	decodeMCPStructured(t, childResult, &child)

	npcResult := callMCPTool(t, session, "create_npc", map[string]any{
		"campaignId": campaign.ID,
		"npc": map[string]any{
			"idempotencyKey": "advanced-npc-create", "name": "Mara Venn",
			"size": "Medium", "creatureType": "humanoid", "alignment": "neutral good",
			"armorClass": 12, "hitPoints": 9, "hitDice": "2d8", "challengeRating": "1/4", "xp": 50,
			"statBlock": map[string]any{
				"abilityScores": map[string]any{"str": 10, "dex": 12, "con": 10, "int": 14, "wis": 13, "cha": 12},
				"speed":         map[string]any{"walk": 30},
			},
		},
	})
	assertMCPToolSuccess(t, "create_npc", npcResult)
	var npc appdomain.NPCWriteResult
	decodeMCPStructured(t, npcResult, &npc)

	updatedNPCResult := callMCPTool(t, session, "update_npc", map[string]any{
		"campaignId": campaign.ID, "npcId": npc.ID,
		"npc": map[string]any{
			"idempotencyKey": "advanced-npc-update", "expectedUpdatedAt": npc.UpdatedAt,
			"name": npc.Name, "description": "Keeper of the repaired waystone.",
			"size": npc.Size, "creatureType": npc.CreatureType, "alignment": npc.Alignment,
			"armorClass": npc.ArmorClass, "hitPoints": npc.HitPoints,
			"hitDice": npc.HitDice, "challengeRating": npc.ChallengeRating, "xp": npc.XP,
			"statBlock": npc.StatBlock,
		},
	})
	assertMCPToolSuccess(t, "update_npc", updatedNPCResult)

	linkNPC := callMCPTool(t, session, "link_npc_to_location", map[string]any{
		"campaignId": campaign.ID,
		"link": map[string]any{
			"idempotencyKey": "advanced-npc-link", "creatureId": npc.ID,
			"locationId": root.ID, "linkType": "resident", "visibility": "dm",
		},
	})
	assertMCPToolSuccess(t, "link_npc_to_location", linkNPC)
	locationLink := callMCPTool(t, session, "create_location_link", map[string]any{
		"campaignId": campaign.ID,
		"link": map[string]any{
			"idempotencyKey": "advanced-location-link", "sourceLocationId": root.ID,
			"targetLocationId": child.ID, "linkType": "road", "direction": "two-way",
		},
	})
	assertMCPToolSuccess(t, "create_location_link", locationLink)

	previewChanges := callMCPTool(t, session, "preview_campaign_changes", map[string]any{
		"campaignId": campaign.ID,
		"changes": map[string]any{"changes": []any{map[string]any{
			"operation": "create_location", "clientRef": "gate",
			"data": map[string]any{"name": "North Gate", "locationType": "landmark", "parentLocationId": root.ID},
		}}},
	})
	assertMCPToolSuccess(t, "preview_campaign_changes", previewChanges)
	var changesPreview appdomain.CampaignChangesPreview
	decodeMCPStructured(t, previewChanges, &changesPreview)
	applyChanges := callMCPTool(t, session, "apply_campaign_changes", map[string]any{
		"campaignId": campaign.ID,
		"changes": map[string]any{
			"idempotencyKey": "advanced-changes-apply", "previewToken": changesPreview.PreviewToken,
			"changes": changesPreview.Changes,
		},
	})
	assertMCPToolSuccess(t, "apply_campaign_changes", applyChanges)
	var appliedChanges appdomain.AppliedCampaignChanges
	decodeMCPStructured(t, applyChanges, &appliedChanges)
	if !appliedChanges.Applied || appliedChanges.OperationCount != 1 {
		t.Fatalf("connected change set was not applied exactly: %+v", appliedChanges)
	}

	createTable := callMCPTool(t, session, "create_roll_table", map[string]any{
		"campaignId": campaign.ID,
		"table": map[string]any{
			"idempotencyKey": "advanced-roll-table", "name": "Road Omens",
			"category": "rumor", "dieExpression": "1d2",
			"rows": []any{
				map[string]any{"minRoll": 1, "maxRoll": 1, "label": "Crows", "resultText": "Three crows circle the road."},
				map[string]any{"minRoll": 2, "maxRoll": 2, "label": "Bell", "resultText": "A distant bell sounds."},
			},
		},
	})
	assertMCPToolSuccess(t, "create_roll_table", createTable)
	var table appdomain.RollTableWriteResult
	decodeMCPStructured(t, createTable, &table)
	rolled := callMCPTool(t, session, "roll_on_table", map[string]any{
		"campaignId": campaign.ID, "tableId": table.ID, "roll": 2,
	})
	assertMCPToolSuccess(t, "roll_on_table", rolled)
	listedTables := callMCPTool(t, session, "list_roll_tables", map[string]any{
		"campaignId": campaign.ID,
	})
	assertMCPToolSuccess(t, "list_roll_tables", listedTables)
	updateTable := callMCPTool(t, session, "update_roll_table", map[string]any{
		"campaignId": campaign.ID, "tableId": table.ID,
		"table": map[string]any{
			"idempotencyKey": "advanced-roll-update", "expectedUpdatedAt": table.UpdatedAt,
			"name": "Road Omens Revised", "category": table.Category, "dieExpression": table.DieExpression,
			"rows": []any{
				map[string]any{"minRoll": 1, "maxRoll": 1, "label": "Crows", "resultText": "Three crows circle the road."},
				map[string]any{"minRoll": 2, "maxRoll": 2, "label": "Bell", "resultText": "The restored bell sounds."},
			},
		},
	})
	assertMCPToolSuccess(t, "update_roll_table", updateTable)

	travel := callMCPTool(t, session, "calculate_travel", map[string]any{
		"campaignId": campaign.ID,
		"calculation": map[string]any{
			"distance": 30, "distanceUnit": "miles", "terrain": "mountain", "pace": "fast", "goodRoads": false,
		},
	})
	assertMCPToolSuccess(t, "calculate_travel", travel)
	var calculation appdomain.TravelCalculation
	decodeMCPStructured(t, travel, &calculation)
	if calculation.EffectivePace != "slow" || calculation.Ruleset != "dnd-5e-2014" {
		t.Fatalf("travel assumptions were not server-authoritative: %+v", calculation)
	}
	journey := callMCPTool(t, session, "create_journey", map[string]any{
		"campaignId": campaign.ID,
		"journey": map[string]any{
			"idempotencyKey": "advanced-journey", "name": "Waystone Expedition",
			"origin": root.Name, "destination": "High Pass", "distance": 30,
			"distanceUnit": "miles", "terrain": "mountain", "pace": calculation.EffectivePace,
			"goodRoads": false, "weather": map[string]any{
				"temperature": "normal", "temperatureDeltaF": 0,
				"wind": "none", "precipitation": "none",
			}, "routeInputMode": "route",
		},
	})
	assertMCPToolSuccess(t, "create_journey", journey)

	settings := generation.DungeonSettings{
		Type: "classic", Seed: "advanced-dungeon", Tileset: "stone",
		Width: 20, Height: 20, RoomCount: 2, Density: 45, CreateRooms: true,
	}
	dungeonPreview := callMCPTool(t, session, "generate_dungeon_preview", map[string]any{
		"campaignId": campaign.ID, "settings": settings,
	})
	assertMCPToolSuccess(t, "generate_dungeon_preview", dungeonPreview)
	savedDungeon := callMCPTool(t, session, "save_generated_dungeon", map[string]any{
		"campaignId": campaign.ID,
		"dungeon": map[string]any{
			"idempotencyKey": "advanced-dungeon-save", "name": "Waystone Cellars",
			"parentLocationId": root.ID, "settings": settings,
		},
	})
	assertMCPToolSuccess(t, "save_generated_dungeon", savedDungeon)
	var dungeon appdomain.SavedDungeon
	decodeMCPStructured(t, savedDungeon, &dungeon)
	if dungeon.Location.ID == "" || dungeon.Map.ID == "" || len(dungeon.Rooms) == 0 {
		t.Fatalf("dungeon was not saved as connected editable content: %+v", dungeon)
	}

	stockPreviewResult := callMCPTool(t, session, "preview_shop_stock_changes", map[string]any{
		"campaignId": campaign.ID,
		"changes": map[string]any{"stock": []any{map[string]any{
			"locationId": child.ID, "itemId": item.ID, "librarySource": "user",
			"quantity": 2, "priceAmount": 30, "priceUnit": "gp", "availability": "in-stock",
		}}},
	})
	assertMCPToolSuccess(t, "preview_shop_stock_changes", stockPreviewResult)
	var stockPreview appdomain.ShopStockPreview
	decodeMCPStructured(t, stockPreviewResult, &stockPreview)
	stockApply := callMCPTool(t, session, "apply_shop_stock_changes", map[string]any{
		"campaignId": campaign.ID,
		"changes": map[string]any{
			"idempotencyKey": "advanced-stock-apply", "previewToken": stockPreview.PreviewToken,
			"stock": stockPreview.Stock,
		},
	})
	assertMCPToolSuccess(t, "apply_shop_stock_changes", stockApply)

	encounter, err := stores.Campaigns.CreateEncounter(ctx, owner.ID, campaign.ID, store.CampaignEncounterInput{
		Name: "Completed Road Ambush", Status: "planned", LocationID: root.ID,
	})
	requireArchiveNoError(t, err)
	run, err := stores.Runs.StartEncounter(ctx, owner.ID, encounter.ID, false)
	requireArchiveNoError(t, err)
	requireArchiveNoError(t, stores.Runs.EndRun(ctx, run, map[string]any{"outcome": "The road reopened."}, map[string]int{}))
	completed := callMCPTool(t, session, "get_completed_run_summary", map[string]any{
		"campaignId": campaign.ID, "runId": run.ID,
	})
	assertMCPToolSuccess(t, "get_completed_run_summary", completed)
	continuity := callMCPTool(t, session, "get_campaign_continuity_context", map[string]any{
		"campaignId": campaign.ID,
	})
	assertMCPToolSuccess(t, "get_campaign_continuity_context", continuity)
	var contextResult appdomain.CampaignContinuityContext
	decodeMCPStructured(t, continuity, &contextResult)
	if len(contextResult.RecentRuns) != 1 || contextResult.RecentRuns[0].RunID != run.ID {
		t.Fatalf("continuity context omitted the discoverable completed run: %+v", contextResult.RecentRuns)
	}

	var auditCount int64
	requireArchiveNoError(t, database.Table("external_audit_records").
		Where("user_id = ? and authentication = ?", owner.ID, string(appdomain.AuthenticationAPIToken)).
		Count(&auditCount).Error)
	if auditCount < 22 {
		t.Fatalf("advanced MCP calls were not individually audited, got %d records", auditCount)
	}

}

func assertMCPToolSuccess(t *testing.T, name string, result *mcp.CallToolResult) {
	t.Helper()
	if result.IsError {
		t.Fatalf("%s returned an error: structured=%#v content=%#v", name, result.StructuredContent, result.Content)
	}
}
