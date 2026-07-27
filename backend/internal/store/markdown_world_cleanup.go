package store

import (
	"context"

	dbmodels "bludm/backend/internal/db"
	"gorm.io/gorm"
)

func deleteMarkdownRoomLocationTx(
	ctx context.Context,
	tx *gorm.DB,
	campaignID string,
	locationID string,
) error {
	if err := tx.WithContext(ctx).
		Where("campaign_id = ? and (source_location_id = ? or target_location_id = ?)", campaignID, locationID, locationID).
		Delete(&dbmodels.CampaignLocationLinkEntity{}).Error; err != nil {
		return err
	}
	if err := tx.WithContext(ctx).Model(&dbmodels.CampaignLocationEntity{}).
		Where("campaign_id = ? and parent_location_id = ?", campaignID, locationID).
		Update("parent_location_id", nil).Error; err != nil {
		return err
	}
	if err := tx.WithContext(ctx).Model(&dbmodels.CampaignMapEntity{}).
		Where("campaign_id = ? and parent_location_id = ?", campaignID, locationID).
		Update("parent_location_id", nil).Error; err != nil {
		return err
	}
	if err := tx.WithContext(ctx).
		Where("campaign_id = ? and location_id = ?", campaignID, locationID).
		Delete(&dbmodels.CampaignNpcLocationLinkEntity{}).Error; err != nil {
		return err
	}
	if err := tx.WithContext(ctx).
		Where("campaign_id = ? and location_id = ?", campaignID, locationID).
		Delete(&dbmodels.CampaignLocationStockEntity{}).Error; err != nil {
		return err
	}
	if err := tx.WithContext(ctx).
		Where("campaign_id = ? and location_id = ?", campaignID, locationID).
		Delete(&dbmodels.CampaignMapPinEntity{}).Error; err != nil {
		return err
	}
	if err := tx.WithContext(ctx).Model(&dbmodels.EncounterEntity{}).
		Where("campaign_id = ? and location_id = ?", campaignID, locationID).
		Update("location_id", nil).Error; err != nil {
		return err
	}
	return tx.WithContext(ctx).
		Where("campaign_id = ? and id = ?", campaignID, locationID).
		Delete(&dbmodels.CampaignLocationEntity{}).Error
}

func deleteMarkdownRoomsForMapSourceTx(
	ctx context.Context,
	tx *gorm.DB,
	campaignID string,
	mapSourceKey string,
) error {
	var rooms []dbmodels.CampaignLocationEntity
	if err := tx.WithContext(ctx).
		Where("campaign_id = ? and map_anchor ->> 'markdownParentSourceKey' = ?", campaignID, mapSourceKey).
		Find(&rooms).Error; err != nil {
		return err
	}
	for _, room := range rooms {
		if err := deleteMarkdownRoomLocationTx(ctx, tx, campaignID, room.ID); err != nil {
			return err
		}
	}
	return nil
}

func deleteMarkdownMapsForParentSourceTx(
	ctx context.Context,
	tx *gorm.DB,
	ownerUserID string,
	campaignID string,
	parentSourceKey string,
) error {
	var maps []dbmodels.CampaignMapEntity
	if err := tx.WithContext(ctx).
		Where("campaign_id = ? and metadata ->> 'markdownParentSourceKey' = ?", campaignID, parentSourceKey).
		Find(&maps).Error; err != nil {
		return err
	}
	for _, campaignMap := range maps {
		mapSourceKey, _ := campaignMap.Metadata["markdownSourceKey"].(string)
		if err := deleteMarkdownRoomsForMapSourceTx(ctx, tx, campaignID, mapSourceKey); err != nil {
			return err
		}
		if err := tx.WithContext(ctx).
			Where("campaign_id = ? and map_id = ?", campaignID, campaignMap.ID).
			Delete(&dbmodels.CampaignMapPinEntity{}).Error; err != nil {
			return err
		}
		if err := tx.WithContext(ctx).
			Where("campaign_id = ? and id = ?", campaignID, campaignMap.ID).
			Delete(&dbmodels.CampaignMapEntity{}).Error; err != nil {
			return err
		}
		if err := deleteMarkdownAssetBySourceKeyTx(
			ctx, tx, ownerUserID, mapSourceKey+"/image",
		); err != nil {
			return err
		}
	}
	return nil
}

func deleteMarkdownAssetBySourceKeyTx(
	ctx context.Context,
	tx *gorm.DB,
	ownerUserID string,
	sourceKey string,
) error {
	return tx.WithContext(ctx).
		Where("owner_user_id = ? and metadata ->> 'markdownSourceKey' = ?", ownerUserID, sourceKey).
		Delete(&dbmodels.UploadedAssetEntity{}).Error
}

func markdownLocationLinkIDs(value any) map[string]string {
	result := map[string]string{}
	switch typed := value.(type) {
	case map[string]string:
		for campaignID, linkID := range typed {
			result[campaignID] = linkID
		}
	case map[string]any:
		for campaignID, rawLinkID := range typed {
			if linkID, ok := rawLinkID.(string); ok {
				result[campaignID] = linkID
			}
		}
	}
	return result
}
