package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"encoding/json"
	"errors"
	"strings"
)

func (s *Server) applySpellEffect(ctx context.Context, runID, actorID, targetID string, roll models.SpellActionRollPart, amount int, spellName string) error {
	switch roll.RollKind {
	case "healing":
		return s.applyHPChange(ctx, runID, actorID, targetID, amount, "healing", "", "spell_healing")
	case "temp_hp":
		return s.applyTemporaryHP(ctx, runID, actorID, targetID, amount, spellName)
	case "max_hp":
		return s.applyMaxHPModifier(ctx, runID, actorID, targetID, amount, spellName)
	case "max_hp_reduction":
		return s.applyMaxHPModifier(ctx, runID, actorID, targetID, -amount, spellName)
	case "heal_to_full":
		return s.applyHealToFull(ctx, runID, actorID, targetID, spellName)
	case "recurring_hp_change":
		mode := strings.TrimSpace(stringFromAny(roll.EffectConfig["mode"]))
		if mode == "" {
			mode = "damage"
		}
		if expectedHP, ok := roll.EffectConfig["onlyIfCurrentHP"]; ok {
			target, err := s.runCombatantByID(ctx, runID, targetID)
			if err == nil && target.CurrentHitPoints != intFromAny(expectedHP) {
				return nil
			}
		}
		damageType := strings.TrimSpace(roll.DamageType)
		return s.applyHPChange(ctx, runID, actorID, targetID, amount, mode, damageType, "spell_recurring_hp")
	case "healing_block", "speed_bonus", "speed_reduction", "speed_multiplier", "movement_mode",
		"ac_bonus", "base_ac", "roll_modifier", "advantage_state", "damage_defense", "forced_movement",
		"attack_damage_rider", "healing_maximized", "action_restriction", "saving_throw_repeat",
		"area_trigger", "visibility_effect", "sense_effect", "terrain_effect", "death_protection",
		"linked_healing", "damage_transfer", "battlefield_object":
		return s.appendCombatLogEvent(ctx, runID, "spell_active_effect", actorID, targetID, map[string]any{
			"spellName":    spellName,
			"effectKind":   roll.RollKind,
			"amount":       amount,
			"effectConfig": roll.EffectConfig,
		})
	case "condition":
		return s.applyRunCondition(ctx, runID, actorID, targetID, roll.ConditionName, roll.RollKind, spellName)
	case "remove_condition":
		return s.removeRunCondition(ctx, runID, actorID, targetID, roll.ConditionName, roll.RollKind, spellName)
	case "condition_immunity":
		return s.appendCombatLogEvent(ctx, runID, "spell_condition_immunity", actorID, targetID, map[string]any{"spellName": spellName, "conditionName": roll.ConditionName})
	case "revive":
		return s.applyRevive(ctx, runID, actorID, targetID, amount, spellName)
	case "damage":
		return s.applyHPChange(ctx, runID, actorID, targetID, amount, "damage", roll.DamageType, "spell_damage")
	default:
		_ = s.appendCombatLogEvent(ctx, runID, "spell_effect_note", actorID, targetID, map[string]any{"spellName": spellName, "effectKind": roll.RollKind, "amount": amount, "effectText": roll.ConditionName})
		return nil
	}
}

func (s *Server) applyTemporaryHP(ctx context.Context, runID, actorID, targetID string, amount int, spellName string) error {
	target, err := s.runCombatantByID(ctx, runID, targetID)
	if err != nil {
		return err
	}
	before := target.TemporaryHitPoints
	if _, err := s.db.Exec(ctx, `update encounter_run_combatants set temporary_hit_points = $2 where id = $1`, targetID, amount); err != nil {
		return err
	}
	return s.appendCombatLogEvent(ctx, runID, "spell_temp_hp", actorID, targetID, map[string]any{"spellName": spellName, "amount": amount, "before": before, "mode": "replace"})
}

