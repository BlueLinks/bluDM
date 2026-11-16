package store

import (
	"context"
	"errors"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrRunNotSetup = errors.New("party setup is only available before combat begins")
var ErrPlayerAlreadyAdded = errors.New("player is already in this run")

// Setup changes affect this run's snapshot, leaving the authored encounter and
// character sheets intact until the normal end-of-run writeback.
func (s RunStore) UpdateSetupParty(ctx context.Context, ownerID, runID, action, targetID string) (models.EncounterRun, error) {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		run, err := runEntityForOwner(ctx, tx, ownerID, runID)
		if err != nil {
			return err
		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&run, "id = ?", run.ID).Error; err != nil {
			return err
		}
		if run.Status != "setup" {
			return ErrRunNotSetup
		}
		switch action {
		case "add-player":
			return s.addSetupPlayer(ctx, tx, ownerID, run, strings.TrimSpace(targetID))
		case "remove-player":
			return removeSetupPlayer(tx, run.ID, strings.TrimSpace(targetID))
		case "heal-party":
			return tx.Model(&dbmodels.EncounterRunCombatantEntity{}).
				Where("encounter_run_id = ? and source_type = 'player'", run.ID).
				Updates(map[string]any{
					"current_hit_points":          gorm.Expr("case when max_hit_points_override > 0 then max_hit_points_override else greatest(1, max_hit_points + max_hit_points_modifier) end"),
					"current_hit_points_override": 0,
					"defeated":                    false, "death_save_successes": 0, "death_save_failures": 0, "stable": false,
				}).Error
		default:
			return ErrNotFound
		}
	})
	if err != nil {
		return models.EncounterRun{}, err
	}
	return s.ByID(ctx, ownerID, runID)
}

func (s RunStore) addSetupPlayer(ctx context.Context, tx *gorm.DB, ownerID string, run dbmodels.EncounterRunEntity, playerID string) error {
	player, err := (PlayerStore{db: tx}).ByID(ctx, ownerID, playerID)
	if err != nil {
		return err
	}
	encounter, err := encounterEntityForOwner(ctx, tx, ownerID, run.EncounterID)
	if err != nil {
		return err
	}
	if player.CampaignID != encounter.CampaignID {
		return ErrNotFound
	}
	var count int64
	if err := tx.Model(&dbmodels.EncounterRunCombatantEntity{}).
		Where("encounter_run_id = ? and player_id = ?", run.ID, player.ID).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return ErrPlayerAlreadyAdded
	}
	var nextOrder int
	if err := tx.Model(&dbmodels.EncounterRunCombatantEntity{}).
		Where("encounter_run_id = ?", run.ID).
		Select("coalesce(max(sort_order) + 1, 0)").Scan(&nextOrder).Error; err != nil {
		return err
	}
	entity := dbmodels.EncounterRunCombatantEntity{
		EncounterRunID: run.ID, SourceType: "player", PlayerID: &player.ID, Side: "player",
		DisplayName: player.CharacterName, AvatarURL: assetOrExternalURL(player.AvatarAssetID, player.AvatarURL),
		ArmorClass: player.ArmorClass, MaxHitPoints: player.MaxHitPoints, CurrentHitPoints: player.CurrentHitPoints,
		TemporaryHitPoints: player.TemporaryHitPoints, MaxHitPointsModifier: player.TemporaryMaxHitPoints,
		SortOrder: nextOrder, Snapshot: jsonMap(map[string]any{"player": map[string]any(structJSONMap(player))}),
	}
	if err := tx.Create(&entity).Error; err != nil {
		return err
	}
	return s.snapshotCombatantSpellSlots(ctx, tx, run.ID, []dbmodels.EncounterRunCombatantEntity{entity})
}

func removeSetupPlayer(tx *gorm.DB, runID, combatantID string) error {
	var entity dbmodels.EncounterRunCombatantEntity
	err := tx.Where("encounter_run_id = ? and id = ? and source_type = 'player'", runID, combatantID).First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if err := tx.Where("combatant_id = ?", entity.ID).Delete(&dbmodels.EncounterRunSpellSlotEntity{}).Error; err != nil {
		return err
	}
	return tx.Delete(&entity).Error
}
