package store

import (
	"bludm/backend/internal/models"
	"context"
	"strings"

	dbmodels "bludm/backend/internal/db"

	"gorm.io/gorm"
)

type ResolutionResourceUpdate struct {
	CombatantID string
	SpellLevel  int
	Before      int
	Remaining   int
}

func (s RunStore) SaveResolutionAndLog(
	ctx context.Context,
	runID string,
	eventType string,
	actorID string,
	targetID string,
	combatants []models.EncounterRunCombatant,
	resource *ResolutionResourceUpdate,
	payload map[string]any,
) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, combatant := range combatants {
			conditions, err := jsonBytes(combatant.Conditions)
			if err != nil {
				return err
			}
			if err := tx.Model(&dbmodels.EncounterRunCombatantEntity{}).
				Where("encounter_run_id = ? and id = ?", strings.TrimSpace(runID), combatant.ID).
				Updates(map[string]any{
					"current_hit_points":   combatant.CurrentHitPoints,
					"temporary_hit_points": combatant.TemporaryHitPoints,
					"defeated":             combatant.Defeated,
					"conditions":           conditions,
					"damage_dealt":         combatant.DamageDealt,
					"damage_taken":         combatant.DamageTaken,
					"healing_done":         combatant.HealingDone,
					"healing_received":     combatant.HealingReceived,
					"kills":                combatant.Kills,
					"death_save_successes": combatant.DeathSaveSuccesses,
					"death_save_failures":  combatant.DeathSaveFailures,
					"stable":               combatant.Stable,
				}).Error; err != nil {
				return err
			}
		}

		if resource != nil {
			result := tx.Model(&dbmodels.EncounterRunSpellSlotEntity{}).
				Where(
					"encounter_run_id = ? and combatant_id = ? and spell_level = ? and remaining_slots = ?",
					strings.TrimSpace(runID),
					strings.TrimSpace(resource.CombatantID),
					resource.SpellLevel,
					resource.Before,
				).
				Update("remaining_slots", resource.Remaining)
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected == 0 {
				return ErrNotFound
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
