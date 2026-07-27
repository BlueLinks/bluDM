package store

import (
	"context"
	"strings"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/generation"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (s MarkdownWorldStore) Import(
	ctx context.Context,
	ownerUserID string,
	campaignID string,
	npcs []MarkdownNPCImportInput,
	dungeons []MarkdownDungeonImportInput,
) (MarkdownWorldImportResult, error) {
	result := MarkdownWorldImportResult{
		NPCs: []MarkdownNPCImportResult{}, Dungeons: []MarkdownDungeonImportResult{},
	}
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureCampaignOwnedTx(ctx, tx, ownerUserID, campaignID); err != nil {
			return err
		}
		for _, input := range dungeons {
			imported, err := importMarkdownDungeonTx(ctx, tx, ownerUserID, campaignID, input)
			if err != nil {
				return err
			}
			result.Dungeons = append(result.Dungeons, imported)
		}
		for _, input := range npcs {
			imported, err := importMarkdownNPCTx(ctx, tx, ownerUserID, campaignID, input)
			if err != nil {
				return err
			}
			result.NPCs = append(result.NPCs, imported)
		}
		return nil
	})
	return result, err
}

func importMarkdownNPCTx(
	ctx context.Context,
	tx *gorm.DB,
	ownerUserID string,
	campaignID string,
	input MarkdownNPCImportInput,
) (MarkdownNPCImportResult, error) {
	var existing dbmodels.CreatureEntity
	query := tx.WithContext(ctx).
		Where("owner_user_id = ? and stat_block ->> 'markdownSourceKey' = ?", ownerUserID, input.SourceKey).
		First(&existing)
	operation := "update"
	if query.Error != nil && query.Error != gorm.ErrRecordNotFound {
		return MarkdownNPCImportResult{}, query.Error
	}
	if query.Error == gorm.ErrRecordNotFound {
		operation = "create"
	}
	statBlock := copyMap(input.Creature.StatBlock)
	locationLinkIDs := map[string]string{}
	if existing.StatBlock != nil {
		locationLinkIDs = markdownLocationLinkIDs(existing.StatBlock["markdownLocationLinkIds"])
	}
	previousLinkID := locationLinkIDs[campaignID]
	if previousLinkID == "" {
		previousLinkID, _ = existing.StatBlock["markdownLocationLinkId"].(string)
	}
	delete(locationLinkIDs, campaignID)
	delete(statBlock, "markdownLocationLinkId")
	delete(statBlock, "markdownLocationLinkIds")
	if len(locationLinkIDs) > 0 {
		statBlock["markdownLocationLinkIds"] = locationLinkIDs
	}
	applyMarkdownMetadata(statBlock, input.SourceKey, input.SourcePath, input.BlockID, input.ContentHash)
	removeAvatarAsset := input.AvatarAsset == nil
	if input.AvatarAsset != nil {
		assetID, err := upsertMarkdownAssetTx(ctx, tx, ownerUserID, *input.AvatarAsset)
		if err != nil {
			return MarkdownNPCImportResult{}, err
		}
		input.Creature.ImageAssetID = assetID
	}
	input.Creature.StatBlock = statBlock
	entity := creatureEntityFromInput(ownerUserID, input.Creature)
	if operation == "update" {
		entity.ID = existing.ID
		entity.CreatedAt = existing.CreatedAt
	}
	if err := tx.WithContext(ctx).Save(&entity).Error; err != nil {
		return MarkdownNPCImportResult{}, err
	}
	if removeAvatarAsset {
		if err := deleteMarkdownAssetBySourceKeyTx(
			ctx, tx, ownerUserID, input.SourceKey+"/avatar",
		); err != nil {
			return MarkdownNPCImportResult{}, err
		}
	}
	if err := tx.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "campaign_id"}, {Name: "creature_id"}},
		DoUpdates: clause.Assignments(map[string]any{"disposition": input.Disposition}),
	}).Create(&dbmodels.CampaignCreatureEntity{
		CampaignID: campaignID, CreatureID: entity.ID, Disposition: input.Disposition,
	}).Error; err != nil {
		return MarkdownNPCImportResult{}, err
	}
	if previousLinkID != "" {
		if err := tx.WithContext(ctx).
			Where("id = ? and campaign_id = ? and creature_id = ?", previousLinkID, campaignID, entity.ID).
			Delete(&dbmodels.CampaignNpcLocationLinkEntity{}).Error; err != nil {
			return MarkdownNPCImportResult{}, err
		}
	}
	if input.LocationID == "" && input.LocationSourceKey != "" {
		var location dbmodels.CampaignLocationEntity
		if err := tx.WithContext(ctx).
			Where("campaign_id = ? and map_anchor ->> 'markdownSourceKey' = ?", campaignID, input.LocationSourceKey).
			First(&location).Error; err != nil {
			return MarkdownNPCImportResult{}, err
		}
		input.LocationID = location.ID
	}
	if input.LocationID != "" {
		link := dbmodels.CampaignNpcLocationLinkEntity{
			CampaignID: campaignID, CreatureID: entity.ID, LocationID: input.LocationID,
			LinkType: input.LocationRole, Visibility: input.Visibility, Notes: input.LocationNotes,
		}
		if err := tx.WithContext(ctx).Create(&link).Error; err != nil {
			return MarkdownNPCImportResult{}, err
		}
		locationLinkIDs[campaignID] = link.ID
		statBlock["markdownLocationLinkIds"] = locationLinkIDs
		entity.StatBlock = dbmodels.JSONMap(statBlock)
		if err := tx.WithContext(ctx).Save(&entity).Error; err != nil {
			return MarkdownNPCImportResult{}, err
		}
	}
	return MarkdownNPCImportResult{
		Creature: creatureFromEntity(entity), Operation: operation,
	}, nil
}

