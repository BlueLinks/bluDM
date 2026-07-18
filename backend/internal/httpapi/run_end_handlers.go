package httpapi

import (
	"net/http"
	"strings"
)

func (s *Server) deathSaveCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	if _, err := s.encounterRunByID(r.Context(), runID); err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return
	}
	var req deathSaveRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	combatant, err := s.runCombatantByID(r.Context(), runID, strings.TrimSpace(req.CombatantID))
	if err != nil {
		writeError(w, http.StatusNotFound, "combatant not found")
		return
	}
	if combatant.SourceType != "player" {
		writeError(w, http.StatusBadRequest, "death saves are only tracked for players")
		return
	}
	before := combatantUndoPayload(combatant)
	action := strings.TrimSpace(strings.ToLower(req.Action))
	switch action {
	case "success":
		if combatant.DeathSaveSuccesses < 3 {
			combatant.DeathSaveSuccesses++
		}
	case "failure":
		if combatant.DeathSaveFailures < 3 {
			combatant.DeathSaveFailures++
		}
	case "undo-success":
		if combatant.DeathSaveSuccesses > 0 {
			combatant.DeathSaveSuccesses--
		}
		if combatant.DeathSaveSuccesses < 3 {
			combatant.Stable = false
		}
	case "undo-failure":
		if combatant.DeathSaveFailures > 0 {
			combatant.DeathSaveFailures--
		}
	case "stabilize":
		combatant.Stable = true
	default:
		writeError(w, http.StatusBadRequest, "action must be success, failure, undo-success, undo-failure, or stabilize")
		return
	}
	if combatant.DeathSaveSuccesses >= 3 {
		combatant.Stable = true
	}
	if err := s.stores.Runs.UpdateDeathSave(r.Context(), combatant); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update death save")
		return
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "death_save_updated", combatant.ID, combatant.ID, map[string]any{"undoable": true, "action": action, "before": before, "after": combatantUndoPayload(combatant)})
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}

func (s *Server) undoCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	if _, err := s.encounterRunByID(r.Context(), runID); err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return
	}
	event, err := s.latestUndoableEvent(r.Context(), runID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "nothing to undo")
		return
	}
	switch event.EventType {
	case "manual_hp", "damage_resolved":
		if before, ok := event.Payload["targetBefore"].(map[string]any); ok {
			_ = s.restoreCombatantState(r.Context(), before)
		}
		if before, ok := event.Payload["actorBefore"].(map[string]any); ok {
			_ = s.restoreCombatantState(r.Context(), before)
		}
	case "turn_changed":
		restoreTimedEffects(r.Context(), s, event.Payload["timedEffects"])
		if before, ok := event.Payload["before"].(map[string]any); ok {
			_ = s.stores.Runs.SetTurnPosition(r.Context(), runID, intFromAny(before["round"]), intFromAny(before["turnIndex"]))
		}
	case "death_save_updated":
		if before, ok := event.Payload["before"].(map[string]any); ok {
			_ = s.restoreCombatantState(r.Context(), before)
		}
	case "resolution_applied":
		for _, before := range mapsFromAny(event.Payload["targetsBefore"]) {
			_ = s.restoreCombatantState(r.Context(), before)
		}
		if before, ok := event.Payload["actorBefore"].(map[string]any); ok && stringFromAny(before["id"]) != "" {
			_ = s.restoreCombatantState(r.Context(), before)
		}
		if resource, ok := event.Payload["resource"].(map[string]any); ok && stringFromAny(resource["kind"]) == "spell_slot" {
			_ = s.stores.Runs.UpdateSpellSlot(
				r.Context(), runID, stringFromAny(resource["combatantId"]),
				intFromAny(resource["spellLevel"]), intFromAny(resource["before"]),
			)
		}
	default:
		writeError(w, http.StatusBadRequest, "latest event cannot be undone")
		return
	}
	_ = s.stores.Runs.MarkLogEventNotUndoable(r.Context(), event.ID)
	_ = s.appendCombatLogEvent(r.Context(), runID, "undo", "", "", map[string]any{"undoneEventId": event.ID, "undoneSequence": event.Sequence})
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}

func mapsFromAny(value any) []map[string]any {
	items, _ := value.([]any)
	values := make([]map[string]any, 0, len(items))
	for _, item := range items {
		if object, ok := item.(map[string]any); ok {
			values = append(values, object)
		}
	}
	return values
}

func (s *Server) endEncounterRun(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	var req endEncounterRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	run, err := s.encounterRunByID(r.Context(), runID)
	if err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return
	}
	summary := map[string]any{
		"xpAwards":        req.XPAwards,
		"lootPool":        req.LootPool,
		"lootAssignments": req.LootAssignments,
		"meters":          run.Combatants,
	}
	if err := s.stores.Runs.EndRun(r.Context(), run, summary, req.XPAwards); err != nil {
		writeError(w, http.StatusInternalServerError, "could not end encounter")
		return
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "encounter_ended", "", "", summary)
	run, _ = s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}
