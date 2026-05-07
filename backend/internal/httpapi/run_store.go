package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"encoding/json"
	"strings"
)

func (s *Server) encounterRunByID(ctx context.Context, runID string) (models.EncounterRun, error) {
	var run models.EncounterRun
	var summaryBytes []byte
	err := s.db.QueryRow(ctx, `
		select id, encounter_id, status, is_test, current_round, current_turn_index, started_at, ended_at, summary
		from encounter_runs where id = $1
	`, runID).Scan(&run.ID, &run.EncounterID, &run.Status, &run.IsTest, &run.CurrentRound, &run.CurrentTurnIndex, &run.StartedAt, &run.EndedAt, &summaryBytes)
	if err != nil {
		return models.EncounterRun{}, err
	}
	run.Summary, _ = unmarshalJSONMap(summaryBytes)
	run.Combatants, err = s.runCombatantsForRun(ctx, runID)
	if err != nil {
		return models.EncounterRun{}, err
	}
	run.Events, _ = s.combatLogEventsForRun(ctx, runID, 80)
	return run, nil
}

func (s *Server) runCombatantsForRun(ctx context.Context, runID string) ([]models.EncounterRunCombatant, error) {
	rows, err := s.db.Query(ctx, `
		select id, encounter_run_id, coalesce(source_combatant_id::text, ''), source_type,
			coalesce(player_id::text, ''), coalesce(creature_id::text, ''), side, display_name,
			color_label, avatar_url, armor_class, max_hit_points, current_hit_points,
			temporary_hit_points, max_hit_points_modifier, armor_class_bonus, armor_class_override,
			max_hit_points_override, current_hit_points_override, coalesce(initiative, 0), initiative_set,
			sort_order, defeated, conditions, damage_dealt, damage_taken, healing_done,
			healing_received, kills, death_save_successes, death_save_failures, stable, snapshot
		from encounter_run_combatants
		where encounter_run_id = $1
		order by initiative desc nulls last, sort_order asc, display_name asc
	`, runID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	combatants := []models.EncounterRunCombatant{}
	for rows.Next() {
		combatant, err := scanEncounterRunCombatant(rows)
		if err != nil {
			return nil, err
		}
		combatants = append(combatants, combatant)
	}
	return combatants, rows.Err()
}

func (s *Server) runCombatantByID(ctx context.Context, runID, combatantID string) (models.EncounterRunCombatant, error) {
	row := s.db.QueryRow(ctx, `
		select id, encounter_run_id, coalesce(source_combatant_id::text, ''), source_type,
			coalesce(player_id::text, ''), coalesce(creature_id::text, ''), side, display_name,
			color_label, avatar_url, armor_class, max_hit_points, current_hit_points,
			temporary_hit_points, max_hit_points_modifier, armor_class_bonus, armor_class_override,
			max_hit_points_override, current_hit_points_override, coalesce(initiative, 0), initiative_set,
			sort_order, defeated, conditions, damage_dealt, damage_taken, healing_done,
			healing_received, kills, death_save_successes, death_save_failures, stable, snapshot
		from encounter_run_combatants
		where encounter_run_id = $1 and id = $2
	`, runID, combatantID)
	return scanEncounterRunCombatant(row)
}

func (s *Server) combatLogEventsForRun(ctx context.Context, runID string, limit int) ([]models.CombatLogEvent, error) {
	rows, err := s.db.Query(ctx, `
		select id, encounter_run_id, sequence, event_type, coalesce(actor_id::text, ''), coalesce(target_id::text, ''), payload, created_at
		from combat_log_events
		where encounter_run_id = $1
		order by sequence desc
		limit $2
	`, runID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	events := []models.CombatLogEvent{}
	for rows.Next() {
		event, err := scanCombatLogEvent(rows)
		if err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	return events, rows.Err()
}

func (s *Server) latestUndoableEvent(ctx context.Context, runID string) (models.CombatLogEvent, error) {
	row := s.db.QueryRow(ctx, `
		select id, encounter_run_id, sequence, event_type, coalesce(actor_id::text, ''), coalesce(target_id::text, ''), payload, created_at
		from combat_log_events
		where encounter_run_id = $1 and coalesce((payload->>'undoable')::boolean, false) = true
		order by sequence desc
		limit 1
	`, runID)
	return scanCombatLogEvent(row)
}

func (s *Server) sortRunInitiative(ctx context.Context, runID string) error {
	combatants, err := s.runCombatantsForRun(ctx, runID)
	if err != nil {
		return err
	}
	for index, combatant := range combatants {
		if _, err := s.db.Exec(ctx, `update encounter_run_combatants set sort_order = $2 where id = $1`, combatant.ID, index); err != nil {
			return err
		}
	}
	return nil
}

func (s *Server) appendCombatLogEvent(ctx context.Context, runID, eventType, actorID, targetID string, payload map[string]any) error {
	if runID == "" {
		return nil
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(ctx, `
		insert into combat_log_events (encounter_run_id, event_type, actor_id, target_id, payload)
		values ($1, $2, nullif($3, '')::uuid, nullif($4, '')::uuid, $5)
	`, runID, eventType, strings.TrimSpace(actorID), strings.TrimSpace(targetID), payloadBytes)
	return err
}

func scanEncounterRunCombatant(row scanner) (models.EncounterRunCombatant, error) {
	var combatant models.EncounterRunCombatant
	var conditionsBytes, snapshotBytes []byte
	err := row.Scan(
		&combatant.ID,
		&combatant.EncounterRunID,
		&combatant.SourceCombatantID,
		&combatant.SourceType,
		&combatant.PlayerID,
		&combatant.CreatureID,
		&combatant.Side,
		&combatant.DisplayName,
		&combatant.ColorLabel,
		&combatant.AvatarURL,
		&combatant.ArmorClass,
		&combatant.MaxHitPoints,
		&combatant.CurrentHitPoints,
		&combatant.TemporaryHitPoints,
		&combatant.MaxHitPointsModifier,
		&combatant.ArmorClassBonus,
		&combatant.ArmorClassOverride,
		&combatant.MaxHitPointsOverride,
		&combatant.CurrentHitPointsOverride,
		&combatant.Initiative,
		&combatant.InitiativeSet,
		&combatant.SortOrder,
		&combatant.Defeated,
		&conditionsBytes,
		&combatant.DamageDealt,
		&combatant.DamageTaken,
		&combatant.HealingDone,
		&combatant.HealingReceived,
		&combatant.Kills,
		&combatant.DeathSaveSuccesses,
		&combatant.DeathSaveFailures,
		&combatant.Stable,
		&snapshotBytes,
	)
	if err != nil {
		return models.EncounterRunCombatant{}, err
	}
	_ = json.Unmarshal(conditionsBytes, &combatant.Conditions)
	combatant.Snapshot, err = unmarshalJSONMap(snapshotBytes)
	return combatant, err
}

func scanCombatLogEvent(row scanner) (models.CombatLogEvent, error) {
	var event models.CombatLogEvent
	var payloadBytes []byte
	err := row.Scan(
		&event.ID,
		&event.EncounterRunID,
		&event.Sequence,
		&event.EventType,
		&event.ActorID,
		&event.TargetID,
		&payloadBytes,
		&event.CreatedAt,
	)
	if err != nil {
		return models.CombatLogEvent{}, err
	}
	event.Payload, err = unmarshalJSONMap(payloadBytes)
	return event, err
}