func importMarkdownDungeonTx(
	ctx context.Context,
	tx *gorm.DB,
	ownerUserID string,
	campaignID string,
	input MarkdownDungeonImportInput,
) (MarkdownDungeonImportResult, error) {
	root, operation, err := upsertMarkdownLocationTx(
		ctx, tx, campaignID, input.SourceKey, input.SourcePath, input.BlockID,
		input.ContentHash, input.Location,
	)
	if err != nil {
		return MarkdownDungeonImportResult{}, err
	}
	mapIDs := []string{}
	if input.Map != nil {
		mapID, err := upsertMarkdownMapTx(ctx, tx, ownerUserID, campaignID, root.ID, *input.Map)
		if err != nil {
			return MarkdownDungeonImportResult{}, err
		}
		mapIDs = append(mapIDs, mapID)
	} else if err := deleteMarkdownMapsForParentSourceTx(
		ctx, tx, ownerUserID, campaignID, input.SourceKey,
	); err != nil {
		return MarkdownDungeonImportResult{}, err
	}
	activeFloorKeys := map[string]bool{}
	for _, floorInput := range input.Floors {
		activeFloorKeys[floorInput.SourceKey] = true
		floorLocation := floorInput.Location
		floorLocation.ParentLocationID = root.ID
		floorLocation.MapAnchor = copyMap(floorLocation.MapAnchor)
		floorLocation.MapAnchor["markdownParentSourceKey"] = input.SourceKey
		floor, _, err := upsertMarkdownLocationTx(
			ctx, tx, campaignID, floorInput.SourceKey, input.SourcePath,
			input.BlockID+"/"+strings.TrimPrefix(floorInput.SourceKey, input.SourceKey+"/floor/"),
			input.ContentHash, floorLocation,
		)
		if err != nil {
			return MarkdownDungeonImportResult{}, err
		}
		if floorInput.Map != nil {
			mapID, err := upsertMarkdownMapTx(
				ctx, tx, ownerUserID, campaignID, floor.ID, *floorInput.Map,
			)
			if err != nil {
				return MarkdownDungeonImportResult{}, err
			}
			mapIDs = append(mapIDs, mapID)
		} else if err := deleteMarkdownMapsForParentSourceTx(
			ctx, tx, ownerUserID, campaignID, floorInput.SourceKey,
		); err != nil {
			return MarkdownDungeonImportResult{}, err
		}
	}
	var staleFloors []dbmodels.CampaignLocationEntity
	if err := tx.WithContext(ctx).
		Where("campaign_id = ? and map_anchor ->> 'markdownParentSourceKey' = ?", campaignID, input.SourceKey).
		Find(&staleFloors).Error; err != nil {
		return MarkdownDungeonImportResult{}, err
	}
	for _, floor := range staleFloors {
		sourceKey, _ := floor.MapAnchor["markdownSourceKey"].(string)
		if activeFloorKeys[sourceKey] {
			continue
		}
		if err := deleteMarkdownMapsForParentSourceTx(
			ctx, tx, ownerUserID, campaignID, sourceKey,
		); err != nil {
			return MarkdownDungeonImportResult{}, err
		}
		if err := deleteMarkdownRoomLocationTx(ctx, tx, campaignID, floor.ID); err != nil {
			return MarkdownDungeonImportResult{}, err
		}
	}
	return MarkdownDungeonImportResult{
		Location: locationFromEntity(root, nil), MapIDs: mapIDs, Operation: operation,
	}, nil
}

