package store

import (
	"context"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"
)

// TimingForRun reads the complete turn timeline, independently of the capped
// recent combat log returned with a run.
func (s RunStore) TimingForRun(ctx context.Context, run models.EncounterRun) (models.EncounterRunTiming, error) {
	var events []dbmodels.CombatLogEventEntity
	err := s.db.WithContext(ctx).
		Where("encounter_run_id = ? and event_type in ?", run.ID, []string{"combat_began", "turn_changed", "undo", "combat_finished", "combat_resumed", "encounter_ended"}).
		Order("sequence asc").Find(&events).Error
	if err != nil {
		return models.EncounterRunTiming{}, err
	}
	return calculateRunTiming(run, events), nil
}

func calculateRunTiming(run models.EncounterRun, events []dbmodels.CombatLogEventEntity) models.EncounterRunTiming {
	timing := models.EncounterRunTiming{TurnTimeMs: map[string]int64{}}
	combatantAt := func(position any) string {
		index := intFromAny(position)
		if index >= 0 && index < len(run.Combatants) {
			return run.Combatants[index].ID
		}
		return ""
	}
	var activeID string
	var segmentStart time.Time
	turnEvents := map[string]dbmodels.CombatLogEventEntity{}
	closeSegment := func(at time.Time) {
		if activeID != "" && !segmentStart.IsZero() && at.After(segmentStart) {
			timing.TurnTimeMs[activeID] += at.Sub(segmentStart).Milliseconds()
		}
	}
	for _, event := range events {
		switch event.EventType {
		case "combat_began":
			started := event.CreatedAt
			timing.CombatStartedAt = &started
			activeID = stringFromPointer(event.TargetID)
			if activeID == "" {
				activeID = combatantAt(0)
			}
			segmentStart = started
		case "turn_changed":
			turnEvents[event.ID] = event
			if segmentStart.IsZero() {
				if timing.CombatStartedAt != nil && timing.CombatFinishedAt != nil {
					activeID = stringFromPointer(event.TargetID)
					segmentStart = event.CreatedAt
					timing.CombatFinishedAt = nil
				}
				continue
			}
			closeSegment(event.CreatedAt)
			activeID = stringFromPointer(event.TargetID)
			if activeID == "" {
				if after, ok := event.Payload["after"].(map[string]any); ok {
					activeID = combatantAt(after["turnIndex"])
				}
			}
			segmentStart = event.CreatedAt
		case "undo":
			undone := turnEvents[stringFromAny(event.Payload["undoneEventId"])]
			if undone.EventType != "turn_changed" || segmentStart.IsZero() {
				continue
			}
			closeSegment(event.CreatedAt)
			activeID = stringFromPointer(event.TargetID)
			if activeID == "" {
				if before, ok := undone.Payload["before"].(map[string]any); ok {
					activeID = combatantAt(before["turnIndex"])
				}
			}
			segmentStart = event.CreatedAt
		case "combat_finished":
			closeSegment(event.CreatedAt)
			finished := event.CreatedAt
			timing.CombatFinishedAt = &finished
			activeID = ""
			segmentStart = time.Time{}
		case "combat_resumed":
			if timing.CombatStartedAt == nil {
				continue
			}
			activeID = stringFromPointer(event.TargetID)
			if activeID == "" {
				activeID = combatantAt(run.CurrentTurnIndex)
			}
			segmentStart = event.CreatedAt
			timing.CombatFinishedAt = nil
		case "encounter_ended":
			if run.EndedAt != nil {
				closeSegment(*run.EndedAt)
			} else {
				closeSegment(event.CreatedAt)
			}
			activeID = ""
			segmentStart = time.Time{}
			if timing.CombatFinishedAt == nil {
				finished := event.CreatedAt
				timing.CombatFinishedAt = &finished
			}
		}
	}
	if timing.CombatStartedAt == nil || segmentStart.IsZero() {
		return timing
	}
	if run.EndedAt != nil {
		closeSegment(*run.EndedAt)
	} else {
		timing.CurrentTurnStartedAt = &segmentStart
	}
	return timing
}