func (s *Server) applyMaxHPModifier(ctx context.Context, runID, actorID, targetID string, amount int, spellName string) error {
	if amount < 0 && s.hasActiveDeathProtection(ctx, runID, targetID, "hp_max_cannot_be_reduced") {
		return s.appendCombatLogEvent(ctx, runID, "spell_max_hp_reduction_blocked", actorID, targetID, map[string]any{"spellName": spellName, "amount": amount})
	}
	if _, err := s.db.Exec(ctx, `
		update encounter_run_combatants
		set max_hit_points_modifier = max_hit_points_modifier + $2
		where id = $1
	`, targetID, amount); err != nil {
		return err
	}
	return s.appendCombatLogEvent(ctx, runID, "spell_max_hp", actorID, targetID, map[string]any{"spellName": spellName, "amount": amount})
}

func (s *Server) applyHealToFull(ctx context.Context, runID, actorID, targetID string, spellName string) error {
	target, err := s.runCombatantByID(ctx, runID, targetID)
	if err != nil {
		return err
	}
	amount := max(0, effectiveMaxHitPoints(target)-target.CurrentHitPoints)
	return s.applyHPChange(ctx, runID, actorID, targetID, amount, "healing", "", "spell_heal_to_full")
}

func (s *Server) applyRevive(ctx context.Context, runID, actorID, targetID string, amount int, spellName string) error {
	target, err := s.runCombatantByID(ctx, runID, targetID)
	if err != nil {
		return err
	}
	before := combatantUndoPayload(target)
	target.CurrentHitPoints = max(1, amount)
	target.Defeated = false
	target.DeathSaveSuccesses = 0
	target.DeathSaveFailures = 0
	target.Stable = false
	if _, err := s.db.Exec(ctx, `
		update encounter_run_combatants
		set current_hit_points = $2, defeated = false, death_save_successes = 0,
			death_save_failures = 0, stable = false
		where id = $1
	`, targetID, target.CurrentHitPoints); err != nil {
		return err
	}
	return s.appendCombatLogEvent(ctx, runID, "spell_revive", actorID, targetID, map[string]any{
		"spellName":    spellName,
		"amount":       amount,
		"targetBefore": before,
		"targetAfter":  combatantUndoPayload(target),
	})
}

func (s *Server) applyRunCondition(ctx context.Context, runID, actorID, targetID, conditionName, effectKind, spellName string) error {
	conditionName = strings.TrimSpace(conditionName)
	if conditionName == "" {
		return nil
	}
	target, err := s.runCombatantByID(ctx, runID, targetID)
	if err != nil {
		return err
	}
	if !containsFold(target.Conditions, conditionName) {
		target.Conditions = append(target.Conditions, conditionName)
	}
	conditions, _ := json.Marshal(target.Conditions)
	if _, err := s.db.Exec(ctx, `update encounter_run_combatants set conditions = $2 where id = $1`, targetID, conditions); err != nil {
		return err
	}
	return s.appendCombatLogEvent(ctx, runID, "spell_condition", actorID, targetID, map[string]any{"spellName": spellName, "conditionName": conditionName, "effectKind": effectKind})
}

func (s *Server) removeRunCondition(ctx context.Context, runID, actorID, targetID, conditionName, effectKind, spellName string) error {
	conditionName = strings.TrimSpace(conditionName)
	if conditionName == "" {
		return nil
	}
	target, err := s.runCombatantByID(ctx, runID, targetID)
	if err != nil {
		return err
	}
	next := make([]string, 0, len(target.Conditions))
	for _, condition := range target.Conditions {
		if !strings.EqualFold(condition, conditionName) {
			next = append(next, condition)
		}
	}
	conditions, _ := json.Marshal(next)
	if _, err := s.db.Exec(ctx, `update encounter_run_combatants set conditions = $2 where id = $1`, targetID, conditions); err != nil {
		return err
	}
	return s.appendCombatLogEvent(ctx, runID, "spell_condition_removed", actorID, targetID, map[string]any{"spellName": spellName, "conditionName": conditionName, "effectKind": effectKind})
}

