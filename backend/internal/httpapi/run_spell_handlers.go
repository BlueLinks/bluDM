package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"errors"
	"net/http"
	"strings"
)

func (s *Server) castSpellCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	if _, err := s.encounterRunByID(r.Context(), runID); err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return
	}
	var req castSpellRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.ActorID = strings.TrimSpace(req.ActorID)
	req.SpellID = strings.TrimSpace(req.SpellID)
	req.LibrarySource = strings.TrimSpace(req.LibrarySource)
	if req.LibrarySource == "" {
		req.LibrarySource = "user"
	}
	if len(req.TargetIDs) == 0 {
		writeError(w, http.StatusBadRequest, "choose at least one target")
		return
	}
	actor, err := s.runCombatantByID(r.Context(), runID, req.ActorID)
	if err != nil {
		writeError(w, http.StatusNotFound, "actor not found")
		return
	}
	spell, err := s.spellForCast(r.Context(), req.SpellID, req.LibrarySource)
	if err != nil {
		writeError(w, http.StatusNotFound, "spell not found")
		return
	}
	castLevel := max(spell.Level, req.CastLevel)
	if castLevel > 0 {
		if err := s.consumeRunSpellSlot(r.Context(), runID, actor.ID, castLevel); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
	}
	if spell.Concentration {
		_ = s.breakConcentration(r.Context(), runID, actor.ID, "new concentration spell")
	}
	modifier := s.spellcastingModifier(r.Context(), actor)
	applied := []map[string]any{}
	for _, targetID := range req.TargetIDs {
		target, err := s.runCombatantByID(r.Context(), runID, strings.TrimSpace(targetID))
		if err != nil {
			continue
		}
		for _, action := range spell.Actions {
			for _, roll := range action.Rolls {
				amount := spellEffectAmount(roll, castLevel, modifier)
				shouldTrack := shouldTrackSpellEffect(roll)
				if roll.Timing != "" && roll.Timing != "immediate" {
					_ = s.createActiveSpellEffect(r.Context(), runID, actor.ID, target.ID, spell, castLevel, roll, amount)
					applied = append(applied, spellEffectLog(target, roll, amount, "scheduled"))
					continue
				}
				_ = s.applySpellEffect(r.Context(), runID, actor.ID, target.ID, roll, amount, spell.Name)
				if shouldTrack {
					_ = s.createActiveSpellEffect(r.Context(), runID, actor.ID, target.ID, spell, castLevel, roll, amount)
				}
				applied = append(applied, spellEffectLog(target, roll, amount, "applied"))
			}
		}
	}
	if spell.Concentration {
		for _, targetID := range req.TargetIDs {
			target, err := s.runCombatantByID(r.Context(), runID, strings.TrimSpace(targetID))
			if err != nil {
				continue
			}
			_ = s.createConcentrationMarker(r.Context(), runID, actor.ID, target.ID, spell, castLevel)
		}
	}
	result := map[string]any{
		"spell":           spell,
		"actorName":       actor.DisplayName,
		"castLevel":       castLevel,
		"spellcastingMod": modifier,
		"effects":         applied,
		"noteOnly":        len(spell.Actions) == 0,
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "spell_cast", actor.ID, "", result)
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run, "result": result})
}

func (s *Server) resolveConcentrationCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	var req resolveConcentrationRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	alert, err := s.alertByID(r.Context(), runID, strings.TrimSpace(req.AlertID))
	if err != nil {
		writeError(w, http.StatusNotFound, "alert not found")
		return
	}
	action := strings.TrimSpace(req.Action)
	if action == "break" || action == "fail" {
		_ = s.breakConcentration(r.Context(), runID, alert.ActorID, "concentration failed")
	}
	if _, err := s.db.Exec(r.Context(), `update encounter_run_alerts set resolved = true where id = $1`, alert.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not resolve alert")
		return
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "concentration_resolved", alert.ActorID, alert.TargetID, map[string]any{"action": action, "dc": alert.DC})
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}

func (s *Server) manualSpellSlotCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	var req manualSpellSlotRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.CombatantID = strings.TrimSpace(req.CombatantID)
	req.Mode = strings.TrimSpace(req.Mode)
	if req.SpellLevel < 1 || req.SpellLevel > 9 {
		writeError(w, http.StatusBadRequest, "choose a spell slot level from 1 to 9")
		return
	}
	combatant, err := s.runCombatantByID(r.Context(), runID, req.CombatantID)
	if err != nil {
		writeError(w, http.StatusNotFound, "combatant not found")
		return
	}
	before, after, err := s.updateRunSpellSlot(r.Context(), runID, combatant.ID, req.SpellLevel, req.Mode)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "spell_slot_manual", combatant.ID, "", map[string]any{
		"spellLevel": req.SpellLevel,
		"mode":       req.Mode,
		"before":     before,
		"after":      after,
	})
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}

