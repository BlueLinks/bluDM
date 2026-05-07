package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"encoding/json"
	"errors"
	mrand "math/rand/v2"
	"strconv"
	"strings"
)

func rollDice(count, dieSize int) int {
	if count < 1 {
		count = 1
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
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `
		update encounter_run_combatants
		set current_hit_points = $2, temporary_hit_points = $3, defeated = $4,
			damage_taken = $5, healing_received = $6, death_save_successes = $7,
			death_save_failures = $8, stable = $9
		where id = $1
	`, target.ID, target.CurrentHitPoints, target.TemporaryHitPoints, target.Defeated, target.DamageTaken,
		target.HealingReceived, target.DeathSaveSuccesses, target.DeathSaveFailures, target.Stable); err != nil {
		return err
	}
	if actor.ID != "" {
		if _, err := tx.Exec(ctx, `
			update encounter_run_combatants
			set damage_dealt = $2, healing_done = $3, kills = $4
			where id = $1
		`, actor.ID, actor.DamageDealt, actor.HealingDone, actor.Kills); err != nil {
			return err
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
	payloadBytes, _ := json.Marshal(payload)
	if _, err := tx.Exec(ctx, `
		insert into combat_log_events (encounter_run_id, event_type, actor_id, target_id, payload)
		values ($1, $2, nullif($3, '')::uuid, nullif($4, '')::uuid, $5)
	`, runID, eventType, strings.TrimSpace(actorID), strings.TrimSpace(targetID), payloadBytes); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *Server) restoreCombatantState(ctx context.Context, payload map[string]any) error {
	_, err := s.db.Exec(ctx, `
		update encounter_run_combatants
		set current_hit_points = $2, temporary_hit_points = $3, defeated = $4,
			damage_dealt = $5, damage_taken = $6, healing_done = $7, healing_received = $8,
			kills = $9, death_save_successes = $10, death_save_failures = $11, stable = $12
		where id = $1
	`, strings.TrimSpace(stringFromAny(payload["id"])), intFromAny(payload["currentHitPoints"]),
		intFromAny(payload["temporaryHitPoints"]), boolFromAny(payload["defeated"]),
		intFromAny(payload["damageDealt"]), intFromAny(payload["damageTaken"]),
		intFromAny(payload["healingDone"]), intFromAny(payload["healingReceived"]), intFromAny(payload["kills"]),
		intFromAny(payload["deathSaveSuccesses"]), intFromAny(payload["deathSaveFailures"]), boolFromAny(payload["stable"]))
	return err
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
	if containsFold(defenses.Immunities, damageType) {
		return 0
	}
	if containsFold(defenses.Vulnerabilities, damageType) {
		return amount * 2
	}
	if containsFold(defenses.Resistances, damageType) {
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
