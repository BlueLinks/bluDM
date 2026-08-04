package store

import (
	"context"

	dbmodels "bludm/backend/internal/db"

	"gorm.io/gorm"
)

func recordEncounterRevision(
	ctx context.Context,
	tx *gorm.DB,
	encounter dbmodels.EncounterEntity,
	actorUserID string,
	reason string,
) error {
	var combatants []dbmodels.EncounterCombatantEntity
	if err := tx.WithContext(ctx).
		Where("encounter_id = ?", encounter.ID).
		Order("sort_order asc, created_at asc").
		Find(&combatants).Error; err != nil {
		return err
	}
	return tx.WithContext(ctx).Create(&dbmodels.EncounterRevisionEntity{
		EncounterID: encounter.ID, Revision: encounter.Revision,
		Snapshot: dbmodels.JSONMap{
			"encounter": encounter, "combatants": combatants,
		},
		GenerationInput: dbmodels.JSONMap{}, GenerationOutput: dbmodels.JSONMap{},
		ChangeReason: reason, ActorUserID: actorUserID,
	}).Error
}
