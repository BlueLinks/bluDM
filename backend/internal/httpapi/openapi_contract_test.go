package httpapi

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/google/jsonschema-go/jsonschema"
	"gopkg.in/yaml.v3"
)

func TestExternalOpenAPITracksEveryRegisteredRoute(t *testing.T) {
	document := readExternalOpenAPI(t)
	if document["openapi"] != "3.1.0" {
		t.Fatalf("unexpected OpenAPI version: %v", document["openapi"])
	}
	paths := mapValueForTest(t, document["paths"])
	scopeContract := mapValueForTest(t, document["x-bludm-scope-contract"])
	for _, route := range externalOpenAPIRoutes {
		operations := mapValueForTest(t, paths[route.path])
		operation := mapValueForTest(t, operations[strings.ToLower(route.method)])
		operationID, _ := operation["operationId"].(string)
		if operationID == "" {
			t.Fatalf("%s %s has no operationId", route.method, route.path)
		}
		scopes, ok := scopeContract[operationID].([]any)
		if !ok || len(scopes) == 0 {
			t.Fatalf("%s %s has no scope contract", route.method, route.path)
		}
		responses := mapValueForTest(t, operation["responses"])
		if responses["default"] == nil {
			t.Fatalf("%s %s has no typed default error response", route.method, route.path)
		}
		for status, responseValue := range responses {
			if status == "default" {
				continue
			}
			response := mapValueForTest(t, responseValue)
			if response["$ref"] == "#/components/responses/Success" {
				t.Fatalf("%s %s uses the removed generic success contract", route.method, route.path)
			}
		}
	}
}

func TestExternalOpenAPIMutationsRequireIdempotency(t *testing.T) {
	document := readExternalOpenAPI(t)
	paths := mapValueForTest(t, document["paths"])
	for _, route := range externalOpenAPIRoutes {
		if route.method == http.MethodGet || strings.Contains(route.path, "preview") ||
			strings.HasSuffix(route.path, "/roll") || strings.HasSuffix(route.path, "/calculate") ||
			strings.HasSuffix(route.path, "/encounter-evaluation") {
			continue
		}
		operations := mapValueForTest(t, paths[route.path])
		operation := mapValueForTest(t, operations[strings.ToLower(route.method)])
		parameters, _ := operation["parameters"].([]any)
		required := false
		for _, value := range parameters {
			parameter := mapValueForTest(t, value)
			if parameter["$ref"] == "#/components/parameters/RequiredIdempotencyKey" {
				required = true
				break
			}
		}
		if !required {
			t.Fatalf("%s %s does not require Idempotency-Key", route.method, route.path)
		}
	}
}

func TestExternalOpenAPIResponseReferencesResolve(t *testing.T) {
	document := readExternalOpenAPI(t)
	responseSchemas := readExternalResponseSchemas(t)
	components := mapValueForTest(t, document["components"])
	responses := mapValueForTest(t, components["responses"])
	for name, value := range responses {
		if name == "Error" {
			continue
		}
		response := mapValueForTest(t, value)
		content := mapValueForTest(t, response["content"])
		for mediaType, mediaValue := range content {
			media := mapValueForTest(t, mediaValue)
			schema := mapValueForTest(t, media["schema"])
			if mediaType == "text/markdown" || mediaType == "application/yaml" {
				if schema["type"] != "string" {
					t.Fatalf("%s text response must be a string", name)
				}
				continue
			}
			ref, _ := schema["$ref"].(string)
			const prefix = "./external-v1.schemas.yaml#/components/schemas/"
			if !strings.HasPrefix(ref, prefix) {
				t.Fatalf("%s has no concrete external response schema: %#v", name, schema)
			}
			schemaName := strings.TrimPrefix(ref, prefix)
			if responseSchemas[schemaName] == nil {
				t.Fatalf("%s references missing schema %s", name, schemaName)
			}
		}
	}
}

func TestExternalOpenAPIWriteSchemasRejectUnknownFields(t *testing.T) {
	document := readExternalOpenAPI(t)
	components := mapValueForTest(t, document["components"])
	schemas := mapValueForTest(t, components["schemas"])
	for _, name := range []string{
		"LocationCommand", "EncounterCommand", "UpdateEncounter", "GenerateEncounter", "RegenerateEncounter",
		"RestoreRevision", "NPCCommand", "NPCLinkCommand", "LocationLinkCommand",
		"RollTableCommand", "JourneyCommand", "TravelCalculationCommand", "DungeonCommand",
		"ShopStockChangesCommand", "CampaignChanges",
	} {
		schema := mapValueForTest(t, schemas[name])
		if schema["additionalProperties"] != false {
			t.Fatalf("%s must reject unknown fields", name)
		}
	}
	for _, name := range []string{"UpdateLocationCommand", "UpdateNPCCommand", "UpdateRollTableCommand"} {
		schema := mapValueForTest(t, schemas[name])
		if schema["allOf"] == nil {
			t.Fatalf("%s must add the update-only concurrency requirement", name)
		}
	}
	if generate := mapValueForTest(t, schemas["GenerateEncounter"]); generate["allOf"] != nil {
		t.Fatal("GenerateEncounter must not combine a closed base schema with extra fields")
	}
}

