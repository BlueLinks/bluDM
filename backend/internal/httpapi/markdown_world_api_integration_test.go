package httpapi

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"testing"
	"time"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/config"
	"bludm/backend/internal/store"
)

func TestExternalMarkdownWorldPreviewImportAndStableUpdate(t *testing.T) {
	db, stores := newImportExportArchiveTestStores(t)
	ctx := context.Background()
	owner, err := stores.Auth.CreateUser(ctx, uniqueArchiveEmail("markdown-world-api"), "hash")
	requireArchiveNoError(t, err)
	campaign, err := stores.Campaigns.Create(
		ctx, owner.ID, store.CampaignInput{Name: "Vault Campaign"},
	)
	requireArchiveNoError(t, err)
	secret := apiTokenPrefix + strings.Repeat("b", 32)
	expiresAt := time.Now().Add(time.Hour)
	_, err = stores.Auth.CreateAPIToken(
		ctx, owner.ID, "World bridge", hashToken(secret),
		secret[:displayedTokenLength], &expiresAt,
	)
	requireArchiveNoError(t, err)
	server := &Server{
		cfg: config.Config{PublicAppURL: "http://example.test"}, stores: stores,
		app: appdomain.NewService(db, "http://example.test"),
		log: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
	payload := markdownWorldRequest{
		SourcePath: "Locations/Sunken Keep.md",
		Markdown: "```bludm-npc\n" + `version: 1
id: keeper-voss
name: Keeper Voss
armor_class: 13
hit_points: 22
location: The Sunken Keep
location_role: keeper
` + "```\n\n```bludm-dungeon\n" + `version: 1
id: sunken-keep
name: The Sunken Keep
map:
  generator:
    type: classic
    seed: keep-seed
    width: 24
    height: 18
    room_count: 4
    create_rooms: true
    add_furniture: true
    add_stairs: true
` + "```\n",
	}
	preview := serveMarkdownAPIRequest(
		t, server, secret, http.MethodPost,
		"/api/external/v1/campaigns/"+campaign.ID+"/content/markdown/preview", payload,
	)
	if preview.Code != http.StatusOK {
		t.Fatalf("expected preview 200, got %d: %s", preview.Code, preview.Body.String())
	}
	var previewBody struct {
		Preview markdownWorldPreview `json:"preview"`
	}
	requireArchiveNoError(t, json.Unmarshal(preview.Body.Bytes(), &previewBody))
	if !previewBody.Preview.CanImport ||
		len(previewBody.Preview.NPCs) != 1 ||
		len(previewBody.Preview.Dungeons) != 1 ||
		previewBody.Preview.Dungeons[0].Maps[0].RoomCount == 0 {
		t.Fatalf("unexpected preview: %+v", previewBody.Preview)
	}

	first := serveMarkdownAPIRequest(
		t, server, secret, http.MethodPost,
		"/api/external/v1/campaigns/"+campaign.ID+"/content/markdown/import", payload,
	)
	if first.Code != http.StatusCreated {
		t.Fatalf("expected import 201, got %d: %s", first.Code, first.Body.String())
	}
	var firstBody struct {
		Import store.MarkdownWorldImportResult `json:"import"`
	}
	requireArchiveNoError(t, json.Unmarshal(first.Body.Bytes(), &firstBody))
	npcID := firstBody.Import.NPCs[0].Creature.ID
	dungeonID := firstBody.Import.Dungeons[0].Location.ID

	second := serveMarkdownAPIRequest(
		t, server, secret, http.MethodPost,
		"/api/external/v1/campaigns/"+campaign.ID+"/content/markdown/import", payload,
	)
	var secondBody struct {
		Import store.MarkdownWorldImportResult `json:"import"`
	}
	requireArchiveNoError(t, json.Unmarshal(second.Body.Bytes(), &secondBody))
	if second.Code != http.StatusCreated ||
		secondBody.Import.NPCs[0].Operation != "update" ||
		secondBody.Import.NPCs[0].Creature.ID != npcID ||
		secondBody.Import.Dungeons[0].Location.ID != dungeonID {
		t.Fatalf("expected stable update, got %d %+v", second.Code, secondBody.Import)
	}

	scopedSecret := apiTokenPrefix + strings.Repeat("d", 32)
	_, err = stores.Auth.CreateScopedAPIToken(ctx, store.APITokenCreateInput{
		UserID: owner.ID, Name: "Scoped world bridge", TokenHash: hashToken(scopedSecret),
		TokenPrefix: scopedSecret[:displayedTokenLength],
		Scopes: []string{
			string(appdomain.ScopeContentImport), string(appdomain.ScopeWorldWrite),
			string(appdomain.ScopeLibraryWrite), string(appdomain.ScopeEncountersWrite),
		},
		CampaignRestrictionMode: "all", AuthenticationVersion: 2, ExpiresAt: &expiresAt,
	})
	requireArchiveNoError(t, err)
	scopedPayload := markdownWorldRequest{
		SourcePath: "Locations/Scoped Tower.md",
		Markdown: "```bludm-npc\n" + `version: 1
id: scoped-keeper
name: Scoped Keeper
armor_class: 12
hit_points: 18
` + "```\n",
	}
	scopedFirst := serveMarkdownAPIRequest(
		t, server, scopedSecret, http.MethodPost,
		"/api/external/v1/campaigns/"+campaign.ID+"/content/markdown/import", scopedPayload,
	)
	scopedSecond := serveMarkdownAPIRequest(
		t, server, scopedSecret, http.MethodPost,
		"/api/external/v1/campaigns/"+campaign.ID+"/content/markdown/import", scopedPayload,
	)
	var scopedFirstBody, scopedSecondBody struct {
		Import appdomain.WorldMarkdownImportResult `json:"import"`
	}
	requireArchiveNoError(t, json.Unmarshal(scopedFirst.Body.Bytes(), &scopedFirstBody))
	requireArchiveNoError(t, json.Unmarshal(scopedSecond.Body.Bytes(), &scopedSecondBody))
	if scopedFirst.Code != http.StatusCreated || scopedSecond.Code != http.StatusCreated ||
		scopedFirstBody.Import.IdempotencyReplay || !scopedSecondBody.Import.IdempotencyReplay ||
		scopedFirstBody.Import.NPCs[0].Creature.ID != scopedSecondBody.Import.NPCs[0].Creature.ID ||
		scopedSecondBody.Import.NPCs[0].Operation != "create" {
		t.Fatalf("scoped world import was not replay-safe: first=%+v second=%+v", scopedFirstBody, scopedSecondBody)
	}
}
