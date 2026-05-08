package httpapi

import (
	"bludm/backend/internal/models"
	"encoding/json"
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
	for _, combatant := range combatants {
		if !sideSet[combatant.Side] {
			continue
		}
		initiative := mrand.IntN(20) + 1 + initiativeBonus(combatant)
		if _, err := s.db.Exec(r.Context(), `
			update encounter_run_combatants
			set initiative = $2, initiative_set = true
			where id = $1
		`, combatant.ID, initiative); err != nil {
			writeError(w, http.StatusInternalServerError, "could not roll initiative")
			return
		}
		rolled = append(rolled, map[string]any{"combatantId": combatant.ID, "initiative": initiative})
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
	tag, err := s.db.Exec(r.Context(), `
		update encounter_run_combatants
		set initiative = $3, initiative_set = true
		where id = $2 and encounter_run_id = $1
	`, runID, strings.TrimSpace(req.CombatantID), req.Initiative)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not set initiative")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "combatant not found")
		return
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "initiative_set", "", req.CombatantID, map[string]any{"initiative": req.Initiative})
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
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not reorder initiative")
		return
	}
	defer tx.Rollback(r.Context())
	for index, id := range req.CombatantIDs {
		if _, err := tx.Exec(r.Context(), `
			update encounter_run_combatants set sort_order = $3 where encounter_run_id = $1 and id = $2
		`, runID, strings.TrimSpace(id), index); err != nil {
			writeError(w, http.StatusInternalServerError, "could not reorder initiative")
			return
		}
	}
	if err := tx.Commit(r.Context()); err != nil {
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
	if _, err := s.db.Exec(r.Context(), `
		update encounter_runs set status = 'active', current_round = 1, current_turn_index = 0 where id = $1
	`, runID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not begin combat")
		return
	}
	if err := s.sortRunInitiative(r.Context(), runID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not sort initiative")
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
	if _, err := s.db.Exec(r.Context(), `
		update encounter_runs set current_round = $2, current_turn_index = $3 where id = $1
	`, runID, nextRound, nextIndex); err != nil {
		writeError(w, http.StatusInternalServerError, "could not move turn")
		return
	}
	after := map[string]any{"round": nextRound, "turnIndex": nextIndex}
	_ = s.appendCombatLogEvent(r.Context(), runID, "turn_changed", "", "", map[string]any{"undoable": true, "before": before, "after": after, "skipped": skipped})
	run, _ = s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusOK, map[string]any{"run": run})
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
	action, err := s.creatureActionByID(r.Context(), req.ActionID)
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
		rolled := rollDice(part.DiceCount, part.DieSize)
		criticalRolled := 0
		if critical {
			criticalRolled = rollDice(part.DiceCount, part.DieSize)
		}
		total := rolled + part.FixedValue
		if critical {
			total += criticalRolled + part.FixedValue
		}
		if total < 0 {
			total = 0
		}
		part.RolledValue = rolled
		part.CriticalRolledValue = criticalRolled
		part.Total = total
		rolls = append(rolls, part)
		rawDamage += total
		adjustedDamage += applyDamageDefense(total, part.DamageType, defensesForCombatant(target))
	}
	targetAC := effectiveArmorClass(target)
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
	if _, err := s.runCombatantOwnedByID(r.Context(), combatantID); err != nil {
		writeError(w, http.StatusNotFound, "combatant not found")
		return
	}
	var req updateRunCombatantRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	conditions, err := json.Marshal(req.Conditions)
	if err != nil {
		writeError(w, http.StatusBadRequest, "conditions must be an array")
		return
	}
	row := s.db.QueryRow(r.Context(), `
		update encounter_run_combatants
		set initiative = $2, initiative_set = $3, armor_class_bonus = $4, temporary_hit_points = $5,
			max_hit_points_modifier = $6, armor_class_override = $7, max_hit_points_override = $8,
			current_hit_points_override = $9, current_hit_points = case when $10 > 0 then $10 else current_hit_points end,
			conditions = $11, defeated = $12
		where id = $1
		returning encounter_run_id
	`, combatantID, req.Initiative, req.InitiativeSet, req.ArmorClassBonus, req.TemporaryHitPoints,
		req.MaxHitPointsModifier, req.ArmorClassOverride, req.MaxHitPointsOverride, req.CurrentHitPointsOverride,
		req.CurrentHitPoints, conditions, req.Defeated)
	var runID string
	if err := row.Scan(&runID); err != nil {
		writeError(w, http.StatusNotFound, "combatant not found")
		return
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "combatant_edited", "", combatantID, map[string]any{"conditions": req.Conditions})
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
