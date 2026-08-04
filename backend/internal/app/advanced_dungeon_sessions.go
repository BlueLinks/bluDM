package app

import (
	"context"
	"errors"
	"strings"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/generation"
	"bludm/backend/internal/models"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

func (s *Service) GenerateDungeonPreview(
	ctx context.Context,
	campaignID string,
	settings generation.DungeonSettings,
) (DungeonPreview, error) {
	if _, err := s.authorize(ctx, campaignID, ScopeWorldRead, ScopeGenerationRun); err != nil {
		return DungeonPreview{}, err
	}
	document := generation.GenerateDungeon(settings)
	warnings := []string{}
	if len(document.Rooms) == 0 {
		warnings = append(warnings, "The generated map has no room regions to save as locations.")
	}
	return DungeonPreview{Document: document, Warnings: warnings}, nil
}

func (s *Service) SaveGeneratedDungeon(
	ctx context.Context,
	campaignID string,
	command DungeonCommand,
) (SavedDungeon, error) {
	principal, err := s.authorize(
		ctx, campaignID, ScopeWorldWrite, ScopeGenerationRun,
	)
	if err != nil {
		return SavedDungeon{}, err
	}
	if strings.TrimSpace(command.Name) == "" {
		return SavedDungeon{}, ValidationError("missing_name", "dungeon name is required", nil)
	}
	if strings.TrimSpace(command.IdempotencyKey) == "" {
		return SavedDungeon{}, ValidationError(
			"missing_idempotency_key", "idempotencyKey is required", nil,
		)
	}
	document := generation.GenerateDungeon(command.Settings)
	inputHash, _ := normalizedHash(command)
	var result SavedDungeon
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[SavedDungeon](
			ctx, tx, principal, "save_generated_dungeon", command.IdempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			result = replay
			result.IdempotencyReplay = true
			return nil
		}
		if err := locationBelongsToCampaign(
			ctx, tx, campaignID, command.ParentLocationID,
		); err != nil {
			return err
		}
		root := dbmodels.CampaignLocationEntity{
			CampaignID: campaignID, ParentLocationID: optionalID(command.ParentLocationID),
			Name: strings.TrimSpace(command.Name), LocationType: "dungeon",
			Summary: strings.TrimSpace(command.Summary), Status: "active",
			Tags: pq.StringArray{"generated", "dungeon-studio"}, MapAnchor: dbmodels.JSONMap{},
		}
		if err := tx.WithContext(ctx).Create(&root).Error; err != nil {
			return err
		}
		rooms := make([]models.CampaignLocation, 0, len(document.Rooms))
		for index := range document.Rooms {
			room := &document.Rooms[index]
			entity := dbmodels.CampaignLocationEntity{
				CampaignID: campaignID, ParentLocationID: &root.ID,
				Name: room.Label, LocationType: "room", SortOrder: index, Status: "active",
				Tags: pq.StringArray{"generated"}, MapAnchor: dbmodels.JSONMap{},
			}
			if strings.TrimSpace(entity.Name) == "" {
				entity.Name = "Room " + rangeLabel(index+1, index+1)
			}
			if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
				return err
			}
			room.LocationID = entity.ID
			rooms = append(rooms, locationModel(entity))
		}
		metadata, err := jsonMap(map[string]any{
			"dungeonStudio": document, "source": "mcp", "generatorVersion": "dungeon-studio@1",
		})
		if err != nil {
			return err
		}
		mapEntity := dbmodels.CampaignMapEntity{
			CampaignID: campaignID, ParentLocationID: &root.ID,
			Name: root.Name + " Studio Map", Description: root.Summary,
			MapType: "dungeon", Mode: "blank",
			Width: float64(document.Grid.Width * 20), Height: float64(document.Grid.Height * 20),
			ScaleDistancePerPixel: float64(document.Grid.CellSizeFeet) / 20,
			ScaleDistanceUnit:     "feet", CalibrationPixelLength: 20,
			CalibrationDistance: float64(document.Grid.CellSizeFeet), Metadata: metadata,
		}
		if err := tx.WithContext(ctx).Create(&mapEntity).Error; err != nil {
			return err
		}
		result = SavedDungeon{
			Location: locationModel(root), Rooms: rooms, Map: campaignMapModel(mapEntity),
			Document:  document,
			AppURL:    s.AppURL("/campaigns/" + campaignID + "/world/location/" + root.ID),
			Operation: "created",
			Warnings:  []string{},
		}
		return saveIdempotency(
			ctx, tx, principal, "save_generated_dungeon", command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func campaignMapModel(entity dbmodels.CampaignMapEntity) models.CampaignMap {
	return models.CampaignMap{
		ID: entity.ID, CampaignID: entity.CampaignID,
		ParentLocationID: stringFromID(entity.ParentLocationID),
		Name:             entity.Name, Description: entity.Description, MapType: entity.MapType, Mode: entity.Mode,
		Width: entity.Width, Height: entity.Height,
		ScaleDistancePerPixel:  entity.ScaleDistancePerPixel,
		ScaleDistanceUnit:      entity.ScaleDistanceUnit,
		CalibrationPixelLength: entity.CalibrationPixelLength,
		CalibrationDistance:    entity.CalibrationDistance,
		Metadata:               map[string]any(entity.Metadata), CreatedAt: entity.CreatedAt, UpdatedAt: entity.UpdatedAt,
	}
}

func stringFromID(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

type CompletedRunSummary struct {
	Run       models.EncounterRun `json:"run"`
	Encounter models.Encounter    `json:"encounter"`
	AppURL    string              `json:"appUrl"`
}

func (s *Service) GetCompletedRunSummary(
	ctx context.Context,
	campaignID string,
	runID string,
) (CompletedRunSummary, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeSessionsRead)
	if err != nil {
		return CompletedRunSummary{}, err
	}
	var row struct {
		RunID       string
		EncounterID string
	}
	err = s.db.WithContext(ctx).Table("encounter_runs").
		Select("encounter_runs.id as run_id, encounters.id as encounter_id").
		Joins("join encounters on encounters.id = encounter_runs.encounter_id").
		Joins("join campaigns on campaigns.id = encounters.campaign_id").
		Where(
			"encounter_runs.id = ? and encounter_runs.status = 'ended' and campaigns.id = ? and campaigns.owner_user_id = ?",
			strings.TrimSpace(runID), campaignID, principal.UserID,
		).Take(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) || row.RunID == "" {
		return CompletedRunSummary{}, NewError(CodeNotFound, "completed run not found", nil)
	}
	if err != nil {
		return CompletedRunSummary{}, err
	}
	run, err := s.stores.Runs.ByID(ctx, principal.UserID, row.RunID)
	if err != nil {
		return CompletedRunSummary{}, storeError(err, "completed run")
	}
	encounter, err := s.stores.Encounters.ByID(ctx, principal.UserID, row.EncounterID)
	if err != nil {
		return CompletedRunSummary{}, storeError(err, "encounter")
	}
	return CompletedRunSummary{
		Run: run, Encounter: encounter,
		AppURL: s.AppURL("/campaigns/" + campaignID + "/encounters/" + encounter.ID),
	}, nil
}

type ContinuityRun struct {
	RunID         string         `json:"runId"`
	EncounterID   string         `json:"encounterId"`
	EncounterName string         `json:"encounterName"`
	EndedAt       time.Time      `json:"endedAt"`
	Summary       map[string]any `json:"summary"`
}

type CampaignContinuityContext struct {
	Campaign      CampaignContext                  `json:"campaign"`
	Locations     []models.CampaignLocation        `json:"locations"`
	Links         []models.CampaignLocationLink    `json:"links"`
	NPCPlacements []models.CampaignNpcLocationLink `json:"npcPlacements"`
	Encounters    []models.Encounter               `json:"encounters"`
	RecentRuns    []ContinuityRun                  `json:"recentRuns"`
	PrepGaps      []PrepGap                        `json:"prepGaps"`
}

func (s *Service) GetCampaignContinuityContext(
	ctx context.Context,
	campaignID string,
) (CampaignContinuityContext, error) {
	principal, err := s.authorize(
		ctx, campaignID, ScopeCampaignsRead, ScopeWorldRead,
		ScopeEncountersRead, ScopeSessionsRead,
	)
	if err != nil {
		return CampaignContinuityContext{}, err
	}
	campaign, err := s.CampaignContext(ctx, campaignID)
	if err != nil {
		return CampaignContinuityContext{}, err
	}
	locations, err := s.stores.Travel.LocationsForCampaign(ctx, principal.UserID, campaignID)
	if err != nil {
		return CampaignContinuityContext{}, err
	}
	links, err := s.stores.Travel.LocationLinksForCampaign(ctx, principal.UserID, campaignID)
	if err != nil {
		return CampaignContinuityContext{}, err
	}
	npcs, err := s.stores.Travel.NpcLocationLinksForCampaign(ctx, principal.UserID, campaignID)
	if err != nil {
		return CampaignContinuityContext{}, err
	}
	encounters, err := s.stores.Campaigns.Encounters(ctx, principal.UserID, campaignID)
	if err != nil {
		return CampaignContinuityContext{}, err
	}
	var runRows []struct {
		RunID         string
		EncounterID   string
		EncounterName string
		EndedAt       time.Time
		Summary       dbmodels.JSONMap
	}
	if err := s.db.WithContext(ctx).Table("encounter_runs").
		Select(`encounter_runs.id as run_id, encounters.id as encounter_id,
			encounters.name as encounter_name, encounter_runs.ended_at, encounter_runs.summary`).
		Joins("join encounters on encounters.id = encounter_runs.encounter_id").
		Where("encounters.campaign_id = ? and encounter_runs.status = 'ended' and encounter_runs.is_test = false", campaignID).
		Order("encounter_runs.ended_at desc").Limit(10).Scan(&runRows).Error; err != nil {
		return CampaignContinuityContext{}, err
	}
	runs := make([]ContinuityRun, 0, len(runRows))
	for _, row := range runRows {
		runs = append(runs, ContinuityRun{
			RunID: row.RunID, EncounterID: row.EncounterID, EncounterName: row.EncounterName,
			EndedAt: row.EndedAt, Summary: map[string]any(row.Summary),
		})
	}
	gaps, err := s.PrepGaps(ctx, campaignID)
	if err != nil {
		return CampaignContinuityContext{}, err
	}
	return CampaignContinuityContext{
		Campaign: campaign, Locations: locations, Links: links, NPCPlacements: npcs,
		Encounters: encounters, RecentRuns: runs, PrepGaps: gaps,
	}, nil
}
