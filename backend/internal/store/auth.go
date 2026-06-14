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

var (
	ErrOAuthEmailAlreadyRegistered = errors.New("email is already registered")
	ErrOAuthIdentityAlreadyLinked  = errors.New("oauth identity is already linked")
)

type AuthStore struct {
	db *gorm.DB
}

func (s AuthStore) HasUser(ctx context.Context) (bool, error) {
	var count int64
	if err := s.db.WithContext(ctx).Model(&dbmodels.UserEntity{}).Limit(1).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s AuthStore) CreateUser(ctx context.Context, email, passwordHash string) (models.User, error) {
	user := dbmodels.UserEntity{
		Email:        strings.TrimSpace(strings.ToLower(email)),
		PasswordHash: passwordHash,
	}
	if err := s.db.WithContext(ctx).Create(&user).Error; err != nil {
		return models.User{}, err
	}
	return userFromEntity(user), nil
}

func (s AuthStore) UserByEmail(ctx context.Context, email string) (models.User, error) {
	var user dbmodels.UserEntity
	err := s.db.WithContext(ctx).
		Where("email = ?", strings.TrimSpace(strings.ToLower(email))).
		First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.User{}, ErrNotFound
	}
	if err != nil {
		return models.User{}, err
	}
	return userFromEntity(user), nil
}

func (s AuthStore) UserBySessionToken(ctx context.Context, tokenHash string) (models.User, error) {
	var user dbmodels.UserEntity
	err := s.db.WithContext(ctx).
		Joins("join sessions on sessions.user_id = users.id").
		Where("sessions.token_hash = ? and sessions.expires_at > ?", tokenHash, time.Now()).
		First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.User{}, ErrNotFound
	}
	if err != nil {
		return models.User{}, err
	}
	return userFromEntity(user), nil
}

func (s AuthStore) FindOrCreateOAuthUser(ctx context.Context, provider, subject, email string, emailVerified bool) (models.User, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	var user dbmodels.UserEntity
	err := s.db.WithContext(ctx).
		Joins("join auth_identities on auth_identities.user_id = users.id").
		Where("auth_identities.provider = ? and auth_identities.provider_subject = ?", provider, subject).
		First(&user).Error
	if err == nil {
		_ = s.db.WithContext(ctx).
			Model(&dbmodels.AuthIdentityEntity{}).
			Where("provider = ? and provider_subject = ?", provider, subject).
			Updates(map[string]any{
				"email":          email,
				"email_verified": emailVerified,
				"last_login_at":  time.Now(),
			}).Error
		return userFromEntity(user), nil
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return models.User{}, err
	}

	if existing, err := s.UserByEmail(ctx, email); err == nil && existing.ID != "" {
		return models.User{}, ErrOAuthEmailAlreadyRegistered
	} else if err != nil && !IsNotFound(err) {
		return models.User{}, err
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		user = dbmodels.UserEntity{Email: email}
		if err := tx.Create(&user).Error; err != nil {
			return err
		}
		identity := dbmodels.AuthIdentityEntity{
			UserID:          user.ID,
			Provider:        provider,
			ProviderSubject: subject,
			Email:           email,
			EmailVerified:   emailVerified,
			LastLoginAt:     time.Now(),
		}
		return tx.Create(&identity).Error
	})
	if err != nil {
		return models.User{}, err
	}
	return userFromEntity(user), nil
}

func (s AuthStore) StartSession(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error {
	return s.db.WithContext(ctx).Create(&dbmodels.SessionEntity{
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt,
	}).Error
}

func (s AuthStore) DeleteSession(ctx context.Context, tokenHash string) error {
	return s.db.WithContext(ctx).Where("token_hash = ?", tokenHash).Delete(&dbmodels.SessionEntity{}).Error
}

func (s AuthStore) DeleteUser(ctx context.Context, userID string) error {
	return s.db.WithContext(ctx).Where("id = ?", userID).Delete(&dbmodels.UserEntity{}).Error
}

func userFromEntity(user dbmodels.UserEntity) models.User {
	return models.User{
		ID:            user.ID,
		Email:         user.Email,
		PasswordHash:  user.PasswordHash,
		AvatarAssetID: stringFromPointer(user.AvatarAssetID),
		AvatarURL:     user.AvatarURL,
		CreatedAt:     user.CreatedAt,
	}
}
