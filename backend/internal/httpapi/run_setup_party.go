package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"bludm/backend/internal/store"
)

func (s *Server) addSetupPlayer(w http.ResponseWriter, r *http.Request) {
	s.updateSetupParty(w, r, "add-player")
}

func (s *Server) removeSetupPlayer(w http.ResponseWriter, r *http.Request) {
	s.updateSetupParty(w, r, "remove-player")
}

func (s *Server) healSetupParty(w http.ResponseWriter, r *http.Request) {
	s.updateSetupParty(w, r, "heal-party")
}

func (s *Server) updateSetupParty(w http.ResponseWriter, r *http.Request, action string) {
	var req struct {
		PlayerID    string `json:"playerId"`
		CombatantID string `json:"combatantId"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	targetID := strings.TrimSpace(req.PlayerID)
	if action == "remove-player" {
		targetID = strings.TrimSpace(req.CombatantID)
	}
	if action != "heal-party" && targetID == "" {
		writeError(w, http.StatusBadRequest, "a player or combatant ID is required")
		return
	}
	ownerID, _ := currentUserID(r.Context())
	run, err := s.stores.Runs.UpdateSetupParty(r.Context(), ownerID, r.PathValue("runID"), action, targetID)
	switch {
	case store.IsNotFound(err):
		writeError(w, http.StatusNotFound, "run or party member not found")
	case errors.Is(err, store.ErrRunNotSetup), errors.Is(err, store.ErrPlayerAlreadyAdded):
		writeError(w, http.StatusConflict, err.Error())
	case err != nil:
		writeError(w, http.StatusInternalServerError, "could not update party setup")
	default:
		writeJSON(w, http.StatusOK, map[string]any{"run": run})
	}
}
