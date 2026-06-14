package httpapi

import (
	"bludm/backend/internal/store"
	"net/http"
	"strconv"
	"strings"
)

func (s *Server) listSpells(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	includeUser := queryBool(r, "includeUser", true)
	includeStandard := queryBool(r, "includeStandard", false)
	sources := querySources(r)
	levelFilter := strings.TrimSpace(r.URL.Query().Get("level"))
	level, levelErr := strconv.Atoi(levelFilter)
	if levelFilter == "" {
		level = -1
		levelErr = nil
	}
	if levelErr != nil {
		writeError(w, http.StatusBadRequest, "level must be a number")
		return
	}

	spells, err := s.stores.Spells.List(r.Context(), user.ID, q, level, includeUser, includeStandard, sources)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list spells")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"spells": spells})
}

func (s *Server) getSpell(w http.ResponseWriter, r *http.Request) {
	spellID := strings.TrimSpace(r.PathValue("spellID"))
	librarySource := strings.TrimSpace(r.URL.Query().Get("librarySource"))
	if librarySource == "" {
		librarySource = "user"
	}
	spell, err := s.spellForCast(r.Context(), spellID, librarySource)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "spell not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load spell")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"spell": spell})
}

func (s *Server) createSpell(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	var req spellRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := req.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	spell, err := s.stores.Spells.Create(r.Context(), user.ID, spellInputFromRequest(req))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create spell")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"spell": spell})
}

func (s *Server) updateSpell(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	spellID := r.PathValue("spellID")
	var req spellRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := req.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	spell, err := s.stores.Spells.Update(r.Context(), user.ID, spellID, spellInputFromRequest(req))
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "spell not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update spell")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"spell": spell})
}

func (s *Server) deleteSpell(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	if err := s.stores.Spells.Delete(r.Context(), user.ID, r.PathValue("spellID")); err != nil {
		if !store.IsNotFound(err) {
			writeError(w, http.StatusInternalServerError, "could not delete spell")
			return
		}
		writeError(w, http.StatusNotFound, "spell not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
