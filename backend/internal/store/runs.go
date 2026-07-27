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

type RunCombatantInput struct {
	SourceCombatantID string
	SourceType        string
	PlayerID          string
	CreatureID        string
	Side              string
	DisplayName       string
	ColorLabel        string
	AvatarURL         string
	ArmorClass        int
	MaxHitPoints      int
	CurrentHitPoints  int
	Initiative        int
	InitiativeSet     bool
	Snapshot          map[string]any
}

type RunCombatantUpdate struct {
	DisplayName              string
	ColorLabel               string
	AvatarURL                string
	Initiative               int
	InitiativeSet            bool
	ArmorClassBonus          int
	TemporaryHitPoints       int
	MaxHitPointsModifier     int
	ArmorClassOverride       int
	MaxHitPointsOverride     int
	CurrentHitPointsOverride int
	CurrentHitPoints         int
	Conditions               []string
	Defeated                 bool
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

func (s RunStore) AddCombatants(ctx context.Context, runID string, inputs []RunCombatantInput) ([]models.EncounterRunCombatant, error) {
	created := []models.EncounterRunCombatant{}
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var nextOrder int
		if err := tx.Model(&dbmodels.EncounterRunCombatantEntity{}).
			Where("encounter_run_id = ?", strings.TrimSpace(runID)).
			Select("coalesce(max(sort_order) + 1, 0)").
			Scan(&nextOrder).Error; err != nil {
			return err
		}
		for index, input := range inputs {
			entity := runCombatantEntityFromInput(runID, nextOrder+index, input)
			if err := tx.Create(&entity).Error; err != nil {
				return err
			}
			created = append(created, encounterRunCombatantFromEntity(entity))
		}
		return nil
	})
	return created, err
}

func (s RunStore) SetInitiatives(ctx context.Context, values map[string]int) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for combatantID, initiative := range values {
			if err := tx.Model(&dbmodels.EncounterRunCombatantEntity{}).
				Where("id = ?", strings.TrimSpace(combatantID)).
				Updates(map[string]any{"initiative": initiative, "initiative_set": true}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (s RunStore) SetInitiative(ctx context.Context, runID, combatantID string, initiative int) error {
	result := s.db.WithContext(ctx).Model(&dbmodels.EncounterRunCombatantEntity{}).
		Where("encounter_run_id = ? and id = ?", strings.TrimSpace(runID), strings.TrimSpace(combatantID)).
		Updates(map[string]any{"initiative": initiative, "initiative_set": true})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s RunStore) ClearInitiative(ctx context.Context, runID, combatantID string) error {
	result := s.db.WithContext(ctx).
		Model(&dbmodels.EncounterRunCombatantEntity{}).
		Where("encounter_run_id = ? and id = ?", strings.TrimSpace(runID), strings.TrimSpace(combatantID)).
		Updates(map[string]any{"initiative": nil, "initiative_set": false})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s RunStore) ClearInitiatives(ctx context.Context, runID string) error {
	return s.db.WithContext(ctx).
		Model(&dbmodels.EncounterRunCombatantEntity{}).
		Where("encounter_run_id = ?", strings.TrimSpace(runID)).
		Updates(map[string]any{"initiative": nil, "initiative_set": false}).
		Error
}

func (s RunStore) ReorderInitiative(ctx context.Context, runID string, combatantIDs []string) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for index, id := range combatantIDs {
			if err := tx.Model(&dbmodels.EncounterRunCombatantEntity{}).
				Where("encounter_run_id = ? and id = ?", strings.TrimSpace(runID), strings.TrimSpace(id)).
				Update("sort_order", index).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (s RunStore) Begin(ctx context.Context, runID string) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var combatants []dbmodels.EncounterRunCombatantEntity
		if err := tx.
			Where("encounter_run_id = ?", strings.TrimSpace(runID)).
			Order("initiative desc nulls last, sort_order asc, display_name asc").
			Find(&combatants).Error; err != nil {
			return err
		}
		for index, combatant := range combatants {
			if !combatant.InitiativeSet {
				return ErrUnresolvedInitiative
			}
			if err := tx.Model(&dbmodels.EncounterRunCombatantEntity{}).
				Where("id = ?", combatant.ID).
				Update("sort_order", index).Error; err != nil {
				return err
			}
		}
		return tx.Model(&dbmodels.EncounterRunEntity{}).
			Where("id = ?", strings.TrimSpace(runID)).
			Updates(map[string]any{"status": "active", "current_round": 1, "current_turn_index": 0}).Error
	})
}

func (s RunStore) SetTurnPosition(ctx context.Context, runID string, round, turnIndex int) error {
	return s.db.WithContext(ctx).Model(&dbmodels.EncounterRunEntity{}).
		Where("id = ?", strings.TrimSpace(runID)).
		Updates(map[string]any{"current_round": round, "current_turn_index": turnIndex}).Error
}

