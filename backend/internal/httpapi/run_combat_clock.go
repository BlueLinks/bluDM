package httpapi

import (
	"net/http"
	"strings"
)

func (s *Server) finishCombatCommand(w http.ResponseWriter, r *http.Request) {
	s.setCombatClock(w, r, false)
}

func (s *Server) resumeCombatCommand(w http.ResponseWriter, r *http.Request) {
	s.setCombatClock(w, r, true)
}

func (s *Server) setCombatClock(w http.ResponseWriter, r *http.Request, resume bool) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	run, err := s.encounterRunByID(r.Context(), runID)
	if err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return
	}
	if run.Status != "active" {
		writeError(w, http.StatusConflict, "combat is not active")
		return
	}
	if resume && run.Timing.CombatFinishedAt != nil {
		if err := s.appendCombatLogEvent(r.Context(), runID, "combat_resumed", "", activeCombatantID(run), map[string]any{}); err != nil {
			writeError(w, http.StatusInternalServerError, "could not resume combat clock")
			return
		}
	}
	if !resume && run.Timing.CombatStartedAt != nil && run.Timing.CombatFinishedAt == nil {
		if err := s.appendCombatLogEvent(r.Context(), runID, "combat_finished", activeCombatantID(run), "", map[string]any{}); err != nil {
			writeError(w, http.StatusInternalServerError, "could not finish combat clock")
			return
		}
	}
	run, err = s.encounterRunByID(r.Context(), runID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load combat clock")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}
