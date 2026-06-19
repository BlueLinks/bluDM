package store

import (
	"context"
	"errors"
	"math"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
)

type CampaignMapInput struct {
	ParentLocationID       string
	Name                   string
	Description            string
	MapType                string
	Mode                   string
	ImageAssetID           string
	Width                  float64
	Height                 float64
	ScaleDistancePerPixel  float64
	ScaleDistanceUnit      string
	CalibrationPixelLength float64
	CalibrationDistance    float64
	Metadata               map[string]any
}

type CampaignMapPinInput struct {
	LocationID    string
	X             float64
	Y             float64
	LabelOverride string
	Visibility    string
	State         string
	Metadata      map[string]any
}

func (s TravelStore) MapsForCampaign(ctx context.Context, ownerUserID, campaignID, parentLocationID string) ([]models.CampaignMap, error) {
	campaignID = strings.TrimSpace(campaignID)
	parentLocationID = strings.TrimSpace(parentLocationID)
	if err := ensureCampaignOwnedTx(ctx, s.db, ownerUserID, campaignID); err != nil {
		return nil, err
	}
	query := s.db.WithContext(ctx).Where("campaign_id = ?", campaignID)
	if parentLocationID != "" {
		query = query.Where("parent_location_id = ?", parentLocationID)
	}
	var entities []dbmodels.CampaignMapEntity
	if err := query.Order("updated_at desc, name asc").Find(&entities).Error; err != nil {
		return nil, err
	}
	maps := make([]models.CampaignMap, 0, len(entities))
	for _, entity := range entities {
		maps = append(maps, campaignMapFromEntity(entity))
	}
	return maps, nil
}

func (s TravelStore) CreateMap(ctx context.Context, ownerUserID, campaignID string, input CampaignMapInput) (models.CampaignMap, error) {
	campaignID = strings.TrimSpace(campaignID)
	var entity dbmodels.CampaignMapEntity
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureCampaignOwnedTx(ctx, tx, ownerUserID, campaignID); err != nil {
			return err
		}
		if strings.TrimSpace(input.ParentLocationID) != "" {
			if err := ensureLocationInCampaignTx(ctx, tx, campaignID, input.ParentLocationID); err != nil {
				return err
			}
		}
		entity = campaignMapEntityFromInput(campaignID, input)
		return tx.WithContext(ctx).Create(&entity).Error
	})
	if err != nil {
		return models.CampaignMap{}, err
	}
	return campaignMapFromEntity(entity), nil
}

func (s TravelStore) UpdateMap(ctx context.Context, ownerUserID, campaignID, mapID string, input CampaignMapInput) (models.CampaignMap, error) {
	campaignID = strings.TrimSpace(campaignID)
	mapID = strings.TrimSpace(mapID)
	var updated dbmodels.CampaignMapEntity
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureCampaignOwnedTx(ctx, tx, ownerUserID, campaignID); err != nil {
			return err
		}
		var existing dbmodels.CampaignMapEntity
		if err := tx.WithContext(ctx).Where("id = ? and campaign_id = ?", mapID, campaignID).First(&existing).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}
		if strings.TrimSpace(input.ParentLocationID) != "" {
			if err := ensureLocationInCampaignTx(ctx, tx, campaignID, input.ParentLocationID); err != nil {
				return err
			}
		}
		updated = campaignMapEntityFromInput(campaignID, input)
		updated.ID = existing.ID
		updated.CreatedAt = existing.CreatedAt
		return tx.WithContext(ctx).Save(&updated).Error
	})
	if err != nil {
		return models.CampaignMap{}, err
	}
	return campaignMapFromEntity(updated), nil
}

