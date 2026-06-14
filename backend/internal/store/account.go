package store

import (
	"context"
	"errors"
	"strings"
	"time"

	dbmodels "bludm/backend/internal/db"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type AccountIdentity struct {
	Provider      string `json:"provider"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"emailVerified"`
	CreatedAt     string `json:"createdAt"`
	LastLoginAt   string `json:"lastLoginAt"`
}

type Account struct {
	Email         string            `json:"email"`
	AvatarAssetID string            `json:"avatarAssetId,omitempty"`
	AvatarURL     string            `json:"avatarUrl"`
	HasPassword   bool              `json:"hasPassword"`
	Identities    []AccountIdentity `json:"identities"`
	Stats         AccountStats      `json:"stats"`
}

type AccountStats struct {
	Campaigns        int `json:"campaigns"`
	PlayerCharacters int `json:"playerCharacters"`
	Creatures        int `json:"creatures"`
	Spells           int `json:"spells"`
	ActionTemplates  int `json:"actionTemplates"`
	Encounters       int `json:"encounters"`
}

type OAuthIdentityInput struct {
	Subject       string
	Email         string
	EmailVerified bool
}

type OAuthStateInput struct {
	StateHash    string
	Provider     string
	Nonce        string
	PKCEVerifier string
	Purpose      string
	UserID       string
	ReturnTo     string
	ExpiresAt    time.Time
}

type OAuthState struct {
	Provider string
	Nonce    string
	Verifier string
	ReturnTo string
	Purpose  string
	UserID   string
}

func (s AuthStore) Account(ctx context.Context, userID string) (Account, error) {
	var user dbmodels.UserEntity
	err := s.db.WithContext(ctx).Where("id = ?", userID).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return Account{}, ErrNotFound
	}
	if err != nil {
		return Account{}, err
	}

	account := Account{
		Email:         user.Email,
		AvatarAssetID: stringFromPointer(user.AvatarAssetID),
		AvatarURL:     user.AvatarURL,
		HasPassword:   user.PasswordHash != "",
		Identities:    []AccountIdentity{},
	}
	if err := s.accountStats(ctx, userID, &account.Stats); err != nil {
		return Account{}, err
	}

	rows, err := s.db.WithContext(ctx).
		Model(&dbmodels.AuthIdentityEntity{}).
		Select("provider, email, email_verified, created_at::text as created_at, last_login_at::text as last_login_at").
		Where("user_id = ?", userID).
		Order("provider").
		Rows()
	if err != nil {
		return Account{}, err
	}
	defer rows.Close()

	for rows.Next() {
		var identity AccountIdentity
		if err := rows.Scan(
			&identity.Provider,
			&identity.Email,
			&identity.EmailVerified,
			&identity.CreatedAt,
			&identity.LastLoginAt,
		); err != nil {
			return Account{}, err
		}
		account.Identities = append(account.Identities, identity)
	}
	return account, rows.Err()
}

func (s AuthStore) accountStats(ctx context.Context, userID string, stats *AccountStats) error {
	var count int64
	if err := s.db.WithContext(ctx).Model(&dbmodels.CampaignEntity{}).Where("owner_user_id = ?", userID).Count(&count).Error; err != nil {
		return err
	}
	stats.Campaigns = int(count)
	if err := s.db.WithContext(ctx).Model(&dbmodels.PlayerEntity{}).Where("owner_user_id = ?", userID).Count(&count).Error; err != nil {
		return err
	}
	stats.PlayerCharacters = int(count)
	if err := s.db.WithContext(ctx).Model(&dbmodels.CreatureEntity{}).Where("owner_user_id = ?", userID).Count(&count).Error; err != nil {
		return err
	}
	stats.Creatures = int(count)
	if err := s.db.WithContext(ctx).Model(&dbmodels.SpellEntity{}).Where("owner_user_id = ?", userID).Count(&count).Error; err != nil {
		return err
	}
	stats.Spells = int(count)
	if err := s.db.WithContext(ctx).Model(&dbmodels.ActionTemplateEntity{}).Where("owner_user_id = ?", userID).Count(&count).Error; err != nil {
		return err
	}
	stats.ActionTemplates = int(count)
	if err := s.db.WithContext(ctx).
		Model(&dbmodels.EncounterEntity{}).
		Joins("join campaigns on campaigns.id = encounters.campaign_id").
		Where("campaigns.owner_user_id = ?", userID).
		Count(&count).Error; err != nil {
		return err
	}
	stats.Encounters = int(count)
	return nil
}

