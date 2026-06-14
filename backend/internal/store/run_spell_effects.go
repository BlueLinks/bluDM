package store

import (
	"context"
	"errors"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
)

func (s RunStore) SetTemporaryHP(ctx context.Context, targetID string, amount int) error {
	return s.db.WithContext(ctx).Model(&dbmodels.EncounterRunCombatantEntity{}).
		Where("id = ?", strings.TrimSpace(targetID)).
		Update("temporary_hit_points", amount).Error
}

func (s RunStore) AddMaxHPModifier(ctx context.Context, targetID string, amount int) error {
	return s.db.WithContext(ctx).Model(&dbmodels.EncounterRunCombatantEntity{}).
		Where("id = ?", strings.TrimSpace(targetID)).
		Update("max_hit_points_modifier", gorm.Expr("max_hit_points_modifier + ?", amount)).Error
}

func (s RunStore) ReviveCombatant(ctx context.Context, target models.EncounterRunCombatant) error {
	return s.db.WithContext(ctx).Model(&dbmodels.EncounterRunCombatantEntity{}).
		Where("id = ?", target.ID).
		Updates(map[string]any{
			"current_hit_points":   target.CurrentHitPoints,
			"defeated":             false,
			"death_save_successes": 0,
			"death_save_failures":  0,
			"stable":               false,
		}).Error
}

func (s RunStore) SetConditions(ctx context.Context, targetID string, conditions []string) error {
	conditionBytes, err := jsonBytes(conditions)
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).Model(&dbmodels.EncounterRunCombatantEntity{}).
		Where("id = ?", strings.TrimSpace(targetID)).
		Update("conditions", conditionBytes).Error
}

type ActiveEffectInput struct {
	RunID         string
	CasterID      string
	TargetID      string
	SpellID       string
	LibrarySource string
	SpellName     string
	CastLevel     int
	Concentration bool
	Timing        string
	EffectKind    string
	ConditionName string
	Amount        int
	Payload       map[string]any
}

func (s RunStore) CreateActiveEffect(ctx context.Context, input ActiveEffectInput) error {
	entity := dbmodels.EncounterRunActiveEffectEntity{
		EncounterRunID: strings.TrimSpace(input.RunID),
		CasterID:       strings.TrimSpace(input.CasterID),
		TargetID:       strings.TrimSpace(input.TargetID),
		SpellID:        stringPointer(input.SpellID),
		LibrarySource:  input.LibrarySource,
		SpellName:      input.SpellName,
		CastLevel:      input.CastLevel,
		Concentration:  input.Concentration,
		Timing:         input.Timing,
		EffectKind:     input.EffectKind,
		ConditionName:  input.ConditionName,
		Amount:         input.Amount,
		Payload:        jsonMap(input.Payload),
	}
	return s.db.WithContext(ctx).Create(&entity).Error
}

func (s RunStore) BreakConcentration(ctx context.Context, runID, casterID string) error {
	return s.db.WithContext(ctx).Model(&dbmodels.EncounterRunActiveEffectEntity{}).
		Where("encounter_run_id = ? and caster_id = ? and concentration = true and active = true", strings.TrimSpace(runID), strings.TrimSpace(casterID)).
		Update("active", false).Error
}

func (s RunStore) UnresolvedConcentrationAlertCount(ctx context.Context, runID, casterID string) (int, error) {
	var count int64
	if err := s.db.WithContext(ctx).Model(&dbmodels.EncounterRunAlertEntity{}).
		Where("encounter_run_id = ? and actor_id = ? and alert_type = 'concentration_check' and resolved = false", strings.TrimSpace(runID), strings.TrimSpace(casterID)).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return int(count), nil
}

func (s RunStore) CreateAlert(ctx context.Context, runID, alertType, actorID, targetID, title, message string, dc int, payload map[string]any) error {
	entity := dbmodels.EncounterRunAlertEntity{
		EncounterRunID: strings.TrimSpace(runID),
		AlertType:      alertType,
		ActorID:        stringPointer(strings.TrimSpace(actorID)),
		TargetID:       stringPointer(strings.TrimSpace(targetID)),
		Title:          title,
		Message:        message,
		DC:             dc,
		Payload:        jsonMap(payload),
	}
	return s.db.WithContext(ctx).Create(&entity).Error
}

func (s RunStore) ResolveAlert(ctx context.Context, alertID string) error {
	return s.db.WithContext(ctx).Model(&dbmodels.EncounterRunAlertEntity{}).
		Where("id = ?", strings.TrimSpace(alertID)).
		Update("resolved", true).Error
}

func (s RunStore) ConsumeSpellSlot(ctx context.Context, runID, combatantID string, level int) error {
	result := s.db.WithContext(ctx).Model(&dbmodels.EncounterRunSpellSlotEntity{}).
		Where("encounter_run_id = ? and combatant_id = ? and spell_level = ? and remaining_slots > 0", strings.TrimSpace(runID), strings.TrimSpace(combatantID), level).
		Update("remaining_slots", gorm.Expr("remaining_slots - 1"))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s RunStore) UpdateSpellSlot(ctx context.Context, runID, combatantID string, level int, remainingSlots int) error {
	return s.db.WithContext(ctx).Model(&dbmodels.EncounterRunSpellSlotEntity{}).
		Where("encounter_run_id = ? and combatant_id = ? and spell_level = ?", strings.TrimSpace(runID), strings.TrimSpace(combatantID), level).
		Update("remaining_slots", remainingSlots).Error
}

func (s RunStore) SpellSlot(ctx context.Context, runID, combatantID string, level int) (models.EncounterRunSpellSlot, error) {
	var entity dbmodels.EncounterRunSpellSlotEntity
	err := s.db.WithContext(ctx).
		Where("encounter_run_id = ? and combatant_id = ? and spell_level = ?", strings.TrimSpace(runID), strings.TrimSpace(combatantID), level).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.EncounterRunSpellSlot{}, ErrNotFound
	}
	if err != nil {
		return models.EncounterRunSpellSlot{}, err
	}
	return encounterRunSpellSlotFromEntity(entity), nil
}

func (s RunStore) UpdateEffectPayload(ctx context.Context, effectID string, payload map[string]any) error {
	return s.db.WithContext(ctx).Model(&dbmodels.EncounterRunActiveEffectEntity{}).
		Where("id = ?", strings.TrimSpace(effectID)).
		Update("payload", jsonMap(payload)).Error
}

func (s RunStore) EndSpellArea(ctx context.Context, runID, casterID, spellName, areaEffectID string) error {
	return s.db.WithContext(ctx).Model(&dbmodels.EncounterRunActiveEffectEntity{}).
		Where("encounter_run_id = ? and active = true and caster_id = ? and spell_name = ? and (id = ? or effect_kind in ?)",
			strings.TrimSpace(runID), strings.TrimSpace(casterID), spellName, strings.TrimSpace(areaEffectID), []string{"area_trigger", "battlefield_object", "concentration"}).
		Update("active", false).Error
}

func (s RunStore) SpellcastingAbility(ctx context.Context, creatureID string) (string, error) {
	var entity dbmodels.CreatureSpellcastingProfileEntity
	err := s.db.WithContext(ctx).Where("creature_id = ?", strings.TrimSpace(creatureID)).First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return entity.SpellcastingAbility, nil
}

func (s RunStore) SpellSaveDC(ctx context.Context, creatureID string) (int, error) {
	var entity dbmodels.CreatureSpellcastingProfileEntity
	err := s.db.WithContext(ctx).Where("creature_id = ?", strings.TrimSpace(creatureID)).First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return entity.SpellSaveDC, nil
}