func (s TravelStore) DeleteMap(ctx context.Context, ownerUserID, campaignID, mapID string) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureCampaignOwnedTx(ctx, tx, ownerUserID, campaignID); err != nil {
			return err
		}
		campaignID = strings.TrimSpace(campaignID)
		mapID = strings.TrimSpace(mapID)
		if err := tx.WithContext(ctx).Where("campaign_id = ? and map_id = ?", campaignID, mapID).Delete(&dbmodels.CampaignMapPinEntity{}).Error; err != nil {
			return err
		}
		result := tx.WithContext(ctx).Where("id = ? and campaign_id = ?", mapID, campaignID).Delete(&dbmodels.CampaignMapEntity{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrNotFound
		}
		return nil
	})
}

func (s TravelStore) PinsForMap(ctx context.Context, ownerUserID, campaignID, mapID string) ([]models.CampaignMapPin, error) {
	if err := ensureMapInCampaignTx(ctx, s.db, ownerUserID, campaignID, mapID); err != nil {
		return nil, err
	}
	var entities []dbmodels.CampaignMapPinEntity
	if err := s.db.WithContext(ctx).Where("campaign_id = ? and map_id = ?", strings.TrimSpace(campaignID), strings.TrimSpace(mapID)).Order("updated_at desc").Find(&entities).Error; err != nil {
		return nil, err
	}
	pins := make([]models.CampaignMapPin, 0, len(entities))
	for _, entity := range entities {
		pins = append(pins, campaignMapPinFromEntity(entity))
	}
	return pins, nil
}

func (s TravelStore) CreateMapPin(ctx context.Context, ownerUserID, campaignID, mapID string, input CampaignMapPinInput) (models.CampaignMapPin, error) {
	campaignID = strings.TrimSpace(campaignID)
	mapID = strings.TrimSpace(mapID)
	var entity dbmodels.CampaignMapPinEntity
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		mapEntity, err := campaignMapEntityForUpdate(ctx, tx, ownerUserID, campaignID, mapID)
		if err != nil {
			return err
		}
		if err := ensureLocationInCampaignTx(ctx, tx, campaignID, input.LocationID); err != nil {
			return err
		}
		if !coordinatesInBounds(input.X, input.Y, mapEntity.Width, mapEntity.Height) {
			return ErrNotFound
		}
		entity = campaignMapPinEntityFromInput(campaignID, mapID, input)
		return tx.WithContext(ctx).Create(&entity).Error
	})
	if err != nil {
		return models.CampaignMapPin{}, err
	}
	return campaignMapPinFromEntity(entity), nil
}

func (s TravelStore) UpdateMapPin(ctx context.Context, ownerUserID, campaignID, mapID, pinID string, input CampaignMapPinInput) (models.CampaignMapPin, error) {
	campaignID = strings.TrimSpace(campaignID)
	mapID = strings.TrimSpace(mapID)
	pinID = strings.TrimSpace(pinID)
	var updated dbmodels.CampaignMapPinEntity
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		mapEntity, err := campaignMapEntityForUpdate(ctx, tx, ownerUserID, campaignID, mapID)
		if err != nil {
			return err
		}
		var existing dbmodels.CampaignMapPinEntity
		if err := tx.WithContext(ctx).Where("id = ? and campaign_id = ? and map_id = ?", pinID, campaignID, mapID).First(&existing).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrNotFound
			}
			return err
		}
		if err := ensureLocationInCampaignTx(ctx, tx, campaignID, input.LocationID); err != nil {
			return err
		}
		if !coordinatesInBounds(input.X, input.Y, mapEntity.Width, mapEntity.Height) {
			return ErrNotFound
		}
		updated = campaignMapPinEntityFromInput(campaignID, mapID, input)
		updated.ID = existing.ID
		updated.CreatedAt = existing.CreatedAt
		return tx.WithContext(ctx).Save(&updated).Error
	})
	if err != nil {
		return models.CampaignMapPin{}, err
	}
	return campaignMapPinFromEntity(updated), nil
}

