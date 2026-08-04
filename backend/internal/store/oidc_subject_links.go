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

type OIDCSubjectLink struct {
	ID        string    `json:"id"`
	Issuer    string    `json:"issuer"`
	Subject   string    `json:"subject"`
	CreatedAt time.Time `json:"createdAt"`
}

func (s AuthStore) LinkOIDCSubject(
	ctx context.Context,
	userID string,
	issuer string,
	subject string,
) error {
	userID = strings.TrimSpace(userID)
	issuer = strings.TrimRight(strings.TrimSpace(issuer), "/")
	subject = strings.TrimSpace(subject)
	if userID == "" || issuer == "" || subject == "" {
		return errors.New("user, issuer, and subject are required")
	}
	return s.db.WithContext(ctx).Create(&dbmodels.OIDCSubjectLinkEntity{
		UserID:  userID,
		Issuer:  issuer,
		Subject: subject,
	}).Error
}

func (s AuthStore) ListOIDCSubjectLinks(
	ctx context.Context,
	userID string,
) ([]OIDCSubjectLink, error) {
	var entities []dbmodels.OIDCSubjectLinkEntity
	if err := s.db.WithContext(ctx).
		Where("user_id = ?", strings.TrimSpace(userID)).
		Order("created_at desc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	result := make([]OIDCSubjectLink, 0, len(entities))
	for _, entity := range entities {
		result = append(result, OIDCSubjectLink{
			ID: entity.ID, Issuer: entity.Issuer, Subject: entity.Subject,
			CreatedAt: entity.CreatedAt,
		})
	}
	return result, nil
}

func (s AuthStore) DeleteOIDCSubjectLink(ctx context.Context, userID, linkID string) error {
	result := s.db.WithContext(ctx).
		Where("id = ? and user_id = ?", strings.TrimSpace(linkID), strings.TrimSpace(userID)).
		Delete(&dbmodels.OIDCSubjectLinkEntity{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s AuthStore) UserByOIDCSubject(
	ctx context.Context,
	issuer string,
	subject string,
) (models.User, error) {
	var user dbmodels.UserEntity
	err := s.db.WithContext(ctx).
		Table("users").
		Select("users.*").
		Joins("join oidc_subject_links on oidc_subject_links.user_id = users.id").
		Where(
			"oidc_subject_links.issuer = ? and oidc_subject_links.subject = ?",
			strings.TrimRight(strings.TrimSpace(issuer), "/"),
			strings.TrimSpace(subject),
		).
		First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.User{}, ErrNotFound
	}
	if err != nil {
		return models.User{}, err
	}
	return userFromEntity(user), nil
}
