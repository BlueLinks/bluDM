package httpapi

import (
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
	"context"
	"errors"
	// nosemgrep: go.lang.security.audit.crypto.math_random.math-random-used -- Initiative rolls are gameplay randomness, not security-sensitive tokens or secrets.
	mrand "math/rand/v2"
	"net/http"
	"strings"
)

func (s *Server) getEncounterRun(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	run, err := s.encounterRunByID(r.Context(), runID)
	if err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}

func (s *Server) rollInitiativeCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	if _, err := s.encounterRunByID(r.Context(), runID); err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return
	}
	var req rollInitiativeRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	sideSet := map[string]bool{}
	for _, side := range req.Sides {
		sideSet[strings.TrimSpace(side)] = true
	}
	if len(sideSet) == 0 {
		sideSet["friendly"] = true
		sideSet["enemy"] = true
	}
	combatants, err := s.runCombatantsForRun(r.Context(), runID)
	if err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return
	}
	rolled := []map[string]any{}
	initiatives := map[string]int{}
	for _, combatant := range combatants {
		if !sideSet[combatant.Side] {
			continue
		}
		initiative := mrand.IntN(20) + 1 + initiativeBonus(combatant)
		initiatives[combatant.ID] = initiative
		rolled = append(rolled, map[string]any{"combatantId": combatant.ID, "initiative": initiative})
	}
	if err := s.stores.Runs.SetInitiatives(r.Context(), initiatives); err != nil {
		writeError(w, http.StatusInternalServerError, "could not roll initiative")
		return
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "initiative_rolled", "", "", map[string]any{"rolled": rolled})
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}

func (s *Server) setInitiativeCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	if _, err := s.encounterRunByID(r.Context(), runID); err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return
	}
	var req setInitiativeRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	var err error
	if req.Initiative == nil {
		err = s.stores.Runs.ClearInitiative(r.Context(), runID, strings.TrimSpace(req.CombatantID))
	} else {
		err = s.stores.Runs.SetInitiative(r.Context(), runID, strings.TrimSpace(req.CombatantID), *req.Initiative)
	}
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "combatant not found")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, "could not set initiative")
		return
	}
	eventType := "initiative_set"
	payload := map[string]any{}
	if req.Initiative == nil {
		eventType = "initiative_cleared"
	} else {
		payload["initiative"] = *req.Initiative
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, eventType, "", req.CombatantID, payload)
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}

func (s *Server) clearInitiativeCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	if _, err := s.encounterRunByID(r.Context(), runID); err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return
	}
	if err := s.stores.Runs.ClearInitiatives(r.Context(), runID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not clear initiative")
		return
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "initiative_cleared", "", "", map[string]any{})
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}

func (s *Server) reorderInitiativeCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	if _, err := s.encounterRunByID(r.Context(), runID); err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return
	}
	var req reorderInitiativeRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if err := s.stores.Runs.ReorderInitiative(r.Context(), runID, req.CombatantIDs); err != nil {
		writeError(w, http.StatusInternalServerError, "could not reorder initiative")
		return
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "initiative_reordered", "", "", map[string]any{"combatantIds": req.CombatantIDs})
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}

func (s *Server) beginEncounterRunCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	if _, err := s.encounterRunByID(r.Context(), runID); err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return
	}
	if err := s.stores.Runs.Begin(r.Context(), runID); errors.Is(err, store.ErrUnresolvedInitiative) {
		writeError(w, http.StatusConflict, err.Error())
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, "could not begin combat")
		return
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "combat_began", "", "", map[string]any{})
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}

func (s *Server) nextTurnCommand(w http.ResponseWriter, r *http.Request) {
	s.moveTurn(w, r, 1)
}

func (s *Server) previousTurnCommand(w http.ResponseWriter, r *http.Request) {
	s.moveTurn(w, r, -1)
}

func (s *Server) moveTurn(w http.ResponseWriter, r *http.Request, direction int) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	run, err := s.encounterRunByID(r.Context(), runID)
	if err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return
	}
	if direction < 0 {
		s.restoreCurrentTurnTimedEffects(r.Context(), runID, run.CurrentRound, run.CurrentTurnIndex)
		run, _ = s.encounterRunByID(r.Context(), runID)
	}
	before := map[string]any{"round": run.CurrentRound, "turnIndex": run.CurrentTurnIndex}
	count := len(run.Combatants)
	if count == 0 {
		writeJSON(w, http.StatusOK, map[string]any{"run": run})
		return
	}
	nextIndex := run.CurrentTurnIndex + direction
	nextRound := run.CurrentRound
	skipped := []string{}
	foundTurn := false
	for attempts := 0; attempts < count; attempts++ {
		if nextIndex >= count {
			nextIndex = 0
			nextRound++
		}
		if nextIndex < 0 {
			nextIndex = count - 1
			if nextRound > 1 {
				nextRound--
			}
		}
		candidate := run.Combatants[nextIndex]
		if !shouldSkipTurn(candidate) {
			foundTurn = true
			break
		}
		skipped = append(skipped, candidate.ID)
		nextIndex += direction
	}
	if !foundTurn {
		nextIndex = run.CurrentTurnIndex
		nextRound = run.CurrentRound
	}
	timedEffects := []map[string]any{}
	if direction > 0 && run.CurrentTurnIndex >= 0 && run.CurrentTurnIndex < len(run.Combatants) {
		timedEffects = append(timedEffects, s.applyEndTurnEffects(r.Context(), runID, run.Combatants[run.CurrentTurnIndex].ID)...)
	}
	if err := s.stores.Runs.SetTurnPosition(r.Context(), runID, nextRound, nextIndex); err != nil {
		writeError(w, http.StatusInternalServerError, "could not move turn")
		return
	}
	after := map[string]any{"round": nextRound, "turnIndex": nextIndex}
	if direction > 0 && nextIndex >= 0 && nextIndex < len(run.Combatants) {
		timedEffects = append(timedEffects, s.applyStartTurnEffects(r.Context(), runID, run.Combatants[nextIndex].ID)...)
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "turn_changed", "", "", map[string]any{"undoable": true, "before": before, "after": after, "skipped": skipped, "timedEffects": timedEffects})
	run, _ = s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}

