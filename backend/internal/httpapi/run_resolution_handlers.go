package httpapi

import (
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
	"context"
	"errors"
	"math"
	"net/http"
	"strings"
)

func (s *Server) applyResolutionCommand(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	if _, err := s.encounterRunByID(r.Context(), runID); err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return
	}
	var req applyResolutionRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if len(req.Targets) == 0 {
		writeError(w, http.StatusBadRequest, "choose at least one target")
		return
	}
	resolutionKind := normalizedResolutionKind(req.Kind)

	states := map[string]*models.EncounterRunCombatant{}
	actorID := strings.TrimSpace(req.ActorID)
	var actor *models.EncounterRunCombatant
	if actorID != "" {
		combatant, err := s.runCombatantByID(r.Context(), runID, actorID)
		if err != nil {
			writeError(w, http.StatusNotFound, "actor not found")
			return
		}
		actor = &combatant
		states[combatant.ID] = actor
	}
	actorBefore := map[string]any{}
	if actor != nil {
		actorBefore = combatantUndoPayload(*actor)
	}

	seen := map[string]bool{}
	targetsBefore := []map[string]any{}
	results := []map[string]any{}
	damagedTargets := map[string]int{}
	for _, targetRequest := range req.Targets {
		if resolutionKind == "save" && !validSaveOutcome(targetRequest.Outcome) {
			writeError(w, http.StatusBadRequest, "saving throw outcome must be success or failure")
			return
		}
		targetID := strings.TrimSpace(targetRequest.TargetID)
		if targetID == "" || seen[targetID] {
			writeError(w, http.StatusBadRequest, "resolution targets must be unique")
			return
		}
		seen[targetID] = true
		target := states[targetID]
		if target == nil {
			combatant, err := s.runCombatantByID(r.Context(), runID, targetID)
			if err != nil {
				writeError(w, http.StatusNotFound, "target not found")
				return
			}
			target = &combatant
			states[targetID] = target
		}
		targetsBefore = append(targetsBefore, combatantUndoPayload(*target))

		result, err := applyResolutionTarget(
			target,
			actor,
			targetRequest,
			s.defensesForRunCombatant(r.Context(), runID, *target),
			s.hasActiveHealingBlock(r.Context(), runID, target.ID),
		)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		results = append(results, result)
		if damage := intFromAny(result["finalDamage"]); damage > 0 {
			damagedTargets[target.ID] += damage
		}
	}

	resourceUpdate, resourcePayload, err := s.resolutionResourceUpdate(r.Context(), runID, actor, req.Resource)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	updated := make([]models.EncounterRunCombatant, 0, len(states))
	for _, combatant := range states {
		updated = append(updated, *combatant)
	}
	payload := map[string]any{
		"undoable":      true,
		"kind":          resolutionKind,
		"sourceName":    resolutionSourceName(req.SourceName),
		"notes":         strings.TrimSpace(req.Notes),
		"targetsBefore": targetsBefore,
		"targetsAfter":  resolutionSnapshots(req.Targets, states),
		"results":       results,
		"actorBefore":   actorBefore,
		"resource":      resourcePayload,
	}
	if actor != nil {
		payload["actorAfter"] = combatantUndoPayload(*actor)
	}
	eventTargetID := ""
	if len(req.Targets) == 1 {
		eventTargetID = strings.TrimSpace(req.Targets[0].TargetID)
	}
	if err := s.stores.Runs.SaveResolutionAndLog(
		r.Context(), runID, "resolution_applied", actorID, eventTargetID, updated, resourceUpdate, payload,
	); err != nil {
		writeError(w, http.StatusInternalServerError, "could not apply resolution")
		return
	}
	for targetID, damage := range damagedTargets {
		s.createConcentrationAlert(r.Context(), runID, targetID, damage)
	}
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run, "result": payload})
}

