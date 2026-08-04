package httpapi

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"bludm/backend/internal/markdownencounter"
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
)

func TestBearerTokenAcceptsOpaqueAndOIDCCredentials(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/external/v1/campaigns", nil)
	request.Header.Set("Authorization", "Bearer bludm_v1_secret")
	if token, ok := bearerToken(request); !ok || token != "bludm_v1_secret" {
		t.Fatalf("expected valid bearer token, got %q %v", token, ok)
	}

	request.Header.Set("Authorization", "Bearer ordinary-session-token")
	if token, ok := bearerToken(request); !ok || token != "ordinary-session-token" {
		t.Fatal("expected an OIDC bearer candidate to be accepted for verification")
	}
	request.Header.Set("Authorization", "Basic secret")
	if _, ok := bearerToken(request); ok {
		t.Fatal("expected a non-bearer credential to be rejected")
	}
}

func TestMarkdownDocumentExportPreservesRuntimeReferences(t *testing.T) {
	locationID := "location-1"
	encounter := models.Encounter{
		ID:          "11111111-2222-3333-4444-555555555555",
		Name:        "Forge Siege",
		Description: "Hold the bridge.",
		Status:      "planned",
		Location:    "Forge of Spells",
		LocationID:  &locationID,
		RoomNumber:  "F6",
		LootNotes:   "Command crystal",
	}
	combatants := []models.EncounterCombatant{
		{
			SourceType:   "player",
			PlayerID:     "player-1",
			Side:         "player",
			DisplayName:  "Seraphine",
			ArmorClass:   16,
			MaxHitPoints: 42,
		},
		{
			SourceType:   "creature",
			Side:         "enemy",
			DisplayName:  "Animated Armor",
			ArmorClass:   18,
			MaxHitPoints: 33,
			Snapshot:     map[string]any{"standardCreatureId": "standard-armor"},
		},
	}

	document := markdownDocumentFromEncounter(encounter, combatants, "forge-siege")
	if document.ID != "forge-siege" || document.LocationID != locationID {
		t.Fatalf("unexpected exported document: %+v", document)
	}
	if document.Combatants[0].PlayerID != "player-1" {
		t.Fatalf("expected player reference, got %+v", document.Combatants[0])
	}
	if document.Combatants[1].StandardCreatureID != "standard-armor" {
		t.Fatalf("expected standard creature reference, got %+v", document.Combatants[1])
	}
}

func TestResolveMarkdownLocationLinksExactNames(t *testing.T) {
	change := markdownEncounterChange{Warnings: []string{}, Errors: []string{}}
	input := emptyMarkdownStoreInput()
	document := testMarkdownDocument("Camp")
	resolveMarkdownLocation(
		&change,
		&input,
		document,
		[]models.CampaignLocation{{ID: "location-1", Name: "Camp"}},
	)
	if change.LocationID != "location-1" || input.Encounter.LocationID != "location-1" {
		t.Fatalf("expected exact location link, got %+v %+v", change, input)
	}

	change = markdownEncounterChange{Warnings: []string{}, Errors: []string{}}
	input = emptyMarkdownStoreInput()
	resolveMarkdownLocation(&change, &input, testMarkdownDocument("Unknown"), nil)
	if len(change.Warnings) != 1 || !strings.Contains(change.Warnings[0], "unlinked free text") {
		t.Fatalf("expected unlinked warning, got %+v", change.Warnings)
	}
}

func emptyMarkdownStoreInput() store.MarkdownEncounterImportInput {
	return store.MarkdownEncounterImportInput{}
}

func testMarkdownDocument(location string) markdownencounter.Document {
	return markdownencounter.Document{Location: location}
}
