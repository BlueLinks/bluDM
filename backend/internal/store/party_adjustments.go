package store

import (
	"context"
	"errors"
	"strconv"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PartyAdjustmentInput struct {
	TargetIDs              []string
	Kind                   string
	Amount                 int
	ActorID                string
	SlotLevel              int
	ConsumeSpellSlot       bool
	AdjustCurrentHitPoints bool
}

func (s PlayerStore) ApplyPartyAdjustment(
	ctx context.Context,
	ownerUserID string,
	campaignID string,
	input PartyAdjustmentInput,
) ([]models.Player, error) {
	var adjusted []models.Player
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureCampaignOwnedTx(ctx, tx, ownerUserID, campaignID); err != nil {
			return err
		}
		entities, byID, err := partyAdjustmentTargets(ctx, tx, ownerUserID, campaignID, input.TargetIDs)
		if err != nil {
			return err
		}
		var actor *dbmodels.PlayerEntity
		if strings.TrimSpace(input.ActorID) != "" {
			actor, err = partyAdjustmentActor(ctx, tx, ownerUserID, campaignID, input.ActorID, byID)
			if err != nil {
				return err
			}
		}
		if input.ConsumeSpellSlot {
			if actor == nil {
				return errors.New("spell slot use requires a caster")
			}
			if err := consumePlayerSpellSlot(actor, input.SlotLevel); err != nil {
				return err
			}
			if err := tx.Save(actor).Error; err != nil {
				return err
			}
		}
		adjusted = make([]models.Player, 0, len(entities))
		for index := range entities {
			applyPartyVitals(&entities[index], input)
			if err := tx.Save(&entities[index]).Error; err != nil {
				return err
			}
			adjusted = append(adjusted, playerFromEntity(entities[index]))
		}
		return nil
	})
	return adjusted, err
}

func partyAdjustmentTargets(
	ctx context.Context,
	tx *gorm.DB,
	ownerUserID string,
	campaignID string,
	targetIDs []string,
) ([]dbmodels.PlayerEntity, map[string]*dbmodels.PlayerEntity, error) {
	var entities []dbmodels.PlayerEntity
	err := tx.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where(
			"owner_user_id = ? and campaign_id = ? and id in ?",
			ownerUserID,
			strings.TrimSpace(campaignID),
			targetIDs,
		).
		Find(&entities).Error
	if err != nil {
		return nil, nil, err
	}
	if len(entities) != len(targetIDs) {
		return nil, nil, ErrNotFound
	}
	byID := make(map[string]*dbmodels.PlayerEntity, len(entities))
	for index := range entities {
		byID[entities[index].ID] = &entities[index]
	}
	return entities, byID, nil
}

func partyAdjustmentActor(
	ctx context.Context,
	tx *gorm.DB,
	ownerUserID string,
	campaignID string,
	actorID string,
	loaded map[string]*dbmodels.PlayerEntity,
) (*dbmodels.PlayerEntity, error) {
	if actor := loaded[strings.TrimSpace(actorID)]; actor != nil {
		return actor, nil
	}
	var actor dbmodels.PlayerEntity
	err := tx.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where(
			"owner_user_id = ? and campaign_id = ? and id = ?",
			ownerUserID,
			strings.TrimSpace(campaignID),
			strings.TrimSpace(actorID),
		).
		First(&actor).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	return &actor, err
}

func applyPartyVitals(entity *dbmodels.PlayerEntity, input PartyAdjustmentInput) {
	amount := max(0, input.Amount)
	switch input.Kind {
	case "damage":
		temporaryDamage := min(entity.TemporaryHitPoints, amount)
		entity.TemporaryHitPoints -= temporaryDamage
		entity.CurrentHitPoints = max(0, entity.CurrentHitPoints-(amount-temporaryDamage))
	case "healing":
		entity.CurrentHitPoints = min(
			partyEffectiveMaxHitPoints(*entity),
			entity.CurrentHitPoints+amount,
		)
	case "temporary_hit_points", "inspiring_leader":
		entity.TemporaryHitPoints = max(entity.TemporaryHitPoints, amount)
	case "temporary_max_hit_points":
		entity.TemporaryMaxHitPoints += amount
		if input.AdjustCurrentHitPoints {
			entity.CurrentHitPoints += amount
		}
	case "aid":
		before := entity.TemporaryMaxHitPoints
		entity.TemporaryMaxHitPoints = max(before, amount)
		entity.CurrentHitPoints = min(
			partyEffectiveMaxHitPoints(*entity),
			entity.CurrentHitPoints+entity.TemporaryMaxHitPoints-before,
		)
	}
}

func partyEffectiveMaxHitPoints(entity dbmodels.PlayerEntity) int {
	return max(1, entity.MaxHitPoints+entity.TemporaryMaxHitPoints)
}

func consumePlayerSpellSlot(entity *dbmodels.PlayerEntity, level int) error {
	if level < 1 || level > 9 {
		return errors.New("choose a spell slot level from 1 to 9")
	}
	sheet := map[string]any(entity.CharacterSheet)
	maximum := numericMap(sheet["spellSlots"])
	remaining := numericMap(sheet["spellSlotsRemaining"])
	key := strconv.Itoa(level)
	available := remaining[key]
	if _, tracked := remaining[key]; !tracked {
		available = maximum[key]
	}
	if available <= 0 {
		return errors.New("no spell slot available at that level")
	}
	remaining[key] = available - 1
	sheet["spellSlotsRemaining"] = remaining
	entity.CharacterSheet = dbmodels.JSONMap(sheet)
	return nil
}

func numericMap(value any) map[string]int {
	result := map[string]int{}
	switch mapped := value.(type) {
	case map[string]any:
		for key, raw := range mapped {
			result[key] = intFromAny(raw)
		}
	case dbmodels.JSONMap:
		for key, raw := range mapped {
			result[key] = intFromAny(raw)
		}
	}
	return result
}
