package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

func runCombatantSelect(alias string) string {
	prefix := ""
	if alias != "" {
		prefix = alias + "."
	}
	return fmt.Sprintf(`
		select %[1]sid, %[1]sencounter_run_id, coalesce(%[1]ssource_combatant_id::text, ''), %[1]ssource_type,
			coalesce(%[1]splayer_id::text, ''), coalesce(%[1]screature_id::text, ''), %[1]sside, %[1]sdisplay_name,
			%[1]scolor_label, %[1]savatar_url, %[1]sarmor_class, %[1]smax_hit_points, %[1]scurrent_hit_points,
			%[1]stemporary_hit_points, %[1]smax_hit_points_modifier, %[1]sarmor_class_bonus, %[1]sarmor_class_override,
			%[1]smax_hit_points_override, %[1]scurrent_hit_points_override, coalesce(%[1]sinitiative, 0), %[1]sinitiative_set,
			%[1]ssort_order, %[1]sdefeated, %[1]sconditions, %[1]sdamage_dealt, %[1]sdamage_taken,
			%[1]shealing_done, %[1]shealing_received, %[1]skills, %[1]sdeath_save_successes,
			%[1]sdeath_save_failures, %[1]sstable, %[1]ssnapshot
	`, prefix)
}

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
	rows, err := s.db.Query(ctx, runCombatantSelect("")+`
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
	row := s.db.QueryRow(ctx, runCombatantSelect("")+`
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
	row := s.db.QueryRow(ctx, runCombatantSelect("erc")+`
		from encounter_run_combatants erc
		where erc.id = $1 and exists (
			select 1
			from encounter_runs
			join encounters on encounters.id = encounter_runs.encounter_id
			join campaigns on campaigns.id = encounters.campaign_id
			where encounter_runs.id = erc.encounter_run_id and campaigns.owner_user_id = $2
		)
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
