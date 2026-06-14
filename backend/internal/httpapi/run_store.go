package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"encoding/json"
	"errors"
)

func (s *Server) encounterRunByID(ctx context.Context, runID string) (models.EncounterRun, error) {
	userID, ok := currentUserID(ctx)
	if !ok {
		return models.EncounterRun{}, errors.New("authentication required")
	}
	return s.stores.Runs.ByID(ctx, userID, runID)
}

func (s *Server) runCombatantsForRun(ctx context.Context, runID string) ([]models.EncounterRunCombatant, error) {
	return s.stores.Runs.CombatantsForRun(ctx, runID)
}

func (s *Server) runCombatantByID(ctx context.Context, runID, combatantID string) (models.EncounterRunCombatant, error) {
	return s.stores.Runs.CombatantByID(ctx, runID, combatantID)
}

func (s *Server) runCombatantOwnedByID(ctx context.Context, combatantID string) (models.EncounterRunCombatant, error) {
	userID, ok := currentUserID(ctx)
	if !ok {
		return models.EncounterRunCombatant{}, errors.New("authentication required")
	}
	return s.stores.Runs.CombatantOwnedByID(ctx, userID, combatantID)
}

func (s *Server) combatLogEventsForRun(ctx context.Context, runID string, limit int) ([]models.CombatLogEvent, error) {
	return s.stores.Runs.CombatLogEventsForRun(ctx, runID, limit)
}

func (s *Server) latestUndoableEvent(ctx context.Context, runID string) (models.CombatLogEvent, error) {
	return s.stores.Runs.LatestUndoableEvent(ctx, runID)
}

func (s *Server) sortRunInitiative(ctx context.Context, runID string) error {
	return s.stores.Runs.SortInitiative(ctx, runID)
}

func (s *Server) appendCombatLogEvent(ctx context.Context, runID, eventType, actorID, targetID string, payload map[string]any) error {
	return s.stores.Runs.AppendCombatLogEvent(ctx, runID, eventType, actorID, targetID, payload)
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
