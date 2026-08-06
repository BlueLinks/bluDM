package store

import (
	"context"
	"strconv"
	"strings"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
)

func (s RunStore) StartEncounter(ctx context.Context, ownerUserID, encounterID string, test bool) (models.EncounterRun, error) {
	if _, err := encounterEntityForOwner(ctx, s.db, ownerUserID, encounterID); err != nil {
		return models.EncounterRun{}, err
	}
	var run dbmodels.EncounterRunEntity
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		run = dbmodels.EncounterRunEntity{
			EncounterID: strings.TrimSpace(encounterID),
			Status:      "setup",
			IsTest:      test,
			StartedAt:   time.Now(),
		}
		if err := tx.Create(&run).Error; err != nil {
			return err
		}
		if err := s.snapshotRunCombatants(ctx, tx, run.ID, encounterID); err != nil {
			return err
		}
		return s.snapshotRunSpellSlots(ctx, tx, run.ID)
	})
	if err != nil {
		return models.EncounterRun{}, err
	}
	return s.ByID(ctx, ownerUserID, run.ID)
}

func (s RunStore) EndRun(ctx context.Context, run models.EncounterRun, summary map[string]any, xpAwards map[string]int) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&dbmodels.EncounterRunEntity{}).
			Where("id = ?", run.ID).
			Updates(map[string]any{"status": "ended", "ended_at": gorm.Expr("now()"), "summary": jsonMap(summary)}).Error; err != nil {
			return err
		}
		if run.IsTest {
			return nil
		}
		if err := tx.Model(&dbmodels.EncounterEntity{}).Where("id = ?", run.EncounterID).Update("status", "completed").Error; err != nil {
			return err
		}
		remainingSlotsByCombatant := map[string]map[string]int{}
		for _, slot := range run.SpellSlots {
			if remainingSlotsByCombatant[slot.CombatantID] == nil {
				remainingSlotsByCombatant[slot.CombatantID] = map[string]int{}
			}
			remainingSlotsByCombatant[slot.CombatantID][strconv.Itoa(slot.SpellLevel)] = slot.RemainingSlots
		}
		for _, combatant := range run.Combatants {
			if combatant.SourceType != "player" || combatant.PlayerID == "" {
				continue
			}
			remainingSlots := remainingSlotsByCombatant[combatant.ID]
			if remainingSlots == nil {
				remainingSlots = map[string]int{}
			}
			if err := tx.Model(&dbmodels.PlayerEntity{}).
				Where("id = ?", combatant.PlayerID).
				Updates(map[string]any{
					"current_hit_points":   combatant.CurrentHitPoints,
					"temporary_hit_points": combatant.TemporaryHitPoints,
					"experience_points":    gorm.Expr("experience_points + ?", xpAwards[combatant.PlayerID]),
					"character_sheet":      gorm.Expr("jsonb_set(coalesce(character_sheet, '{}'::jsonb), '{spellSlotsRemaining}', ?::jsonb, true)", jsonMapFromInts(remainingSlots)),
				}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (s RunStore) UpdateDeathSave(ctx context.Context, combatant models.EncounterRunCombatant) error {
	return s.db.WithContext(ctx).Model(&dbmodels.EncounterRunCombatantEntity{}).
		Where("id = ?", combatant.ID).
		Updates(map[string]any{
			"death_save_successes": combatant.DeathSaveSuccesses,
			"death_save_failures":  combatant.DeathSaveFailures,
			"stable":               combatant.Stable,
		}).Error
}

func (s RunStore) snapshotRunCombatants(ctx context.Context, tx *gorm.DB, runID string, encounterID string) error {
	var sources []dbmodels.EncounterCombatantEntity
	if err := tx.WithContext(ctx).Where("encounter_id = ?", strings.TrimSpace(encounterID)).Order("sort_order asc").Find(&sources).Error; err != nil {
		return err
	}
	for _, source := range sources {
		avatarURL := source.AvatarURL
		if strings.TrimSpace(avatarURL) == "" {
			avatarURL = s.snapshotAvatarURL(ctx, tx, source)
		}
		entity := dbmodels.EncounterRunCombatantEntity{
			EncounterRunID:    runID,
			SourceCombatantID: &source.ID,
			SourceType:        source.SourceType,
			PlayerID:          source.PlayerID,
			CreatureID:        source.CreatureID,
			Side:              canonicalCombatantSide(source.SourceType, source.Side),
			DisplayName:       source.DisplayName,
			ColorLabel:        source.ColorLabel,
			AvatarURL:         avatarURL,
			ArmorClass:        source.ArmorClass,
			MaxHitPoints:      source.MaxHitPoints,
			CurrentHitPoints:  source.CurrentHitPoints,
			SortOrder:         source.SortOrder,
			Snapshot:          source.Snapshot,
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	return nil
}

func (s RunStore) snapshotRunSpellSlots(ctx context.Context, tx *gorm.DB, runID string) error {
	var combatants []dbmodels.EncounterRunCombatantEntity
	if err := tx.WithContext(ctx).Where("encounter_run_id = ?", runID).Find(&combatants).Error; err != nil {
		return err
	}
	for _, combatant := range combatants {
		maxSlots := map[string]any{}
		remaining := map[string]any(nil)
		if combatant.SourceType == "player" {
			sheet := sourceMapFromSnapshot(map[string]any(combatant.Snapshot))
			maxSlots = mapFromAny(sheet["spellSlots"])
			remaining = mapFromAny(sheet["spellSlotsRemaining"])
		} else if combatant.CreatureID != nil {
			var profile dbmodels.CreatureSpellcastingProfileEntity
			err := tx.WithContext(ctx).Where("creature_id = ?", *combatant.CreatureID).First(&profile).Error
			if err == nil {
				maxSlots = map[string]any(profile.Slots)
			}
		}
		for level := 1; level <= 9; level++ {
			levelKey := strconv.Itoa(level)
			count := intFromAny(maxSlots[levelKey])
			if count <= 0 {
				continue
			}
			remainingSlots := count
			if remaining != nil {
				remainingSlots = minInt(maxInt(0, intFromAny(remaining[levelKey])), count)
			}
			entity := dbmodels.EncounterRunSpellSlotEntity{
				EncounterRunID: runID,
				CombatantID:    combatant.ID,
				SpellLevel:     level,
				MaxSlots:       count,
				RemainingSlots: remainingSlots,
			}
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

func (s RunStore) snapshotAvatarURL(ctx context.Context, tx *gorm.DB, source dbmodels.EncounterCombatantEntity) string {
	if source.SourceType == "player" && source.PlayerID != nil {
		var player dbmodels.PlayerEntity
		if err := tx.WithContext(ctx).Where("id = ?", *source.PlayerID).First(&player).Error; err == nil {
			return assetOrExternalURL(stringFromPointer(player.ImageAssetID), player.AvatarURL)
		}
	}
	if source.CreatureID != nil {
		var creature dbmodels.CreatureEntity
		if err := tx.WithContext(ctx).Where("id = ?", *source.CreatureID).First(&creature).Error; err == nil {
			return assetOrExternalURL(stringFromPointer(creature.ImageAssetID), creature.AvatarURL)
		}
	}
	return ""
}

func assetOrExternalURL(assetID, externalURL string) string {
	if strings.TrimSpace(assetID) != "" {
		return "/api/assets/" + strings.TrimSpace(assetID)
	}
	return strings.TrimSpace(externalURL)
}

func sourceMapFromSnapshot(snapshot map[string]any) map[string]any {
	for _, key := range []string{"player", "creature"} {
		if source, ok := snapshot[key].(map[string]any); ok {
			if sheet, ok := source["characterSheet"].(map[string]any); ok {
				return sheet
			}
			if block, ok := source["statBlock"].(map[string]any); ok {
				return block
			}
			return source
		}
	}
	return snapshot
}

func mapFromAny(value any) map[string]any {
	if mapped, ok := value.(map[string]any); ok {
		return mapped
	}
	return nil
}

func jsonMapFromInts(values map[string]int) dbmodels.JSONMap {
	mapped := dbmodels.JSONMap{}
	for key, value := range values {
		mapped[key] = value
	}
	return mapped
}

func minInt(left, right int) int {
	if left < right {
		return left
	}
	return right
}

func maxInt(left, right int) int {
	if left > right {
		return left
	}
	return right
}