func (s AuthStore) SetPassword(ctx context.Context, userID, passwordHash string) error {
	result := s.db.WithContext(ctx).
		Model(&dbmodels.UserEntity{}).
		Where("id = ?", userID).
		Update("password_hash", passwordHash)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s AuthStore) UpdateAvatar(ctx context.Context, userID, avatarAssetID, avatarURL string) error {
	result := s.db.WithContext(ctx).
		Model(&dbmodels.UserEntity{}).
		Where("id = ?", userID).
		Updates(map[string]any{
			"avatar_asset_id": stringPointer(avatarAssetID),
			"avatar_url":      avatarURL,
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s AuthStore) UnlinkIdentity(ctx context.Context, userID, provider string) error {
	result := s.db.WithContext(ctx).
		Where("user_id = ? and provider = ?", userID, provider).
		Delete(&dbmodels.AuthIdentityEntity{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s AuthStore) LinkOAuthIdentity(ctx context.Context, userID, provider string, identity OAuthIdentityInput) error {
	identity.Email = strings.TrimSpace(strings.ToLower(identity.Email))
	var linked dbmodels.AuthIdentityEntity
	err := s.db.WithContext(ctx).
		Where("provider = ? and provider_subject = ?", provider, identity.Subject).
		First(&linked).Error
	if err == nil && linked.UserID != userID {
		return ErrOAuthIdentityAlreadyLinked
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	var existing dbmodels.AuthIdentityEntity
	err = s.db.WithContext(ctx).
		Where("user_id = ? and provider = ?", userID, provider).
		First(&existing).Error
	if err == nil && existing.ProviderSubject != identity.Subject {
		return errors.New("this account already has a different identity for that provider")
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	if linked.ID != "" {
		return s.db.WithContext(ctx).
			Model(&dbmodels.AuthIdentityEntity{}).
			Where("id = ?", linked.ID).
			Updates(map[string]any{
				"email":          identity.Email,
				"email_verified": identity.EmailVerified,
				"last_login_at":  time.Now(),
			}).Error
	}
	return s.db.WithContext(ctx).Create(&dbmodels.AuthIdentityEntity{
		UserID:          userID,
		Provider:        provider,
		ProviderSubject: identity.Subject,
		Email:           identity.Email,
		EmailVerified:   identity.EmailVerified,
		LastLoginAt:     time.Now(),
	}).Error
}

func (s AuthStore) CleanupExpiredOAuthStates(ctx context.Context) error {
	return s.db.WithContext(ctx).
		Where("expires_at < ?", time.Now()).
		Delete(&dbmodels.OAuthStateEntity{}).Error
}

func (s AuthStore) CreateOAuthState(ctx context.Context, input OAuthStateInput) error {
	state := dbmodels.OAuthStateEntity{
		StateHash:    input.StateHash,
		Provider:     input.Provider,
		Nonce:        input.Nonce,
		PKCEVerifier: input.PKCEVerifier,
		Purpose:      input.Purpose,
		UserID:       stringPointer(input.UserID),
		ReturnTo:     input.ReturnTo,
		ExpiresAt:    input.ExpiresAt,
	}
	return s.db.WithContext(ctx).Create(&state).Error
}

func (s AuthStore) ConsumeOAuthState(ctx context.Context, stateHash string) (OAuthState, error) {
	var state dbmodels.OAuthStateEntity
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("state_hash = ? and expires_at > ?", stateHash, time.Now()).
			First(&state).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}
		return tx.Delete(&state).Error
	})
	if err != nil {
		return OAuthState{}, err
	}
	return OAuthState{
		Provider: state.Provider,
		Nonce:    state.Nonce,
		Verifier: state.PKCEVerifier,
		ReturnTo: state.ReturnTo,
		Purpose:  state.Purpose,
		UserID:   stringFromPointer(state.UserID),
	}, nil
}
