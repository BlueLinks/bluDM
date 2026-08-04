package app

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"strings"
	"time"

	dbmodels "bludm/backend/internal/db"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (s *Service) PreviewCampaignChanges(
	ctx context.Context,
	campaignID string,
	command CampaignChangesCommand,
) (CampaignChangesPreview, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeContentImport)
	if err != nil {
		return CampaignChangesPreview{}, err
	}
	if len(command.Changes) == 0 || len(command.Changes) > 100 {
		return CampaignChangesPreview{}, ValidationError(
			"invalid_change_count", "changes must contain between 1 and 100 operations", nil,
		)
	}
	normalizedChanges, err := s.validateCampaignChanges(ctx, principal, campaignID, command.Changes)
	if err != nil {
		return CampaignChangesPreview{}, err
	}
	hash, err := normalizedHash(normalizedChanges)
	if err != nil {
		return CampaignChangesPreview{}, err
	}
	token := randomPreviewToken()
	tokenHash := sha256.Sum256([]byte(token))
	expires := time.Now().Add(10 * time.Minute)
	operations, err := jsonMap(map[string]any{"changes": normalizedChanges})
	if err != nil {
		return CampaignChangesPreview{}, err
	}
	result := CampaignChangesPreview{
		PreviewToken: token, ExpiresAt: expires, Changes: normalizedChanges,
		Warnings: []string{"Review the normalized operations before applying this exact preview token."},
	}
	resultMap, _ := jsonMap(result)
	err = s.db.WithContext(ctx).Create(&dbmodels.AuthoringPreviewEntity{
		TokenHash: hex.EncodeToString(tokenHash[:]), PrincipalKey: principal.Key(),
		CampaignID: campaignID, OperationsHash: hash, Operations: operations,
		EntityVersions: dbmodels.JSONMap{}, Result: resultMap, ExpiresAt: expires,
	}).Error
	return result, err
}

func (s *Service) ApplyCampaignChanges(
	ctx context.Context,
	campaignID string,
	command CampaignChangesCommand,
) (AppliedCampaignChanges, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeContentImport)
	if err != nil {
		return AppliedCampaignChanges{}, err
	}
	if command.PreviewToken == "" {
		return AppliedCampaignChanges{}, ValidationError("missing_preview_token", "previewToken is required", nil)
	}
	tokenHash := sha256.Sum256([]byte(command.PreviewToken))
	inputHash, _ := normalizedHash(command)
	result := AppliedCampaignChanges{}
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[AppliedCampaignChanges](
			ctx, tx, principal, "apply_campaign_changes", command.IdempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			result = replay
			result.IdempotencyReplay = true
			return nil
		}
		var preview dbmodels.AuthoringPreviewEntity
		err = tx.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("token_hash = ?", hex.EncodeToString(tokenHash[:])).
			First(&preview).Error
		if errors.Is(err, gorm.ErrRecordNotFound) || preview.ExpiresAt.Before(time.Now()) {
			return NewError(CodeNotFound, "preview token is invalid or expired", nil)
		}
		if err != nil {
			return err
		}
		if preview.AppliedAt != nil {
			return NewError(CodeConflict, "preview token was already applied", nil)
		}
		if preview.PrincipalKey != principal.Key() || preview.CampaignID != campaignID {
			return NewError(CodeForbidden, "preview token belongs to another principal or campaign", nil)
		}
		var envelope struct {
			Changes []CampaignChange `json:"changes"`
		}
		if err := decodeMap(preview.Operations, &envelope); err != nil {
			return err
		}
		hash, _ := normalizedHash(envelope.Changes)
		if hash != preview.OperationsHash {
			return NewError(CodeConflict, "preview operations failed integrity validation", nil)
		}
		if len(command.Changes) > 0 {
			providedHash, _ := normalizedHash(command.Changes)
			if providedHash != hash {
				return NewError(CodeConflict, "changes differ from the approved preview", nil)
			}
		}
		outputs := make([]any, 0, len(envelope.Changes))
		refs := map[string]resolvedChangeReference{}
		for _, change := range envelope.Changes {
			output, err := s.applyCampaignChangeTx(ctx, tx, principal, campaignID, change, refs)
			if err != nil {
				return err
			}
			outputs = append(outputs, output)
		}
		now := time.Now()
		if err := tx.WithContext(ctx).Model(&preview).Update("applied_at", now).Error; err != nil {
			return err
		}
		result = AppliedCampaignChanges{
			Applied: true, Operations: outputs, OperationCount: len(outputs),
			Operation: "updated", AppURL: s.AppURL("/campaigns/" + campaignID + "/world"),
			Warnings: []string{},
		}
		return saveIdempotency(
			ctx, tx, principal, "apply_campaign_changes", command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func validateCampaignChange(principal Principal, change CampaignChange) error {
	switch change.Operation {
	case "create_location", "link_npc_to_location", "create_location_link":
		return Require(principal, "", ScopeWorldWrite)
	case "create_npc":
		return Require(principal, "", ScopeLibraryWrite)
	default:
		return ValidationError("unsupported_operation", "unsupported campaign change operation", map[string]any{
			"operation": change.Operation,
		})
	}
}

func CampaignChangeScopes(changes []CampaignChange) []Scope {
	scopes := []Scope{ScopeContentImport}
	world, library := false, false
	for _, change := range changes {
		switch strings.ReplaceAll(normalizedToken(change.Operation, ""), "-", "_") {
		case "create_location", "link_npc_to_location", "create_location_link":
			world = true
		case "create_npc":
			library = true
		}
	}
	if world {
		scopes = append(scopes, ScopeWorldWrite)
	}
	if library {
		scopes = append(scopes, ScopeLibraryWrite)
	}
	return scopes
}

func decodeChange[T any](change CampaignChange, target *T) error {
	data, err := json.Marshal(change.Data)
	if err != nil {
		return err
	}
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return ValidationError(
			"invalid_change_schema", "change data does not match the operation schema",
			map[string]any{"error": err.Error()},
		)
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		return ValidationError("invalid_change_schema", "change data must contain one JSON object", nil)
	}
	return nil
}

func randomPreviewToken() string {
	data := make([]byte, 32)
	if _, err := rand.Read(data); err != nil {
		sum := sha256.Sum256([]byte(time.Now().String()))
		data = sum[:]
	}
	return base64.RawURLEncoding.EncodeToString(data)
}