func (s *Server) restoreCurrentTurnTimedEffects(ctx context.Context, runID string, round, turnIndex int) {
	events, err := s.combatLogEventsForRun(ctx, runID, 25)
	if err != nil {
		return
	}
	for _, event := range events {
		if event.EventType != "turn_changed" || !boolFromAny(event.Payload["undoable"]) {
			continue
		}
		after, ok := event.Payload["after"].(map[string]any)
		if !ok || intFromAny(after["round"]) != round || intFromAny(after["turnIndex"]) != turnIndex {
			continue
		}
		restoreTimedEffects(ctx, s, event.Payload["timedEffects"])
		_ = s.stores.Runs.MarkLogEventNotUndoable(ctx, event.ID)
		return
	}
}

func restoreTimedEffects(ctx context.Context, s *Server, value any) {
	effects, ok := value.([]any)
	if !ok {
		return
	}
	for _, raw := range effects {
		effect, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		before, ok := effect["before"].(map[string]any)
		if ok {
			_ = s.restoreCombatantState(ctx, before)
		}
		effectID := strings.TrimSpace(stringFromAny(effect["effectId"]))
		if effectID != "" {
			_ = s.stores.Runs.SetEffectActive(ctx, effectID, true)
		}
	}
}

func shouldSkipTurn(combatant models.EncounterRunCombatant) bool {
	return combatant.SourceType != "player" && (combatant.Defeated || combatant.CurrentHitPoints <= 0)
}

func (s *Server) manualHPCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	var req manualHPRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Amount < 0 {
		writeError(w, http.StatusBadRequest, "amount cannot be negative")
		return
	}
	mode := strings.TrimSpace(req.Mode)
	if mode != "damage" && mode != "healing" {
		writeError(w, http.StatusBadRequest, "mode must be damage or healing")
		return
	}
	if err := s.applyHPChange(r.Context(), runID, req.ActorID, req.TargetID, req.Amount, mode, strings.TrimSpace(req.DamageType), "manual_hp"); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}

func (s *Server) executeActionCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	if _, err := s.encounterRunByID(r.Context(), runID); err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return
	}
	var req executeActionRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.ActionID = strings.TrimSpace(req.ActionID)
	if req.ActionID == "" {
		writeError(w, http.StatusBadRequest, "actionId is required")
		return
	}
	actor, err := s.runCombatantByID(r.Context(), runID, strings.TrimSpace(req.ActorID))
	if err != nil {
		writeError(w, http.StatusNotFound, "actor not found")
		return
	}
	target, err := s.runCombatantByID(r.Context(), runID, strings.TrimSpace(req.TargetID))
	if err != nil {
		writeError(w, http.StatusNotFound, "target not found")
		return
	}
	userID, _ := currentUserID(r.Context())
	action, err := s.stores.Actions.CreatureActionByID(r.Context(), userID, req.ActionID)
	if err != nil {
		writeError(w, http.StatusNotFound, "action not found")
		return
	}

	d20, d20Rolls, rollMode := rollD20WithMode(req.RollMode)
	attackTotal := d20 + action.AttackModifier
	hits := false
	usesAttackRoll := strings.Contains(action.ActionType, "attack") || action.ActionType == "melee_weapon" || action.ActionType == "ranged_weapon"
	critical := usesAttackRoll && d20 == 20
	rolls := make([]models.ActionRollPart, 0, len(action.Rolls))
	rawDamage := 0
	adjustedDamage := 0
	for _, part := range action.Rolls {
		part = actionRollTotal(part, critical, rollDice)
		rolls = append(rolls, part)
		rawDamage += part.Total
		adjustedDamage += applyDamageDefense(part.Total, part.DamageType, s.defensesForRunCombatant(r.Context(), runID, target))
	}
	targetAC := s.effectiveArmorClassForRun(r.Context(), runID, target)
	if !usesAttackRoll || targetAC <= 0 {
		hits = true
	} else {
		hits = d20 == 20 || (d20 != 1 && attackTotal >= targetAC)
	}
	if !hits && action.MissEffect == "none" {
		adjustedDamage = 0
	}
	if !hits && action.MissEffect == "half" {
		adjustedDamage = adjustedDamage / 2
	}

	result := map[string]any{
		"action":         action,
		"actorName":      actor.DisplayName,
		"targetName":     target.DisplayName,
		"targetId":       target.ID,
		"d20":            d20,
		"d20Rolls":       d20Rolls,
		"rollMode":       rollMode,
		"attackTotal":    attackTotal,
		"targetAC":       targetAC,
		"hit":            hits,
		"critical":       critical,
		"rolls":          rolls,
		"rawDamage":      rawDamage,
		"adjustedDamage": adjustedDamage,
		"availableOverrides": []string{
			"reroll", "ignore", "half", "full", "double",
		},
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "action_executed", req.ActorID, req.TargetID, result)
	writeJSON(w, http.StatusOK, map[string]any{"result": result})
}

