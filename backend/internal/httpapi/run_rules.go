package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"encoding/json"
	"errors"
	// nosemgrep: go.lang.security.audit.crypto.math_random.math-random-used -- D&D dice rolls are gameplay randomness, not security-sensitive tokens or secrets.
	mrand "math/rand/v2"
	"strconv"
	"strings"
)

func rollDice(count, dieSize int) int {
	if count < 1 {
		return 0
	}
	if dieSize < 2 {
		dieSize = 6
	}
	total := 0
	for range count {
		total += mrand.IntN(dieSize) + 1
	}
	return total
}

func rollD20WithMode(mode string) (int, []int, string) {
	normalized := strings.TrimSpace(strings.ToLower(mode))
	if normalized != "advantage" && normalized != "disadvantage" {
		roll := mrand.IntN(20) + 1
		return roll, []int{roll}, "normal"
	}
	first := mrand.IntN(20) + 1
	second := mrand.IntN(20) + 1
	if normalized == "advantage" {
		return max(first, second), []int{first, second}, normalized
	}
	return min(first, second), []int{first, second}, normalized
}

func (s *Server) applyHPChange(ctx context.Context, runID, actorID, targetID string, amount int, mode, damageType, eventType string) error {
	target, err := s.runCombatantByID(ctx, runID, strings.TrimSpace(targetID))
	if err != nil {
		return errors.New("target not found")
	}
	var actor models.EncounterRunCombatant
	if strings.TrimSpace(actorID) != "" {
		actor, _ = s.runCombatantByID(ctx, runID, strings.TrimSpace(actorID))
	}
	targetBefore := combatantUndoPayload(target)
	actorBefore := combatantUndoPayload(actor)
	if mode == "damage" {
		if strings.TrimSpace(damageType) != "" {
			amount = s.applyActiveDamageDefenses(ctx, runID, target.ID, amount, damageType)
		}
		remaining := amount
		if target.TemporaryHitPoints > 0 {
			used := min(target.TemporaryHitPoints, remaining)
			target.TemporaryHitPoints -= used
			remaining -= used
		}
		target.CurrentHitPoints = max(0, target.CurrentHitPoints-remaining)
		if target.SourceType == "player" {
			target.Defeated = false
			if target.CurrentHitPoints <= 0 {
				target.Stable = false
			}
		} else {
			target.Defeated = target.CurrentHitPoints <= 0
		}
		target.DamageTaken += amount
		if actor.ID != "" {
			actor.DamageDealt += amount
			if target.Defeated && target.Side == "enemy" {
				actor.Kills++
			}
		}
	} else {
		if s.hasActiveHealingBlock(ctx, runID, target.ID) {
			return s.appendCombatLogEvent(ctx, runID, "healing_blocked", actorID, targetID, map[string]any{
				"amount":       amount,
				"targetBefore": targetBefore,
				"targetAfter":  targetBefore,
			})
		}
		target.CurrentHitPoints = min(effectiveMaxHitPoints(target), target.CurrentHitPoints+amount)
		if target.CurrentHitPoints > 0 {
			target.Defeated = false
			target.DeathSaveSuccesses = 0
			target.DeathSaveFailures = 0
			target.Stable = false
		} else if target.SourceType != "player" {
			target.Defeated = true
		}
		target.HealingReceived += amount
		if actor.ID != "" {
			actor.HealingDone += amount
		}
	}
	payload := map[string]any{
		"undoable":     true,
		"mode":         mode,
		"amount":       amount,
		"damageType":   damageType,
		"targetBefore": targetBefore,
		"targetAfter":  combatantUndoPayload(target),
	}
	if actor.ID != "" {
		payload["actorBefore"] = actorBefore
		payload["actorAfter"] = combatantUndoPayload(actor)
	}
	if err := s.stores.Runs.SaveHPChangeAndLog(ctx, runID, eventType, actorID, targetID, target, actor, payload); err != nil {
		return err
	}
	if mode == "damage" && amount > 0 {
		s.createConcentrationAlert(ctx, runID, target.ID, amount)
	}
	return nil
}

func (s *Server) restoreCombatantState(ctx context.Context, payload map[string]any) error {
	return s.stores.Runs.RestoreCombatantState(ctx, payload)
}