func TestExternalOpenAPIExamplesValidateAgainstTheirSchemas(t *testing.T) {
	document := readExternalOpenAPI(t)
	components := mapValueForTest(t, document["components"])
	schemas := mapValueForTest(t, components["schemas"])
	rewritten := rewriteOpenAPIRefs(schemas)

	for _, name := range []string{
		"UpdateEncounter", "EvaluateEncounter", "GenerateEncounter", "RegenerateEncounter",
		"RestoreRevision", "CampaignChanges", "RollTableCommand", "TravelCalculationCommand",
		"JourneyCommand", "DungeonCommand", "ShopStockChangesCommand",
	} {
		schema := mapValueForTest(t, schemas[name])
		examples, ok := schema["examples"].([]any)
		if !ok || len(examples) == 0 {
			t.Fatalf("%s has no executable OpenAPI example", name)
		}
		root := map[string]any{
			"$schema": "https://json-schema.org/draft/2020-12/schema",
			"$ref":    "#/$defs/" + name,
			"$defs":   rewritten,
		}
		encoded, err := json.Marshal(root)
		if err != nil {
			t.Fatal(err)
		}
		var schemaDocument jsonschema.Schema
		if err := json.Unmarshal(encoded, &schemaDocument); err != nil {
			t.Fatalf("decode %s schema: %v", name, err)
		}
		resolved, err := schemaDocument.Resolve(nil)
		if err != nil {
			t.Fatalf("resolve %s schema: %v", name, err)
		}
		for index, example := range examples {
			if err := resolved.Validate(example); err != nil {
				t.Fatalf("%s example %d violates its schema: %v", name, index, err)
			}
		}
	}
}

func rewriteOpenAPIRefs(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		result := make(map[string]any, len(typed))
		for key, child := range typed {
			if key == "$ref" {
				if ref, ok := child.(string); ok {
					result[key] = strings.Replace(ref, "#/components/schemas/", "#/$defs/", 1)
					continue
				}
			}
			result[key] = rewriteOpenAPIRefs(child)
		}
		return result
	case []any:
		result := make([]any, len(typed))
		for index, child := range typed {
			result[index] = rewriteOpenAPIRefs(child)
		}
		return result
	default:
		return typed
	}
}

func readExternalOpenAPI(t *testing.T) map[string]any {
	t.Helper()
	data, err := os.ReadFile("../../../docs/api/external-v1.openapi.yaml")
	if err != nil {
		t.Fatal(err)
	}
	document := map[string]any{}
	if err := yaml.Unmarshal(data, &document); err != nil {
		t.Fatal(err)
	}
	return document
}

func readExternalResponseSchemas(t *testing.T) map[string]any {
	t.Helper()
	path := filepath.Join("..", "..", "..", "docs", "api", "external-v1.schemas.yaml")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	document := map[string]any{}
	if err := yaml.Unmarshal(data, &document); err != nil {
		t.Fatal(err)
	}
	components := mapValueForTest(t, document["components"])
	return mapValueForTest(t, components["schemas"])
}

func mapValueForTest(t *testing.T, value any) map[string]any {
	t.Helper()
	result, ok := value.(map[string]any)
	if !ok {
		t.Fatalf("expected object, got %#v", value)
	}
	return result
}

var externalOpenAPIRoutes = []struct {
	method string
	path   string
}{
	{"GET", "/api/external/v1/campaigns"},
	{"GET", "/api/external/v1/campaigns/{campaignId}"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/players"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/players/{playerId}"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/locations"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/locations"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/locations/{locationId}"},
	{"PATCH", "/api/external/v1/campaigns/{campaignId}/locations/{locationId}"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/world-graph"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/search"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/prep-gaps"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/library/creatures"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/library/creatures/{creatureId}"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/library/entries"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/library/entries/{entryId}"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/encounters"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/encounters"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/encounters/{encounterId}"},
	{"PATCH", "/api/external/v1/campaigns/{campaignId}/encounters/{encounterId}"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/generation/encounter-evaluation"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/generation/encounter-preview"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/generation/dungeon-preview"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/encounters/generate"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/encounters/{encounterId}/regenerate"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/encounters/{encounterId}/revisions"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/encounters/{encounterId}/revisions/{revision}/restore"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/npcs"},
	{"PATCH", "/api/external/v1/campaigns/{campaignId}/npcs/{npcId}"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/npc-location-links"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/location-links"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/roll-tables"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/roll-tables"},
	{"PATCH", "/api/external/v1/campaigns/{campaignId}/roll-tables/{tableId}"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/roll-tables/{tableId}/roll"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/travel/calculate"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/journeys"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/dungeons/preview"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/dungeons"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/completed-runs/{runId}"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/continuity"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/shop-stock/preview"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/shop-stock/apply"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/content/changes/preview"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/content/changes/apply"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/encounters/markdown/preview"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/encounters/markdown/import"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/content/markdown/preview"},
	{"POST", "/api/external/v1/campaigns/{campaignId}/content/markdown/import"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/library/creatures/{creatureId}/exports/fantasy-statblocks"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/library/creatures/{creatureId}/exports/fantasy-statblocks/compatibility"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/encounters/{encounterId}/exports/fantasy-statblocks"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/encounters/{encounterId}/exports/fantasy-statblocks/compatibility"},
	{"GET", "/api/external/v1/campaigns/{campaignId}/encounters/{encounterId}/exports/obsidian-bundle"},
	{"GET", "/api/external/v1/encounters/{encounterId}/markdown"},
}
