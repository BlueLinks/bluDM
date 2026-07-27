package store

import (
	"context"
	"errors"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/generation"
	"bludm/backend/internal/models"
	"gorm.io/gorm"
)

type MarkdownAssetInput struct {
	SourceKey   string
	Filename    string
	ContentType string
	Data        []byte
}

type MarkdownNPCImportInput struct {
	SourceKey         string
	SourcePath        string
	BlockID           string
	ContentHash       string
	Creature          CreatureInput
	Disposition       string
	LocationID        string
	LocationSourceKey string
	LocationRole      string
	Visibility        string
	LocationNotes     string
	AvatarAsset       *MarkdownAssetInput
}

type MarkdownDungeonMapImportInput struct {
	SourceKey       string
	ParentSourceKey string
	SourcePath      string
	BlockID         string
	ContentHash     string
	Map             CampaignMapInput
	Studio          *generation.DungeonDocument
	ImageAsset      *MarkdownAssetInput
}

type MarkdownDungeonFloorImportInput struct {
	SourceKey string
	Location  LocationInput
	Map       *MarkdownDungeonMapImportInput
}

type MarkdownDungeonImportInput struct {
	SourceKey   string
	SourcePath  string
	BlockID     string
	ContentHash string
	Location    LocationInput
	Map         *MarkdownDungeonMapImportInput
	Floors      []MarkdownDungeonFloorImportInput
}

type MarkdownNPCImportResult struct {
	Creature  models.Creature `json:"creature"`
	Operation string          `json:"operation"`
}

type MarkdownDungeonImportResult struct {
	Location  models.CampaignLocation `json:"location"`
	MapIDs    []string                `json:"mapIds"`
	Operation string                  `json:"operation"`
}

type MarkdownWorldImportResult struct {
	NPCs     []MarkdownNPCImportResult     `json:"npcs"`
	Dungeons []MarkdownDungeonImportResult `json:"dungeons"`
}

type MarkdownWorldStore struct {
	db *gorm.DB
}

func (s MarkdownWorldStore) NPCBySourceKey(
	ctx context.Context,
	ownerUserID string,
	sourceKey string,
) (models.Creature, error) {
	var entity dbmodels.CreatureEntity
	err := s.db.WithContext(ctx).
		Where("owner_user_id = ? and stat_block ->> 'markdownSourceKey' = ?", ownerUserID, sourceKey).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Creature{}, ErrNotFound
	}
	if err != nil {
		return models.Creature{}, err
	}
	return creatureFromEntity(entity), nil
}

func (s MarkdownWorldStore) LocationBySourceKey(
	ctx context.Context,
	ownerUserID string,
	campaignID string,
	sourceKey string,
) (models.CampaignLocation, error) {
	if err := ensureCampaignOwnedTx(ctx, s.db, ownerUserID, campaignID); err != nil {
		return models.CampaignLocation{}, err
	}
	var entity dbmodels.CampaignLocationEntity
	err := s.db.WithContext(ctx).
		Where("campaign_id = ? and map_anchor ->> 'markdownSourceKey' = ?", strings.TrimSpace(campaignID), sourceKey).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.CampaignLocation{}, ErrNotFound
	}
	if err != nil {
		return models.CampaignLocation{}, err
	}
	return locationFromEntity(entity, nil), nil
}
