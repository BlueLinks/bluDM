package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
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

	spells := []models.Spell{}
	if includeUser {
		rows, err := s.db.Query(r.Context(), `
			select id, name, level, school, casting_time, cast_type, spell_range, range_type,
				range_feet, components, material_components, classes, duration, duration_type,
				duration_value, duration_scale, aoe_type, aoe_size, ritual, concentration,
				scaling_type, description, higher_level, source_note, source_material,
				mechanics, created_at, updated_at
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
				ritual, concentration, description, higher_level, source_note, source_key, source_label, mechanics, created_at, updated_at
			from standard_spells
			where ($1 = '' or name ilike '%' || $1 || '%' or school ilike '%' || $1 || '%')
				and ($2 = -1 or level = $2)
				and (cardinality($3::text[]) = 0 or source_key = any($3::text[]))
			order by level asc, name asc
			limit 500
		`, q, level, sources)
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

	var err error
	spells, err = s.attachSpellChildren(r.Context(), spells)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not read spell actions")
		return
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

	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create spell")
		return
	}
	defer tx.Rollback(r.Context())

	spell, err := s.insertSpell(r.Context(), tx, user.ID, req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create spell")
		return
	}
	if err := s.replaceSpellChildren(r.Context(), tx, spell.ID, req); err != nil {
		writeError(w, http.StatusInternalServerError, "could not create spell actions")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not create spell")
		return
	}

	spells, err := s.attachSpellChildren(r.Context(), []models.Spell{spell})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load spell")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"spell": spells[0]})
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

	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update spell")
		return
	}
	defer tx.Rollback(r.Context())

	spell, err := s.updateSpellRecord(r.Context(), tx, user.ID, spellID, req)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "spell not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update spell")
		return
	}
	if err := s.replaceSpellChildren(r.Context(), tx, spell.ID, req); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update spell actions")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update spell")
		return
	}

	spells, err := s.attachSpellChildren(r.Context(), []models.Spell{spell})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load spell")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"spell": spells[0]})
}

func (s *Server) deleteSpell(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	tag, err := s.db.Exec(r.Context(), `
		delete from spells
		where id = $1 and owner_user_id = $2
	`, r.PathValue("spellID"), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete spell")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "spell not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) insertSpell(ctx context.Context, tx spellDataTx, userID string, req spellRequest) (models.Spell, error) {
	components, mechanics, err := spellJSON(req)
	if err != nil {
		return models.Spell{}, err
	}
	row := tx.QueryRow(ctx, `
		insert into spells (
			owner_user_id, name, level, school, casting_time, cast_type, spell_range, range_type,
			range_feet, components, material_components, classes, duration, duration_type,
			duration_value, duration_scale, aoe_type, aoe_size, ritual, concentration,
			scaling_type, description, higher_level, source_note, source_material, mechanics
		)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
			$14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
		returning id, name, level, school, casting_time, cast_type, spell_range, range_type,
			range_feet, components, material_components, classes, duration, duration_type,
			duration_value, duration_scale, aoe_type, aoe_size, ritual, concentration,
			scaling_type, description, higher_level, source_note, source_material,
			mechanics, created_at, updated_at
	`, userID, req.Name, req.Level, req.School, req.CastingTime, req.CastType, req.Range,
		req.RangeType, req.RangeFeet, components, req.Material, req.Classes, req.Duration,
		req.DurationType, req.DurationValue, req.DurationScale, req.AOEType, req.AOESize,
		req.Ritual, req.Concentration, req.ScalingType, req.Description, req.HigherLevel,
		req.SourceNote, req.SourceMaterial, mechanics)

	return scanSpell(row)
}

func (s *Server) updateSpellRecord(ctx context.Context, tx spellDataTx, userID string, spellID string, req spellRequest) (models.Spell, error) {
	components, mechanics, err := spellJSON(req)
	if err != nil {
		return models.Spell{}, err
	}
	row := tx.QueryRow(ctx, `
		update spells set
			name = $3, level = $4, school = $5, casting_time = $6, cast_type = $7,
			spell_range = $8, range_type = $9, range_feet = $10, components = $11,
			material_components = $12, classes = $13, duration = $14, duration_type = $15,
			duration_value = $16, duration_scale = $17, aoe_type = $18, aoe_size = $19,
			ritual = $20, concentration = $21, scaling_type = $22, description = $23,
			higher_level = $24, source_note = $25, source_material = $26, mechanics = $27,
			updated_at = now()
		where id = $1 and owner_user_id = $2
		returning id, name, level, school, casting_time, cast_type, spell_range, range_type,
			range_feet, components, material_components, classes, duration, duration_type,
			duration_value, duration_scale, aoe_type, aoe_size, ritual, concentration,
			scaling_type, description, higher_level, source_note, source_material,
			mechanics, created_at, updated_at
	`, spellID, userID, req.Name, req.Level, req.School, req.CastingTime, req.CastType,
		req.Range, req.RangeType, req.RangeFeet, components, req.Material, req.Classes,
		req.Duration, req.DurationType, req.DurationValue, req.DurationScale, req.AOEType,
		req.AOESize, req.Ritual, req.Concentration, req.ScalingType, req.Description,
		req.HigherLevel, req.SourceNote, req.SourceMaterial, mechanics)
	return scanSpell(row)
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
		&spell.CastType,
		&spell.Range,
		&spell.RangeType,
		&spell.RangeFeet,
		&componentsBytes,
		&spell.Material,
		&spell.Classes,
		&spell.Duration,
		&spell.DurationType,
		&spell.DurationValue,
		&spell.DurationScale,
		&spell.AOEType,
		&spell.AOESize,
		&spell.Ritual,
		&spell.Concentration,
		&spell.ScalingType,
		&spell.Description,
		&spell.HigherLevel,
		&spell.SourceNote,
		&spell.SourceMaterial,
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
	spell.Actions = []models.SpellAction{}
	return spell, nil
}

func spellJSON(req spellRequest) ([]byte, []byte, error) {
	components, err := marshalJSONMap(req.Components)
	if err != nil {
		return nil, nil, err
	}
	mechanics, err := marshalJSONMap(req.Mechanics)
	if err != nil {
		return nil, nil, err
	}
	return components, mechanics, nil
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
		&spell.SourceKey,
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
	spell.Classes = standardSpellClasses(spell.Mechanics)
	spell.LibrarySource = "standard"
	spell.ReadOnly = true
	spell.Actions = []models.SpellAction{}
	return spell, nil
}

func standardSpellClasses(mechanics map[string]any) []string {
	rawClasses, ok := mechanics["classes"].([]any)
	if !ok {
		return []string{}
	}
	classes := make([]string, 0, len(rawClasses))
	for _, rawClass := range rawClasses {
		className, ok := rawClass.(string)
		if !ok {
			continue
		}
		className = strings.TrimSpace(className)
		if className != "" {
			classes = append(classes, className)
		}
	}
	return classes
}
