package store

import "bludm/backend/internal/models"

// Older manual healing meters included overheal. Correct the read model using
// persisted before/after HP without changing the historical events or roster.
func normalizeReportHealing(run *models.EncounterRun, events []models.CombatLogEvent) {
	undone := map[string]bool{}
	for _, event := range events {
		if event.EventType == "undo" {
			undone[stringFromAny(event.Payload["undoneEventId"])] = true
		}
	}
	for _, event := range events {
		if event.EventType != "manual_hp" || stringFromAny(event.Payload["mode"]) != "healing" || undone[event.ID] {
			continue
		}
		before, beforeOK := event.Payload["targetBefore"].(map[string]any)
		after, afterOK := event.Payload["targetAfter"].(map[string]any)
		if !beforeOK || !afterOK || before["currentHitPoints"] == nil || after["currentHitPoints"] == nil {
			continue
		}
		effective := max(0, intFromAny(after["currentHitPoints"])-intFromAny(before["currentHitPoints"]))
		excess := max(0, intFromAny(event.Payload["amount"])-effective)
		for index := range run.Combatants {
			person := &run.Combatants[index]
			if person.ID == event.ActorID {
				person.HealingDone = max(0, person.HealingDone-excess)
			}
			if person.ID == event.TargetID {
				person.HealingReceived = max(0, person.HealingReceived-excess)
			}
		}
		if excess > 0 {
			event.Payload["requestedAmount"] = event.Payload["amount"]
			event.Payload["amount"] = effective
		}
	}
}
