package store

import (
	"context"
	"errors"
	"testing"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"
)

func TestCombatHistoryOwnershipPaginationAndSnapshots(t *testing.T) {
	s := newIntegrationStores(t)
	ctx := context.Background()
	owner, err := s.Auth.CreateUser(ctx, uniqueEmail("history"), "hash")
	requireNoError(t, err)
	other, err := s.Auth.CreateUser(ctx, uniqueEmail("other-history"), "hash")
	requireNoError(t, err)
	campaign, err := s.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Campaign"})
	requireNoError(t, err)
	encounter, err := s.Campaigns.CreateEncounter(ctx, owner.ID, campaign.ID, CampaignEncounterInput{Name: "Original encounter"})
	requireNoError(t, err)
	for i := 0; i < 22; i++ {
		run, err := s.Runs.StartEncounter(ctx, owner.ID, encounter.ID, i == 21)
		requireNoError(t, err)
		requireNoError(t, s.Runs.EndRun(ctx, run, nil, nil))
	}
	setup, err := s.Runs.StartEncounter(ctx, owner.ID, encounter.ID, false)
	requireNoError(t, err)
	requireNoError(t, s.db.Model(&dbmodels.EncounterEntity{}).Where("id = ?", encounter.ID).Update("name", "Renamed encounter").Error)
	first, err := s.Runs.History(ctx, owner.ID, campaign.ID, CombatHistoryOptions{Page: 1})
	requireNoError(t, err)
	if first.Total != 21 || len(first.Runs) != 20 || first.Runs[0].EncounterName != "Original encounter" || first.Runs[0].ActiveTimeMs != nil {
		t.Fatalf("unexpected first page or legacy timing: %+v", first)
	}
	second, err := s.Runs.History(ctx, owner.ID, campaign.ID, CombatHistoryOptions{Page: 2})
	requireNoError(t, err)
	if len(second.Runs) != 1 || second.Runs[0].ID == first.Runs[0].ID {
		t.Fatalf("unexpected second page: %+v", second)
	}
	withTests, err := s.Runs.History(ctx, owner.ID, campaign.ID, CombatHistoryOptions{IncludeTests: true, Query: "original"})
	requireNoError(t, err)
	if withTests.Total != 22 || !withTests.Runs[0].IsTest {
		t.Fatalf("test runs or snapshot search missing: %+v", withTests)
	}
	if _, err := s.Runs.History(ctx, other.ID, campaign.ID, CombatHistoryOptions{}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("another owner could read history: %v", err)
	}
	if _, err := s.Runs.Report(ctx, other.ID, setup.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("another owner could read report: %v", err)
	}
}

func TestCombatReportFullLogAndReadOnlyClock(t *testing.T) {
	s := newIntegrationStores(t)
	ctx := context.Background()
	owner, err := s.Auth.CreateUser(ctx, uniqueEmail("full-report"), "hash")
	requireNoError(t, err)
	campaign, err := s.Campaigns.Create(ctx, owner.ID, CampaignInput{Name: "Campaign"})
	requireNoError(t, err)
	encounter, err := s.Campaigns.CreateEncounter(ctx, owner.ID, campaign.ID, CampaignEncounterInput{Name: "Long fight"})
	requireNoError(t, err)
	run, err := s.Runs.StartEncounter(ctx, owner.ID, encounter.ID, false)
	requireNoError(t, err)
	people, err := s.Runs.AddCombatants(ctx, run.ID, []RunCombatantInput{{SourceType: "creature", Side: "friendly", DisplayName: "Ally", MaxHitPoints: 20, CurrentHitPoints: 20}})
	requireNoError(t, err)
	requireNoError(t, s.db.Model(&dbmodels.EncounterRunEntity{}).Where("id = ?", run.ID).Update("status", "active").Error)
	requireNoError(t, s.Runs.AppendCombatLogEvent(ctx, run.ID, "combat_began", "", people[0].ID, map[string]any{}))
	for range 100 {
		requireNoError(t, s.Runs.AppendCombatLogEvent(ctx, run.ID, "check_rolled", people[0].ID, "", map[string]any{"total": 12}))
	}
	requireNoError(t, s.db.Model(&dbmodels.EncounterRunCombatantEntity{}).Where("id = ?", people[0].ID).Updates(map[string]any{"healing_done": 10, "healing_received": 10}).Error)
	requireNoError(t, s.Runs.AppendCombatLogEvent(ctx, run.ID, "manual_hp", people[0].ID, people[0].ID, map[string]any{"mode": "healing", "amount": 10, "targetBefore": map[string]any{"currentHitPoints": 18}, "targetAfter": map[string]any{"currentHitPoints": 20}}))
	requireNoError(t, s.Runs.AppendCombatLogEvent(ctx, run.ID, "combat_finished", people[0].ID, "", map[string]any{}))
	report, err := s.Runs.Report(ctx, owner.ID, run.ID)
	requireNoError(t, err)
	if len(report.Run.Events) != 103 || report.Run.Timing.CombatFinishedAt == nil || report.Run.Timing.CurrentTurnStartedAt != nil || report.Run.Combatants[0].HealingDone != 2 {
		t.Fatalf("report truncated or resumed the clock: %+v", report.Run)
	}
	history, err := s.Runs.History(ctx, owner.ID, campaign.ID, CombatHistoryOptions{})
	requireNoError(t, err)
	if history.Total != 1 || history.Runs[0].Status != "active" || history.Runs[0].HealingDone != 2 {
		t.Fatalf("awaiting-summary run missing: %+v", history)
	}
	live, err := s.Runs.ByID(ctx, owner.ID, run.ID)
	requireNoError(t, err)
	if len(live.Events) != 80 {
		t.Fatalf("live tracker window changed: %d", len(live.Events))
	}
	if live.Combatants[0].HealingDone != 10 {
		t.Fatal("report normalization changed the stored roster")
	}
	requireNoError(t, s.Runs.AppendCombatLogEvent(ctx, run.ID, "combat_resumed", "", people[0].ID, nil))
	history, err = s.Runs.History(ctx, owner.ID, campaign.ID, CombatHistoryOptions{})
	requireNoError(t, err)
	if history.Total != 0 {
		t.Fatal("running combat should not appear as a finished fight")
	}
}

