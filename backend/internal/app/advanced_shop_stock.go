package app

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ShopStockPreview struct {
	PreviewToken string                         `json:"previewToken"`
	ExpiresAt    time.Time                      `json:"expiresAt"`
	Stock        []ShopStockCommand             `json:"stock"`
	Existing     []models.CampaignLocationStock `json:"existing"`
	Warnings     []string                       `json:"warnings"`
}

func (s *Service) PreviewShopStockChanges(
	ctx context.Context,
	campaignID string,
	command ShopStockChangesCommand,
) (ShopStockPreview, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeWorldWrite, ScopeLibraryRead)
	if err != nil {
		return ShopStockPreview{}, err
	}
	normalized, err := s.validateShopStock(ctx, principal, campaignID, command.Stock)
	if err != nil {
		return ShopStockPreview{}, err
	}
	hash, _ := normalizedHash(normalized)
	token := randomPreviewToken()
	tokenHash := sha256.Sum256([]byte(token))
	expiresAt := time.Now().Add(10 * time.Minute)
	existing, err := s.stores.Travel.LocationStockForCampaign(
		ctx, principal.UserID, campaignID,
	)
	if err != nil {
		return ShopStockPreview{}, err
	}
	result := ShopStockPreview{
		PreviewToken: token, ExpiresAt: expiresAt, Stock: normalized, Existing: existing,
		Warnings: []string{"Applying will upsert matching location, item, and source rows; it will not delete unmentioned stock."},
	}
	operations, _ := jsonMap(map[string]any{"stock": normalized})
	resultMap, _ := jsonMap(result)
	err = s.db.WithContext(ctx).Create(&dbmodels.AuthoringPreviewEntity{
		TokenHash: hex.EncodeToString(tokenHash[:]), PrincipalKey: principal.Key(),
		CampaignID: campaignID, OperationsHash: hash, Operations: operations,
		EntityVersions: dbmodels.JSONMap{}, Result: resultMap, ExpiresAt: expiresAt,
	}).Error
	return result, err
}