func (s *Server) consumeRunSpellSlot(ctx context.Context, runID, combatantID string, level int) error {
	tag, err := s.db.Exec(ctx, `
		update encounter_run_spell_slots
		set remaining_slots = remaining_slots - 1
		where encounter_run_id = $1 and combatant_id = $2 and spell_level = $3 and remaining_slots > 0
	`, runID, combatantID, level)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("no spell slot available at that level")
	}
	return nil
}

func (s *Server) updateRunSpellSlot(ctx context.Context, runID, combatantID string, level int, mode string) (int, int, error) {
	var before, maxSlots int
	if err := s.db.QueryRow(ctx, `
		select remaining_slots, max_slots
		from encounter_run_spell_slots
		where encounter_run_id = $1 and combatant_id = $2 and spell_level = $3
	`, runID, combatantID, level).Scan(&before, &maxSlots); err != nil {
		return 0, 0, errors.New("no spell slots are tracked at that level")
	}
	after := before
	switch mode {
	case "consume":
		if before <= 0 {
			return before, before, errors.New("no spell slot available at that level")
		}
		after = before - 1
	case "restore":
		if before >= maxSlots {
			return before, before, errors.New("spell slots are already full at that level")
		}
		after = before + 1
	default:
		return before, before, errors.New("spell slot mode must be consume or restore")
	}
	if _, err := s.db.Exec(ctx, `
		update encounter_run_spell_slots
		set remaining_slots = $4
		where encounter_run_id = $1 and combatant_id = $2 and spell_level = $3
	`, runID, combatantID, level, after); err != nil {
		return before, before, err
	}
	return before, after, nil
}

func (s *Server) spellForCast(ctx context.Context, spellID string, librarySource string) (models.Spell, error) {
	if librarySource == "standard" {
		row := s.db.QueryRow(ctx, `
			select id, name, level, school, casting_time, spell_range, components, duration,
				ritual, concentration, description, higher_level, source_note, source_key, source_label, mechanics, created_at, updated_at
			from standard_spells
			where id = $1
		`, spellID)
		spell, err := scanStandardSpell(row)
		if err != nil {
			return models.Spell{}, err
		}
		spells, err := s.attachSpellChildren(ctx, []models.Spell{spell})
		if err != nil {
			return models.Spell{}, err
		}
		return spells[0], nil
	}
	userID, _ := currentUserID(ctx)
	row := s.db.QueryRow(ctx, `
		select id, name, level, school, casting_time, cast_type, spell_range, range_type,
			range_feet, components, material_components, classes, duration, duration_type,
			duration_value, duration_scale, aoe_type, aoe_size, ritual, concentration,
			scaling_type, description, higher_level, source_note, source_material,
			mechanics, created_at, updated_at
		from spells
		where id = $1 and owner_user_id = $2
	`, spellID, userID)
	spell, err := scanSpell(row)
	if err != nil {
		return models.Spell{}, err
	}
	spells, err := s.attachSpellChildren(ctx, []models.Spell{spell})
	if err != nil {
		return models.Spell{}, err
	}
	return spells[0], nil
}

func spellEffectAmount(roll models.SpellActionRollPart, castLevel int, spellcastingMod int) int {
	total := rollDice(roll.DiceCount, roll.DieSize) + roll.FixedValue
	if roll.ScalingType == "spell_level" && castLevel > roll.ScalingFromLevel && roll.ScalingFromLevel > 0 {
		steps := 1 + (castLevel-roll.ScalingFromLevel-1)/max(1, roll.ScalingStepSize)
		total += steps * (rollDice(roll.ScalingDiceCount, roll.ScalingDieSize) + roll.ScalingFixedValue)
	}
	if roll.AddPrimaryStatModifier {
		total += spellcastingMod
	}
	return max(0, total)
}

func spellEffectLog(target models.EncounterRunCombatant, roll models.SpellActionRollPart, amount int, status string) map[string]any {
	return map[string]any{"targetId": target.ID, "targetName": target.DisplayName, "effectKind": roll.RollKind, "conditionName": roll.ConditionName, "effectConfig": roll.EffectConfig, "amount": amount, "timing": roll.Timing, "status": status}
}

func shouldTrackSpellEffect(roll models.SpellActionRollPart) bool {
	if roll.Timing != "" && roll.Timing != "immediate" {
		return true
	}
	switch roll.RollKind {
	case "condition_immunity", "healing_block", "speed_bonus", "speed_reduction", "speed_multiplier",
		"movement_mode", "ac_bonus", "base_ac", "roll_modifier", "advantage_state", "damage_defense",
		"attack_damage_rider":
		return true
	default:
		return false
	}
}