func actionRollTotal(part models.ActionRollPart, critical bool, roller func(int, int) int) models.ActionRollPart {
	rolled := roller(part.DiceCount, part.DieSize)
	criticalRolled := 0
	if critical {
		criticalRolled = roller(part.DiceCount, part.DieSize)
	}
	total := rolled + part.FixedValue
	if critical {
		total += criticalRolled
	}
	if total < 0 {
		total = 0
	}
	part.RolledValue = rolled
	part.CriticalRolledValue = criticalRolled
	part.Total = total
	return part
}

func (s *Server) resolveActionDamageCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	var req resolveDamageRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	override := strings.TrimSpace(req.Override)
	if override == "" {
		override = "full"
	}
	finalDamage := req.Damage
	switch override {
	case "ignore":
		finalDamage = 0
	case "half":
		finalDamage = req.Damage / 2
	case "double":
		finalDamage = req.Damage * 2
	case "full":
	default:
		writeError(w, http.StatusBadRequest, "override must be ignore, half, full, or double")
		return
	}
	payload := map[string]any{
		"targetId":    req.TargetID,
		"targetName":  req.TargetName,
		"damage":      req.Damage,
		"override":    override,
		"finalDamage": finalDamage,
	}
	if finalDamage > 0 {
		if err := s.applyHPChange(r.Context(), runID, req.ActorID, req.TargetID, finalDamage, "damage", "", "damage_resolved"); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
	} else {
		_ = s.appendCombatLogEvent(r.Context(), runID, "damage_cancelled", req.ActorID, req.TargetID, payload)
	}
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"result": payload, "run": run})
}

func (s *Server) updateEncounterRunCombatant(w http.ResponseWriter, r *http.Request) {
	combatantID := strings.TrimSpace(r.PathValue("combatantID"))
	combatant, err := s.runCombatantOwnedByID(r.Context(), combatantID)
	if err != nil {
		writeError(w, http.StatusNotFound, "combatant not found")
		return
	}
	var req updateRunCombatantRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	displayName := strings.TrimSpace(req.DisplayName)
	if displayName == "" {
		displayName = combatant.DisplayName
	}
	runID, err := s.stores.Runs.UpdateCombatant(r.Context(), combatantID, store.RunCombatantUpdate{
		DisplayName:              displayName,
		ColorLabel:               strings.TrimSpace(req.ColorLabel),
		AvatarURL:                strings.TrimSpace(req.AvatarURL),
		Initiative:               req.Initiative,
		InitiativeSet:            req.InitiativeSet,
		ArmorClassBonus:          req.ArmorClassBonus,
		TemporaryHitPoints:       req.TemporaryHitPoints,
		MaxHitPointsModifier:     req.MaxHitPointsModifier,
		ArmorClassOverride:       req.ArmorClassOverride,
		MaxHitPointsOverride:     req.MaxHitPointsOverride,
		CurrentHitPointsOverride: req.CurrentHitPointsOverride,
		CurrentHitPoints:         req.CurrentHitPoints,
		Conditions:               req.Conditions,
		Defeated:                 req.Defeated,
	})
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "combatant not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "conditions must be an array")
		return
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "combatant_edited", "", combatantID, map[string]any{
		"displayName": displayName,
		"colorLabel":  strings.TrimSpace(req.ColorLabel),
		"avatarUrl":   strings.TrimSpace(req.AvatarURL),
		"conditions":  req.Conditions,
	})
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
}

func (s *Server) rollCheckCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	if _, err := s.encounterRunByID(r.Context(), runID); err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return
	}
	var req rollCheckRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	roll, d20Rolls, rollMode := rollD20WithMode(req.RollMode)
	total := roll + req.Bonus
	payload := map[string]any{"label": req.Label, "ability": req.Ability, "bonus": req.Bonus, "d20": roll, "d20Rolls": d20Rolls, "rollMode": rollMode, "total": total}
	_ = s.appendCombatLogEvent(r.Context(), runID, "check_rolled", req.ActorID, "", payload)
	writeJSON(w, http.StatusOK, map[string]any{"result": payload})
}