func combatantUndoPayload(combatant models.EncounterRunCombatant) map[string]any {
	if combatant.ID == "" {
		return map[string]any{}
	}
	return map[string]any{
		"id":                 combatant.ID,
		"currentHitPoints":   combatant.CurrentHitPoints,
		"temporaryHitPoints": combatant.TemporaryHitPoints,
		"defeated":           combatant.Defeated,
		"damageDealt":        combatant.DamageDealt,
		"damageTaken":        combatant.DamageTaken,
		"healingDone":        combatant.HealingDone,
		"healingReceived":    combatant.HealingReceived,
		"kills":              combatant.Kills,
		"deathSaveSuccesses": combatant.DeathSaveSuccesses,
		"deathSaveFailures":  combatant.DeathSaveFailures,
		"stable":             combatant.Stable,
		"conditions":         combatant.Conditions,
	}
}

func initiativeBonus(combatant models.EncounterRunCombatant) int {
	return abilityModFromSnapshot(combatant.Snapshot, "dex")
}

func effectiveArmorClass(combatant models.EncounterRunCombatant) int {
	if combatant.ArmorClassOverride > 0 {
		return combatant.ArmorClassOverride
	}
	return combatant.ArmorClass + combatant.ArmorClassBonus
}

func (s *Server) effectiveArmorClassForRun(ctx context.Context, runID string, combatant models.EncounterRunCombatant) int {
	ac := effectiveArmorClass(combatant)
	for _, effect := range s.activeEffectsForTarget(ctx, runID, combatant.ID) {
		switch effect.EffectKind {
		case "ac_bonus":
			ac += effect.Amount
		case "base_ac":
			base := effect.Amount + abilityModFromSnapshot(combatant.Snapshot, "dex")
			if base > ac {
				ac = base
			}
		}
	}
	return ac
}

func effectiveMaxHitPoints(combatant models.EncounterRunCombatant) int {
	if combatant.MaxHitPointsOverride > 0 {
		return combatant.MaxHitPointsOverride
	}
	return max(1, combatant.MaxHitPoints+combatant.MaxHitPointsModifier)
}

func defensesForCombatant(combatant models.EncounterRunCombatant) damageDefenseRequest {
	source := sourceMap(combatant.Snapshot)
	return damageDefenseRequest{
		Vulnerabilities: stringSliceFromAny(source["damageVulnerabilities"]),
		Resistances:     stringSliceFromAny(source["damageResistances"]),
		Immunities:      stringSliceFromAny(source["damageImmunities"]),
	}
}

func (s *Server) defensesForRunCombatant(ctx context.Context, runID string, combatant models.EncounterRunCombatant) damageDefenseRequest {
	defenses := defensesForCombatant(combatant)
	for _, effect := range s.activeEffectsForTarget(ctx, runID, combatant.ID) {
		if effect.EffectKind != "damage_defense" {
			continue
		}
		mode := strings.ToLower(stringFromAny(effect.Payload["mode"]))
		if mode == "" {
			if config, ok := effect.Payload["effectConfig"].(map[string]any); ok {
				mode = strings.ToLower(stringFromAny(config["mode"]))
			}
		}
		types := effectDamageTypes(effect)
		switch mode {
		case "immunity":
			defenses.Immunities = append(defenses.Immunities, types...)
		case "vulnerability":
			defenses.Vulnerabilities = append(defenses.Vulnerabilities, types...)
		default:
			defenses.Resistances = append(defenses.Resistances, types...)
		}
	}
	return defenses
}

func (s *Server) applyActiveDamageDefenses(ctx context.Context, runID, targetID string, amount int, damageType string) int {
	combatant, err := s.runCombatantByID(ctx, runID, targetID)
	if err != nil {
		return amount
	}
	return applyDamageDefense(amount, damageType, s.defensesForRunCombatant(ctx, runID, combatant))
}

func (s *Server) hasActiveHealingBlock(ctx context.Context, runID, targetID string) bool {
	for _, effect := range s.activeEffectsForTarget(ctx, runID, targetID) {
		if effect.EffectKind == "healing_block" {
			return true
		}
	}
	return false
}

func (s *Server) hasActiveDeathProtection(ctx context.Context, runID, targetID string, mode string) bool {
	for _, effect := range s.activeEffectsForTarget(ctx, runID, targetID) {
		if effect.EffectKind != "death_protection" {
			continue
		}
		if mode == "" || strings.EqualFold(stringFromAny(effect.Payload["mode"]), mode) {
			return true
		}
	}
	return false
}

func (s *Server) hasActiveHealingMaximized(ctx context.Context, runID, targetID string) bool {
	for _, effect := range s.activeEffectsForTarget(ctx, runID, targetID) {
		if effect.EffectKind == "healing_maximized" {
			return true
		}
	}
	return false
}

