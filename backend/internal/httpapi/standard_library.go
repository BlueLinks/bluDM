package httpapi

import (
	"bludm/backend/internal/store"
	"net/http"
	"strings"
)

func (s *Server) listStandardSources(w http.ResponseWriter, r *http.Request) {
	sources, err := s.stores.Library.ListSources(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list standard sources")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"sources": sources})
}

func (s *Server) listStandardLibraryEntries(w http.ResponseWriter, r *http.Request) {
	category := strings.TrimSpace(r.URL.Query().Get("category"))
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	sources := querySources(r)
	compact := strings.EqualFold(strings.TrimSpace(r.URL.Query().Get("compact")), "true")
	entries, err := s.stores.Library.ListEntries(r.Context(), store.StandardLibraryFilters{
		Category: category,
		Query:    q,
		Sources:  sources,
		Compact:  compact,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list standard library entries")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"entries": entries})
}

func querySources(r *http.Request) []string {
	raw := strings.TrimSpace(r.URL.Query().Get("source"))
	if raw == "" {
		return []string{}
	}
	parts := strings.Split(raw, ",")
	sources := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			sources = append(sources, part)
		}
	}
	return sources
}
