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
	"sync"
	"testing"
	"time"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/config"
	"bludm/backend/internal/generation"
	"bludm/backend/internal/store"
)

func TestExternalGeneratedEncounterLifecycleIsAtomicAndRevisioned(t *testing.T) {
	db, stores := newImportExportArchiveTestStores(t)
	ctx := context.Background()
	owner, err := stores.Auth.CreateUser(ctx, uniqueArchiveEmail("external-authoring"), "hash")
	requireArchiveNoError(t, err)
	campaign, err := stores.Campaigns.Create(
		ctx, owner.ID, store.CampaignInput{Name: "Revision Campaign"},
	)
	requireArchiveNoError(t, err)
	otherCampaign, err := stores.Campaigns.Create(
		ctx, owner.ID, store.CampaignInput{Name: "Restricted Campaign"},
	)
	requireArchiveNoError(t, err)
	player, err := stores.Players.Create(ctx, owner.ID, store.PlayerInput{
		CampaignID: campaign.ID, CharacterName: "Ari", ArmorClass: 15, MaxHitPoints: 28,
		CharacterSheet: map[string]any{"level": 4},
	})
	requireArchiveNoError(t, err)
	creature, err := stores.Creatures.Create(ctx, owner.ID, store.CreatureInput{
		Name: "Wolf", Size: "Medium", CreatureType: "Beast", ArmorClass: 13,
		HitPoints: 11, HitDice: "2d8+2", ChallengeRating: "1/4", XP: 50,
		StatBlock: map[string]any{
			"abilityScores": map[string]any{
				"str": 12, "dex": 15, "con": 12, "int": 3, "wis": 12, "cha": 6,
			},
			"speed": map[string]any{"walk": 40},
		},
	})
	requireArchiveNoError(t, err)

	secret := apiTokenPrefix + strings.Repeat("b", 32)
	expiresAt := time.Now().Add(time.Hour)
	_, err = stores.Auth.CreateScopedAPIToken(ctx, store.APITokenCreateInput{
		UserID: owner.ID, Name: "Encounter builder", TokenHash: hashToken(secret),
		TokenPrefix: secret[:displayedTokenLength],
		Scopes: appdomain.ScopeStrings([]appdomain.Scope{
			appdomain.ScopeCampaignsRead, appdomain.ScopePartyRead, appdomain.ScopeLibraryRead,
			appdomain.ScopeEncountersRead, appdomain.ScopeEncountersWrite, appdomain.ScopeGenerationRun,
		}),
		CampaignRestrictionMode: "selected", AllowedCampaignIDs: []string{campaign.ID},
		AuthenticationVersion: 2, ExpiresAt: &expiresAt,
	})
	requireArchiveNoError(t, err)
	server := New(config.Config{
		PublicAppURL: "http://example.test",
		MCP: config.MCPConfig{
			MaxRequestBytes: 1 << 20, ReadRequestsPerMinute: 100,
			WriteRequestsPerMinute: 100, GenerationRequestsPerMinute: 100,
		},
	}, nil, db, slog.New(slog.NewTextHandler(io.Discard, nil)))

	command := appdomain.GenerateEncounterCommand{
		IdempotencyKey: "same-create-key", Name: "Wolves at the Gate",
		PlayerIDs: []string{player.ID}, Options: generation.EncounterOptions{
			Archetype: "beasts", Challenge: "medium", EnemyCount: 1,
		},
		Seed: 17, RequiredCreatureIDs: []string{creature.ID},
	}
	responses := make([]*httptest.ResponseRecorder, 2)
	var wait sync.WaitGroup
	for index := range responses {
		wait.Add(1)
		go func(index int) {
			defer wait.Done()
			responses[index] = serveExternalJSON(
				t, server, secret, http.MethodPost,
				"/api/external/v1/campaigns/"+campaign.ID+"/encounters/generate", command,
			)
		}(index)
	}
	wait.Wait()
	results := make([]appdomain.EncounterAuthoringResult, len(responses))
	for index, response := range responses {
		if response.Code != http.StatusCreated {
			t.Fatalf("create %d returned %d: %s", index, response.Code, response.Body.String())
		}
		requireArchiveNoError(t, json.Unmarshal(response.Body.Bytes(), &results[index]))
	}
	if results[0].Encounter.ID != results[1].Encounter.ID {
		t.Fatalf("idempotent retries created different encounters: %+v", results)
	}
	var encounterCount int64
	requireArchiveNoError(t, db.Table("encounters").
		Where("campaign_id = ? and name = ?", campaign.ID, command.Name).
		Count(&encounterCount).Error)
	if encounterCount != 1 {
		t.Fatalf("expected exactly one encounter, got %d", encounterCount)
	}
	encounterID := results[0].Encounter.ID
	changedCommand := command
	changedCommand.Name = "A Different Intended Encounter"
	conflictingReplay := serveExternalJSON(
		t, server, secret, http.MethodPost,
		"/api/external/v1/campaigns/"+campaign.ID+"/encounters/generate", changedCommand,
	)
	if conflictingReplay.Code != http.StatusConflict ||
		!strings.Contains(conflictingReplay.Body.String(), string(appdomain.CodeIdempotencyConflict)) {
		t.Fatalf(
			"changed input reused under the same idempotency key was not rejected: %d %s",
			conflictingReplay.Code, conflictingReplay.Body.String(),
		)
	}

	_, err = stores.Encounters.AddCombatant(ctx, owner.ID, encounterID, store.EncounterCombatantInput{
		SourceType: "inline", Side: "enemy", DisplayName: "Manual Snare",
		ArmorClass: 10, MaxHitPoints: 1, CurrentHitPoints: 1, Snapshot: map[string]any{"xp": 100},
	})
	requireArchiveNoError(t, err)
	regenerate := appdomain.RegenerateEncounterCommand{
		IdempotencyKey: "regenerate-key", ExpectedRevision: 2,
		Options: generation.EncounterOptions{
			Archetype: "beasts", Challenge: "medium", EnemyCount: 1,
		},
		Seed: 29, RequiredCreatureIDs: []string{creature.ID},
	}
	regeneratedResponse := serveExternalJSON(
		t, server, secret, http.MethodPost,
		"/api/external/v1/campaigns/"+campaign.ID+"/encounters/"+encounterID+"/regenerate",
		regenerate,
	)
	if regeneratedResponse.Code != http.StatusOK {
		t.Fatalf("regenerate returned %d: %s", regeneratedResponse.Code, regeneratedResponse.Body.String())
	}
	var regenerated appdomain.EncounterAuthoringResult
	requireArchiveNoError(t, json.Unmarshal(regeneratedResponse.Body.Bytes(), &regenerated))
	if regenerated.Encounter.ID != encounterID || regenerated.Revision != 3 {
		t.Fatalf("regeneration did not preserve identity/revision: %+v", regenerated)
	}
	if regenerated.PreservedCombatantCount < 2 || regenerated.DifficultyEvidence.RawXP != 150 {
		t.Fatalf("manual roster was not preserved in final evidence: %+v", regenerated)
	}

	restoreResponse := serveExternalJSON(
		t, server, secret, http.MethodPost,
		"/api/external/v1/campaigns/"+campaign.ID+"/encounters/"+encounterID+
			"/revisions/1/restore",
		appdomain.RestoreRevisionCommand{
			IdempotencyKey: "restore-key", ExpectedRevision: 3,
		},
	)
	if restoreResponse.Code != http.StatusOK {
		t.Fatalf("restore returned %d: %s", restoreResponse.Code, restoreResponse.Body.String())
	}
	var restored struct {
		ID       string `json:"id"`
		Revision int    `json:"revision"`
	}
	requireArchiveNoError(t, json.Unmarshal(restoreResponse.Body.Bytes(), &restored))
	if restored.ID != encounterID || restored.Revision != 4 {
		t.Fatalf("restore did not create a new head revision: %+v", restored)
	}

	conflictResponse := serveExternalJSON(
		t, server, secret, http.MethodPost,
		"/api/external/v1/campaigns/"+campaign.ID+"/encounters/"+encounterID+"/regenerate",
		appdomain.RegenerateEncounterCommand{
			IdempotencyKey: "stale-regenerate", ExpectedRevision: 3,
			Options: generation.EncounterOptions{Challenge: "medium", EnemyCount: 1},
		},
	)
	if conflictResponse.Code != http.StatusConflict {
		t.Fatalf("expected stale revision conflict, got %d: %s", conflictResponse.Code, conflictResponse.Body.String())
	}
	restrictedResponse := serveExternalJSON(
		t, server, secret, http.MethodGet,
		"/api/external/v1/campaigns/"+otherCampaign.ID, nil,
	)
	if restrictedResponse.Code != http.StatusForbidden {
		t.Fatalf("expected campaign restriction denial, got %d: %s", restrictedResponse.Code, restrictedResponse.Body.String())
	}

	revisions, err := server.app.ListEncounterRevisions(
		appdomain.WithPrincipal(ctx, appdomain.Principal{
			UserID: owner.ID, Scopes: []appdomain.Scope{appdomain.ScopeEncountersRead},
			CampaignRestrictionMode: "all",
		}), campaign.ID, encounterID,
	)
	requireArchiveNoError(t, err)
	if len(revisions) != 4 || revisions[0].Revision != 4 || revisions[3].Revision != 1 {
		t.Fatalf("unexpected recoverable history: %+v", revisions)
	}
	_, err = server.app.ListEncounterRevisions(
		appdomain.WithPrincipal(ctx, appdomain.Principal{
			UserID: owner.ID, Scopes: []appdomain.Scope{appdomain.ScopeEncountersRead},
			CampaignRestrictionMode: "all",
		}), otherCampaign.ID, encounterID,
	)
	if appdomain.ErrorInfo(err).Code != appdomain.CodeNotFound {
		t.Fatalf("cross-campaign revision lookup leaked history: %v", err)
	}

	patchedDescription := "Keep this prose while changing only the roster."
	patchResponse := serveExternalJSON(
		t, server, secret, http.MethodPatch,
		"/api/external/v1/campaigns/"+campaign.ID+"/encounters/"+encounterID,
		appdomain.UpdateEncounterCommand{
			IdempotencyKey: "targeted-patch", ExpectedRevision: 4,
			Description: &patchedDescription,
			AddCombatants: []appdomain.EncounterCombatantCommand{{
				SourceType: "inline", Side: "enemy", DisplayName: "Manual Snare",
				ArmorClass: 10, MaxHitPoints: 1, CurrentHitPoints: 1,
				Snapshot: map[string]any{"xp": 100},
			}},
		},
	)
	if patchResponse.Code != http.StatusOK {
		t.Fatalf("targeted patch returned %d: %s", patchResponse.Code, patchResponse.Body.String())
	}
	var patchResult appdomain.EncounterWriteResult
	requireArchiveNoError(t, json.Unmarshal(patchResponse.Body.Bytes(), &patchResult))
	if patchResult.Operation != "updated" || patchResult.AppURL == "" ||
		patchResult.IdempotencyReplay || patchResult.ExportLinks["obsidianBundle"] == "" {
		t.Fatalf("targeted patch omitted write evidence: %+v", patchResult)
	}
	patched, err := server.app.GetEncounter(serviceContextForOwner(owner.ID), campaign.ID, encounterID)
	requireArchiveNoError(t, err)
	if patched.Encounter.Revision != 5 || patched.Encounter.Description != patchedDescription ||
		len(patched.Combatants) != 3 {
		t.Fatalf("targeted patch did not preserve and extend state: %+v", patched)
	}
	replaceAllEnemies := false
	explicitReplacement := serveExternalJSON(
		t, server, secret, http.MethodPost,
		"/api/external/v1/campaigns/"+campaign.ID+"/encounters/"+encounterID+"/regenerate",
		appdomain.RegenerateEncounterCommand{
			IdempotencyKey: "replace-all-enemies", ExpectedRevision: 5,
			Options: generation.EncounterOptions{
				Archetype: "beasts", Challenge: "medium", EnemyCount: 1,
			},
			Seed: 31, RequiredCreatureIDs: []string{creature.ID},
			ReplaceManagedOnly: &replaceAllEnemies,
		},
	)
	if explicitReplacement.Code != http.StatusOK {
		t.Fatalf("explicit all-enemy replacement returned %d: %s", explicitReplacement.Code, explicitReplacement.Body.String())
	}
	var replaced appdomain.EncounterAuthoringResult
	requireArchiveNoError(t, json.Unmarshal(explicitReplacement.Body.Bytes(), &replaced))
	if replaced.Revision != 6 || replaced.ReplacedCombatantCount != 2 || replaced.PreservedCombatantCount != 1 {
		t.Fatalf("explicit replacement did not retain only the player before generation: %+v", replaced)
	}

	for index := range 2 {
		side := "enemy"
		if index == 1 {
			side = "ally"
		}
		_, err = stores.Encounters.AddCombatant(
			ctx, owner.ID, encounterID, store.EncounterCombatantInput{
				SourceType: "creature", CreatureID: creature.ID, Side: side,
				DisplayName: creature.Name, ArmorClass: creature.ArmorClass,
				MaxHitPoints: creature.HitPoints, CurrentHitPoints: creature.HitPoints,
				Snapshot: map[string]any{"xp": creature.XP},
			},
		)
		requireArchiveNoError(t, err)
	}
	_, err = stores.Encounters.AddCombatant(
		ctx, owner.ID, encounterID, store.EncounterCombatantInput{
			SourceType: "inline", Side: "enemy", DisplayName: "Unlinked Hazard",
			ArmorClass: 10, MaxHitPoints: 1, CurrentHitPoints: 1,
		},
	)
	requireArchiveNoError(t, err)
	serviceContext := appdomain.WithPrincipal(ctx, appdomain.Principal{
		UserID: owner.ID,
		Scopes: []appdomain.Scope{
			appdomain.ScopeEncountersRead, appdomain.ScopeLibraryRead,
		},
		CampaignRestrictionMode: "all",
	})
	exported, err := server.app.ExportEncounter(serviceContext, campaign.ID, encounterID, false)
	requireArchiveNoError(t, err)
	if len(exported.Roster) != 1 || exported.Roster[0].Quantity != 3 ||
		exported.Roster[0].Sides["enemy"] != 2 || exported.Roster[0].Sides["ally"] != 1 ||
		len(exported.Results) != 1 || strings.Count(exported.Markdown, "```statblock") != 1 ||
		len(exported.OmittedCombatants) != 1 || len(exported.Warnings) == 0 {
		t.Fatalf("repeated creature was not deduplicated with quantity preserved: %+v", exported)
	}
	snapshotExport, err := server.app.ExportEncounterWithCreatureData(
		serviceContext, campaign.ID, encounterID, "snapshot", false,
	)
	requireArchiveNoError(t, err)
	if snapshotExport.CreatureData != "snapshot" ||
		len(snapshotExport.Results) != 1 ||
		snapshotExport.Results[0].Canonical.AdjacentMetadata["encounterSnapshot"] == nil {
		t.Fatalf("snapshot export did not use saved combatant data: %+v", snapshotExport)
	}

	incomplete, err := stores.Creatures.Create(ctx, owner.ID, store.CreatureInput{
		Name: "Incomplete", Size: "Medium", CreatureType: "Construct",
		ArmorClass: 12, HitPoints: 5, HitDice: "1d8", ChallengeRating: "1/8", XP: 25,
		StatBlock: map[string]any{
			"abilityScores": map[string]any{
				"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10,
			},
		},
	})
	requireArchiveNoError(t, err)
	_, err = stores.Encounters.AddCombatant(
		ctx, owner.ID, encounterID, store.EncounterCombatantInput{
			SourceType: "creature", CreatureID: incomplete.ID, Side: "enemy",
			DisplayName: incomplete.Name, ArmorClass: incomplete.ArmorClass,
			MaxHitPoints: incomplete.HitPoints, CurrentHitPoints: incomplete.HitPoints,
			Snapshot: map[string]any{"xp": incomplete.XP},
		},
	)
	requireArchiveNoError(t, err)
	strictExport, err := server.app.ExportEncounter(
		serviceContext, campaign.ID, encounterID, false,
	)
	if err == nil || strictExport.Markdown != "" || strictExport.BundleMarkdown != "" {
		t.Fatalf("strict mixed export was not atomic: err=%v export=%+v", err, strictExport)
	}
}

