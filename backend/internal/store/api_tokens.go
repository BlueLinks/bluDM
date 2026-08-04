package store

import (
	"context"
	"errors"
	"slices"
	"strings"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

type APITokenCreateInput struct {
	UserID                  string
	Name                    string
	TokenHash               string
	TokenPrefix             string
	Scopes                  []string
	CampaignRestrictionMode string
	AllowedCampaignIDs      []string
	AuthenticationVersion   int
	ExpiresAt               *time.Time
}

type APITokenAuthentication struct {
	User  models.User
	Token models.APIToken
}

func (s AuthStore) CreateAPIToken(
	ctx context.Context,
	userID string,
	name string,
	tokenHash string,
	tokenPrefix string,
	expiresAt *time.Time,
) (models.APIToken, error) {
	return s.CreateScopedAPIToken(ctx, APITokenCreateInput{
		UserID:                  userID,
		Name:                    name,
		TokenHash:               tokenHash,
		TokenPrefix:             tokenPrefix,
		CampaignRestrictionMode: "legacy_all",
		AuthenticationVersion:   1,
		ExpiresAt:               expiresAt,
	})
}

func (s AuthStore) CreateScopedAPIToken(
	ctx context.Context,
	input APITokenCreateInput,
) (models.APIToken, error) {
	entity := dbmodels.APITokenEntity{
		UserID:                  strings.TrimSpace(input.UserID),
		Name:                    strings.TrimSpace(input.Name),
		TokenHash:               input.TokenHash,
		TokenPrefix:             input.TokenPrefix,
		Scopes:                  pq.StringArray(normalizedStrings(input.Scopes)),
		CampaignRestrictionMode: strings.TrimSpace(input.CampaignRestrictionMode),
		AuthenticationVersion:   input.AuthenticationVersion,
		ExpiresAt:               input.ExpiresAt,
	}
	if entity.CampaignRestrictionMode == "" {
		entity.CampaignRestrictionMode = "all"
	}
	if entity.AuthenticationVersion == 0 {
		entity.AuthenticationVersion = 2
	}
	var token models.APIToken
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&entity).Error; err != nil {
			return err
		}
		for _, campaignID := range normalizedStrings(input.AllowedCampaignIDs) {
			var count int64
			if err := tx.Model(&dbmodels.CampaignEntity{}).
				Where("id = ? and owner_user_id = ?", campaignID, entity.UserID).
				Count(&count).Error; err != nil {
				return err
			}
			if count == 0 {
				return ErrNotFound
			}
			if err := tx.Create(&dbmodels.APITokenCampaignEntity{
				TokenID: entity.ID, CampaignID: campaignID,
			}).Error; err != nil {
				return err
			}
		}
		token = apiTokenFromEntity(entity)
		token.AllowedCampaignIDs = normalizedStrings(input.AllowedCampaignIDs)
		return nil
	})
	return token, err
}

func (s AuthStore) ListAPITokens(ctx context.Context, userID string) ([]models.APIToken, error) {
	var entities []dbmodels.APITokenEntity
	if err := s.db.WithContext(ctx).
		Where("user_id = ? and revoked_at is null", strings.TrimSpace(userID)).
		Order("created_at desc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	tokens := make([]models.APIToken, 0, len(entities))
	for _, entity := range entities {
		token := apiTokenFromEntity(entity)
		token.AllowedCampaignIDs, _ = s.allowedCampaignIDs(ctx, entity.ID)
		tokens = append(tokens, token)
	}
	return tokens, nil
}

func (s AuthStore) DeleteAPIToken(ctx context.Context, userID, tokenID string) error {
	result := s.db.WithContext(ctx).
		Model(&dbmodels.APITokenEntity{}).
		Where("id = ? and user_id = ?", strings.TrimSpace(tokenID), strings.TrimSpace(userID)).
		Update("revoked_at", time.Now())
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s AuthStore) UserByAPITokenHash(ctx context.Context, tokenHash string) (models.User, error) {
	result, err := s.AuthenticateAPIToken(ctx, tokenHash)
	return result.User, err
}

func (s AuthStore) AuthenticateAPIToken(
	ctx context.Context,
	tokenHash string,
) (APITokenAuthentication, error) {
	var token dbmodels.APITokenEntity
	err := s.db.WithContext(ctx).
		Where("token_hash = ? and revoked_at is null and (expires_at is null or expires_at > ?)", tokenHash, time.Now()).
		First(&token).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return APITokenAuthentication{}, ErrNotFound
	}
	if err != nil {
		return APITokenAuthentication{}, err
	}

	var user dbmodels.UserEntity
	if err := s.db.WithContext(ctx).Where("id = ?", token.UserID).First(&user).Error; err != nil {
		return APITokenAuthentication{}, err
	}
	now := time.Now()
	_ = s.db.WithContext(ctx).
		Model(&dbmodels.APITokenEntity{}).
		Where("id = ?", token.ID).
		Update("last_used_at", now).Error
	modelToken := apiTokenFromEntity(token)
	modelToken.AllowedCampaignIDs, _ = s.allowedCampaignIDs(ctx, token.ID)
	return APITokenAuthentication{User: userFromEntity(user), Token: modelToken}, nil
}

func apiTokenFromEntity(entity dbmodels.APITokenEntity) models.APIToken {
	return models.APIToken{
		ID:                      entity.ID,
		Name:                    entity.Name,
		TokenPrefix:             entity.TokenPrefix,
		Scopes:                  append([]string(nil), entity.Scopes...),
		CampaignRestrictionMode: entity.CampaignRestrictionMode,
		AuthenticationVersion:   entity.AuthenticationVersion,
		LastUsedAt:              entity.LastUsedAt,
		ExpiresAt:               entity.ExpiresAt,
		RevokedAt:               entity.RevokedAt,
		CreatedAt:               entity.CreatedAt,
	}
}

func (s AuthStore) allowedCampaignIDs(ctx context.Context, tokenID string) ([]string, error) {
	var ids []string
	err := s.db.WithContext(ctx).
		Model(&dbmodels.APITokenCampaignEntity{}).
		Where("token_id = ?", tokenID).
		Order("campaign_id asc").
		Pluck("campaign_id", &ids).Error
	return ids, err
}

func normalizedStrings(values []string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" && !slices.Contains(result, value) {
			result = append(result, value)
		}
	}
	slices.Sort(result)
	return result
}
