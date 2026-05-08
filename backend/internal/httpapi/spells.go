package httpapi

import (
	"bludm/backend/internal/models"
	"net/http"
	"strconv"
	"strings"
)

func (s *Server) listSpells(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	includeUser := queryBool(r, "includeUser", true)
	includeStandard := queryBool(r, "includeStandard", false)
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

	spells := []models.Spell{}
	if includeUser {
		rows, err := s.db.Query(r.Context(), `
			select id, name, level, school, casting_time, spell_range, components, duration,
				ritual, concentration, description, higher_level, source_note, mechanics, created_at, updated_at
			from spells
			where owner_user_id = $3
				and ($1 = '' or name ilike '%' || $1 || '%' or school ilike '%' || $1 || '%')
				and ($2 = -1 or level = $2)
			order by level asc, name asc
			limit 500
		`, q, level, user.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list spells")
			return
		}
		defer rows.Close()
		for rows.Next() {
			spell, err := scanSpell(rows)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "could not read spells")
				return
			}
			spells = append(spells, spell)
		}
		if rows.Err() != nil {
			writeError(w, http.StatusInternalServerError, "could not read spells")
			return
		}
	}
	if includeStandard {
		rows, err := s.db.Query(r.Context(), `
			select id, name, level, school, casting_time, spell_range, components, duration,
				ritual, concentration, description, higher_level, source_note, source_label, mechanics, created_at, updated_at
			from standard_spells
			where ($1 = '' or name ilike '%' || $1 || '%' or school ilike '%' || $1 || '%')
				and ($2 = -1 or level = $2)
			order by level asc, name asc
			limit 500
		`, q, level)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list standard spells")
			return
		}
		defer rows.Close()
		for rows.Next() {
			spell, err := scanStandardSpell(rows)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "could not read standard spells")
				return
			}
			spells = append(spells, spell)
		}
		if rows.Err() != nil {
			writeError(w, http.StatusInternalServerError, "could not read standard spells")
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"spells": spells})
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

	components, err := marshalJSONMap(req.Components)
	if err != nil {
		writeError(w, http.StatusBadRequest, "components must be a JSON object")
		return
	}
	mechanics, err := marshalJSONMap(req.Mechanics)
	if err != nil {
		writeError(w, http.StatusBadRequest, "mechanics must be a JSON object")
		return
	}

	row := s.db.QueryRow(r.Context(), `
		insert into spells (
			owner_user_id, name, level, school, casting_time, spell_range, components, duration, ritual,
			concentration, description, higher_level, source_note, mechanics
		)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		returning id, name, level, school, casting_time, spell_range, components, duration,
			ritual, concentration, description, higher_level, source_note, mechanics, created_at, updated_at
	`, user.ID, req.Name, req.Level, req.School, req.CastingTime, req.Range, components, req.Duration, req.Ritual,
		req.Concentration, req.Description, req.HigherLevel, req.SourceNote, mechanics)

	spell, err := scanSpell(row)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create spell")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"spell": spell})
}

func scanSpell(row scanner) (models.Spell, error) {
	var spell models.Spell
	var componentsBytes []byte
	var mechanicsBytes []byte
	err := row.Scan(
		&spell.ID,
		&spell.Name,
		&spell.Level,
		&spell.School,
		&spell.CastingTime,
		&spell.Range,
		&componentsBytes,
		&spell.Duration,
		&spell.Ritual,
		&spell.Concentration,
		&spell.Description,
		&spell.HigherLevel,
		&spell.SourceNote,
		&mechanicsBytes,
		&spell.CreatedAt,
		&spell.UpdatedAt,
	)
	if err != nil {
		return models.Spell{}, err
	}
	spell.Components, err = unmarshalJSONMap(componentsBytes)
	if err != nil {
		return models.Spell{}, err
	}
	spell.Mechanics, err = unmarshalJSONMap(mechanicsBytes)
	if err != nil {
		return models.Spell{}, err
	}
	spell.LibrarySource = "user"
	return spell, nil
}

func scanStandardSpell(row scanner) (models.Spell, error) {
	var spell models.Spell
	var componentsBytes []byte
	var mechanicsBytes []byte
	err := row.Scan(
		&spell.ID,
		&spell.Name,
		&spell.Level,
		&spell.School,
		&spell.CastingTime,
		&spell.Range,
		&componentsBytes,
		&spell.Duration,
		&spell.Ritual,
		&spell.Concentration,
		&spell.Description,
		&spell.HigherLevel,
		&spell.SourceNote,
		&spell.SourceLabel,
		&mechanicsBytes,
		&spell.CreatedAt,
		&spell.UpdatedAt,
	)
	if err != nil {
		return models.Spell{}, err
	}
	spell.Components, err = unmarshalJSONMap(componentsBytes)
	if err != nil {
		return models.Spell{}, err
	}
	spell.Mechanics, err = unmarshalJSONMap(mechanicsBytes)
	if err != nil {
		return models.Spell{}, err
	}
	spell.LibrarySource = "standard"
	spell.ReadOnly = true
	return spell, nil
}