func (s *Server) activeEffectsForTarget(ctx context.Context, runID, targetID string) []models.EncounterRunEffect {
	effects, err := s.runActiveEffects(ctx, runID)
	if err != nil {
		return nil
	}
	filtered := []models.EncounterRunEffect{}
	for _, effect := range effects {
		if effect.TargetID == targetID {
			filtered = append(filtered, effect)
		}
	}
	return filtered
}

func effectDamageTypes(effect models.EncounterRunEffect) []string {
	value := effect.Payload["damageTypes"]
	if config, ok := effect.Payload["effectConfig"].(map[string]any); ok && value == nil {
		value = config["damageTypes"]
	}
	switch typed := value.(type) {
	case []string:
		return typed
	case []any:
		values := []string{}
		for _, item := range typed {
			values = append(values, stringFromAny(item))
		}
		return values
	case string:
		parts := strings.Split(typed, ",")
		values := []string{}
		for _, part := range parts {
			if trimmed := strings.TrimSpace(part); trimmed != "" {
				values = append(values, trimmed)
			}
		}
		return values
	default:
		return nil
	}
}

func abilityModFromSnapshot(snapshot map[string]any, ability string) int {
	source := sourceMap(snapshot)
	if scores, ok := source["abilityScores"].(map[string]any); ok {
		score := intFromAny(scores[ability])
		if score == 0 {
			score = 10
		}
		return (score - 10) / 2
	}
	return 0
}

func sourceMap(snapshot map[string]any) map[string]any {
	for _, key := range []string{"player", "creature"} {
		if source, ok := snapshot[key].(map[string]any); ok {
			if sheet, ok := source["characterSheet"].(map[string]any); ok {
				return sheet
			}
			if block, ok := source["statBlock"].(map[string]any); ok {
				return block
			}
			return source
		}
	}
	return snapshot
}

func applyDamageDefense(amount int, damageType string, defenses damageDefenseRequest) int {
	damageType = strings.TrimSpace(strings.ToLower(damageType))
	if containsFold(defenses.Immunities, damageType) || containsFold(defenses.Immunities, "all") {
		return 0
	}
	if containsFold(defenses.Vulnerabilities, damageType) || containsFold(defenses.Vulnerabilities, "all") {
		return amount * 2
	}
	if containsFold(defenses.Resistances, damageType) || containsFold(defenses.Resistances, "all") {
		return amount / 2
	}
	return amount
}

func intFromAny(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	case json.Number:
		parsed, _ := typed.Int64()
		return int(parsed)
	case string:
		parsed, _ := strconv.Atoi(typed)
		return parsed
	default:
		return 0
	}
}

func boolFromAny(value any) bool {
	typed, _ := value.(bool)
	return typed
}

func stringFromAny(value any) string {
	typed, _ := value.(string)
	return typed
}

func stringSliceFromAny(value any) []string {
	switch typed := value.(type) {
	case []string:
		return typed
	case []any:
		values := []string{}
		for _, item := range typed {
			if text := strings.TrimSpace(stringFromAny(item)); text != "" {
				values = append(values, text)
			}
		}
		return values
	default:
		return nil
	}
}

func containsFold(values []string, needle string) bool {
	for _, value := range values {
		if strings.EqualFold(strings.TrimSpace(value), needle) {
			return true
		}
	}
	return false
}

func normalizeSide(side string) string {
	side = strings.TrimSpace(strings.ToLower(side))
	switch side {
	case "player", "friendly", "enemy":
		return side
	default:
		return "enemy"
	}
}

func rollHitDice(hitDice string, fallback int) int {
	hitDice = strings.TrimSpace(strings.ToLower(hitDice))
	if hitDice == "" {
		return fallback
	}
	parts := strings.SplitN(hitDice, "d", 2)
	if len(parts) != 2 {
		return fallback
	}
	count, err := strconv.Atoi(strings.TrimSpace(parts[0]))
	if err != nil || count < 1 {
		return fallback
	}
	rest := strings.TrimSpace(parts[1])
	modifier := 0
	dieText := rest
	if index := strings.IndexAny(rest, "+-"); index >= 0 {
		dieText = strings.TrimSpace(rest[:index])
		mod, err := strconv.Atoi(strings.ReplaceAll(strings.TrimSpace(rest[index:]), " ", ""))
		if err == nil {
			modifier = mod
		}
	}
	die, err := strconv.Atoi(dieText)
	if err != nil || die < 2 {
		return fallback
	}
	total := modifier
	for range count {
		total += mrand.IntN(die) + 1
	}
	if total < 1 {
		return 1
	}
	return total
}
