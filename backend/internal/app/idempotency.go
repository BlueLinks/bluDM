package app

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	dbmodels "bludm/backend/internal/db"

	"gorm.io/gorm"
)

func normalizedHash(value any) (string, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:]), nil
}

func decodeMap[T any](value dbmodels.JSONMap, target *T) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, target)
}

func jsonMap(value any) (dbmodels.JSONMap, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	result := dbmodels.JSONMap{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, err
	}
	return result, nil
}

func idempotencyReplay[T any](
	ctx context.Context,
	tx *gorm.DB,
	principal Principal,
	operation string,
	key string,
	inputHash string,
) (T, bool, error) {
	var zero T
	if key != strings.TrimSpace(key) || len(key) < 8 || len(key) > 256 {
		return zero, false, ValidationError(
			"invalid_idempotency_key",
			"idempotency key must be 8-256 non-whitespace-padded characters",
			nil,
		)
	}
	lockKey, err := normalizedHash([]string{principal.Key(), operation, key})
	if err != nil {
		return zero, false, err
	}
	if err := tx.WithContext(ctx).
		Exec("select pg_advisory_xact_lock(hashtextextended(?, 0))", lockKey).Error; err != nil {
		return zero, false, err
	}
	var record dbmodels.IdempotencyRecordEntity
	err = tx.WithContext(ctx).
		Where(
			"principal_key = ? and operation = ? and idempotency_key = ? and expires_at > ?",
			principal.Key(), operation, key, time.Now(),
		).
		First(&record).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return zero, false, nil
	}
	if err != nil {
		return zero, false, err
	}
	if record.InputHash != inputHash {
		return zero, false, NewError(
			CodeIdempotencyConflict,
			"the idempotency key was already used with different input",
			map[string]any{"operation": operation},
		)
	}
	if err := decodeMap(record.Response, &zero); err != nil {
		return zero, false, err
	}
	return zero, true, nil
}

func saveIdempotency(
	ctx context.Context,
	tx *gorm.DB,
	principal Principal,
	operation string,
	key string,
	inputHash string,
	response any,
) error {
	value, err := jsonMap(response)
	if err != nil {
		return err
	}
	return tx.WithContext(ctx).Create(&dbmodels.IdempotencyRecordEntity{
		PrincipalKey: principal.Key(), Operation: operation, IdempotencyKey: key,
		InputHash: inputHash, Response: value, ExpiresAt: time.Now().Add(24 * time.Hour),
	}).Error
}
