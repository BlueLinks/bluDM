package mcpserver

import (
	"context"
	"encoding/json"
	"slices"
	"strings"
	"testing"

	appdomain "bludm/backend/internal/app"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func TestToolContractAndInstructions(t *testing.T) {
	serverTransport, clientTransport := mcp.NewInMemoryTransports()
	server := New(nil, appdomain.Principal{UserID: "test-user"}, nil)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go func() {
		_ = server.Run(ctx, serverTransport)
	}()
	client := mcp.NewClient(&mcp.Implementation{
		Name: "contract-test", Version: "1.0.0",
	}, nil)
	session, err := client.Connect(ctx, clientTransport, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer session.Close()
	if instructions := session.InitializeResult().Instructions; instructions != Instructions {
		t.Fatalf("unexpected instructions: %q", instructions)
	}
	result, err := session.ListTools(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	names := make([]string, 0, len(result.Tools))
	for _, declared := range result.Tools {
		names = append(names, declared.Name)
		if declared.Annotations == nil {
			t.Fatalf("%s has no annotations", declared.Name)
		}
		if declared.Annotations.OpenWorldHint == nil || *declared.Annotations.OpenWorldHint {
			t.Fatalf("%s must describe bluDM as a closed world", declared.Name)
		}
		if declared.OutputSchema == nil {
			t.Fatalf("%s has no output schema", declared.Name)
		}
		if declared.InputSchema == nil {
			t.Fatalf("%s has no input schema", declared.Name)
		}
		var inputSchema map[string]any
		encoded, err := json.Marshal(declared.InputSchema)
		if err != nil {
			t.Fatalf("%s input schema is not serializable: %v", declared.Name, err)
		}
		if err := json.Unmarshal(encoded, &inputSchema); err != nil {
			t.Fatalf("%s input schema is not an object: %v", declared.Name, err)
		}
		if inputSchema["additionalProperties"] != false {
			t.Fatalf("%s input schema must reject unknown fields: %#v", declared.Name, inputSchema)
		}
		var outputSchema map[string]any
		encoded, err = json.Marshal(declared.OutputSchema)
		if err != nil {
			t.Fatalf("%s output schema is not serializable: %v", declared.Name, err)
		}
		if err := json.Unmarshal(encoded, &outputSchema); err != nil {
			t.Fatalf("%s output schema is not an object: %v", declared.Name, err)
		}
		alternatives, ok := outputSchema["oneOf"].([]any)
		if !ok || len(alternatives) != 2 {
			t.Fatalf("%s output schema must declare success and error results: %#v", declared.Name, outputSchema)
		}
		if outputSchema["type"] != "object" {
			t.Fatalf("%s output schema must remain an MCP object schema: %#v", declared.Name, outputSchema)
		}
		for index, alternative := range alternatives {
			candidate, ok := alternative.(map[string]any)
			if !ok || candidate["properties"] == nil {
				t.Fatalf("%s output alternative %d has no properties: %#v", declared.Name, index, alternative)
			}
		}
		if len(declared.Meta) == 0 {
			t.Fatalf("%s has no security scheme metadata", declared.Name)
		}
	}
	required := []string{
		"list_campaigns", "get_campaign_context", "search_campaign_content",
		"create_campaign", "update_campaign",
		"list_players", "get_player", "list_locations", "get_location", "get_world_graph",
		"create_player", "update_player", "move_player", "clone_player",
		"list_encounters", "get_encounter", "search_creatures", "get_creature",
		"check_statblock_compatibility", "export_creature_statblock",
		"export_encounter_statblocks", "export_encounter_bundle", "search_library",
		"get_library_entry", "get_prep_gaps", "evaluate_encounter",
		"create_generated_encounter", "regenerate_encounter", "list_encounter_revisions",
		"restore_encounter_revision", "create_encounter", "update_encounter",
		"create_location", "update_location", "create_npc", "update_npc",
		"link_npc_to_location", "create_location_link", "preview_campaign_changes",
		"apply_campaign_changes", "list_roll_tables", "roll_on_table",
		"create_roll_table", "update_roll_table", "calculate_travel", "create_journey",
		"generate_dungeon_preview", "save_generated_dungeon",
		"get_completed_run_summary", "get_campaign_continuity_context",
		"preview_shop_stock_changes", "apply_shop_stock_changes",
	}
	for _, name := range required {
		if !slices.Contains(names, name) {
			t.Fatalf("required tool %s is missing from %v", name, names)
		}
	}
	assertToolHints(t, result.Tools, "list_campaigns", true, false, false)
	assertToolHints(t, result.Tools, "create_campaign", false, false, true)
	assertToolHints(t, result.Tools, "update_campaign", false, false, true)
	assertToolHints(t, result.Tools, "create_player", false, false, true)
	assertToolHints(t, result.Tools, "update_player", false, false, true)
	assertToolHints(t, result.Tools, "move_player", false, false, true)
	assertToolHints(t, result.Tools, "clone_player", false, false, true)
	assertToolHints(t, result.Tools, "create_generated_encounter", false, false, true)
	assertToolHints(t, result.Tools, "regenerate_encounter", false, true, true)
	assertToolHints(t, result.Tools, "restore_encounter_revision", false, true, true)
	assertToolHints(t, result.Tools, "generate_dungeon_preview", true, false, false)
	assertToolHints(t, result.Tools, "save_generated_dungeon", false, false, true)
	assertToolHints(t, result.Tools, "preview_shop_stock_changes", true, false, false)
	assertToolHints(t, result.Tools, "apply_shop_stock_changes", false, false, true)
	assertRequiredInputFields(t, result.Tools, "create_generated_encounter", "campaignId", "idempotencyKey", "options")
	assertRequiredInputFields(t, result.Tools, "regenerate_encounter", "campaignId", "encounterId", "idempotencyKey", "expectedRevision", "options")
	assertRequiredInputFields(t, result.Tools, "restore_encounter_revision", "campaignId", "encounterId", "revision", "expectedRevision", "idempotencyKey")
	assertRequiredInputFields(t, result.Tools, "create_campaign", "campaign")
	assertNestedRequiredInputFields(t, result.Tools, "create_campaign", "campaign", "idempotencyKey", "name", "encounterRuleset")
	assertRequiredInputFields(t, result.Tools, "update_campaign", "campaignId", "campaign")
	assertNestedRequiredInputFields(t, result.Tools, "update_campaign", "campaign", "idempotencyKey", "expectedUpdatedAt")
	assertRequiredInputFields(t, result.Tools, "create_player", "campaignId", "player")
	assertNestedRequiredInputFields(t, result.Tools, "create_player", "player", "idempotencyKey", "characterName")
	assertRequiredInputFields(t, result.Tools, "update_player", "campaignId", "playerId", "player")
	assertNestedRequiredInputFields(t, result.Tools, "update_player", "player", "idempotencyKey", "expectedUpdatedAt")
	assertRequiredInputFields(t, result.Tools, "move_player", "campaignId", "playerId", "move")
	assertNestedRequiredInputFields(t, result.Tools, "move_player", "move", "idempotencyKey", "expectedUpdatedAt", "destinationCampaignId")
	assertRequiredInputFields(t, result.Tools, "clone_player", "campaignId", "playerId", "clone")
	assertNestedRequiredInputFields(t, result.Tools, "clone_player", "clone", "idempotencyKey", "expectedUpdatedAt")
	assertNestedRequiredInputFields(t, result.Tools, "preview_campaign_changes", "changes", "changes")
	assertNestedRequiredInputFields(t, result.Tools, "apply_campaign_changes", "changes", "idempotencyKey", "previewToken", "changes")
	assertNestedRequiredInputFields(t, result.Tools, "preview_shop_stock_changes", "changes", "stock")
	assertNestedRequiredInputFields(t, result.Tools, "apply_shop_stock_changes", "changes", "idempotencyKey", "previewToken", "stock")
	for _, declared := range result.Tools {
		if strings.Contains(declared.Name, "delete") || strings.Contains(declared.Name, "live_combat") {
			t.Fatalf("unsafe tool shipped unexpectedly: %s", declared.Name)
		}
	}
}

func assertNestedRequiredInputFields(
	t *testing.T,
	tools []*mcp.Tool,
	name string,
	propertyName string,
	fields ...string,
) {
	t.Helper()
	for _, declared := range tools {
		if declared.Name != name {
			continue
		}
		encoded, err := json.Marshal(declared.InputSchema)
		if err != nil {
			t.Fatal(err)
		}
		var schema map[string]any
		if err := json.Unmarshal(encoded, &schema); err != nil {
			t.Fatal(err)
		}
		properties, _ := schema["properties"].(map[string]any)
		nested, _ := properties[propertyName].(map[string]any)
		required, _ := nested["required"].([]any)
		for _, field := range fields {
			if !slices.Contains(required, any(field)) {
				t.Fatalf("%s.%s does not require %s: %#v", name, propertyName, field, nested)
			}
		}
		return
	}
	t.Fatalf("tool %s not found", name)
}

func TestMCPPaginationIsBoundedAndOpaque(t *testing.T) {
	values := []int{1, 2, 3, 4, 5}
	first, page, err := pageValues(values, 2, "")
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(first, []int{1, 2}) || page.Limit != 2 || page.NextCursor == "" {
		t.Fatalf("unexpected first page: values=%v page=%+v", first, page)
	}
	second, next, err := pageValues(values, 2, page.NextCursor)
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(second, []int{3, 4}) || next.NextCursor == "" {
		t.Fatalf("unexpected second page: values=%v page=%+v", second, next)
	}
	if _, _, err := pageValues(values, 101, ""); err == nil {
		t.Fatal("expected an oversized page to fail")
	}
	if _, _, err := pageValues(values, 2, "not-a-cursor"); err == nil {
		t.Fatal("expected an invalid cursor to fail")
	}
}

func TestToolErrorsAreStructuredAndSelfCorrectable(t *testing.T) {
	serverTransport, clientTransport := mcp.NewInMemoryTransports()
	server := New(
		appdomain.NewService(nil, ""),
		appdomain.Principal{UserID: "test-user", CampaignRestrictionMode: "all"},
		nil,
	)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go func() {
		_ = server.Run(ctx, serverTransport)
	}()
	client := mcp.NewClient(&mcp.Implementation{
		Name: "error-contract-test", Version: "1.0.0",
	}, nil)
	session, err := client.Connect(ctx, clientTransport, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer session.Close()
	result, err := session.CallTool(ctx, &mcp.CallToolParams{Name: "list_campaigns"})
	if err != nil {
		t.Fatal(err)
	}
	if !result.IsError {
		t.Fatalf("expected tool error, got %+v", result)
	}
	structured, ok := result.StructuredContent.(map[string]any)
	if !ok {
		t.Fatalf("expected structured error, got %#v", result.StructuredContent)
	}
	body, ok := structured["error"].(map[string]any)
	if !ok || body["code"] != string(appdomain.CodeForbidden) {
		t.Fatalf("unexpected structured error: %#v", structured)
	}
	resolved, err := outputSchemaFor("list_campaigns").Resolve(nil)
	if err != nil {
		t.Fatal(err)
	}
	if err := resolved.Validate(result.StructuredContent); err != nil {
		t.Fatalf("structured tool error violates the declared output schema: %v", err)
	}
}

func assertToolHints(
	t *testing.T,
	tools []*mcp.Tool,
	name string,
	readOnly bool,
	destructive bool,
	idempotent bool,
) {
	t.Helper()
	for _, declared := range tools {
		if declared.Name != name {
			continue
		}
		if declared.Annotations.ReadOnlyHint != readOnly ||
			declared.Annotations.DestructiveHint == nil ||
			*declared.Annotations.DestructiveHint != destructive ||
			declared.Annotations.IdempotentHint != idempotent {
			t.Fatalf("unexpected hints for %s: %+v", name, declared.Annotations)
		}
		return
	}
	t.Fatalf("tool %s not found", name)
}

func assertRequiredInputFields(t *testing.T, tools []*mcp.Tool, name string, fields ...string) {
	t.Helper()
	for _, declared := range tools {
		if declared.Name != name {
			continue
		}
		encoded, err := json.Marshal(declared.InputSchema)
		if err != nil {
			t.Fatal(err)
		}
		var schema map[string]any
		if err := json.Unmarshal(encoded, &schema); err != nil {
			t.Fatal(err)
		}
		requiredValues, _ := schema["required"].([]any)
		for _, field := range fields {
			found := false
			for _, value := range requiredValues {
				if value == field {
					found = true
					break
				}
			}
			if !found {
				t.Fatalf("%s input does not require %s: %#v", name, field, schema)
			}
		}
		return
	}
	t.Fatalf("tool %s not found", name)
}
