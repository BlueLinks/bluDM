package app

import (
	"context"
	"time"

	dbmodels "bludm/backend/internal/db"
)

type AuditRecord struct {
	RequestID         string
	Operation         string
	CampaignID        string
	TargetEntityID    string
	RequiredScopes    []Scope
	Authorization     string
	ResultClass       string
	IdempotencyReplay bool
	EncounterRevision int
	GeneratorVersion  string
	Seed              string
	Duration          time.Duration
}

func (s *Service) RecordAudit(
	ctx context.Context,
	principal Principal,
	record AuditRecord,
) error {
	if s == nil || s.db == nil {
		return nil
	}
	scopes := map[string]any{"scopes": ScopeStrings(record.RequiredScopes)}
	tokenID := optionalID(principal.TokenID)
	return s.db.WithContext(ctx).Create(&dbmodels.ExternalAuditRecordEntity{
		RequestID: record.RequestID, UserID: principal.UserID, TokenID: tokenID,
		Authentication: string(principal.AuthenticationMethod),
		ClientName:     principal.Audit["clientName"], Operation: record.Operation,
		CampaignID: optionalID(record.CampaignID), TargetEntityID: optionalID(record.TargetEntityID),
		RequiredScopes: scopes, Authorization: record.Authorization,
		ResultClass: record.ResultClass, IdempotencyReplay: record.IdempotencyReplay,
		EncounterRevision: record.EncounterRevision, GeneratorVersion: record.GeneratorVersion,
		Seed: record.Seed, DurationMS: record.Duration.Milliseconds(),
	}).Error
}