func (s *Service) ApplyShopStockChanges(
	ctx context.Context,
	campaignID string,
	command ShopStockChangesCommand,
) (AppliedShopStockChanges, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeWorldWrite, ScopeLibraryRead)
	if err != nil {
		return AppliedShopStockChanges{}, err
	}
	if strings.TrimSpace(command.PreviewToken) == "" ||
		strings.TrimSpace(command.IdempotencyKey) == "" {
		return AppliedShopStockChanges{}, ValidationError(
			"missing_write_guard",
			"previewToken and idempotencyKey are required",
			nil,
		)
	}
	tokenHash := sha256.Sum256([]byte(command.PreviewToken))
	inputHash, _ := normalizedHash(command)
	result := AppliedShopStockChanges{}
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[AppliedShopStockChanges](
			ctx, tx, principal, "apply_shop_stock_changes", command.IdempotencyKey, inputHash,
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
			Stock []ShopStockCommand `json:"stock"`
		}
		if err := decodeMap(preview.Operations, &envelope); err != nil {
			return err
		}
		hash, _ := normalizedHash(envelope.Stock)
		if hash != preview.OperationsHash {
			return NewError(CodeConflict, "preview operations failed integrity validation", nil)
		}
		provided, err := s.validateShopStock(ctx, principal, campaignID, command.Stock)
		if err != nil {
			return err
		}
		providedHash, _ := normalizedHash(provided)
		if providedHash != hash {
			return NewError(CodeConflict, "stock differs from the approved preview", nil)
		}
		applied := make([]models.CampaignLocationStock, 0, len(envelope.Stock))
		for _, stock := range envelope.Stock {
			entity, err := upsertShopStockTx(ctx, tx, campaignID, stock)
			if err != nil {
				return err
			}
			applied = append(applied, shopStockModel(entity))
		}
		now := time.Now()
		if err := tx.WithContext(ctx).Model(&preview).Update("applied_at", now).Error; err != nil {
			return err
		}
		result = AppliedShopStockChanges{
			Applied: true, Stock: applied, OperationCount: len(applied),
			Operation: "updated", AppURL: s.AppURL("/campaigns/" + campaignID + "/world"),
			Warnings: []string{},
		}
		return saveIdempotency(
			ctx, tx, principal, "apply_shop_stock_changes", command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func (s *Service) validateShopStock(
	ctx context.Context,
	principal Principal,
	campaignID string,
	input []ShopStockCommand,
) ([]ShopStockCommand, error) {
	if len(input) == 0 || len(input) > 100 {
		return nil, ValidationError(
			"invalid_stock_count", "stock must contain between 1 and 100 rows", nil,
		)
	}
	campaign, err := s.stores.Campaigns.ByID(ctx, principal.UserID, campaignID)
	if err != nil {
		return nil, storeError(err, "campaign")
	}
	locations, err := s.stores.Travel.LocationsForCampaign(ctx, principal.UserID, campaignID)
	if err != nil {
		return nil, err
	}
	locationIDs := make(map[string]bool, len(locations))
	for _, location := range locations {
		locationIDs[location.ID] = true
	}
	normalized := make([]ShopStockCommand, 0, len(input))
	seen := map[string]bool{}
	for index, row := range input {
		row.LocationID = strings.TrimSpace(row.LocationID)
		row.ItemID = strings.TrimSpace(row.ItemID)
		row.LibrarySource = normalizedToken(row.LibrarySource, "user")
		row.PriceUnit = normalizedToken(row.PriceUnit, "gp")
		row.Availability = normalizedToken(row.Availability, "in-stock")
		row.Notes = strings.TrimSpace(row.Notes)
		if row.Quantity < 1 {
			row.Quantity = 1
		}
		if row.PriceAmount < 0 {
			return nil, ValidationError(
				"invalid_stock_price", "priceAmount cannot be negative", map[string]any{"row": index},
			)
		}
		if !locationIDs[row.LocationID] {
			return nil, NewError(
				CodeNotFound, "location not found", map[string]any{"row": index},
			)
		}
		switch row.LibrarySource {
		case "user":
			if _, err := s.stores.Items.ByID(ctx, principal.UserID, row.ItemID); err != nil {
				return nil, storeError(err, "item")
			}
		case "standard":
			if _, err := s.stores.Library.EntryByID(
				ctx, row.ItemID, "equipment", campaign.AllowedStandardSources,
			); err != nil {
				return nil, storeError(err, "equipment")
			}
		default:
			return nil, ValidationError(
				"invalid_library_source", "librarySource must be user or standard",
				map[string]any{"row": index},
			)
		}
		key := row.LocationID + ":" + row.LibrarySource + ":" + row.ItemID
		if seen[key] {
			return nil, ValidationError(
				"duplicate_stock", "duplicate location/item/source stock row",
				map[string]any{"row": index},
			)
		}
		seen[key] = true
		normalized = append(normalized, row)
	}
	return normalized, nil
}

func upsertShopStockTx(
	ctx context.Context,
	tx *gorm.DB,
	campaignID string,
	input ShopStockCommand,
) (dbmodels.CampaignLocationStockEntity, error) {
	var entity dbmodels.CampaignLocationStockEntity
	err := tx.WithContext(ctx).
		Where(
			"campaign_id = ? and location_id = ? and item_id = ? and library_source = ?",
			campaignID, input.LocationID, input.ItemID, input.LibrarySource,
		).First(&entity).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return entity, err
	}
	entity.CampaignID = campaignID
	entity.LocationID = input.LocationID
	entity.ItemID = input.ItemID
	entity.LibrarySource = input.LibrarySource
	entity.Quantity = input.Quantity
	entity.PriceAmount = input.PriceAmount
	entity.PriceUnit = input.PriceUnit
	entity.Availability = input.Availability
	entity.Notes = input.Notes
	entity.SortOrder = input.SortOrder
	return entity, tx.WithContext(ctx).Save(&entity).Error
}

func shopStockModel(entity dbmodels.CampaignLocationStockEntity) models.CampaignLocationStock {
	return models.CampaignLocationStock{
		ID: entity.ID, CampaignID: entity.CampaignID, LocationID: entity.LocationID,
		ItemID: entity.ItemID, LibrarySource: entity.LibrarySource, Quantity: entity.Quantity,
		PriceAmount: entity.PriceAmount, PriceUnit: entity.PriceUnit,
		Availability: entity.Availability, Notes: entity.Notes, SortOrder: entity.SortOrder,
		CreatedAt: entity.CreatedAt, UpdatedAt: entity.UpdatedAt,
	}
}