func (s *Server) createActiveSpellEffect(ctx context.Context, runID, casterID, targetID string, spell models.Spell, castLevel int, roll models.SpellActionRollPart, amount int) error {
	payloadMap := map[string]any{"spellId": spell.ID, "conditionName": roll.ConditionName, "damageType": roll.DamageType, "effectConfig": roll.EffectConfig}
	for key, value := range roll.EffectConfig {
		payloadMap[key] = value
	}
	payload := marshalEffectPayload(payloadMap)
	_, err := s.db.Exec(ctx, `
		insert into encounter_run_active_effects (
			encounter_run_id, caster_id, target_id, spell_id, library_source, spell_name,
			cast_level, concentration, timing, effect_kind, condition_name, amount, payload
		)
		values ($1, $2, $3, nullif($4, '')::uuid, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`, runID, casterID, targetID, spell.ID, spell.LibrarySource, spell.Name, castLevel, spell.Concentration,
		roll.Timing, roll.RollKind, roll.ConditionName, amount, payload)
	return err
}

func (s *Server) createConcentrationMarker(ctx context.Context, runID, casterID, targetID string, spell models.Spell, castLevel int) error {
	_, err := s.db.Exec(ctx, `
		insert into encounter_run_active_effects (
			encounter_run_id, caster_id, target_id, spell_id, library_source, spell_name,
			cast_level, concentration, timing, effect_kind, payload
		)
		values ($1, $2, $3, nullif($4, '')::uuid, $5, $6, $7, true, 'concentration', 'concentration', '{}'::jsonb)
	`, runID, casterID, targetID, spell.ID, spell.LibrarySource, spell.Name, castLevel)
	return err
}

func (s *Server) applyStartTurnEffects(ctx context.Context, runID, targetID string) []map[string]any {
	return s.applyTurnEffects(ctx, runID, targetID, "start")
}

func (s *Server) applyEndTurnEffects(ctx context.Context, runID, targetID string) []map[string]any {
	return s.applyTurnEffects(ctx, runID, targetID, "end")
}

func (s *Server) applyTurnEffects(ctx context.Context, runID, targetID string, phase string) []map[string]any {
	effects, err := s.runActiveEffects(ctx, runID)
	if err != nil {
		return nil
	}
	applied := []map[string]any{}
	for _, effect := range effects {
		if effect.CasterID == targetID && shouldExpireCasterEffect(effect.Timing, phase) {
			if _, err := s.db.Exec(ctx, `update encounter_run_active_effects set active = false where id = $1`, effect.ID); err == nil {
				applied = append(applied, map[string]any{
					"effectId":  effect.ID,
					"spellName": effect.SpellName,
					"timing":    effect.Timing,
					"expired":   true,
				})
			}
			continue
		}
		if effect.CasterID == targetID && shouldApplyCasterEffect(effect.Timing, phase) {
			change, err := s.applyTimedSpellEffect(ctx, runID, effect)
			if err == nil {
				applied = append(applied, change)
			}
			continue
		}
		if effect.TargetID != targetID || !isTargetTurnEffect(effect.Timing, phase) {
			continue
		}
		change, err := s.applyTimedSpellEffect(ctx, runID, effect)
		if err == nil {
			applied = append(applied, change)
		}
		if strings.HasSuffix(effect.Timing, "_once") {
			_, _ = s.db.Exec(ctx, `update encounter_run_active_effects set active = false where id = $1`, effect.ID)
		}
	}
	return applied
}

func shouldExpireCasterEffect(timing string, phase string) bool {
	return (phase == "start" && timing == "start_caster_turn_once") ||
		(phase == "end" && timing == "end_caster_turn_once")
}

func shouldApplyCasterEffect(timing string, phase string) bool {
	return (phase == "start" && timing == "start_caster_turn_each") ||
		(phase == "end" && timing == "end_caster_turn_each")
}

