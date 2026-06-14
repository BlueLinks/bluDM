package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"net/http"
	"strconv"
	"strings"
)

func (s *Server) moveSpellAreaCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	var req moveSpellAreaRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	area, ok := s.activeSpellAreaOrError(w, r.Context(), runID, req.AreaEffectID)
	if !ok {
		return
	}
	payload := cloneMap(area.Payload)
	payload["lastMovedNote"] = strings.TrimSpace(req.Note)
	payload["lastMovedAtRound"] = currentAreaTurnKeyFromRun(r.Context(), s, runID)
	payload["moveCount"] = intFromAny(payload["moveCount"]) + 1
	if err := s.stores.Runs.UpdateEffectPayload(r.Context(), area.ID, payload); err != nil {
		writeError(w, http.StatusInternalServerError, "could not move spell area")
		return
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "spell_area_moved", area.CasterID, area.TargetID, map[string]any{
		"areaEffectId": area.ID,
		"spellName":    area.SpellName,
		"note":         req.Note,
		"moveDistance": intFromAny(payload["moveDistanceFeet"]),
	})
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}

func (s *Server) applySpellAreaCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	var req applySpellAreaRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	area, ok := s.activeSpellAreaOrError(w, r.Context(), runID, req.AreaEffectID)
	if !ok {
		return
	}
	if len(req.TargetIDs) == 0 {
		writeError(w, http.StatusBadRequest, "choose at least one target in the area")
		return
	}
	run, err := s.encounterRunByID(r.Context(), runID)
	if err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return
	}
	payload := cloneMap(area.Payload)
	appliedTargets := mapFromAny(payload["appliedTargets"])
	if appliedTargets == nil {
		appliedTargets = map[string]any{}
	}
	turnKey := spellAreaTurnKey(run)
	caster, err := s.runCombatantByID(r.Context(), runID, area.CasterID)
	if err != nil {
		writeError(w, http.StatusNotFound, "caster not found")
		return
	}
	saveAbility := strings.TrimSpace(stringFromAny(payload["saveAbility"]))
	saveDC := s.spellSaveDC(r.Context(), caster)
	saveEffect := strings.TrimSpace(stringFromAny(payload["saveEffect"]))
	if saveEffect == "" {
		saveEffect = "half"
	}
	results := []map[string]any{}
	for _, targetID := range req.TargetIDs {
		targetID = strings.TrimSpace(targetID)
		if targetID == "" {
			continue
		}
		if boolishFromAny(payload["oncePerTurn"]) && stringFromAny(appliedTargets[targetID]) == turnKey {
			target, _ := s.runCombatantByID(r.Context(), runID, targetID)
			results = append(results, map[string]any{"targetId": targetID, "targetName": target.DisplayName, "skipped": true, "reason": "already applied this turn"})
			continue
		}
		target, err := s.runCombatantByID(r.Context(), runID, targetID)
		if err != nil {
			continue
		}
		d20, d20Rolls, rollMode := rollD20WithMode(req.RollMode)
		saveBonus := abilityModFromSnapshot(target.Snapshot, saveAbility)
		saveTotal := d20 + saveBonus
		succeeded := saveAbility != "" && saveDC > 0 && saveTotal >= saveDC
		damage := spellAreaDamageAmount(payload, area.CastLevel)
		appliedDamage := damage
		if succeeded && saveEffect == "half" {
			appliedDamage = damage / 2
		}
		if succeeded && saveEffect == "negates" {
			appliedDamage = 0
		}
		damageType := strings.TrimSpace(stringFromAny(payload["damageType"]))
		if appliedDamage > 0 {
			_ = s.applyHPChange(r.Context(), runID, area.CasterID, target.ID, appliedDamage, "damage", damageType, "spell_area_damage")
		}
		appliedTargets[target.ID] = turnKey
		results = append(results, map[string]any{
			"targetId":      target.ID,
			"targetName":    target.DisplayName,
			"d20":           d20,
			"d20Rolls":      d20Rolls,
			"rollMode":      rollMode,
			"saveAbility":   saveAbility,
			"saveBonus":     saveBonus,
			"saveTotal":     saveTotal,
			"saveDC":        saveDC,
			"succeeded":     succeeded,
			"damage":        damage,
			"appliedDamage": appliedDamage,
			"damageType":    damageType,
			"riderText":     stringFromAny(payload["riderText"]),
		})
	}
	payload["appliedTargets"] = appliedTargets
	if err := s.stores.Runs.UpdateEffectPayload(r.Context(), area.ID, payload); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update spell area")
		return
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "spell_area_applied", area.CasterID, "", map[string]any{
		"areaEffectId": area.ID,
		"spellName":    area.SpellName,
		"turnKey":      turnKey,
		"results":      results,
	})
	run, _ = s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run, "result": map[string]any{"results": results}})
}

