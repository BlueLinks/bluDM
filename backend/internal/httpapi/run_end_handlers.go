package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
)

func (s *Server) deathSaveCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
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
	if _, err := s.db.Exec(r.Context(), `
		update encounter_run_combatants
		set death_save_successes = $2, death_save_failures = $3, stable = $4
		where id = $1
	`, combatant.ID, combatant.DeathSaveSuccesses, combatant.DeathSaveFailures, combatant.Stable); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update death save")
		return
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "death_save_updated", combatant.ID, combatant.ID, map[string]any{"undoable": true, "action": action, "before": before, "after": combatantUndoPayload(combatant)})
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}

func (s *Server) undoCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
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
		if before, ok := event.Payload["before"].(map[string]any); ok {
			_, _ = s.db.Exec(r.Context(), `update encounter_runs set current_round = $2, current_turn_index = $3 where id = $1`,
				runID, intFromAny(before["round"]), intFromAny(before["turnIndex"]))
		}
	case "death_save_updated":
		if before, ok := event.Payload["before"].(map[string]any); ok {
			_ = s.restoreCombatantState(r.Context(), before)
		}
	default:
		writeError(w, http.StatusBadRequest, "latest event cannot be undone")
		return
	}
	_, _ = s.db.Exec(r.Context(), `update combat_log_events set payload = jsonb_set(payload, '{undoable}', 'false'::jsonb) where id = $1`, event.ID)
	_ = s.appendCombatLogEvent(r.Context(), runID, "undo", "", "", map[string]any{"undoneEventId": event.ID, "undoneSequence": event.Sequence})
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
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
	summaryBytes, _ := json.Marshal(summary)
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not end encounter")
		return
	}
	defer tx.Rollback(r.Context())
	if _, err := tx.Exec(r.Context(), `update encounter_runs set status = 'ended', ended_at = now(), summary = $2 where id = $1`, runID, summaryBytes); err != nil {
		writeError(w, http.StatusInternalServerError, "could not end encounter")
		return
	}
	if !run.IsTest {
		if _, err := tx.Exec(r.Context(), `update encounters set status = 'completed' where id = $1`, run.EncounterID); err != nil {
			writeError(w, http.StatusInternalServerError, "could not end encounter")
			return
		}
		for _, combatant := range run.Combatants {
			if combatant.SourceType == "player" && combatant.PlayerID != "" {
				_, _ = tx.Exec(r.Context(), `
					update players
					set current_hit_points = $2, temporary_hit_points = $3, experience_points = experience_points + $4
					where id = $1
				`, combatant.PlayerID, combatant.CurrentHitPoints, combatant.TemporaryHitPoints, req.XPAwards[combatant.PlayerID])
			}
		}
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not end encounter")
		return
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "encounter_ended", "", "", summary)
	run, _ = s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}
