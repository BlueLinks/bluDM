package store

import (
	"testing"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"
)

func TestCalculateRunTimingAcrossTurnsUndoAndEnd(t *testing.T) {
	start := time.Date(2026, 9, 24, 10, 0, 0, 0, time.UTC)
	ended := start.Add(20 * time.Minute)
	run := models.EncounterRun{
		EndedAt:    &ended,
		Combatants: []models.EncounterRunCombatant{{ID: "alice"}, {ID: "bob"}},
	}
	events := []dbmodels.CombatLogEventEntity{
		{EventType: "combat_began", TargetID: stringPointer("alice"), CreatedAt: start},
		{ID: "first-turn", EventType: "turn_changed", ActorID: stringPointer("alice"), TargetID: stringPointer("bob"), CreatedAt: start.Add(10 * time.Minute)},
		{EventType: "undo", TargetID: stringPointer("alice"), Payload: dbmodels.JSONMap{"undoneEventId": "first-turn"}, CreatedAt: start.Add(12 * time.Minute)},
		{EventType: "turn_changed", ActorID: stringPointer("alice"), TargetID: stringPointer("bob"), CreatedAt: start.Add(15 * time.Minute)},
		{EventType: "encounter_ended", CreatedAt: ended.Add(time.Second)},
	}
	timing := calculateRunTiming(run, events)
	if timing.CombatStartedAt == nil || !timing.CombatStartedAt.Equal(start) {
		t.Fatalf("wrong combat start: %+v", timing.CombatStartedAt)
	}
	if timing.CurrentTurnStartedAt != nil {
		t.Fatalf("ended run still has a current turn: %+v", timing.CurrentTurnStartedAt)
	}
	if timing.TurnTimeMs["alice"] != (13*time.Minute).Milliseconds() || timing.TurnTimeMs["bob"] != (7*time.Minute).Milliseconds() {
		t.Fatalf("wrong turn totals: %+v", timing.TurnTimeMs)
	}
}

func TestCalculateRunTimingUsesCurrentTurnAndLegacyEventPositions(t *testing.T) {
	start := time.Date(2026, 9, 24, 10, 0, 0, 0, time.UTC)
	run := models.EncounterRun{Combatants: []models.EncounterRunCombatant{{ID: "alice"}, {ID: "bob"}}}
	events := []dbmodels.CombatLogEventEntity{
		{EventType: "combat_began", CreatedAt: start},
		{EventType: "turn_changed", Payload: dbmodels.JSONMap{"after": map[string]any{"turnIndex": 1}}, CreatedAt: start.Add(3 * time.Minute)},
	}
	timing := calculateRunTiming(run, events)
	if timing.TurnTimeMs["alice"] != (3 * time.Minute).Milliseconds() {
		t.Fatalf("wrong first-turn total: %+v", timing.TurnTimeMs)
	}
	if timing.CurrentTurnStartedAt == nil || !timing.CurrentTurnStartedAt.Equal(start.Add(3*time.Minute)) {
		t.Fatalf("wrong current turn start: %+v", timing.CurrentTurnStartedAt)
	}
}

func TestCalculateRunTimingExcludesSummaryPause(t *testing.T) {
	start := time.Date(2026, 9, 24, 10, 0, 0, 0, time.UTC)
	run := models.EncounterRun{Combatants: []models.EncounterRunCombatant{{ID: "alice"}, {ID: "bob"}}}
	events := []dbmodels.CombatLogEventEntity{
		{EventType: "combat_began", TargetID: stringPointer("alice"), CreatedAt: start},
		{EventType: "combat_finished", CreatedAt: start.Add(2 * time.Minute)},
	}
	paused := calculateRunTiming(run, events)
	if paused.TurnTimeMs["alice"] != (2*time.Minute).Milliseconds() || paused.CurrentTurnStartedAt != nil || paused.CombatFinishedAt == nil {
		t.Fatalf("summary did not pause the combat clock: %+v", paused)
	}
	events = append(events,
		dbmodels.CombatLogEventEntity{EventType: "combat_resumed", TargetID: stringPointer("alice"), CreatedAt: start.Add(7 * time.Minute)},
		dbmodels.CombatLogEventEntity{EventType: "turn_changed", TargetID: stringPointer("bob"), CreatedAt: start.Add(9 * time.Minute)},
	)
	resumed := calculateRunTiming(run, events)
	if resumed.TurnTimeMs["alice"] != (4*time.Minute).Milliseconds() || resumed.CombatFinishedAt != nil {
		t.Fatalf("summary pause was included in turn time: %+v", resumed)
	}
	if resumed.CurrentTurnStartedAt == nil || !resumed.CurrentTurnStartedAt.Equal(start.Add(9*time.Minute)) {
		t.Fatalf("wrong resumed current turn: %+v", resumed.CurrentTurnStartedAt)
	}
}
