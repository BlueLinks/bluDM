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

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/config"
	"bludm/backend/internal/store"
)

func TestExternalMarkdownEncounterPreviewImportAndUpdate(t *testing.T) {
	db, stores := newImportExportArchiveTestStores(t)
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
		app:    appdomain.NewService(db, "http://example.test"),
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

	scopedSecret := apiTokenPrefix + strings.Repeat("c", 32)
	_, err = stores.Auth.CreateScopedAPIToken(ctx, store.APITokenCreateInput{
		UserID: owner.ID, Name: "Scoped encounter bridge", TokenHash: hashToken(scopedSecret),
		TokenPrefix:             scopedSecret[:displayedTokenLength],
		Scopes:                  []string{string(appdomain.ScopeContentImport), string(appdomain.ScopeEncountersWrite)},
		CampaignRestrictionMode: "all", AuthenticationVersion: 2, ExpiresAt: &expiresAt,
	})
	requireArchiveNoError(t, err)
	scopedPayload := markdownEncounterRequest{
		SourcePath: "Locations/Scoped.md",
		Markdown: fencedMarkdownEncounter(`version: 1
id: scoped-horror
name: Scoped Horror
add_party: false
combatants:
  - name: Scoped Horror
    armor_class: 13
    hit_points: 31`),
	}
	scopedFirst := serveMarkdownAPIRequest(
		t, server, scopedSecret, http.MethodPost,
		"/api/external/v1/campaigns/"+campaign.ID+"/encounters/markdown/import", scopedPayload,
	)
	scopedSecond := serveMarkdownAPIRequest(
		t, server, scopedSecret, http.MethodPost,
		"/api/external/v1/campaigns/"+campaign.ID+"/encounters/markdown/import", scopedPayload,
	)
	var scopedFirstBody, scopedSecondBody struct {
		Import appdomain.EncounterMarkdownImportResult `json:"import"`
	}
	requireArchiveNoError(t, json.Unmarshal(scopedFirst.Body.Bytes(), &scopedFirstBody))
	requireArchiveNoError(t, json.Unmarshal(scopedSecond.Body.Bytes(), &scopedSecondBody))
	if scopedFirst.Code != http.StatusCreated || scopedSecond.Code != http.StatusCreated ||
		scopedFirstBody.Import.IdempotencyReplay || !scopedSecondBody.Import.IdempotencyReplay ||
		scopedFirstBody.Import.Encounters[0].ID != scopedSecondBody.Import.Encounters[0].ID ||
		scopedSecondBody.Import.Operations[0] != "create" {
		t.Fatalf("scoped import was not replay-safe: first=%+v second=%+v", scopedFirstBody, scopedSecondBody)
	}
	var revisionCount int64
	requireArchiveNoError(t, db.Table("encounter_revisions").
		Where("encounter_id = ?", scopedFirstBody.Import.Encounters[0].ID).Count(&revisionCount).Error)
	if revisionCount != 1 {
		t.Fatalf("idempotent import wrote %d revisions", revisionCount)
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
	request.Header.Set("Idempotency-Key", "markdown-import-key")
	recorder := httptest.NewRecorder()
	server.Routes().ServeHTTP(recorder, request)
	return recorder
}

func fencedMarkdownEncounter(body string) string {
	return "```bludm-encounter\n" + body + "\n```\n"
}
