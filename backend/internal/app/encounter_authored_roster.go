package app

import (
	"context"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"

	"gorm.io/gorm"
)

func (s *Service) replaceAuthoredRoster(
	ctx context.Context,
	tx *gorm.DB,
	principal Principal,
	campaignID string,
	encounterID string,
	commands []EncounterCombatantCommand,
) (int, error) {
	campaign, err := s.stores.Campaigns.ByID(ctx, principal.UserID, campaignID)
	if err != nil {
		return 0, err
	}
	enemies := 0
	for index, command := range commands {
		combatant, err := s.authoredCombatant(
			ctx, principal, campaign, encounterID, index, command,
		)
		if err != nil {
			return 0, err
		}
		if combatant.Side == "enemy" {
			enemies++
		}
		if err := tx.WithContext(ctx).Create(&combatant).Error; err != nil {
			return 0, err
		}
	}
	return enemies, nil
}

func (s *Service) authoredCombatant(
	ctx context.Context,
	principal Principal,
	campaign models.Campaign,
	encounterID string,
	sortOrder int,
	command EncounterCombatantCommand,
) (dbmodels.EncounterCombatantEntity, error) {
	switch command.SourceType {
	case "player":
		player, err := s.stores.Players.ByID(ctx, principal.UserID, command.PlayerID)
		if err != nil || player.CampaignID != campaign.ID {
			return dbmodels.EncounterCombatantEntity{}, ValidationError(
				"unknown_player", "unknown or cross-campaign player ID", nil,
			)
		}
		return playerCombatant(encounterID, player, sortOrder)
	case "creature":
		creature, err := s.stores.Creatures.ByID(ctx, principal.UserID, command.CreatureID)
		if store.IsNotFound(err) {
			creature, err = s.stores.Creatures.StandardByID(ctx, command.CreatureID)
			if err == nil && !stringAllowed(creature.SourceKey, campaign.AllowedStandardSources) {
				err = store.ErrNotFound
			}
		}
		if err != nil {
			return dbmodels.EncounterCombatantEntity{}, ValidationError(
				"unknown_creature", "unknown or unavailable creature ID", nil,
			)
		}
		combatant, err := generatedCombatant(
			encounterID, creature, sortOrder, "", "", 0,
		)
		if err == nil {
			err = s.enrichCreatureSnapshot(ctx, principal, creature, &combatant)
		}
		delete(combatant.Snapshot, "authoringOrigin")
		delete(combatant.Snapshot, "generationBatchId")
		delete(combatant.Snapshot, "generatorVersion")
		delete(combatant.Snapshot, "seed")
		combatant.Side = canonicalAuthoredCombatantSide(command.SourceType, command.Side)
		combatant.RolledHP = command.RolledHP
		return combatant, err
	case "inline":
		snapshot := dbmodels.JSONMap(command.Snapshot)
		if snapshot == nil {
			snapshot = dbmodels.JSONMap{}
		}
		return dbmodels.EncounterCombatantEntity{
			EncounterID: encounterID, SourceType: "inline",
			Side:        canonicalAuthoredCombatantSide(command.SourceType, command.Side),
			DisplayName: command.DisplayName, AvatarURL: command.AvatarURL,
			ColorLabel: "neutral", ArmorClass: max(1, command.ArmorClass),
			MaxHitPoints:     max(1, command.MaxHitPoints),
			CurrentHitPoints: max(1, command.CurrentHitPoints),
			RolledHP:         command.RolledHP, SortOrder: sortOrder, Snapshot: snapshot,
		}, nil
	default:
		return dbmodels.EncounterCombatantEntity{}, ValidationError(
			"unsupported_source_type", "sourceType must be player, creature, or inline", nil,
		)
	}
}

// The external authoring API describes encounter allegiance as enemy/ally,
// while combat setup uses player/friendly/enemy groups. Persist the latter so
// authored combatants are immediately usable by the browser combat workflow.
func canonicalAuthoredCombatantSide(sourceType, side string) string {
	if normalizedToken(sourceType, "") == "player" {
		return "player"
	}
	if normalizedToken(side, "") == "ally" {
		return "friendly"
	}
	return normalizedToken(side, "")
}