func applyResolutionTarget(
	target *models.EncounterRunCombatant,
	actor *models.EncounterRunCombatant,
	req resolutionTargetRequest,
	defenses damageDefenseRequest,
	healingBlocked bool,
) (map[string]any, error) {
	if req.DamageMultiplier < 0 || req.DamageMultiplier > 10 {
		return nil, errors.New("damage multiplier must be between 0 and 10")
	}
	rawDamage, finalDamage, components, err := resolutionDamage(req.DamageComponents, req.DamageMultiplier, defenses)
	if err != nil {
		return nil, err
	}
	if req.Healing < 0 {
		return nil, errors.New("healing cannot be negative")
	}

	if finalDamage > 0 {
		remaining := finalDamage
		usedTemporaryHP := min(target.TemporaryHitPoints, remaining)
		target.TemporaryHitPoints -= usedTemporaryHP
		remaining -= usedTemporaryHP
		target.CurrentHitPoints = max(0, target.CurrentHitPoints-remaining)
		target.DamageTaken += finalDamage
		if actor != nil {
			actor.DamageDealt += finalDamage
		}
	}
	appliedHealing := 0
	if req.Healing > 0 && !healingBlocked {
		before := target.CurrentHitPoints
		target.CurrentHitPoints = min(effectiveMaxHitPoints(*target), target.CurrentHitPoints+req.Healing)
		appliedHealing = target.CurrentHitPoints - before
		target.HealingReceived += appliedHealing
		if actor != nil {
			actor.HealingDone += appliedHealing
		}
	}
	if req.DirectHP != nil {
		target.CurrentHitPoints = min(effectiveMaxHitPoints(*target), max(0, *req.DirectHP))
	}
	if req.TemporaryHP != nil {
		amount := max(0, *req.TemporaryHP)
		if strings.EqualFold(strings.TrimSpace(req.TemporaryHPMode), "replace") {
			target.TemporaryHitPoints = amount
		} else {
			target.TemporaryHitPoints = max(target.TemporaryHitPoints, amount)
		}
	}
	for _, condition := range req.Conditions {
		name := strings.TrimSpace(condition.Name)
		if name != "" && !containsFold(target.Conditions, name) {
			target.Conditions = append(target.Conditions, name)
		}
	}
	updateResolutionLifeState(target, actor)

	return map[string]any{
		"targetId":               target.ID,
		"targetName":             target.DisplayName,
		"outcome":                strings.TrimSpace(req.Outcome),
		"saveAbility":            strings.TrimSpace(req.SaveAbility),
		"dc":                     req.DC,
		"rollMode":               normalizedRollMode(req.RollMode),
		"rollSource":             strings.TrimSpace(req.RollSource),
		"d20Rolls":               req.D20Rolls,
		"rollTotal":              req.RollTotal,
		"damageMultiplier":       req.DamageMultiplier,
		"rawDamage":              rawDamage,
		"finalDamage":            finalDamage,
		"damageComponents":       components,
		"healing":                appliedHealing,
		"healingRequested":       req.Healing,
		"healingBlocked":         healingBlocked && req.Healing > 0,
		"temporaryHitPoints":     req.TemporaryHP,
		"temporaryHitPointsMode": strings.TrimSpace(req.TemporaryHPMode),
		"directHitPoints":        req.DirectHP,
		"conditions":             req.Conditions,
		"targetAfter":            combatantUndoPayload(*target),
	}, nil
}