func (s *Server) endSpellAreaCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	var req endSpellAreaRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	area, ok := s.activeSpellAreaOrError(w, r.Context(), runID, req.AreaEffectID)
	if !ok {
		return
	}
	if err := s.stores.Runs.EndSpellArea(r.Context(), runID, area.CasterID, area.SpellName, area.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not end spell area")
		return
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "spell_area_ended", area.CasterID, area.TargetID, map[string]any{"areaEffectId": area.ID, "spellName": area.SpellName})
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}

func (s *Server) activeSpellAreaOrError(w http.ResponseWriter, ctx context.Context, runID string, areaEffectID string) (models.EncounterRunEffect, bool) {
	if _, err := s.encounterRunByID(ctx, runID); err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return models.EncounterRunEffect{}, false
	}
	areaEffectID = strings.TrimSpace(areaEffectID)
	for _, effect := range mustRunActiveEffects(ctx, s, runID) {
		if effect.ID == areaEffectID && isActiveSpellArea(effect) {
			return effect, true
		}
	}
	writeError(w, http.StatusNotFound, "active spell area not found")
	return models.EncounterRunEffect{}, false
}

func mustRunActiveEffects(ctx context.Context, s *Server, runID string) []models.EncounterRunEffect {
	effects, err := s.runActiveEffects(ctx, runID)
	if err != nil {
		return nil
	}
	return effects
}

func isActiveSpellArea(effect models.EncounterRunEffect) bool {
	return effect.Active && (effect.EffectKind == "battlefield_object" || effect.EffectKind == "layered_effect") && boolishFromAny(effect.Payload["areaSpell"])
}

func spellAreaDamageAmount(payload map[string]any, castLevel int) int {
	total := rollDice(intFromAny(payload["diceCount"]), intFromAny(payload["dieSize"])) + intFromAny(payload["fixedValue"])
	scalingType := strings.TrimSpace(stringFromAny(payload["scalingType"]))
	fromLevel := intFromAny(payload["scalingFromLevel"])
	if scalingType == "spell_level" && castLevel > fromLevel && fromLevel > 0 {
		stepSize := max(1, intFromAny(payload["scalingStepSize"]))
		steps := 1 + (castLevel-fromLevel-1)/stepSize
		total += steps * (rollDice(intFromAny(payload["scalingDiceCount"]), intFromAny(payload["scalingDieSize"])) + intFromAny(payload["scalingFixedValue"]))
	}
	return max(0, total)
}

func spellAreaTurnKey(run models.EncounterRun) string {
	return strings.Join([]string{stringFromInt(run.CurrentRound), stringFromInt(run.CurrentTurnIndex)}, ":")
}

func currentAreaTurnKeyFromRun(ctx context.Context, s *Server, runID string) string {
	run, err := s.encounterRunByID(ctx, runID)
	if err != nil {
		return ""
	}
	return spellAreaTurnKey(run)
}

func stringFromInt(value int) string {
	return strconv.Itoa(value)
}

func cloneMap(value map[string]any) map[string]any {
	next := map[string]any{}
	for key, item := range value {
		next[key] = item
	}
	return next
}

func boolishFromAny(value any) bool {
	if boolFromAny(value) {
		return true
	}
	return strings.EqualFold(strings.TrimSpace(stringFromAny(value)), "true")
}

func (s *Server) spellSaveDC(ctx context.Context, actor models.EncounterRunCombatant) int {
	if actor.CreatureID != "" {
		dc, _ := s.stores.Runs.SpellSaveDC(ctx, actor.CreatureID)
		if dc > 0 {
			return dc
		}
	}
	source := sourceMap(actor.Snapshot)
	for _, key := range []string{"spellSaveDC", "spellSaveDc", "spell_save_dc"} {
		if dc := intFromAny(source[key]); dc > 0 {
			return dc
		}
	}
	ability := strings.ToLower(strings.TrimSpace(stringFromAny(source["spellcastingAbility"])))
	if ability == "" {
		ability = "wis"
	}
	proficiency := intFromAny(source["proficiencyBonus"])
	if proficiency <= 0 {
		proficiency = 2
	}
	return 8 + proficiency + abilityModFromSnapshot(actor.Snapshot, ability)
}
