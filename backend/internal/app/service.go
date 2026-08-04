package app

import (
	"context"
	"errors"
	"strings"

	"bludm/backend/internal/store"

	"gorm.io/gorm"
)

type Service struct {
	stores    *store.Stores
	db        *gorm.DB
	publicURL string
}

func NewService(db *gorm.DB, publicURL string) *Service {
	return &Service{
		stores: store.New(db), db: db, publicURL: strings.TrimRight(publicURL, "/"),
	}
}

func (s *Service) Stores() *store.Stores {
	return s.stores
}

func (s *Service) AppURL(path string) string {
	if s.publicURL == "" {
		return path
	}
	return s.publicURL + "/" + strings.TrimLeft(path, "/")
}

func (s *Service) authorize(
	ctx context.Context,
	campaignID string,
	scopes ...Scope,
) (Principal, error) {
	principal, ok := PrincipalFromContext(ctx)
	if !ok {
		return Principal{}, NewError(CodeUnauthorized, "authentication required", nil)
	}
	if err := Require(principal, campaignID, scopes...); err != nil {
		return Principal{}, err
	}
	if campaignID != "" {
		if _, err := s.stores.Campaigns.ByID(ctx, principal.UserID, campaignID); err != nil {
			return Principal{}, storeError(err, "campaign")
		}
	}
	return principal, nil
}

func storeError(err error, entity string) error {
	if store.IsNotFound(err) {
		return NewError(CodeNotFound, entity+" not found", map[string]any{"entity": entity})
	}
	var domain *DomainError
	if errors.As(err, &domain) {
		return err
	}
	return err
}