func TestRunTurnDetailsMergePauseAndUndo(t *testing.T) {
	start := time.Date(2026, 10, 15, 12, 0, 0, 0, time.UTC)
	end := start.Add(8 * time.Minute)
	run := models.EncounterRun{EndedAt: &end, Combatants: []models.EncounterRunCombatant{{ID: "a"}, {ID: "b"}}}
	events := []dbmodels.CombatLogEventEntity{
		{EventType: "combat_began", TargetID: stringPointer("a"), CreatedAt: start},
		{EventType: "combat_finished", CreatedAt: start.Add(time.Minute)},
		{EventType: "combat_resumed", TargetID: stringPointer("a"), CreatedAt: start.Add(4 * time.Minute)},
		{ID: "advance", EventType: "turn_changed", TargetID: stringPointer("b"), Payload: dbmodels.JSONMap{"before": map[string]any{"round": 1, "turnIndex": 0}, "after": map[string]any{"round": 1, "turnIndex": 1}}, CreatedAt: start.Add(5 * time.Minute)},
		{EventType: "undo", TargetID: stringPointer("a"), Payload: dbmodels.JSONMap{"undoneEventId": "advance"}, CreatedAt: start.Add(6 * time.Minute)},
		{EventType: "turn_changed", TargetID: stringPointer("b"), Payload: dbmodels.JSONMap{"after": map[string]any{"round": 1, "turnIndex": 1}}, CreatedAt: start.Add(7 * time.Minute)},
		{EventType: "encounter_ended", CreatedAt: end},
	}
	timing := calculateRunTiming(run, events)
	if len(timing.Turns) != 2 || timing.Turns[0].DurationMs != (3*time.Minute).Milliseconds() || timing.Turns[1].DurationMs != (2*time.Minute).Milliseconds() {
		t.Fatalf("pause or undo corrupted logical turns: %+v", timing.Turns)
	}
	for _, turn := range timing.Turns {
		if !turn.Completed || timing.TurnTimeMs[turn.CombatantID] != turn.DurationMs {
			t.Fatalf("completed turn disagrees with totals: %+v", timing)
		}
	}
}

func TestNormalizeLegacyHealingWithoutChangingStoredMeters(t *testing.T) {
	run := models.EncounterRun{Combatants: []models.EncounterRunCombatant{{ID: "healer", HealingDone: 10}, {ID: "target", HealingReceived: 10}}}
	events := []models.CombatLogEvent{{ID: "heal", EventType: "manual_hp", ActorID: "healer", TargetID: "target", Payload: map[string]any{"mode": "healing", "amount": 10, "targetBefore": map[string]any{"currentHitPoints": 18}, "targetAfter": map[string]any{"currentHitPoints": 20}}}}
	normalizeReportHealing(&run, events)
	if run.Combatants[0].HealingDone != 2 || run.Combatants[1].HealingReceived != 2 || intFromAny(events[0].Payload["requestedAmount"]) != 10 {
		t.Fatalf("legacy healing was not normalized: %+v", run)
	}
	// New events already have an effective amount, so normalization is idempotent.
	normalizeReportHealing(&run, events)
	if run.Combatants[0].HealingDone != 2 {
		t.Fatal("normalization double-subtracted overhealing")
	}
	undoneRun := models.EncounterRun{Combatants: []models.EncounterRunCombatant{{ID: "healer"}}}
	events = append(events, models.CombatLogEvent{EventType: "undo", Payload: map[string]any{"undoneEventId": "heal"}})
	normalizeReportHealing(&undoneRun, events)
	if undoneRun.Combatants[0].HealingDone != 0 {
		t.Fatal("undone healing affected totals")
	}
}
