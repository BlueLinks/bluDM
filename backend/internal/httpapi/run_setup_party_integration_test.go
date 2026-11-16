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
	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
)

func TestSetupPartyCommands(t *testing.T) {
	database, stores := newImportExportArchiveTestStores(t)
	ctx := context.Background()
	owner, err := stores.Auth.CreateUser(ctx, uniqueArchiveEmail("setup-party"), "hash")
	requireArchiveNoError(t, err)
	campaign, err := stores.Campaigns.Create(ctx, owner.ID, store.CampaignInput{Name: "Party"})
	requireArchiveNoError(t, err)
	encounter, err := stores.Campaigns.CreateEncounter(ctx, owner.ID, campaign.ID, store.CampaignEncounterInput{Name: "Fight"})
	requireArchiveNoError(t, err)
	player, err := stores.Players.Create(ctx, owner.ID, store.PlayerInput{
		CampaignID: campaign.ID, CharacterName: "Caster", ArmorClass: 15, MaxHitPoints: 25,
		TemporaryHitPoints: 4, TemporaryMaxHitPoints: 5,
		CharacterSheet: map[string]any{"spellSlots": map[string]any{"1": 3}, "spellSlotsRemaining": map[string]any{"1": 1}},
	})
	requireArchiveNoError(t, err)
	requireArchiveNoError(t, database.Model(&dbmodels.PlayerEntity{}).Where("id = ?", player.ID).Update("current_hit_points", 7).Error)
	run, err := stores.Runs.StartEncounter(ctx, owner.ID, encounter.ID, false)
	requireArchiveNoError(t, err)
	others, err := stores.Runs.AddCombatants(ctx, run.ID, []store.RunCombatantInput{
		{SourceType: "creature", Side: "enemy", DisplayName: "Enemy", MaxHitPoints: 10, CurrentHitPoints: 3, Initiative: 12, InitiativeSet: true},
		{SourceType: "creature", Side: "friendly", DisplayName: "Ally", MaxHitPoints: 15, CurrentHitPoints: 2, Initiative: 10, InitiativeSet: true},
	})
	requireArchiveNoError(t, err)
	secret := "setup-party-session"
	requireArchiveNoError(t, stores.Auth.StartSession(ctx, owner.ID, hashToken(secret), time.Now().Add(time.Hour)))
	s := &Server{cfg: config.Config{PublicAppURL: "http://example.test"}, stores: stores,
		app: appdomain.NewService(database, "http://example.test"), log: slog.New(slog.NewTextHandler(io.Discard, nil))}
	handler := s.Routes()
	request := func(action, body, token string, status int) models.EncounterRun {
		t.Helper()
		r := httptest.NewRequest(http.MethodPost, "/api/encounter-runs/"+run.ID+"/commands/"+action, strings.NewReader(body))
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("Origin", "http://example.test")
		if token != "" {
			r.AddCookie(&http.Cookie{Name: "bludm_session", Value: token})
		}
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, r)
		if response.Code != status {
			t.Fatalf("%s: got %d, want %d: %s", action, response.Code, status, response.Body.String())
		}
		var payload struct {
			Run models.EncounterRun `json:"run"`
		}
		if status == http.StatusOK {
			requireArchiveNoError(t, json.Unmarshal(response.Body.Bytes(), &payload))
		}
		return payload.Run
	}
	body := `{"playerId":"` + player.ID + `"}`
	for _, action := range []string{"add-player", "remove-player", "heal-party"} {
		request(action, body, "", http.StatusUnauthorized)
	}
	request("add-player", "{}", secret, http.StatusBadRequest)
	request("remove-player", "{}", secret, http.StatusBadRequest)
	added := request("add-player", body, secret, http.StatusOK)
	var member models.EncounterRunCombatant
	for _, combatant := range added.Combatants {
		if combatant.PlayerID == player.ID {
			member = combatant
		}
	}
	if member.ID == "" || member.SourceType != "player" || member.Side != "player" || member.InitiativeSet || member.CurrentHitPoints != 7 || member.TemporaryHitPoints != 4 || member.MaxHitPointsModifier != 5 {
		t.Fatalf("player snapshot or initiative incorrect: %+v", member)
	}
	if len(added.SpellSlots) != 1 || added.SpellSlots[0].RemainingSlots != 1 || added.SpellSlots[0].MaxSlots != 3 {
		t.Fatalf("spell slots did not carry over: %+v", added.SpellSlots)
	}
	request("add-player", body, secret, http.StatusConflict)
	otherCampaign, err := stores.Campaigns.Create(ctx, owner.ID, store.CampaignInput{Name: "Other party"})
	requireArchiveNoError(t, err)
	outsider, err := stores.Players.Create(ctx, owner.ID, store.PlayerInput{CampaignID: otherCampaign.ID, CharacterName: "Outsider", MaxHitPoints: 10})
	requireArchiveNoError(t, err)
	request("add-player", `{"playerId":"`+outsider.ID+`"}`, secret, http.StatusNotFound)
	otherOwner, err := stores.Auth.CreateUser(ctx, uniqueArchiveEmail("other-setup"), "hash")
	requireArchiveNoError(t, err)
	requireArchiveNoError(t, stores.Auth.StartSession(ctx, otherOwner.ID, hashToken("other-setup-token"), time.Now().Add(time.Hour)))
	foreignPlayer, err := stores.Players.Create(ctx, otherOwner.ID, store.PlayerInput{CharacterName: "Foreign", MaxHitPoints: 12})
	requireArchiveNoError(t, err)
	request("add-player", `{"playerId":"`+foreignPlayer.ID+`"}`, secret, http.StatusNotFound)
	for _, action := range []string{"add-player", "remove-player", "heal-party"} {
		request(action, `{"playerId":"`+player.ID+`","combatantId":"`+member.ID+`"}`, "other-setup-token", http.StatusNotFound)
	}
	for _, other := range others {
		request("remove-player", `{"combatantId":"`+other.ID+`"}`, secret, http.StatusNotFound)
	}

	// Healing uses the effective maximum, resets death saves, and is not combat healing.
	requireArchiveNoError(t, database.Model(&dbmodels.EncounterRunCombatantEntity{}).Where("id = ?", member.ID).
		Updates(map[string]any{"current_hit_points": 0, "death_save_failures": 2, "death_save_successes": 1, "defeated": true, "stable": true}).Error)
	healed := request("heal-party", "{}", secret, http.StatusOK)
	for _, combatant := range healed.Combatants {
		if combatant.ID == member.ID {
			if combatant.CurrentHitPoints != 30 || combatant.Defeated || combatant.Stable || combatant.DeathSaveSuccesses != 0 || combatant.DeathSaveFailures != 0 || combatant.TemporaryHitPoints != 4 || combatant.HealingReceived != 0 {
				t.Fatalf("incorrect healed player: %+v", combatant)
			}
		} else if combatant.CurrentHitPoints != others[combatant.SortOrder].CurrentHitPoints {
			t.Fatalf("healed a creature: %+v", combatant)
		}
	}
	requireArchiveNoError(t, database.Model(&dbmodels.EncounterRunCombatantEntity{}).Where("id = ?", member.ID).
		Updates(map[string]any{"max_hit_points_override": 40, "current_hit_points": 1}).Error)
	request("heal-party", "{}", secret, http.StatusOK)
	member, err = stores.Runs.CombatantByID(ctx, run.ID, member.ID)
	requireArchiveNoError(t, err)
	if member.CurrentHitPoints != 40 {
		t.Fatalf("heal ignored max HP override: %+v", member)
	}
	unchangedPlayer, err := stores.Players.ByID(ctx, owner.ID, player.ID)
	requireArchiveNoError(t, err)
	if unchangedPlayer.CurrentHitPoints != 7 {
		t.Fatal("setup changed the source character sheet")
	}
	unchangedEncounter, err := stores.Encounters.ByID(ctx, owner.ID, encounter.ID)
	requireArchiveNoError(t, err)
	if len(unchangedEncounter.Combatants) != 0 {
		t.Fatal("setup changed the authored encounter roster")
	}
	removed := request("remove-player", `{"combatantId":"`+member.ID+`"}`, secret, http.StatusOK)
	if len(removed.Combatants) != 2 || len(removed.SpellSlots) != 0 {
		t.Fatalf("removal left player or spell slots: %+v", removed)
	}
	request("remove-player", `{"combatantId":"`+member.ID+`"}`, secret, http.StatusNotFound)
	request("add-player", body, secret, http.StatusOK)
	requireArchiveNoError(t, stores.Runs.ClearInitiatives(ctx, run.ID))
	if err := stores.Runs.Begin(ctx, run.ID); err != store.ErrUnresolvedInitiative {
		t.Fatalf("added player did not need initiative: %v", err)
	}
	requireArchiveNoError(t, database.Model(&dbmodels.EncounterRunEntity{}).Where("id = ?", run.ID).Update("status", "active").Error)
	for _, action := range []string{"add-player", "remove-player", "heal-party"} {
		request(action, `{"playerId":"`+player.ID+`","combatantId":"`+member.ID+`"}`, secret, http.StatusConflict)
	}
}
