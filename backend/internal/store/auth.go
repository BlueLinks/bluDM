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
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return ErrNotFound
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		type deleteStep struct {
			statement string
			args      []any
		}
		steps := []deleteStep{
			{
				statement: `delete from sessions where user_id = ?`,
				args:      []any{userID},
			},
			{
				statement: `delete from api_tokens where user_id = ?`,
				args:      []any{userID},
			},
			{
				statement: `delete from auth_identities where user_id = ?`,
				args:      []any{userID},
			},
			{
				statement: `delete from oauth_states where user_id = ?`,
				args:      []any{userID},
			},
			{
				statement: `delete from encounter_run_spell_slots where encounter_run_id in (
				select encounter_runs.id
				from encounter_runs
				join encounters on encounters.id = encounter_runs.encounter_id
				join campaigns on campaigns.id = encounters.campaign_id
				where campaigns.owner_user_id = ?
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from encounter_run_active_effects where encounter_run_id in (
				select encounter_runs.id
				from encounter_runs
				join encounters on encounters.id = encounter_runs.encounter_id
				join campaigns on campaigns.id = encounters.campaign_id
				where campaigns.owner_user_id = ?
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from encounter_run_alerts where encounter_run_id in (
				select encounter_runs.id
				from encounter_runs
				join encounters on encounters.id = encounter_runs.encounter_id
				join campaigns on campaigns.id = encounters.campaign_id
				where campaigns.owner_user_id = ?
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from combat_log_events where encounter_run_id in (
				select encounter_runs.id
				from encounter_runs
				join encounters on encounters.id = encounter_runs.encounter_id
				join campaigns on campaigns.id = encounters.campaign_id
				where campaigns.owner_user_id = ?
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from encounter_run_combatants where encounter_run_id in (
				select encounter_runs.id
				from encounter_runs
				join encounters on encounters.id = encounter_runs.encounter_id
				join campaigns on campaigns.id = encounters.campaign_id
				where campaigns.owner_user_id = ?
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from encounter_runs where encounter_id in (
				select encounters.id
				from encounters
				join campaigns on campaigns.id = encounters.campaign_id
				where campaigns.owner_user_id = ?
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from encounter_combatants where encounter_id in (
				select encounters.id
				from encounters
				join campaigns on campaigns.id = encounters.campaign_id
				where campaigns.owner_user_id = ?
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from encounters where campaign_id in (
				select id from campaigns where owner_user_id = ?
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from roll_table_rows where table_id in (
				select roll_tables.id
				from roll_tables
				join campaigns on campaigns.id = roll_tables.campaign_id
				where campaigns.owner_user_id = ?
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from roll_tables where campaign_id in (
				select id from campaigns where owner_user_id = ?
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from campaign_journeys where campaign_id in (
				select id from campaigns where owner_user_id = ?
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from campaign_locations where campaign_id in (
				select id from campaigns where owner_user_id = ?
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from campaign_creatures where campaign_id in (
				select id from campaigns where owner_user_id = ?
			) or creature_id in (
				select id from creatures where owner_user_id = ?
			)`,
				args: []any{userID, userID},
			},
			{
				statement: `delete from players where owner_user_id = ?`,
				args:      []any{userID},
			},
			{
				statement: `delete from creature_action_roll_parts where creature_action_id in (
				select id from creature_actions where creature_id in (
					select id from creatures where owner_user_id = ?
				)
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from creature_actions where creature_id in (
				select id from creatures where owner_user_id = ?
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from creature_spellcasting_profiles where creature_id in (
				select id from creatures where owner_user_id = ?
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from creature_spells where creature_id in (
				select id from creatures where owner_user_id = ?
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from creatures where owner_user_id = ?`,
				args:      []any{userID},
			},
			{
				statement: `delete from spell_action_roll_parts where spell_action_id in (
				select id from spell_actions where spell_id in (
					select id from spells where owner_user_id = ?
				)
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from spell_actions where spell_id in (
				select id from spells where owner_user_id = ?
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from spell_projectile_scaling where spell_id in (
				select id from spells where owner_user_id = ?
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from spells where owner_user_id = ?`,
				args:      []any{userID},
			},
			{
				statement: `delete from action_template_roll_parts where action_template_id in (
				select id from action_templates where owner_user_id = ?
			)`,
				args: []any{userID},
			},
			{
				statement: `delete from action_templates where owner_user_id = ?`,
				args:      []any{userID},
			},
			{
				statement: `delete from items where owner_user_id = ?`,
				args:      []any{userID},
			},
			{
				statement: `delete from uploaded_assets where owner_user_id = ?`,
				args:      []any{userID},
			},
			{
				statement: `delete from campaigns where owner_user_id = ?`,
				args:      []any{userID},
			},
		}
		for _, step := range steps {
			if err := tx.Exec(step.statement, step.args...).Error; err != nil {
				return err
			}
		}
		result := tx.Where("id = ?", userID).Delete(&dbmodels.UserEntity{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrNotFound
		}
		return nil
	})
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