func upsertMarkdownLocationTx(
	ctx context.Context,
	tx *gorm.DB,
	campaignID string,
	sourceKey string,
	sourcePath string,
	blockID string,
	contentHash string,
	input LocationInput,
) (dbmodels.CampaignLocationEntity, string, error) {
	var existing dbmodels.CampaignLocationEntity
	query := tx.WithContext(ctx).
		Where("campaign_id = ? and map_anchor ->> 'markdownSourceKey' = ?", campaignID, sourceKey).
		First(&existing)
	operation := "update"
	if query.Error != nil && query.Error != gorm.ErrRecordNotFound {
		return dbmodels.CampaignLocationEntity{}, "", query.Error
	}
	if query.Error == gorm.ErrRecordNotFound {
		operation = "create"
	}
	anchor := copyMap(input.MapAnchor)
	applyMarkdownMetadata(anchor, sourceKey, sourcePath, blockID, contentHash)
	input.MapAnchor = anchor
	entity := locationEntityFromInput(campaignID, input)
	if operation == "update" {
		entity.ID = existing.ID
		entity.CreatedAt = existing.CreatedAt
	}
	if err := tx.WithContext(ctx).Save(&entity).Error; err != nil {
		return dbmodels.CampaignLocationEntity{}, "", err
	}
	return entity, operation, nil
}

func upsertMarkdownMapTx(
	ctx context.Context,
	tx *gorm.DB,
	ownerUserID string,
	campaignID string,
	parentLocationID string,
	input MarkdownDungeonMapImportInput,
) (string, error) {
	var existing dbmodels.CampaignMapEntity
	query := tx.WithContext(ctx).
		Where("campaign_id = ? and metadata ->> 'markdownSourceKey' = ?", campaignID, input.SourceKey).
		First(&existing)
	if query.Error != nil && query.Error != gorm.ErrRecordNotFound {
		return "", query.Error
	}
	metadata := copyMap(input.Map.Metadata)
	applyMarkdownMetadata(metadata, input.SourceKey, input.SourcePath, input.BlockID, input.ContentHash)
	metadata["markdownParentSourceKey"] = input.ParentSourceKey
	input.Map.Metadata = metadata
	input.Map.ParentLocationID = parentLocationID
	removeImageAsset := input.ImageAsset == nil
	if input.ImageAsset != nil {
		assetID, err := upsertMarkdownAssetTx(ctx, tx, ownerUserID, *input.ImageAsset)
		if err != nil {
			return "", err
		}
		input.Map.ImageAssetID = assetID
		input.Map.Mode = "image"
	}
	entity := campaignMapEntityFromInput(campaignID, input.Map)
	if query.Error == nil {
		entity.ID = existing.ID
		entity.CreatedAt = existing.CreatedAt
	}
	if err := tx.WithContext(ctx).Save(&entity).Error; err != nil {
		return "", err
	}
	if removeImageAsset {
		if err := deleteMarkdownAssetBySourceKeyTx(
			ctx, tx, ownerUserID, input.SourceKey+"/image",
		); err != nil {
			return "", err
		}
	}
	if input.Studio != nil {
		studio := *input.Studio
		if err := syncMarkdownStudioRoomsTx(
			ctx, tx, campaignID, parentLocationID, entity.ID, input.SourceKey, &studio,
		); err != nil {
			return "", err
		}
		metadata["studio"] = studio
		entity.Metadata = dbmodels.JSONMap(metadata)
		if err := tx.WithContext(ctx).Save(&entity).Error; err != nil {
			return "", err
		}
	} else if err := deleteMarkdownRoomsForMapSourceTx(
		ctx, tx, campaignID, input.SourceKey,
	); err != nil {
		return "", err
	}
	return entity.ID, nil
}

