package httpapi

import (
	"bludm/backend/internal/store"
	"net/http"
	"strings"
)

func (s *Server) getCreatureSpellcasting(w http.ResponseWriter, r *http.Request) {
	creatureID := strings.TrimSpace(r.PathValue("creatureID"))
	if _, err := s.creatureExists(r.Context(), creatureID); err != nil {
		writeError(w, http.StatusNotFound, "creature not found")
		return
	}
	user, _ := s.currentUser(r)
	profile, err := s.stores.Spellcasts.Profile(r.Context(), user.ID, creatureID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load spellcasting")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"spellcasting": profile})
}

func (s *Server) upsertCreatureSpellcasting(w http.ResponseWriter, r *http.Request) {
	creatureID := strings.TrimSpace(r.PathValue("creatureID"))
	if _, err := s.creatureExists(r.Context(), creatureID); err != nil {
		writeError(w, http.StatusNotFound, "creature not found")
		return
	}
	var req spellcastingRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	user, _ := s.currentUser(r)
	profile, err := s.stores.Spellcasts.UpsertProfile(r.Context(), user.ID, creatureID, spellcastingInputFromRequest(req))
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "spell not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save spellcasting")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"spellcasting": profile})
}
