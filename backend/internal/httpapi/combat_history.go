package httpapi

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"bludm/backend/internal/store"
)

func (s *Server) combatHistory(w http.ResponseWriter, r *http.Request) {
	ownerID, _ := currentUserID(r.Context())
	status := r.URL.Query().Get("status")
	if status != "" && status != "completed" && status != "finished" {
		writeError(w, http.StatusBadRequest, "status must be completed or finished")
		return
	}
	page, err := strconv.Atoi(r.URL.Query().Get("page"))
	if r.URL.Query().Has("page") && (err != nil || page < 1 || page > 100000) {
		writeError(w, http.StatusBadRequest, "page must be between 1 and 100000")
		return
	}
	result, err := s.stores.Runs.History(r.Context(), ownerID, strings.TrimSpace(r.PathValue("campaignID")), store.CombatHistoryOptions{
		Query: r.URL.Query().Get("q"), IncludeTests: r.URL.Query().Get("includeTests") == "true", Page: max(1, page), Status: status,
	})
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "campaign not found")
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load combat history")
	} else {
		writeJSON(w, http.StatusOK, result)
	}
}

func (s *Server) combatReport(w http.ResponseWriter, r *http.Request) {
	ownerID, _ := currentUserID(r.Context())
	result, err := s.stores.Runs.Report(r.Context(), ownerID, strings.TrimSpace(r.PathValue("runID")))
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "encounter run not found")
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load combat report")
	} else {
		writeJSON(w, http.StatusOK, result)
	}
}
