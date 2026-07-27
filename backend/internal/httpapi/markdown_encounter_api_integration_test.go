package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"bludm/backend/internal/config"
	"bludm/backend/internal/store"
)

func TestExternalMarkdownEncounterPreviewImportAndUpdate(t *testing.T) {
	_, stores := newImportExportArchiveTestStores(t)
	ctx := context.Background()
	owner, err := stores.Auth.CreateUser(ctx, uniqueArchiveEmail("markdown-api"), "hash")
	requireArchiveNoError(t, err)
	campaign, err := stores.Campaigns.Create(
		ctx,
		owner.ID,
		store.CampaignInput{Name: "Vault Campaign"},
	)
	requireArchiveNoError(t, err)
	secret := apiTokenPrefix + strings.Repeat("a", 32)
	expiresAt := time.Now().Add(time.Hour)
	_, err = stores.Auth.CreateAPIToken(
		ctx,
		owner.ID,
		"Integration bridge",
		hashToken(secret),
		secret[:displayedTokenLength],
		&expiresAt,
	)
	requireArchiveNoError(t, err)

	server := &Server{
		cfg:    config.Config{PublicAppURL: "http://example.test"},
		stores: stores,
		log:    slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
	payload := markdownEncounterRequest{
		SourcePath: "Locations/Camp.md",
		Markdown: fencedMarkdownEncounter(`version: 1
id: root-horror
name: Root Horror
add_party: false
combatants:
  - name: Root Horror
    armor_class: 15
    hit_points: 95`),
	}

	preview := serveMarkdownAPIRequest(
		t,
		server,
		secret,
		http.MethodPost,
		"/api/external/v1/campaigns/"+campaign.ID+"/encounters/markdown/preview",
		payload,
	)
	if preview.Code != http.StatusOK {
		t.Fatalf("expected preview 200, got %d: %s", preview.Code, preview.Body.String())
	}
	var previewBody struct {
		Preview markdownEncounterPreview `json:"preview"`
	}
	requireArchiveNoError(t, json.Unmarshal(preview.Body.Bytes(), &previewBody))
	if !previewBody.Preview.CanImport || previewBody.Preview.Encounters[0].Operation != "create" {
		t.Fatalf("unexpected preview: %+v", previewBody.Preview)
	}

	first := serveMarkdownAPIRequest(
		t,
		server,
		secret,
		http.MethodPost,
		"/api/external/v1/campaigns/"+campaign.ID+"/encounters/markdown/import",
		payload,
	)
	if first.Code != http.StatusCreated {
		t.Fatalf("expected import 201, got %d: %s", first.Code, first.Body.String())
	}
	var firstBody struct {
		Import markdownImportResponse `json:"import"`
	}
	requireArchiveNoError(t, json.Unmarshal(first.Body.Bytes(), &firstBody))
	if len(firstBody.Import.Encounters) != 1 {
		t.Fatalf("unexpected first import: %+v", firstBody.Import)
	}
	encounterID := firstBody.Import.Encounters[0].ID

	second := serveMarkdownAPIRequest(
		t,
		server,
		secret,
		http.MethodPost,
		"/api/external/v1/campaigns/"+campaign.ID+"/encounters/markdown/import",
		payload,
	)
	var secondBody struct {
		Import markdownImportResponse `json:"import"`
	}
	requireArchiveNoError(t, json.Unmarshal(second.Body.Bytes(), &secondBody))
	if second.Code != http.StatusCreated ||
		secondBody.Import.Operations[0] != "update" ||
		secondBody.Import.Encounters[0].ID != encounterID {
		t.Fatalf("expected stable update, got %d %+v", second.Code, secondBody.Import)
	}
}

func serveMarkdownAPIRequest(
	t *testing.T,
	server *Server,
	token string,
	method string,
	target string,
	payload any,
) *httptest.ResponseRecorder {
	t.Helper()
	data, err := json.Marshal(payload)
	requireArchiveNoError(t, err)
	request := httptest.NewRequest(method, target, bytes.NewReader(data))
	request.Header.Set("Authorization", "Bearer "+token)
	recorder := httptest.NewRecorder()
	server.Routes().ServeHTTP(recorder, request)
	return recorder
}

func fencedMarkdownEncounter(body string) string {
	return "```bludm-encounter\n" + body + "\n```\n"
}
