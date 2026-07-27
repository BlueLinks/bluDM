package store

import (
	"context"
	"errors"
	"strings"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
)

func (s AuthStore) CreateAPIToken(
	ctx context.Context,
	userID string,
	name string,
	tokenHash string,
	tokenPrefix string,
	expiresAt *time.Time,
) (models.APIToken, error) {
	entity := dbmodels.APITokenEntity{
		UserID:      strings.TrimSpace(userID),
		Name:        strings.TrimSpace(name),
		TokenHash:   tokenHash,
		TokenPrefix: tokenPrefix,
		ExpiresAt:   expiresAt,
	}
	if err := s.db.WithContext(ctx).Create(&entity).Error; err != nil {
		return models.APIToken{}, err
	}
	return apiTokenFromEntity(entity), nil
}

func (s AuthStore) ListAPITokens(ctx context.Context, userID string) ([]models.APIToken, error) {
	var entities []dbmodels.APITokenEntity
	if err := s.db.WithContext(ctx).
		Where("user_id = ?", strings.TrimSpace(userID)).
		Order("created_at desc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	tokens := make([]models.APIToken, 0, len(entities))
	for _, entity := range entities {
		tokens = append(tokens, apiTokenFromEntity(entity))
	}
	return tokens, nil
}

func (s AuthStore) DeleteAPIToken(ctx context.Context, userID, tokenID string) error {
	result := s.db.WithContext(ctx).
		Where("id = ? and user_id = ?", strings.TrimSpace(tokenID), strings.TrimSpace(userID)).
		Delete(&dbmodels.APITokenEntity{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s AuthStore) UserByAPITokenHash(ctx context.Context, tokenHash string) (models.User, error) {
	var token dbmodels.APITokenEntity
	err := s.db.WithContext(ctx).
		Where("token_hash = ? and (expires_at is null or expires_at > ?)", tokenHash, time.Now()).
		First(&token).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.User{}, ErrNotFound
	}
	if err != nil {
		return models.User{}, err
	}

	var user dbmodels.UserEntity
	if err := s.db.WithContext(ctx).Where("id = ?", token.UserID).First(&user).Error; err != nil {
		return models.User{}, err
	}
	now := time.Now()
	_ = s.db.WithContext(ctx).
		Model(&dbmodels.APITokenEntity{}).
		Where("id = ?", token.ID).
		Update("last_used_at", now).Error
	return userFromEntity(user), nil
}

func apiTokenFromEntity(entity dbmodels.APITokenEntity) models.APIToken {
	return models.APIToken{
		ID:          entity.ID,
		Name:        entity.Name,
		TokenPrefix: entity.TokenPrefix,
		LastUsedAt:  entity.LastUsedAt,
		ExpiresAt:   entity.ExpiresAt,
		CreatedAt:   entity.CreatedAt,
	}
}