func resolutionDamage(
	components []resolutionDamageComponentRequest,
	multiplier float64,
	defenses damageDefenseRequest,
) (int, int, []map[string]any, error) {
	rawTotal := 0
	finalTotal := 0
	results := make([]map[string]any, 0, len(components))
	for _, component := range components {
		if component.Amount < 0 {
			return 0, 0, nil, errors.New("damage component amount cannot be negative")
		}
		rawTotal += component.Amount
		scaled := int(math.Floor(float64(component.Amount) * multiplier))
		typeName := strings.TrimSpace(component.DamageType)
		defense := resolutionDefenseLabel(typeName, defenses)
		final := applyDamageDefense(scaled, typeName, defenses)
		if strings.EqualFold(strings.TrimSpace(component.Mitigation), "ignore") {
			defense = "ignored"
			final = scaled
		}
		finalTotal += final
		results = append(results, map[string]any{
			"id": component.ID, "source": component.Source, "formula": component.Formula,
			"amount": component.Amount, "scaledAmount": scaled, "damageType": typeName,
			"rolledValue": component.RolledValue, "criticalRolledValue": component.CriticalRolledValue,
			"modifier": component.Modifier, "criticalBehavior": strings.TrimSpace(component.CriticalBehavior),
			"mitigation": strings.TrimSpace(component.Mitigation), "manualOverride": component.ManualOverride,
			"defense": defense, "finalAmount": final,
		})
	}
	return rawTotal, finalTotal, results, nil
}

func resolutionDefenseLabel(damageType string, defenses damageDefenseRequest) string {
	if containsFold(defenses.Immunities, damageType) {
		return "immune"
	}
	if containsFold(defenses.Vulnerabilities, damageType) {
		return "vulnerable"
	}
	if containsFold(defenses.Resistances, damageType) {
		return "resistant"
	}
	return "normal"
}

func updateResolutionLifeState(target *models.EncounterRunCombatant, actor *models.EncounterRunCombatant) {
	wasDefeated := target.Defeated
	if target.CurrentHitPoints > 0 {
		target.Defeated = false
		target.DeathSaveSuccesses = 0
		target.DeathSaveFailures = 0
		target.Stable = false
	} else if target.SourceType == "player" {
		target.Defeated = false
		target.Stable = false
	} else {
		target.Defeated = true
	}
	if !wasDefeated && target.Defeated && target.Side == "enemy" && actor != nil && actor.ID != target.ID {
		actor.Kills++
	}
}

func (s *Server) resolutionResourceUpdate(
	ctx context.Context,
	runID string,
	actor *models.EncounterRunCombatant,
	request *resolutionResourceRequest,
) (*store.ResolutionResourceUpdate, map[string]any, error) {
	if request == nil || strings.TrimSpace(request.Kind) == "" {
		return nil, map[string]any{}, nil
	}
	if actor == nil {
		return nil, nil, errors.New("resource use requires an acting combatant")
	}
	if strings.TrimSpace(request.Kind) != "spell_slot" || request.SpellLevel < 1 || request.SpellLevel > 9 {
		return nil, nil, errors.New("invalid resolution resource")
	}
	slot, err := s.stores.Runs.SpellSlot(ctx, runID, actor.ID, request.SpellLevel)
	if err != nil || slot.RemainingSlots <= 0 {
		return nil, nil, errors.New("no spell slot available at that level")
	}
	after := slot.RemainingSlots - 1
	return &store.ResolutionResourceUpdate{
			CombatantID: actor.ID, SpellLevel: request.SpellLevel, Before: slot.RemainingSlots, Remaining: after,
		}, map[string]any{
			"kind": "spell_slot", "combatantId": actor.ID, "spellLevel": request.SpellLevel,
			"before": slot.RemainingSlots, "after": after,
		}, nil
}

func resolutionSnapshots(
	targets []resolutionTargetRequest,
	states map[string]*models.EncounterRunCombatant,
) []map[string]any {
	values := make([]map[string]any, 0, len(targets))
	for _, target := range targets {
		if combatant := states[strings.TrimSpace(target.TargetID)]; combatant != nil {
			values = append(values, combatantUndoPayload(*combatant))
		}
	}
	return values
}

func normalizedResolutionKind(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "attack", "save", "spell", "healing", "manual":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "manual"
	}
}

func validSaveOutcome(value string) bool {
	value = strings.ToLower(strings.TrimSpace(value))
	return value == "success" || value == "failure"
}

func resolutionSourceName(value string) string {
	if value := strings.TrimSpace(value); value != "" {
		return value
	}
	return "Manual resolution"
}

func normalizedRollMode(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "advantage" || value == "disadvantage" {
		return value
	}
	return "normal"
}