func isTargetTurnEffect(timing string, phase string) bool {
	if phase == "start" {
		return timing == "start_target_turn" || timing == "start_target_turn_each" || timing == "start_target_turn_once"
	}
	return timing == "end_target_turn" || timing == "end_target_turn_each" || timing == "end_target_turn_once"
}

func (s *Server) applyTimedSpellEffect(ctx context.Context, runID string, effect models.EncounterRunEffect) (map[string]any, error) {
	beforeTarget, err := s.runCombatantByID(ctx, runID, effect.TargetID)
	if err != nil {
		return nil, err
	}
	roll := models.SpellActionRollPart{
		RollKind:      effect.EffectKind,
		DamageType:    strings.TrimSpace(stringFromAny(effect.Payload["damageType"])),
		ConditionName: effect.ConditionName,
		EffectConfig:  effect.Payload,
	}
	if err := s.applySpellEffect(ctx, runID, effect.CasterID, effect.TargetID, roll, effect.Amount, effect.SpellName); err != nil {
		return nil, err
	}
	afterTarget, err := s.runCombatantByID(ctx, runID, effect.TargetID)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"effectId":  effect.ID,
		"spellName": effect.SpellName,
		"timing":    effect.Timing,
		"before":    combatantUndoPayload(beforeTarget),
		"after":     combatantUndoPayload(afterTarget),
	}, nil
}

func (s *Server) breakConcentration(ctx context.Context, runID, casterID string, reason string) error {
	if _, err := s.db.Exec(ctx, `
		update encounter_run_active_effects
		set active = false
		where encounter_run_id = $1 and caster_id = $2 and concentration = true and active = true
	`, runID, casterID); err != nil {
		return err
	}
	return s.appendCombatLogEvent(ctx, runID, "concentration_broken", casterID, "", map[string]any{"reason": reason})
}

func (s *Server) createConcentrationAlert(ctx context.Context, runID, casterID string, damage int) {
	effects, err := s.runActiveEffects(ctx, runID)
	if err != nil {
		return
	}
	var unresolved int
	_ = s.db.QueryRow(ctx, `
		select count(*)
		from encounter_run_alerts
		where encounter_run_id = $1 and actor_id = $2 and alert_type = 'concentration_check' and resolved = false
	`, runID, casterID).Scan(&unresolved)
	if unresolved > 0 {
		return
	}
	for _, effect := range effects {
		if effect.CasterID != casterID || !effect.Concentration {
			continue
		}
		dc := max(10, damage/2)
		_, _ = s.db.Exec(ctx, `
			insert into encounter_run_alerts (
				encounter_run_id, alert_type, actor_id, title, message, dc, payload
			)
			values ($1, 'concentration_check', $2, 'Concentration check', $3, $4, $5)
		`, runID, casterID, "Damage may break concentration on "+effect.SpellName+".", dc,
			marshalEffectPayload(map[string]any{"spellName": effect.SpellName, "damage": damage}))
		return
	}
}

func (s *Server) alertByID(ctx context.Context, runID, alertID string) (models.EncounterRunAlert, error) {
	alerts, err := s.runAlerts(ctx, runID)
	if err != nil {
		return models.EncounterRunAlert{}, err
	}
	for _, alert := range alerts {
		if alert.ID == alertID {
			return alert, nil
		}
	}
	return models.EncounterRunAlert{}, errors.New("alert not found")
}

func (s *Server) spellcastingModifier(ctx context.Context, actor models.EncounterRunCombatant) int {
	ability := ""
	if actor.CreatureID != "" {
		_ = s.db.QueryRow(ctx, `select spellcasting_ability from creature_spellcasting_profiles where creature_id = $1`, actor.CreatureID).Scan(&ability)
	}
	if ability == "" {
		ability = stringFromAny(sourceMap(actor.Snapshot)["spellcastingAbility"])
	}
	return abilityModFromSnapshot(actor.Snapshot, strings.ToLower(ability))
}
