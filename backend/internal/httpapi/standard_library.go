package httpapi

import (
	"bludm/backend/internal/models"
	"net/http"
	"strings"
)

func (s *Server) listStandardSources(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `
		select source_key, label, ruleset, license_name, source_url, attribution, created_at, updated_at
		from standard_sources
		order by source_key
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list standard sources")
		return
	}
	defer rows.Close()

	sources := []models.StandardSource{}
	for rows.Next() {
		var source models.StandardSource
		if err := rows.Scan(
			&source.Key,
			&source.Label,
			&source.Ruleset,
			&source.LicenseName,
			&source.SourceURL,
			&source.Attribution,
			&source.CreatedAt,
			&source.UpdatedAt,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "could not read standard sources")
			return
		}
		sources = append(sources, source)
	}
	if rows.Err() != nil {
		writeError(w, http.StatusInternalServerError, "could not read standard sources")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"sources": sources})
}

func (s *Server) listStandardLibraryEntries(w http.ResponseWriter, r *http.Request) {
	category := strings.TrimSpace(r.URL.Query().Get("category"))
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	sources := querySources(r)
	dataExpression := "standard_library_entries.data"
	if strings.EqualFold(strings.TrimSpace(r.URL.Query().Get("compact")), "true") {
		dataExpression = "'{}'::jsonb"
	}

	query := strings.Replace(`
		select standard_library_entries.id, standard_library_entries.source_key, standard_sources.label,
			standard_library_entries.category, standard_library_entries.slug, standard_library_entries.name,
			standard_library_entries.summary, standard_library_entries.description, {{DATA}},
			standard_library_entries.created_at, standard_library_entries.updated_at
		from standard_library_entries
		join standard_sources on standard_sources.source_key = standard_library_entries.source_key
		where ($1 = '' or standard_library_entries.category = $1)
			and (cardinality($2::text[]) = 0 or standard_library_entries.source_key = any($2::text[]))
			and ($3 = '' or standard_library_entries.name ilike '%' || $3 || '%'
				or standard_library_entries.summary ilike '%' || $3 || '%')
		order by standard_library_entries.category asc, standard_library_entries.name asc
		limit 1000
	`, "{{DATA}}", dataExpression, 1)

	rows, err := s.db.Query(r.Context(), query, category, sources, q)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list standard library entries")
		return
	}
	defer rows.Close()

	entries := []models.StandardLibraryEntry{}
	for rows.Next() {
		entry, err := scanStandardLibraryEntry(rows)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not read standard library entries")
			return
		}
		entries = append(entries, entry)
	}
	if rows.Err() != nil {
		writeError(w, http.StatusInternalServerError, "could not read standard library entries")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"entries": entries})
}

func scanStandardLibraryEntry(row scanner) (models.StandardLibraryEntry, error) {
	var entry models.StandardLibraryEntry
	var dataBytes []byte
	err := row.Scan(
		&entry.ID,
		&entry.SourceKey,
		&entry.SourceLabel,
		&entry.Category,
		&entry.Slug,
		&entry.Name,
		&entry.Summary,
		&entry.Description,
		&dataBytes,
		&entry.CreatedAt,
		&entry.UpdatedAt,
	)
	if err != nil {
		return models.StandardLibraryEntry{}, err
	}
	entry.Data, err = unmarshalJSONMap(dataBytes)
	entry.ReadOnly = true
	return entry, err
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