func (s TravelStore) DeleteMapPin(ctx context.Context, ownerUserID, campaignID, mapID, pinID string) error {
	if err := ensureMapInCampaignTx(ctx, s.db, ownerUserID, campaignID, mapID); err != nil {
		return err
	}
	result := s.db.WithContext(ctx).Where("id = ? and campaign_id = ? and map_id = ?", strings.TrimSpace(pinID), strings.TrimSpace(campaignID), strings.TrimSpace(mapID)).Delete(&dbmodels.CampaignMapPinEntity{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s TravelStore) DistanceBetweenLocationPins(ctx context.Context, ownerUserID, campaignID, mapID, originLocationID, targetLocationID string) (models.CampaignMapDistance, error) {
	mapEntity, err := campaignMapEntityForUpdate(ctx, s.db, ownerUserID, campaignID, mapID)
	if err != nil {
		return models.CampaignMapDistance{}, err
	}
	var pins []dbmodels.CampaignMapPinEntity
	if err := s.db.WithContext(ctx).
		Where("campaign_id = ? and map_id = ? and location_id in ?", strings.TrimSpace(campaignID), strings.TrimSpace(mapID), []string{strings.TrimSpace(originLocationID), strings.TrimSpace(targetLocationID)}).
		Order("created_at asc").
		Find(&pins).Error; err != nil {
		return models.CampaignMapDistance{}, err
	}
	var origin, target *dbmodels.CampaignMapPinEntity
	for index := range pins {
		pin := &pins[index]
		if pin.LocationID == strings.TrimSpace(originLocationID) && origin == nil {
			origin = pin
		}
		if pin.LocationID == strings.TrimSpace(targetLocationID) && target == nil {
			target = pin
		}
	}
	if origin == nil || target == nil {
		return models.CampaignMapDistance{}, ErrNotFound
	}
	pixelDistance := math.Hypot(origin.X-target.X, origin.Y-target.Y)
	distance := pixelDistance * mapEntity.ScaleDistancePerPixel
	travelDistance, travelUnit := mapDistanceForTravel(distance, mapEntity.ScaleDistanceUnit)
	return models.CampaignMapDistance{
		MapID:              mapEntity.ID,
		OriginLocationID:   strings.TrimSpace(originLocationID),
		TargetLocationID:   strings.TrimSpace(targetLocationID),
		PixelDistance:      pixelDistance,
		Distance:           distance,
		DistanceUnit:       mapEntity.ScaleDistanceUnit,
		TravelDistance:     travelDistance,
		TravelDistanceUnit: travelUnit,
	}, nil
}

func campaignMapEntityFromInput(campaignID string, input CampaignMapInput) dbmodels.CampaignMapEntity {
	metadata := dbmodels.JSONMap(input.Metadata)
	if metadata == nil {
		metadata = dbmodels.JSONMap{}
	}
	return dbmodels.CampaignMapEntity{
		CampaignID:             strings.TrimSpace(campaignID),
		ParentLocationID:       stringPointer(strings.TrimSpace(input.ParentLocationID)),
		Name:                   input.Name,
		Description:            input.Description,
		MapType:                input.MapType,
		Mode:                   input.Mode,
		ImageAssetID:           stringPointer(strings.TrimSpace(input.ImageAssetID)),
		Width:                  input.Width,
		Height:                 input.Height,
		ScaleDistancePerPixel:  input.ScaleDistancePerPixel,
		ScaleDistanceUnit:      input.ScaleDistanceUnit,
		CalibrationPixelLength: input.CalibrationPixelLength,
		CalibrationDistance:    input.CalibrationDistance,
		Metadata:               metadata,
	}
}

func campaignMapFromEntity(entity dbmodels.CampaignMapEntity) models.CampaignMap {
	metadata := map[string]any(entity.Metadata)
	if metadata == nil {
		metadata = map[string]any{}
	}
	imageAssetID := stringFromPointer(entity.ImageAssetID)
	imageURL := ""
	if imageAssetID != "" {
		imageURL = "/api/assets/" + imageAssetID
	}
	return models.CampaignMap{
		ID:                     entity.ID,
		CampaignID:             entity.CampaignID,
		ParentLocationID:       stringFromPointer(entity.ParentLocationID),
		Name:                   entity.Name,
		Description:            entity.Description,
		MapType:                entity.MapType,
		Mode:                   entity.Mode,
		ImageAssetID:           imageAssetID,
		ImageURL:               imageURL,
		Width:                  entity.Width,
		Height:                 entity.Height,
		ScaleDistancePerPixel:  entity.ScaleDistancePerPixel,
		ScaleDistanceUnit:      entity.ScaleDistanceUnit,
		CalibrationPixelLength: entity.CalibrationPixelLength,
		CalibrationDistance:    entity.CalibrationDistance,
		Metadata:               metadata,
		CreatedAt:              entity.CreatedAt,
		UpdatedAt:              entity.UpdatedAt,
	}
}

func campaignMapPinEntityFromInput(campaignID, mapID string, input CampaignMapPinInput) dbmodels.CampaignMapPinEntity {
	metadata := dbmodels.JSONMap(input.Metadata)
	if metadata == nil {
		metadata = dbmodels.JSONMap{}
	}
	return dbmodels.CampaignMapPinEntity{
		CampaignID:    strings.TrimSpace(campaignID),
		MapID:         strings.TrimSpace(mapID),
		LocationID:    strings.TrimSpace(input.LocationID),
		X:             input.X,
		Y:             input.Y,
		LabelOverride: input.LabelOverride,
		Visibility:    input.Visibility,
		State:         input.State,
		Metadata:      metadata,
	}
}

func campaignMapPinFromEntity(entity dbmodels.CampaignMapPinEntity) models.CampaignMapPin {
	metadata := map[string]any(entity.Metadata)
	if metadata == nil {
		metadata = map[string]any{}
	}
	return models.CampaignMapPin{
		ID:            entity.ID,
		CampaignID:    entity.CampaignID,
		MapID:         entity.MapID,
		LocationID:    entity.LocationID,
		X:             entity.X,
		Y:             entity.Y,
		LabelOverride: entity.LabelOverride,
		Visibility:    entity.Visibility,
		State:         entity.State,
		Metadata:      metadata,
		CreatedAt:     entity.CreatedAt,
		UpdatedAt:     entity.UpdatedAt,
	}
}

func campaignMapEntityForUpdate(ctx context.Context, tx *gorm.DB, ownerUserID, campaignID, mapID string) (dbmodels.CampaignMapEntity, error) {
	if err := ensureCampaignOwnedTx(ctx, tx, ownerUserID, campaignID); err != nil {
		return dbmodels.CampaignMapEntity{}, err
	}
	var entity dbmodels.CampaignMapEntity
	if err := tx.WithContext(ctx).Where("id = ? and campaign_id = ?", strings.TrimSpace(mapID), strings.TrimSpace(campaignID)).First(&entity).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return dbmodels.CampaignMapEntity{}, ErrNotFound
		}
		return dbmodels.CampaignMapEntity{}, err
	}
	return entity, nil
}

func ensureMapInCampaignTx(ctx context.Context, tx *gorm.DB, ownerUserID, campaignID, mapID string) error {
	_, err := campaignMapEntityForUpdate(ctx, tx, ownerUserID, campaignID, mapID)
	return err
}

func coordinatesInBounds(x, y, width, height float64) bool {
	return x >= 0 && y >= 0 && (width <= 0 || x <= width) && (height <= 0 || y <= height)
}

func mapDistanceForTravel(distance float64, unit string) (float64, string) {
	switch unit {
	case "feet":
		return distance / 5280, "miles"
	case "kilometres":
		return distance, "kilometers"
	case "kilometers":
		return distance, "kilometers"
	default:
		return distance, "miles"
	}
}
