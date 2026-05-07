package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (s *Server) getCreatureSpellcasting(w http.ResponseWriter, r *http.Request) {
	creatureID := strings.TrimSpace(r.PathValue("creatureID"))
	if _, err := s.creatureExists(r.Context(), creatureID); err != nil {
		writeError(w, http.StatusNotFound, "creature not found")
		return
	}
	profile, err := s.creatureSpellcastingProfile(r.Context(), creatureID)
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
	slots, err := marshalJSONMap(req.Slots)
	if err != nil {
		writeError(w, http.StatusBadRequest, "slots must be a JSON object")
		return
	}

	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save spellcasting")
		return
	}
	defer tx.Rollback(r.Context())

	_, err = tx.Exec(r.Context(), `
		insert into creature_spellcasting_profiles (
			creature_id, spellcasting_ability, innate_spellcasting_ability, caster_level,
			spell_save_dc, spell_attack_bonus, slots
		)
		values ($1, $2, $3, $4, $5, $6, $7)
		on conflict (creature_id) do update
		set spellcasting_ability = excluded.spellcasting_ability,
			innate_spellcasting_ability = excluded.innate_spellcasting_ability,
			caster_level = excluded.caster_level,
			spell_save_dc = excluded.spell_save_dc,
			spell_attack_bonus = excluded.spell_attack_bonus,
			slots = excluded.slots
	`, creatureID, req.SpellcastingAbility, req.InnateSpellcastingAbility, req.CasterLevel,
		req.SpellSaveDC, req.SpellAttackBonus, slots)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save spellcasting")
		return
	}
	if _, err := tx.Exec(r.Context(), `delete from creature_spells where creature_id = $1`, creatureID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not save creature spells")
		return
	}
	for index, spell := range req.Spells {
		if strings.TrimSpace(spell.SpellID) == "" {
			continue
		}
		_, err := tx.Exec(r.Context(), `
			insert into creature_spells (creature_id, spell_id, spell_level, prepared, innate, sort_order)
			values ($1, $2, $3, $4, $5, $6)
		`, creatureID, strings.TrimSpace(spell.SpellID), spell.SpellLevel, spell.Prepared, spell.Innate, index)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not save creature spells")
			return
		}
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not save spellcasting")
		return
	}
	profile, err := s.creatureSpellcastingProfile(r.Context(), creatureID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load spellcasting")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"spellcasting": profile})
}

func (s *Server) creatureSpellcastingProfile(ctx context.Context, creatureID string) (models.CreatureSpellcastingProfile, error) {
	var profile models.CreatureSpellcastingProfile
	var slotsBytes []byte
	err := s.db.QueryRow(ctx, `
		select creature_id, spellcasting_ability, innate_spellcasting_ability, caster_level,
			spell_save_dc, spell_attack_bonus, slots, created_at, updated_at
		from creature_spellcasting_profiles
		where creature_id = $1
	`, creatureID).Scan(&profile.CreatureID, &profile.SpellcastingAbility, &profile.InnateSpellcastingAbility,
		&profile.CasterLevel, &profile.SpellSaveDC, &profile.SpellAttackBonus, &slotsBytes,
		&profile.CreatedAt, &profile.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			profile.CreatureID = creatureID
			profile.Slots = map[string]any{}
			profile.Spells = []models.CreatureSpell{}
			return profile, nil
		}
		return models.CreatureSpellcastingProfile{}, err
	}
	profile.Slots, err = unmarshalJSONMap(slotsBytes)
	if err != nil {
		return models.CreatureSpellcastingProfile{}, err
	}
	profile.Spells, err = s.creatureSpells(ctx, creatureID)
	return profile, err
}

func (s *Server) creatureSpells(ctx context.Context, creatureID string) ([]models.CreatureSpell, error) {
	rows, err := s.db.Query(ctx, `
		select creature_spells.id, creature_spells.creature_id, creature_spells.spell_id,
			spells.name, creature_spells.spell_level, creature_spells.prepared,
			creature_spells.innate, creature_spells.sort_order
		from creature_spells
		join spells on spells.id = creature_spells.spell_id
		where creature_spells.creature_id = $1
		order by creature_spells.spell_level asc, creature_spells.sort_order asc
	`, creatureID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	spells := []models.CreatureSpell{}
	for rows.Next() {
		var spell models.CreatureSpell
		if err := rows.Scan(&spell.ID, &spell.CreatureID, &spell.SpellID, &spell.SpellName, &spell.SpellLevel, &spell.Prepared, &spell.Innate, &spell.SortOrder); err != nil {
			return nil, err
		}
		spells = append(spells, spell)
	}
	return spells, rows.Err()
}
