package store

import (
	"context"
	"errors"
	"strings"

	dbmodels "bludm/backend/internal/db"

	"gorm.io/gorm"
)

type AssetStore struct {
	db *gorm.DB
}

type AssetData struct {
	ContentType string
	Data        []byte
}

func (s AssetStore) Create(ctx context.Context, ownerUserID, filename, contentType string, byteSize int, data []byte) (string, error) {
	asset := dbmodels.UploadedAssetEntity{
		OwnerUserID: ownerUserID,
		Filename:    filename,
		ContentType: contentType,
		ByteSize:    int64(byteSize),
		Data:        data,
	}
	if err := s.db.WithContext(ctx).Create(&asset).Error; err != nil {
		return "", err
	}
	return asset.ID, nil
}

func (s AssetStore) DataByID(ctx context.Context, ownerUserID, assetID string) (AssetData, error) {
	var asset dbmodels.UploadedAssetEntity
	err := s.db.WithContext(ctx).
		Select("content_type", "data").
		Where("id = ? and owner_user_id = ?", strings.TrimSpace(assetID), ownerUserID).
		First(&asset).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return AssetData{}, ErrNotFound
	}
	if err != nil {
		return AssetData{}, err
	}
	return AssetData{ContentType: asset.ContentType, Data: asset.Data}, nil
}

func (s AssetStore) Exists(ctx context.Context, ownerUserID, assetID string) (bool, error) {
	assetID = strings.TrimSpace(assetID)
	if assetID == "" {
		return true, nil
	}
	var count int64
	err := s.db.WithContext(ctx).
		Model(&dbmodels.UploadedAssetEntity{}).
		Where("id = ? and owner_user_id = ?", assetID, ownerUserID).
		Count(&count).Error
	return count > 0, err
}
