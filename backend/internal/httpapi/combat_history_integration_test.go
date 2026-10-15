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
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
)

func TestCombatHistoryHTTPAndEffectiveManualHealing(t *testing.T) {
	db, stores := newImportExportArchiveTestStores(t)
	ctx := context.Background()
	owner, err := stores.Auth.CreateUser(ctx, uniqueArchiveEmail("combat-history"), "hash")
	requireArchiveNoError(t, err)
	campaign, err := stores.Campaigns.Create(ctx, owner.ID, store.CampaignInput{Name: "History campaign"})
	requireArchiveNoError(t, err)
	encounter, err := stores.Campaigns.CreateEncounter(ctx, owner.ID, campaign.ID, store.CampaignEncounterInput{Name: "Combat report"})
	requireArchiveNoError(t, err)
	run, err := stores.Runs.StartEncounter(ctx, owner.ID, encounter.ID, false)
	requireArchiveNoError(t, err)
	people, err := stores.Runs.AddCombatants(ctx, run.ID, []store.RunCombatantInput{
		{SourceType: "creature", Side: "friendly", DisplayName: "Healer", MaxHitPoints: 20, CurrentHitPoints: 20, InitiativeSet: true},
		{SourceType: "creature", Side: "friendly", DisplayName: "Target", MaxHitPoints: 20, CurrentHitPoints: 18, InitiativeSet: true},
	})
	requireArchiveNoError(t, err)
	requireArchiveNoError(t, stores.Runs.Begin(ctx, run.ID))
	requireArchiveNoError(t, stores.Runs.AppendCombatLogEvent(ctx, run.ID, "combat_began", "", people[0].ID, nil))
	secret := "combat-history-session"
	requireArchiveNoError(t, stores.Auth.StartSession(ctx, owner.ID, hashToken(secret), time.Now().Add(time.Hour)))
	s := &Server{cfg: config.Config{PublicAppURL: "http://example.test"}, stores: stores, app: appdomain.NewService(db, "http://example.test"), log: slog.New(slog.NewTextHandler(io.Discard, nil))}
	handler := s.Routes()
	request := func(method, path, body, token string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(method, path, strings.NewReader(body))
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("Origin", "http://example.test")
		if token != "" {
			r.AddCookie(&http.Cookie{Name: "bludm_session", Value: token})
		}
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, r)
		return response
	}
	path := "/api/campaigns/" + campaign.ID + "/combat-history"
	if response := request(http.MethodGet, path, "", ""); response.Code != http.StatusUnauthorized {
		t.Fatalf("history allowed an anonymous read: %d", response.Code)
	}
	for _, query := range []string{"?page=-1", "?page=bad", "?status=unknown"} {
		if response := request(http.MethodGet, path+query, "", secret); response.Code != http.StatusBadRequest {
			t.Fatalf("invalid pagination/filter accepted: %s %d", query, response.Code)
		}
	}
	body := `{"actorId":"` + people[0].ID + `","targetId":"` + people[1].ID + `","mode":"healing","amount":10}`
	response := request(http.MethodPost, "/api/encounter-runs/"+run.ID+"/commands/manual-hp", body, secret)
	if response.Code != http.StatusOK {
		t.Fatalf("manual healing: %d %s", response.Code, response.Body.String())
	}
	healer, err := stores.Runs.CombatantByID(ctx, run.ID, people[0].ID)
	requireArchiveNoError(t, err)
	if healer.HealingDone != 2 {
		t.Fatalf("overhealing included in meter: %d", healer.HealingDone)
	}
	response = request(http.MethodPost, "/api/encounter-runs/"+run.ID+"/commands/finish-combat", "{}", secret)
	if response.Code != http.StatusOK {
		t.Fatalf("finish: %d %s", response.Code, response.Body.String())
	}
	response = request(http.MethodGet, path+"?status=finished", "", secret)
	var history models.CombatHistory
	requireArchiveNoError(t, json.Unmarshal(response.Body.Bytes(), &history))
	if response.Code != http.StatusOK || history.Total != 1 || history.Runs[0].HealingDone != 2 {
		t.Fatalf("history totals: %d %s", response.Code, response.Body.String())
	}
	response = request(http.MethodGet, "/api/encounter-runs/"+run.ID+"/report", "", secret)
	var report models.CombatReport
	requireArchiveNoError(t, json.Unmarshal(response.Body.Bytes(), &report))
	if response.Code != http.StatusOK || report.Run.Timing.CurrentTurnStartedAt != nil || report.Run.Timing.CombatFinishedAt == nil {
		t.Fatalf("report changed paused state: %d %s", response.Code, response.Body.String())
	}
	other, err := stores.Auth.CreateUser(ctx, uniqueArchiveEmail("combat-other"), "hash")
	requireArchiveNoError(t, err)
	requireArchiveNoError(t, stores.Auth.StartSession(ctx, other.ID, hashToken("other-session"), time.Now().Add(time.Hour)))
	for _, endpoint := range []string{path, "/api/encounter-runs/" + run.ID + "/report"} {
		if response := request(http.MethodGet, endpoint, "", "other-session"); response.Code != http.StatusNotFound {
			t.Fatalf("other owner read %s: %d", endpoint, response.Code)
		}
	}
}
