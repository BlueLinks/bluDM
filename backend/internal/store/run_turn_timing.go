package store

import (
	"fmt"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"
)

// Keep a logical turn across a summary pause, or a navigation/undo correction.
// Revisited turns accumulate their actual table time without counting twice.
func calculateRunTurns(run models.EncounterRun, events []dbmodels.CombatLogEventEntity) []models.EncounterRunTurn {
	turns := []models.EncounterRunTurn{}
	indexes := map[string]int{}
	turnEvents := map[string]dbmodels.CombatLogEventEntity{}
	active, round := "", 1
	var started time.Time
	began := false
	combatantAt := func(index int) string {
		if index >= 0 && index < len(run.Combatants) {
			return run.Combatants[index].ID
		}
		return ""
	}
	open := func(id string, at time.Time) {
		active, started = id, at
		if id == "" {
			return
		}
		key := fmt.Sprintf("%d:%s", round, id)
		index, exists := indexes[key]
		if !exists {
			index = len(turns)
			indexes[key] = index
			turns = append(turns, models.EncounterRunTurn{CombatantID: id, Round: round, StartedAt: at})
		}
		turns[index].Completed = false
	}
	closeTurn := func(at time.Time, completed bool) {
		if active != "" && !started.IsZero() {
			index := indexes[fmt.Sprintf("%d:%s", round, active)]
			turns[index].DurationMs += max(0, at.Sub(started).Milliseconds())
			turns[index].EndedAt = at
			turns[index].Completed = completed
		}
		active, started = "", time.Time{}
	}
	position := func(event dbmodels.CombatLogEventEntity, key string, fallback string) string {
		id := stringFromPointer(event.TargetID)
		if value, ok := event.Payload[key].(map[string]any); ok {
			if n := intFromAny(value["round"]); n > 0 {
				round = n
			}
			if id == "" {
				id = combatantAt(intFromAny(value["turnIndex"]))
			}
		}
		if id == "" {
			id = fallback
		}
		return id
	}
	for _, event := range events {
		switch event.EventType {
		case "combat_began":
			began, round = true, 1
			open(position(event, "after", combatantAt(0)), event.CreatedAt)
		case "turn_changed":
			turnEvents[event.ID] = event
			if began {
				closeTurn(event.CreatedAt, true)
				open(position(event, "after", ""), event.CreatedAt)
			}
		case "undo":
			undone := turnEvents[stringFromAny(event.Payload["undoneEventId"])]
			if undone.EventType == "turn_changed" && active != "" {
				closeTurn(event.CreatedAt, false)
				restored := event
				restored.Payload = undone.Payload
				open(position(restored, "before", ""), event.CreatedAt)
			}
		case "combat_finished":
			closeTurn(event.CreatedAt, true)
		case "combat_resumed":
			if began {
				open(position(event, "after", combatantAt(run.CurrentTurnIndex)), event.CreatedAt)
			}
		case "encounter_ended":
			at := event.CreatedAt
			if run.EndedAt != nil {
				at = *run.EndedAt
			}
			closeTurn(at, true)
		}
	}
	if run.EndedAt != nil {
		closeTurn(*run.EndedAt, true)
	}
	return turns
}