func TestConnectedCampaignChangesAndUpdateIdempotency(t *testing.T) {
	db, stores := newImportExportArchiveTestStores(t)
	ctx := context.Background()
	owner, err := stores.Auth.CreateUser(ctx, uniqueArchiveEmail("connected-changes"), "hash")
	requireArchiveNoError(t, err)
	campaign, err := stores.Campaigns.Create(
		ctx, owner.ID, store.CampaignInput{Name: "Connected Campaign"},
	)
	requireArchiveNoError(t, err)
	service := appdomain.NewService(db, "http://example.test")
	serviceContext := appdomain.WithPrincipal(ctx, appdomain.Principal{
		UserID: owner.ID,
		Scopes: []appdomain.Scope{
			appdomain.ScopeContentImport, appdomain.ScopeWorldWrite,
			appdomain.ScopeWorldRead, appdomain.ScopeLibraryWrite,
		},
		CampaignRestrictionMode: "all",
	})
	changes := []appdomain.CampaignChange{
		{
			Operation: "create_location", ClientRef: "entry",
			Data: map[string]any{"name": "Entry", "locationType": "room"},
		},
		{
			Operation: "create_location", ClientRef: "vault",
			Data: map[string]any{
				"name": "Vault", "locationType": "room", "parentLocationId": "ref:entry",
			},
		},
		{
			Operation: "create_location_link",
			Data: map[string]any{
				"sourceLocationId": "ref:entry", "targetLocationId": "ref:vault",
				"linkType": "door",
			},
		},
	}
	preview, err := service.PreviewCampaignChanges(
		serviceContext, campaign.ID, appdomain.CampaignChangesCommand{Changes: changes},
	)
	requireArchiveNoError(t, err)
	if preview.PreviewToken == "" || len(preview.Changes) != 3 {
		t.Fatalf("connected preview was incomplete: %+v", preview)
	}
	command := appdomain.CampaignChangesCommand{
		IdempotencyKey: "apply-connected", PreviewToken: preview.PreviewToken,
		Changes: preview.Changes,
	}
	first, err := service.ApplyCampaignChanges(serviceContext, campaign.ID, command)
	requireArchiveNoError(t, err)
	second, err := service.ApplyCampaignChanges(serviceContext, campaign.ID, command)
	requireArchiveNoError(t, err)
	if first.OperationCount != 3 || !second.IdempotencyReplay || first.AppURL == "" || first.Warnings == nil {
		t.Fatalf("connected change set was not atomically idempotent: first=%+v second=%+v", first, second)
	}
	var locationCount, linkCount int64
	requireArchiveNoError(t, db.Table("campaign_locations").Where("campaign_id = ?", campaign.ID).Count(&locationCount).Error)
	requireArchiveNoError(t, db.Table("campaign_location_links").Where("campaign_id = ?", campaign.ID).Count(&linkCount).Error)
	if locationCount != 2 || linkCount != 1 {
		t.Fatalf("unexpected connected content counts: locations=%d links=%d", locationCount, linkCount)
	}

	created, err := service.CreateLocation(serviceContext, campaign.ID, appdomain.LocationCommand{
		IdempotencyKey: "create-updatable", Name: "Updatable", LocationType: "room",
	})
	requireArchiveNoError(t, err)
	if created.Operation != "created" || created.AppURL == "" || created.IdempotencyReplay || created.Warnings == nil {
		t.Fatalf("location create omitted write metadata: %+v", created)
	}
	updatedAt := created.UpdatedAt
	update := appdomain.LocationCommand{
		IdempotencyKey: "update-location-once", ExpectedUpdatedAt: &updatedAt,
		Name: "Updated Once", LocationType: "room",
	}
	updated, err := service.UpdateLocation(serviceContext, campaign.ID, created.ID, update)
	requireArchiveNoError(t, err)
	replayed, err := service.UpdateLocation(serviceContext, campaign.ID, created.ID, update)
	requireArchiveNoError(t, err)
	if updated.ID != replayed.ID || updated.UpdatedAt != replayed.UpdatedAt ||
		updated.Operation != "updated" || updated.IdempotencyReplay || !replayed.IdempotencyReplay {
		t.Fatalf("location update retry was not replayed: updated=%+v replayed=%+v", updated, replayed)
	}
	child, err := service.CreateLocation(serviceContext, campaign.ID, appdomain.LocationCommand{
		IdempotencyKey: "create-cycle-child", ParentLocationID: updated.ID,
		Name: "Cycle Child", LocationType: "room",
	})
	requireArchiveNoError(t, err)
	cycleParent := child.ID
	_, err = service.UpdateLocation(serviceContext, campaign.ID, updated.ID, appdomain.LocationCommand{
		IdempotencyKey: "reject-location-cycle", ExpectedUpdatedAt: &updated.UpdatedAt,
		ParentLocationID: cycleParent, Name: updated.Name, LocationType: updated.LocationType,
	})
	if appdomain.ErrorInfo(err).Code != appdomain.CodeValidation {
		t.Fatalf("descendant location parent cycle was not rejected: %v", err)
	}

	_, err = service.CreateJourney(serviceContext, campaign.ID, appdomain.JourneyCommand{
		IdempotencyKey: "reject-invalid-journey", Name: "Impossible route",
		Distance: 12, DistanceUnit: "leagues", Terrain: "void", Pace: "reckless",
	})
	if appdomain.ErrorInfo(err).Code != appdomain.CodeValidation {
		t.Fatalf("invalid journey assumptions were not rejected: %v", err)
	}

	_, err = service.PreviewCampaignChanges(
		serviceContext, campaign.ID, appdomain.CampaignChangesCommand{Changes: []appdomain.CampaignChange{{
			Operation: "create_location",
			Data: map[string]any{
				"name": "Unknown field", "locationType": "room", "unexpected": true,
			},
		}}},
	)
	if appdomain.ErrorInfo(err).Code != appdomain.CodeValidation {
		t.Fatalf("unknown bulk field was not rejected: %v", err)
	}
}

func serviceContextForOwner(ownerID string) context.Context {
	return appdomain.WithPrincipal(context.Background(), appdomain.Principal{
		UserID: ownerID,
		Scopes: []appdomain.Scope{
			appdomain.ScopeEncountersRead, appdomain.ScopeLibraryRead,
		},
		CampaignRestrictionMode: "all",
	})
}

func serveExternalJSON(
	t *testing.T,
	server *Server,
	token string,
	method string,
	target string,
	payload any,
) *httptest.ResponseRecorder {
	t.Helper()
	var body bytes.Buffer
	if payload != nil {
		requireArchiveNoError(t, json.NewEncoder(&body).Encode(payload))
	}
	request := httptest.NewRequest(method, target, &body)
	request.Header.Set("Authorization", "Bearer "+token)
	recorder := httptest.NewRecorder()
	server.Routes().ServeHTTP(recorder, request)
	return recorder
}
