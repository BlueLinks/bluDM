package app

import (
	"context"
	"strings"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (s *Service) CreateCampaign(
	ctx context.Context,
	command CampaignCreateCommand,
) (CampaignWriteResult, error) {
	principal, err := s.authorize(ctx, "", ScopeCampaignsWrite)
	if err != nil {
		return CampaignWriteResult{}, err
	}
	if principal.CampaignRestrictionMode == "selected" {
		return CampaignWriteResult{}, NewError(
			CodeForbidden, "creating campaigns requires access to all campaigns", nil,
		)
	}
	input, warnings, err := normalizeCampaignCreate(command)
	if err != nil {
		return CampaignWriteResult{}, err
	}
	inputHash, _ := normalizedHash(command)
	var result CampaignWriteResult
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[CampaignWriteResult](
			ctx, tx, principal, "create_campaign", command.IdempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			result = replay
			result.IdempotencyReplay = true
			return nil
		}
		campaign, err := store.New(tx).Campaigns.Create(ctx, principal.UserID, input)
		if err != nil {
			return err
		}
		result = CampaignWriteResult{
			Campaign: campaign,
			AuthoringWriteMetadata: AuthoringWriteMetadata{
				Operation: "created", AppURL: s.AppURL("/campaigns/" + campaign.ID),
				Warnings: warnings,
			},
		}
		return saveIdempotency(
			ctx, tx, principal, "create_campaign", command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func (s *Service) UpdateCampaign(
	ctx context.Context,
	campaignID string,
	command CampaignUpdateCommand,
) (CampaignWriteResult, error) {
	campaignID = strings.TrimSpace(campaignID)
	principal, err := s.authorize(ctx, campaignID, ScopeCampaignsWrite)
	if err != nil {
		return CampaignWriteResult{}, err
	}
	if command.ExpectedUpdatedAt == nil || !campaignUpdateHasChanges(command) {
		return CampaignWriteResult{}, ValidationError(
			"missing_update", "expectedUpdatedAt and at least one campaign field are required", nil,
		)
	}
	inputHash, _ := normalizedHash(command)
	var result CampaignWriteResult
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[CampaignWriteResult](
			ctx, tx, principal, "update_campaign:"+campaignID,
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
		var entity dbmodels.CampaignEntity
		if err := tx.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? and owner_user_id = ? and archived_at is null", campaignID, principal.UserID).
			First(&entity).Error; err != nil {
			return storeError(err, "campaign")
		}
		if !entity.UpdatedAt.Equal(*command.ExpectedUpdatedAt) {
			return NewError(CodeConflict, "campaign changed since it was read", map[string]any{
				"actualUpdatedAt": entity.UpdatedAt,
			})
		}
		input, warnings, err := mergeCampaignUpdate(entity, command)
		if err != nil {
			return err
		}
		campaign, err := store.New(tx).Campaigns.Update(ctx, principal.UserID, campaignID, input)
		if err != nil {
			return storeError(err, "campaign")
		}
		result = CampaignWriteResult{
			Campaign: campaign,
			AuthoringWriteMetadata: AuthoringWriteMetadata{
				Operation: "updated", AppURL: s.AppURL("/campaigns/" + campaign.ID),
				Warnings: warnings,
			},
		}
		return saveIdempotency(
			ctx, tx, principal, "update_campaign:"+campaignID,
			command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func (s *Service) CreatePlayer(
	ctx context.Context,
	campaignID string,
	command PlayerCreateCommand,
) (PlayerWriteResult, error) {
	campaignID = strings.TrimSpace(campaignID)
	principal, err := s.authorize(ctx, campaignID, ScopePartyWrite)
	if err != nil {
		return PlayerWriteResult{}, err
	}
	if campaignID == "" && principal.CampaignRestrictionMode == "selected" {
		return PlayerWriteResult{}, NewError(
			CodeForbidden, "creating an unassigned player requires access to all campaigns", nil,
		)
	}
	input, err := playerCreateInput(campaignID, command)
	if err != nil {
		return PlayerWriteResult{}, err
	}
	inputHash, _ := normalizedHash(command)
	var result PlayerWriteResult
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[PlayerWriteResult](
			ctx, tx, principal, "create_player:"+campaignID,
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
		player, err := store.New(tx).Players.Create(ctx, principal.UserID, input)
		if err != nil {
			return err
		}
		player, err = store.New(tx).Players.ByID(ctx, principal.UserID, player.ID)
		if err != nil {
			return err
		}
		result = playerWriteResult(s, player, "created", nil)
		return saveIdempotency(
			ctx, tx, principal, "create_player:"+campaignID,
			command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func (s *Service) UpdatePlayer(
	ctx context.Context,
	campaignID string,
	playerID string,
	command PlayerUpdateCommand,
) (PlayerWriteResult, error) {
	campaignID = strings.TrimSpace(campaignID)
	principal, err := s.authorize(ctx, "", ScopePartyWrite)
	if err != nil {
		return PlayerWriteResult{}, err
	}
	if campaignID != "" {
		if _, err := s.authorize(ctx, campaignID, ScopePartyWrite); err != nil {
			return PlayerWriteResult{}, err
		}
	} else if principal.CampaignRestrictionMode == "selected" {
		return PlayerWriteResult{}, NewError(CodeForbidden, "token cannot access unassigned players", nil)
	}
	if command.ExpectedUpdatedAt == nil || !playerUpdateHasChanges(command) {
		return PlayerWriteResult{}, ValidationError(
			"missing_update", "expectedUpdatedAt and at least one player field are required", nil,
		)
	}
	inputHash, _ := normalizedHash(command)
	return s.mutatePlayer(ctx, principal, campaignID, playerID, "update_player", command.IdempotencyKey, inputHash,
		func(tx *gorm.DB, source models.Player) (PlayerWriteResult, error) {
			input, err := mergePlayerUpdate(source, command)
			if err != nil {
				return PlayerWriteResult{}, err
			}
			player, err := store.New(tx).Players.Update(ctx, principal.UserID, playerID, input)
			if err != nil {
				return PlayerWriteResult{}, storeError(err, "player")
			}
			return playerWriteResult(s, player, "updated", nil), nil
		}, command.ExpectedUpdatedAt)
}

func (s *Service) MovePlayer(
	ctx context.Context,
	campaignID string,
	playerID string,
	command PlayerMoveCommand,
) (PlayerWriteResult, error) {
	campaignID = strings.TrimSpace(campaignID)
	principal, err := s.authorize(ctx, "", ScopePartyWrite)
	if err != nil {
		return PlayerWriteResult{}, err
	}
	if campaignID != "" {
		if _, err := s.authorize(ctx, campaignID, ScopePartyWrite); err != nil {
			return PlayerWriteResult{}, err
		}
	} else if principal.CampaignRestrictionMode == "selected" {
		return PlayerWriteResult{}, NewError(CodeForbidden, "token cannot access unassigned players", nil)
	}
	destination := strings.TrimSpace(command.DestinationCampaignID)
	if destination == "" && principal.CampaignRestrictionMode == "selected" {
		return PlayerWriteResult{}, NewError(
			CodeForbidden, "moving a player to Unassigned requires access to all campaigns", nil,
		)
	}
	if destination != "" {
		if _, err := s.authorize(ctx, destination, ScopePartyWrite); err != nil {
			return PlayerWriteResult{}, err
		}
	}
	inputHash, _ := normalizedHash(command)
	return s.mutatePlayer(ctx, principal, campaignID, playerID, "move_player", command.IdempotencyKey, inputHash,
		func(tx *gorm.DB, source models.Player) (PlayerWriteResult, error) {
			if source.CampaignID == destination {
				return playerWriteResult(s, source, "unchanged", []string{
					"player is already assigned to the requested campaign",
				}), nil
			}
			player, err := store.New(tx).Players.Move(ctx, principal.UserID, playerID, destination)
			if err != nil {
				return PlayerWriteResult{}, storeError(err, "player or campaign")
			}
			return playerWriteResult(s, player, "moved", nil), nil
		}, command.ExpectedUpdatedAt)
}

func (s *Service) ClonePlayer(
	ctx context.Context,
	campaignID string,
	playerID string,
	command PlayerCloneCommand,
) (PlayerWriteResult, error) {
	campaignID = strings.TrimSpace(campaignID)
	principal, err := s.authorize(ctx, "", ScopePartyWrite)
	if err != nil {
		return PlayerWriteResult{}, err
	}
	if campaignID != "" {
		if _, err := s.authorize(ctx, campaignID, ScopePartyWrite); err != nil {
			return PlayerWriteResult{}, err
		}
	} else if principal.CampaignRestrictionMode == "selected" {
		return PlayerWriteResult{}, NewError(CodeForbidden, "token cannot access unassigned players", nil)
	}
	inputHash, _ := normalizedHash(command)
	return s.mutatePlayer(ctx, principal, campaignID, playerID, "clone_player", command.IdempotencyKey, inputHash,
		func(tx *gorm.DB, _ models.Player) (PlayerWriteResult, error) {
			player, err := store.New(tx).Players.Clone(ctx, principal.UserID, playerID)
			if err != nil {
				return PlayerWriteResult{}, storeError(err, "player")
			}
			return playerWriteResult(s, player, "cloned", nil), nil
		}, command.ExpectedUpdatedAt)
}

func (s *Service) mutatePlayer(
	ctx context.Context,
	principal Principal,
	campaignID string,
	playerID string,
	operation string,
	idempotencyKey string,
	inputHash string,
	mutate func(*gorm.DB, models.Player) (PlayerWriteResult, error),
	expectedUpdatedAt *time.Time,
) (PlayerWriteResult, error) {
	campaignID = strings.TrimSpace(campaignID)
	playerID = strings.TrimSpace(playerID)
	if expectedUpdatedAt == nil {
		return PlayerWriteResult{}, ValidationError(
			"missing_concurrency", "expectedUpdatedAt is required", nil,
		)
	}
	var result PlayerWriteResult
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[PlayerWriteResult](
			ctx, tx, principal, operation+":"+playerID, idempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			result = replay
			result.IdempotencyReplay = true
			return nil
		}
		var entity dbmodels.PlayerEntity
		if err := tx.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? and owner_user_id = ?", playerID, principal.UserID).
			First(&entity).Error; err != nil {
			return storeError(err, "player")
		}
		actualCampaignID := valueFromPointer(entity.CampaignID)
		if actualCampaignID != strings.TrimSpace(campaignID) {
			return NewError(CodeNotFound, "player not found in the supplied campaign", nil)
		}
		if actualCampaignID == "" && principal.CampaignRestrictionMode == "selected" {
			return NewError(CodeForbidden, "token cannot access unassigned players", nil)
		}
		if actualCampaignID != "" && !principal.AllowsCampaign(actualCampaignID) {
			return NewError(CodeForbidden, "token cannot access the player's campaign", map[string]any{
				"campaignId": actualCampaignID,
			})
		}
		if !entity.UpdatedAt.Equal(*expectedUpdatedAt) {
			return NewError(CodeConflict, "player changed since it was read", map[string]any{
				"actualUpdatedAt": entity.UpdatedAt,
			})
		}
		source, err := store.New(tx).Players.ByID(ctx, principal.UserID, playerID)
		if err != nil {
			return storeError(err, "player")
		}
		result, err = mutate(tx, source)
		if err != nil {
			return err
		}
		return saveIdempotency(
			ctx, tx, principal, operation+":"+playerID, idempotencyKey, inputHash, result,
		)
	})
	return result, err
}
