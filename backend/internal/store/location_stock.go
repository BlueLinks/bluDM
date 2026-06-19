package store

import (
	"context"
	"errors"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
)

type LocationStockInput struct {
	LocationID    string
	ItemID        string
	LibrarySource string
	Quantity      int
	PriceAmount   int
	PriceUnit     string
	Availability  string
	Notes         string
	SortOrder     int
}

func (s TravelStore) LocationStockForCampaign(ctx context.Context, ownerUserID, campaignID string) ([]models.CampaignLocationStock, error) {
	if err := ensureCampaignOwnedTx(ctx, s.db, ownerUserID, campaignID); err != nil {
		return nil, err
	}
	var entities []dbmodels.CampaignLocationStockEntity
	if err := s.db.WithContext(ctx).
		Where("campaign_id = ?", strings.TrimSpace(campaignID)).
		Order("location_id asc, sort_order asc, created_at asc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	stock := make([]models.CampaignLocationStock, 0, len(entities))
	for _, entity := range entities {
		stock = append(stock, locationStockFromEntity(entity))
	}
	return stock, nil
}

func (s TravelStore) UpsertLocationStock(ctx context.Context, ownerUserID, campaignID string, input LocationStockInput) (models.CampaignLocationStock, error) {
	campaignID = strings.TrimSpace(campaignID)
	var entity dbmodels.CampaignLocationStockEntity
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureCampaignOwnedTx(ctx, tx, ownerUserID, campaignID); err != nil {
			return err
		}
		if err := ensureLocationInCampaignTx(ctx, tx, campaignID, input.LocationID); err != nil {
			return err
		}
		if err := ensureCatalogItemAvailableTx(ctx, tx, ownerUserID, input.ItemID, input.LibrarySource); err != nil {
			return err
		}
		entity = dbmodels.CampaignLocationStockEntity{
			CampaignID:    campaignID,
			LocationID:    strings.TrimSpace(input.LocationID),
			ItemID:        strings.TrimSpace(input.ItemID),
			LibrarySource: normalizeLibrarySource(input.LibrarySource),
			Quantity:      input.Quantity,
			PriceAmount:   input.PriceAmount,
			PriceUnit:     strings.ToLower(strings.TrimSpace(input.PriceUnit)),
			Availability:  normalizeLocationToken(input.Availability),
			Notes:         strings.TrimSpace(input.Notes),
			SortOrder:     input.SortOrder,
		}
		if entity.Quantity <= 0 {
			entity.Quantity = 1
		}
		if entity.PriceAmount < 0 {
			entity.PriceAmount = 0
		}
		if entity.PriceUnit == "" {
			entity.PriceUnit = "gp"
		}
		if entity.Availability == "" {
			entity.Availability = "in-stock"
		}
		var existing dbmodels.CampaignLocationStockEntity
		err := tx.WithContext(ctx).
			Where("campaign_id = ? and location_id = ? and item_id = ? and library_source = ?", entity.CampaignID, entity.LocationID, entity.ItemID, entity.LibrarySource).
			First(&existing).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if err == nil {
			entity.ID = existing.ID
			entity.CreatedAt = existing.CreatedAt
		}
		return tx.Save(&entity).Error
	})
	if err != nil {
		return models.CampaignLocationStock{}, err
	}
	return locationStockFromEntity(entity), nil
}

func (s TravelStore) DeleteLocationStock(ctx context.Context, ownerUserID, campaignID, stockID string) error {
	if err := ensureCampaignOwnedTx(ctx, s.db, ownerUserID, campaignID); err != nil {
		return err
	}
	result := s.db.WithContext(ctx).
		Where("id = ? and campaign_id = ?", strings.TrimSpace(stockID), strings.TrimSpace(campaignID)).
		Delete(&dbmodels.CampaignLocationStockEntity{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func locationStockFromEntity(entity dbmodels.CampaignLocationStockEntity) models.CampaignLocationStock {
	return models.CampaignLocationStock{
		ID:            entity.ID,
		CampaignID:    entity.CampaignID,
		LocationID:    entity.LocationID,
		ItemID:        entity.ItemID,
		LibrarySource: entity.LibrarySource,
		Quantity:      entity.Quantity,
		PriceAmount:   entity.PriceAmount,
		PriceUnit:     entity.PriceUnit,
		Availability:  entity.Availability,
		Notes:         entity.Notes,
		SortOrder:     entity.SortOrder,
		CreatedAt:     entity.CreatedAt,
		UpdatedAt:     entity.UpdatedAt,
	}
}

func ensureCatalogItemAvailableTx(ctx context.Context, tx *gorm.DB, ownerUserID, itemID, librarySource string) error {
	var count int64
	itemID = strings.TrimSpace(itemID)
	switch normalizeLibrarySource(librarySource) {
	case "standard":
		if err := tx.WithContext(ctx).
			Table("standard_library_entries").
			Where("id = ? and category = ?", itemID, "equipment").
			Count(&count).Error; err != nil {
			return err
		}
	case "user":
		if err := tx.WithContext(ctx).
			Model(&dbmodels.ItemEntity{}).
			Where("id = ? and owner_user_id = ?", itemID, ownerUserID).
			Count(&count).Error; err != nil {
			return err
		}
	default:
		return ErrNotFound
	}
	if count == 0 {
		return ErrNotFound
	}
	return nil
}

func normalizeLibrarySource(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return "user"
	}
	return value
}

func normalizeLocationToken(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, "_", "-")
	value = strings.ReplaceAll(value, " ", "-")
	return value
}
