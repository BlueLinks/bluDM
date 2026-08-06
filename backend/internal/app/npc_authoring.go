package app

import (
	"context"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (s *Service) CreateNPC(
	ctx context.Context,
	campaignID string,
	command NPCCommand,
) (NPCWriteResult, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeLibraryWrite)
	if err != nil {
		return NPCWriteResult{}, err
	}
	if err := validateNPC(command); err != nil {
		return NPCWriteResult{}, err
	}
	inputHash, _ := normalizedHash(command)
	var result NPCWriteResult
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[NPCWriteResult](
			ctx, tx, principal, "create_npc", command.IdempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			result = replay
			result.IdempotencyReplay = true
			return nil
		}
		entity := creatureEntity(principal.UserID, command)
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
		disposition := normalizedToken(command.Disposition, "neutral")
		if err := tx.WithContext(ctx).Create(&dbmodels.CampaignCreatureEntity{
			CampaignID: campaignID, CreatureID: entity.ID, Disposition: disposition,
		}).Error; err != nil {
			return err
		}
		actions, spellcasting, err := persistNPCAbilities(ctx, tx, principal, entity.ID, command)
		if err != nil {
			return err
		}
		result = NPCWriteResult{
			Creature: creatureModel(entity), Actions: actions, Spellcasting: spellcasting,
			AuthoringWriteMetadata: AuthoringWriteMetadata{
				Operation: "created", AppURL: s.AppURL("/creatures/" + entity.ID), Warnings: []string{},
			},
		}
		return saveIdempotency(
			ctx, tx, principal, "create_npc", command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func (s *Service) UpdateNPC(
	ctx context.Context,
	campaignID string,
	creatureID string,
	command NPCCommand,
) (NPCWriteResult, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeLibraryWrite)
	if err != nil {
		return NPCWriteResult{}, err
	}
	if err := validateNPC(command); err != nil {
		return NPCWriteResult{}, err
	}
	if command.ExpectedUpdatedAt == nil {
		return NPCWriteResult{}, ValidationError(
			"missing_concurrency", "expectedUpdatedAt is required", nil,
		)
	}
	var entity dbmodels.CreatureEntity
	inputHash, _ := normalizedHash(command)
	var result NPCWriteResult
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[NPCWriteResult](
			ctx, tx, principal, "update_npc:"+creatureID,
			command.IdempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			result = replay
			result.IdempotencyReplay = true
			return nil
		}
		err = tx.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).
			Joins("join campaign_creatures on campaign_creatures.creature_id = creatures.id").
			Where(
				"creatures.id = ? and creatures.owner_user_id = ? and campaign_creatures.campaign_id = ?",
				creatureID, principal.UserID, campaignID,
			).
			First(&entity).Error
		if err != nil {
			return storeError(err, "npc")
		}
		if !entity.UpdatedAt.Equal(*command.ExpectedUpdatedAt) {
			return NewError(CodeConflict, "NPC changed since it was read", map[string]any{
				"actualUpdatedAt": entity.UpdatedAt,
			})
		}
		updated := creatureEntity(principal.UserID, command)
		updated.ID, updated.CreatedAt = entity.ID, entity.CreatedAt
		entity = updated
		if err := tx.WithContext(ctx).Save(&entity).Error; err != nil {
			return err
		}
		actions, spellcasting, err := persistNPCAbilities(ctx, tx, principal, entity.ID, command)
		if err != nil {
			return err
		}
		result = NPCWriteResult{
			Creature: creatureModel(entity), Actions: actions, Spellcasting: spellcasting,
			AuthoringWriteMetadata: AuthoringWriteMetadata{
				Operation: "updated", AppURL: s.AppURL("/creatures/" + entity.ID), Warnings: []string{},
			},
		}
		return saveIdempotency(
			ctx, tx, principal, "update_npc:"+creatureID,
			command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func (s *Service) LinkNPCToLocation(
	ctx context.Context,
	campaignID string,
	command NPCLinkCommand,
) (NPCLinkWriteResult, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeWorldWrite)
	if err != nil {
		return NPCLinkWriteResult{}, err
	}
	inputHash, _ := normalizedHash(command)
	var result NPCLinkWriteResult
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[NPCLinkWriteResult](
			ctx, tx, principal, "link_npc_to_location", command.IdempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			result = replay
			result.IdempotencyReplay = true
			return nil
		}
		if err := locationBelongsToCampaign(ctx, tx, campaignID, command.LocationID); err != nil {
			return err
		}
		var count int64
		if err := tx.WithContext(ctx).Model(&dbmodels.CampaignCreatureEntity{}).
			Where("campaign_id = ? and creature_id = ?", campaignID, command.CreatureID).
			Count(&count).Error; err != nil || count == 0 {
			return ValidationError("unknown_npc", "unknown or cross-campaign NPC ID", nil)
		}
		entity := dbmodels.CampaignNpcLocationLinkEntity{
			CampaignID: campaignID, CreatureID: command.CreatureID,
			LocationID: command.LocationID, LinkType: normalizedToken(command.LinkType, "frequents"),
			Visibility: normalizedToken(command.Visibility, "dm"), Notes: strings.TrimSpace(command.Notes),
		}
		if err := tx.WithContext(ctx).Clauses(clause.OnConflict{
			Columns: []clause.Column{
				{Name: "campaign_id"}, {Name: "creature_id"}, {Name: "location_id"}, {Name: "link_type"},
			},
			DoUpdates: clause.AssignmentColumns([]string{"visibility", "notes", "updated_at"}),
		}).Create(&entity).Error; err != nil {
			return err
		}
		result = NPCLinkWriteResult{
			CampaignNpcLocationLink: npcLinkModel(entity),
			AuthoringWriteMetadata: AuthoringWriteMetadata{
				Operation: "created_or_updated",
				AppURL:    s.AppURL("/campaigns/" + campaignID + "/world/location/" + command.LocationID),
				Warnings:  []string{},
			},
		}
		return saveIdempotency(
			ctx, tx, principal, "link_npc_to_location", command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func validateNPC(command NPCCommand) error {
	if strings.TrimSpace(command.Name) == "" || strings.TrimSpace(command.Size) == "" ||
		strings.TrimSpace(command.CreatureType) == "" || command.ArmorClass <= 0 ||
		command.HitPoints <= 0 {
		return ValidationError(
			"missing_npc_fields", "name, size, type, AC, and HP are required", nil,
		)
	}
	return validateNPCAbilities(command)
}

func creatureEntity(userID string, command NPCCommand) dbmodels.CreatureEntity {
	statBlock := command.StatBlock
	if statBlock == nil {
		statBlock = map[string]any{}
	}
	return dbmodels.CreatureEntity{
		OwnerUserID: userID, Name: strings.TrimSpace(command.Name),
		Description: strings.TrimSpace(command.Description), Size: strings.TrimSpace(command.Size),
		CreatureType: strings.TrimSpace(command.CreatureType),
		Alignment:    strings.TrimSpace(command.Alignment), ArmorClass: command.ArmorClass,
		HitPoints: command.HitPoints, HitDice: strings.TrimSpace(command.HitDice),
		ChallengeRating: strings.TrimSpace(command.ChallengeRating), XP: command.XP,
		AvatarURL: strings.TrimSpace(command.AvatarURL), StatBlock: dbmodels.JSONMap(statBlock),
	}
}

func creatureModel(entity dbmodels.CreatureEntity) models.Creature {
	return models.Creature{
		ID: entity.ID, Name: entity.Name, Description: entity.Description, Size: entity.Size,
		CreatureType: entity.CreatureType, Alignment: entity.Alignment,
		ArmorClass: entity.ArmorClass, HitPoints: entity.HitPoints, HitDice: entity.HitDice,
		ChallengeRating: entity.ChallengeRating, XP: entity.XP, AvatarURL: entity.AvatarURL,
		LibrarySource: "user", StatBlock: map[string]any(entity.StatBlock),
		CreatedAt: entity.CreatedAt, UpdatedAt: entity.UpdatedAt,
	}
}

func npcLinkModel(entity dbmodels.CampaignNpcLocationLinkEntity) models.CampaignNpcLocationLink {
	return models.CampaignNpcLocationLink{
		ID: entity.ID, CampaignID: entity.CampaignID, CreatureID: entity.CreatureID,
		LocationID: entity.LocationID, LinkType: entity.LinkType,
		Visibility: entity.Visibility, Notes: entity.Notes,
		CreatedAt: entity.CreatedAt, UpdatedAt: entity.UpdatedAt,
	}
}