func (s RunStore) UpdateCombatant(ctx context.Context, combatantID string, input RunCombatantUpdate) (string, error) {
	conditions, err := jsonBytes(input.Conditions)
	if err != nil {
		return "", err
	}
	result := s.db.WithContext(ctx).Model(&dbmodels.EncounterRunCombatantEntity{}).
		Where("id = ?", strings.TrimSpace(combatantID)).
		Updates(map[string]any{
			"display_name":                input.DisplayName,
			"color_label":                 input.ColorLabel,
			"avatar_url":                  input.AvatarURL,
			"initiative":                  input.Initiative,
			"initiative_set":              input.InitiativeSet,
			"armor_class_bonus":           input.ArmorClassBonus,
			"temporary_hit_points":        input.TemporaryHitPoints,
			"max_hit_points_modifier":     input.MaxHitPointsModifier,
			"armor_class_override":        input.ArmorClassOverride,
			"max_hit_points_override":     input.MaxHitPointsOverride,
			"current_hit_points_override": input.CurrentHitPointsOverride,
			"current_hit_points":          input.CurrentHitPoints,
			"conditions":                  conditions,
			"defeated":                    input.Defeated,
		})
	if result.Error != nil {
		return "", result.Error
	}
	if result.RowsAffected == 0 {
		return "", ErrNotFound
	}
	var entity dbmodels.EncounterRunCombatantEntity
	if err := s.db.WithContext(ctx).Where("id = ?", strings.TrimSpace(combatantID)).First(&entity).Error; err != nil {
		return "", err
	}
	return entity.EncounterRunID, nil
}

func (s RunStore) MarkLogEventNotUndoable(ctx context.Context, eventID string) error {
	return s.db.WithContext(ctx).
		Exec("update combat_log_events set payload = jsonb_set(payload, '{undoable}', 'false'::jsonb) where id = ?", strings.TrimSpace(eventID)).
		Error
}

func (s RunStore) SetEffectActive(ctx context.Context, effectID string, active bool) error {
	return s.db.WithContext(ctx).Model(&dbmodels.EncounterRunActiveEffectEntity{}).
		Where("id = ?", strings.TrimSpace(effectID)).
		Update("active", active).Error
}

func (s RunStore) SaveHPChangeAndLog(ctx context.Context, runID, eventType, actorID, targetID string, target models.EncounterRunCombatant, actor models.EncounterRunCombatant, payload map[string]any) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&dbmodels.EncounterRunCombatantEntity{}).
			Where("id = ?", target.ID).
			Updates(map[string]any{
				"current_hit_points":   target.CurrentHitPoints,
				"temporary_hit_points": target.TemporaryHitPoints,
				"defeated":             target.Defeated,
				"damage_taken":         target.DamageTaken,
				"healing_received":     target.HealingReceived,
				"death_save_successes": target.DeathSaveSuccesses,
				"death_save_failures":  target.DeathSaveFailures,
				"stable":               target.Stable,
			}).Error; err != nil {
			return err
		}
		if actor.ID != "" {
			if err := tx.Model(&dbmodels.EncounterRunCombatantEntity{}).
				Where("id = ?", actor.ID).
				Updates(map[string]any{
					"damage_dealt": actor.DamageDealt,
					"healing_done": actor.HealingDone,
					"kills":        actor.Kills,
				}).Error; err != nil {
				return err
			}
		}
		entity := dbmodels.CombatLogEventEntity{
			EncounterRunID: strings.TrimSpace(runID),
			EventType:      eventType,
			ActorID:        stringPointer(strings.TrimSpace(actorID)),
			TargetID:       stringPointer(strings.TrimSpace(targetID)),
			Payload:        jsonMap(payload),
		}
		return tx.Create(&entity).Error
	})
}

func (s RunStore) RestoreCombatantState(ctx context.Context, payload map[string]any) error {
	conditions, err := jsonBytes(stringListFromAny(payload["conditions"]))
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).Model(&dbmodels.EncounterRunCombatantEntity{}).
		Where("id = ?", strings.TrimSpace(stringFromAny(payload["id"]))).
		Updates(map[string]any{
			"current_hit_points":   intFromAny(payload["currentHitPoints"]),
			"temporary_hit_points": intFromAny(payload["temporaryHitPoints"]),
			"defeated":             boolFromAny(payload["defeated"]),
			"damage_dealt":         intFromAny(payload["damageDealt"]),
			"damage_taken":         intFromAny(payload["damageTaken"]),
			"healing_done":         intFromAny(payload["healingDone"]),
			"healing_received":     intFromAny(payload["healingReceived"]),
			"kills":                intFromAny(payload["kills"]),
			"death_save_successes": intFromAny(payload["deathSaveSuccesses"]),
			"death_save_failures":  intFromAny(payload["deathSaveFailures"]),
			"stable":               boolFromAny(payload["stable"]),
			"conditions":           conditions,
		}).Error
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
