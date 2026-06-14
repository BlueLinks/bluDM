package store

import (
	"context"
	"errors"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
)

type RunStore struct {
	db *gorm.DB
}

func (s RunStore) ByID(ctx context.Context, ownerUserID, runID string) (models.EncounterRun, error) {
	entity, err := runEntityForOwner(ctx, s.db, ownerUserID, runID)
	if err != nil {
		return models.EncounterRun{}, err
	}
	run := encounterRunFromEntity(entity)
	if run.Combatants, err = s.CombatantsForRun(ctx, runID); err != nil {
		return models.EncounterRun{}, err
	}
	run.Events, _ = s.CombatLogEventsForRun(ctx, runID, 80)
	run.SpellSlots, _ = s.SpellSlots(ctx, runID)
	run.ActiveEffects, _ = s.ActiveEffects(ctx, runID)
	run.Alerts, _ = s.Alerts(ctx, runID)
	return run, nil
}

func (s RunStore) CombatantsForRun(ctx context.Context, runID string) ([]models.EncounterRunCombatant, error) {
	var entities []dbmodels.EncounterRunCombatantEntity
	if err := s.db.WithContext(ctx).
		Where("encounter_run_id = ?", strings.TrimSpace(runID)).
		Order("initiative desc nulls last, sort_order asc, display_name asc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	combatants := make([]models.EncounterRunCombatant, 0, len(entities))
	for _, entity := range entities {
		combatants = append(combatants, encounterRunCombatantFromEntity(entity))
	}
	return combatants, nil
}

func (s RunStore) CombatantByID(ctx context.Context, runID, combatantID string) (models.EncounterRunCombatant, error) {
	var entity dbmodels.EncounterRunCombatantEntity
	err := s.db.WithContext(ctx).
		Where("encounter_run_id = ? and id = ?", strings.TrimSpace(runID), strings.TrimSpace(combatantID)).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.EncounterRunCombatant{}, ErrNotFound
	}
	if err != nil {
		return models.EncounterRunCombatant{}, err
	}
	return encounterRunCombatantFromEntity(entity), nil
}

func (s RunStore) CombatantOwnedByID(ctx context.Context, ownerUserID, combatantID string) (models.EncounterRunCombatant, error) {
	var entity dbmodels.EncounterRunCombatantEntity
	err := s.db.WithContext(ctx).
		Table("encounter_run_combatants").
		Select("encounter_run_combatants.*").
		Joins("join encounter_runs on encounter_runs.id = encounter_run_combatants.encounter_run_id").
		Joins("join encounters on encounters.id = encounter_runs.encounter_id").
		Joins("join campaigns on campaigns.id = encounters.campaign_id").
		Where("encounter_run_combatants.id = ? and campaigns.owner_user_id = ?", strings.TrimSpace(combatantID), ownerUserID).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.EncounterRunCombatant{}, ErrNotFound
	}
	if err != nil {
		return models.EncounterRunCombatant{}, err
	}
	return encounterRunCombatantFromEntity(entity), nil
}

func (s RunStore) CombatLogEventsForRun(ctx context.Context, runID string, limit int) ([]models.CombatLogEvent, error) {
	var entities []dbmodels.CombatLogEventEntity
	if err := s.db.WithContext(ctx).
		Where("encounter_run_id = ?", strings.TrimSpace(runID)).
		Order("sequence desc").
		Limit(limit).
		Find(&entities).Error; err != nil {
		return nil, err
	}
	events := make([]models.CombatLogEvent, 0, len(entities))
	for _, entity := range entities {
		events = append(events, combatLogEventFromEntity(entity))
	}
	return events, nil
}

func (s RunStore) LatestUndoableEvent(ctx context.Context, runID string) (models.CombatLogEvent, error) {
	var entity dbmodels.CombatLogEventEntity
	err := s.db.WithContext(ctx).
		Where("encounter_run_id = ? and coalesce((payload->>'undoable')::boolean, false) = true", strings.TrimSpace(runID)).
		Order("sequence desc").
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.CombatLogEvent{}, ErrNotFound
	}
	if err != nil {
		return models.CombatLogEvent{}, err
	}
	return combatLogEventFromEntity(entity), nil
}

func (s RunStore) SortInitiative(ctx context.Context, runID string) error {
	combatants, err := s.CombatantsForRun(ctx, runID)
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for index, combatant := range combatants {
			if err := tx.Model(&dbmodels.EncounterRunCombatantEntity{}).
				Where("id = ?", combatant.ID).
				Update("sort_order", index).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (s RunStore) AppendCombatLogEvent(ctx context.Context, runID, eventType, actorID, targetID string, payload map[string]any) error {
	if strings.TrimSpace(runID) == "" {
		return nil
	}
	entity := dbmodels.CombatLogEventEntity{
		EncounterRunID: strings.TrimSpace(runID),
		EventType:      eventType,
		ActorID:        stringPointer(strings.TrimSpace(actorID)),
		TargetID:       stringPointer(strings.TrimSpace(targetID)),
		Payload:        jsonMap(payload),
	}
	return s.db.WithContext(ctx).Create(&entity).Error
}

func (s RunStore) SpellSlots(ctx context.Context, runID string) ([]models.EncounterRunSpellSlot, error) {
	var entities []dbmodels.EncounterRunSpellSlotEntity
	if err := s.db.WithContext(ctx).
		Where("encounter_run_id = ?", strings.TrimSpace(runID)).
		Order("spell_level asc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	slots := make([]models.EncounterRunSpellSlot, 0, len(entities))
	for _, entity := range entities {
		slots = append(slots, encounterRunSpellSlotFromEntity(entity))
	}
	return slots, nil
}

func (s RunStore) ActiveEffects(ctx context.Context, runID string) ([]models.EncounterRunEffect, error) {
	var entities []dbmodels.EncounterRunActiveEffectEntity
	if err := s.db.WithContext(ctx).
		Where("encounter_run_id = ? and active = true", strings.TrimSpace(runID)).
		Order("created_at asc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	effects := make([]models.EncounterRunEffect, 0, len(entities))
	for _, entity := range entities {
		effects = append(effects, encounterRunEffectFromEntity(entity))
	}
	return effects, nil
}

func (s RunStore) Alerts(ctx context.Context, runID string) ([]models.EncounterRunAlert, error) {
	var entities []dbmodels.EncounterRunAlertEntity
	if err := s.db.WithContext(ctx).
		Where("encounter_run_id = ? and resolved = false", strings.TrimSpace(runID)).
		Order("created_at asc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	alerts := make([]models.EncounterRunAlert, 0, len(entities))
	for _, entity := range entities {
		alerts = append(alerts, encounterRunAlertFromEntity(entity))
	}
	return alerts, nil
}

func runEntityForOwner(ctx context.Context, db *gorm.DB, ownerUserID, runID string) (dbmodels.EncounterRunEntity, error) {
	var entity dbmodels.EncounterRunEntity
	err := db.WithContext(ctx).
		Table("encounter_runs").
		Select("encounter_runs.*").
		Joins("join encounters on encounters.id = encounter_runs.encounter_id").
		Joins("join campaigns on campaigns.id = encounters.campaign_id").
		Where("encounter_runs.id = ? and campaigns.owner_user_id = ?", strings.TrimSpace(runID), ownerUserID).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return dbmodels.EncounterRunEntity{}, ErrNotFound
	}
	return entity, err
}
