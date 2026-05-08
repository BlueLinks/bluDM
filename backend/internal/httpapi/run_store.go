package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"encoding/json"
	"errors"
	"strings"
)

func (s *Server) encounterRunByID(ctx context.Context, runID string) (models.EncounterRun, error) {
	userID, ok := currentUserID(ctx)
	if !ok {
		return models.EncounterRun{}, errors.New("authentication required")
	}
	var run models.EncounterRun
	var summaryBytes []byte
	err := s.db.QueryRow(ctx, `
		select encounter_runs.id, encounter_runs.encounter_id, encounter_runs.status, encounter_runs.is_test,
			encounter_runs.current_round, encounter_runs.current_turn_index, encounter_runs.started_at,
			encounter_runs.ended_at, encounter_runs.summary
		from encounter_runs
		join encounters on encounters.id = encounter_runs.encounter_id
		join campaigns on campaigns.id = encounters.campaign_id
		where encounter_runs.id = $1 and campaigns.owner_user_id = $2
	`, runID, userID).Scan(&run.ID, &run.EncounterID, &run.Status, &run.IsTest, &run.CurrentRound, &run.CurrentTurnIndex, &run.StartedAt, &run.EndedAt, &summaryBytes)
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

func (s *Server) runCombatantOwnedByID(ctx context.Context, combatantID string) (models.EncounterRunCombatant, error) {
	userID, ok := currentUserID(ctx)
	if !ok {
		return models.EncounterRunCombatant{}, errors.New("authentication required")
	}
	row := s.db.QueryRow(ctx, `
		select encounter_run_combatants.id, encounter_run_combatants.encounter_run_id,
			coalesce(encounter_run_combatants.source_combatant_id::text, ''), encounter_run_combatants.source_type,
			coalesce(encounter_run_combatants.player_id::text, ''), coalesce(encounter_run_combatants.creature_id::text, ''),
			encounter_run_combatants.side, encounter_run_combatants.display_name, encounter_run_combatants.color_label,
			encounter_run_combatants.avatar_url, encounter_run_combatants.armor_class,
			encounter_run_combatants.max_hit_points, encounter_run_combatants.current_hit_points,
			encounter_run_combatants.temporary_hit_points, encounter_run_combatants.max_hit_points_modifier,
			encounter_run_combatants.armor_class_bonus, encounter_run_combatants.armor_class_override,
			encounter_run_combatants.max_hit_points_override, encounter_run_combatants.current_hit_points_override,
			coalesce(encounter_run_combatants.initiative, 0), encounter_run_combatants.initiative_set,
			encounter_run_combatants.sort_order, encounter_run_combatants.defeated, encounter_run_combatants.conditions,
			encounter_run_combatants.damage_dealt, encounter_run_combatants.damage_taken,
			encounter_run_combatants.healing_done, encounter_run_combatants.healing_received,
			encounter_run_combatants.kills, encounter_run_combatants.death_save_successes,
			encounter_run_combatants.death_save_failures, encounter_run_combatants.stable,
			encounter_run_combatants.snapshot
		from encounter_run_combatants
		join encounter_runs on encounter_runs.id = encounter_run_combatants.encounter_run_id
		join encounters on encounters.id = encounter_runs.encounter_id
		join campaigns on campaigns.id = encounters.campaign_id
		where encounter_run_combatants.id = $1 and campaigns.owner_user_id = $2
	`, combatantID, userID)
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