func syncMarkdownStudioRoomsTx(
	ctx context.Context,
	tx *gorm.DB,
	campaignID string,
	parentLocationID string,
	mapID string,
	mapSourceKey string,
	studio *generation.DungeonDocument,
) error {
	activeKeys := map[string]bool{}
	for index := range studio.Rooms {
		room := &studio.Rooms[index]
		sourceKey := mapSourceKey + "/room/" + room.ID
		activeKeys[sourceKey] = true
		location, _, err := upsertMarkdownLocationTx(
			ctx, tx, campaignID, sourceKey, "", room.ID, "",
			LocationInput{
				ParentLocationID: parentLocationID,
				Name:             room.Label, LocationType: "room",
				Summary: "Room mapped in Dungeon Studio.", Status: "active",
				MapAnchor: map[string]any{
					"markdownParentSourceKey": mapSourceKey,
					"dungeonStudio": map[string]any{
						"managed": true, "mapId": mapID, "roomId": room.ID,
					},
				},
			},
		)
		if err != nil {
			return err
		}
		room.LocationID = location.ID
	}
	var stale []dbmodels.CampaignLocationEntity
	if err := tx.WithContext(ctx).
		Where("campaign_id = ? and map_anchor ->> 'markdownParentSourceKey' = ?", campaignID, mapSourceKey).
		Find(&stale).Error; err != nil {
		return err
	}
	for _, location := range stale {
		sourceKey, _ := location.MapAnchor["markdownSourceKey"].(string)
		if activeKeys[sourceKey] {
			continue
		}
		if err := deleteMarkdownRoomLocationTx(ctx, tx, campaignID, location.ID); err != nil {
			return err
		}
	}
	return nil
}

func upsertMarkdownAssetTx(
	ctx context.Context,
	tx *gorm.DB,
	ownerUserID string,
	input MarkdownAssetInput,
) (string, error) {
	var existing dbmodels.UploadedAssetEntity
	query := tx.WithContext(ctx).
		Where("owner_user_id = ? and metadata ->> 'markdownSourceKey' = ?", ownerUserID, input.SourceKey).
		First(&existing)
	if query.Error != nil && query.Error != gorm.ErrRecordNotFound {
		return "", query.Error
	}
	entity := dbmodels.UploadedAssetEntity{
		OwnerUserID: ownerUserID, Filename: input.Filename, ContentType: input.ContentType,
		ByteSize: int64(len(input.Data)), Data: input.Data,
		Metadata: dbmodels.JSONMap{"markdownSourceKey": input.SourceKey},
	}
	if query.Error == nil {
		entity.ID = existing.ID
		entity.CreatedAt = existing.CreatedAt
	}
	if err := tx.WithContext(ctx).Save(&entity).Error; err != nil {
		return "", err
	}
	return entity.ID, nil
}

func applyMarkdownMetadata(
	target map[string]any,
	sourceKey string,
	sourcePath string,
	blockID string,
	contentHash string,
) {
	target["markdownSourceKey"] = sourceKey
	if sourcePath != "" {
		target["markdownSourcePath"] = sourcePath
	}
	if blockID != "" {
		target["markdownBlockId"] = blockID
	}
	if contentHash != "" {
		target["markdownContentHash"] = contentHash
	}
	target["markdownImportedAt"] = time.Now().UTC().Format(time.RFC3339)
}

func copyMap(source map[string]any) map[string]any {
	result := map[string]any{}
	for key, value := range source {
		result[key] = value
	}
	return result
}
