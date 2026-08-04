package app

import (
	"context"
	"encoding/json"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

func (s *Service) CreateRollTable(
	ctx context.Context,
	campaignID string,
	command RollTableCommand,
) (RollTableWriteResult, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeWorldWrite)
	if err != nil {
		return RollTableWriteResult{}, err
	}
	if err := validateRollTableCommand(command); err != nil {
		return RollTableWriteResult{}, err
	}
	inputHash, _ := normalizedHash(command)
	var result RollTableWriteResult
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[RollTableWriteResult](
			ctx, tx, principal, "create_roll_table", command.IdempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			result = replay
			result.IdempotencyReplay = true
			return nil
		}
		entity := dbmodels.RollTableEntity{
			CampaignID: optionalID(campaignID), Source: "campaign",
			Name: strings.TrimSpace(command.Name), Description: strings.TrimSpace(command.Description),
			Category:      normalizedToken(command.Category, "custom"),
			Tags:          pq.StringArray(normalizedStringList(command.Tags)),
			DieExpression: strings.TrimSpace(command.DieExpression), Metadata: dbmodels.JSONMap{},
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
		rows := make([]models.RollTableRow, 0, len(command.Rows))
		for index, row := range command.Rows {
			if row.MinRoll > row.MaxRoll || row.MinRoll < 1 || strings.TrimSpace(row.ResultText) == "" {
				return ValidationError(
					"invalid_roll_table_row", "roll-table rows need a valid range and result text",
					map[string]any{"row": index},
				)
			}
			rowEntity := dbmodels.RollTableRowEntity{
				TableID: entity.ID, MinRoll: row.MinRoll, MaxRoll: row.MaxRoll,
				Label: strings.TrimSpace(row.Label), ResultText: strings.TrimSpace(row.ResultText),
				Notes: strings.TrimSpace(row.Notes), SortOrder: index,
			}
			if err := tx.WithContext(ctx).Create(&rowEntity).Error; err != nil {
				return err
			}
			rows = append(rows, models.RollTableRow{
				ID: rowEntity.ID, TableID: entity.ID, MinRoll: row.MinRoll, MaxRoll: row.MaxRoll,
				Label: rowEntity.Label, ResultText: rowEntity.ResultText,
				Notes: rowEntity.Notes, SortOrder: index,
			})
		}
		result = RollTableWriteResult{
			RollTable: models.RollTable{
				ID: entity.ID, CampaignID: campaignID, Source: entity.Source,
				Name: entity.Name, Description: entity.Description, Category: entity.Category,
				Tags: []string(entity.Tags), DieExpression: entity.DieExpression,
				Rows: rows, CreatedAt: entity.CreatedAt, UpdatedAt: entity.UpdatedAt,
			},
			AuthoringWriteMetadata: AuthoringWriteMetadata{
				Operation: "created", AppURL: s.AppURL("/campaigns/" + campaignID + "/world"), Warnings: []string{},
			},
		}
		return saveIdempotency(
			ctx, tx, principal, "create_roll_table", command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func (s *Service) CreateJourney(
	ctx context.Context,
	campaignID string,
	command JourneyCommand,
) (JourneyWriteResult, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeWorldWrite)
	if err != nil {
		return JourneyWriteResult{}, err
	}
	command.Name = strings.TrimSpace(command.Name)
	command.Origin = strings.TrimSpace(command.Origin)
	command.Destination = strings.TrimSpace(command.Destination)
	command.DistanceUnit = normalizedToken(command.DistanceUnit, "")
	command.Terrain = normalizedToken(command.Terrain, "")
	command.Pace = normalizedToken(command.Pace, "")
	command.RouteInputMode = normalizedToken(command.RouteInputMode, "route")
	if command.Name == "" || command.Distance <= 0 || travelUnitMiles[command.DistanceUnit] == 0 {
		return JourneyWriteResult{}, ValidationError(
			"invalid_journey", "name and a positive distance in miles, kilometers, or hexes are required", nil,
		)
	}
	if _, ok := travelMilesPerDay[command.Pace]; !ok {
		return JourneyWriteResult{}, ValidationError(
			"invalid_pace", "pace must be slow, normal, or fast", nil,
		)
	}
	if _, ok := travelTerrainRules[command.Terrain]; !ok {
		return JourneyWriteResult{}, ValidationError(
			"invalid_terrain", "unsupported terrain", nil,
		)
	}
	inputHash, _ := normalizedHash(command)
	var result JourneyWriteResult
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[JourneyWriteResult](
			ctx, tx, principal, "create_journey", command.IdempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			result = replay
			result.IdempotencyReplay = true
			return nil
		}
		weatherBytes, err := json.Marshal(command.Weather)
		if err != nil {
			return err
		}
		weather := dbmodels.JSONMap{}
		if err := json.Unmarshal(weatherBytes, &weather); err != nil {
			return err
		}
		entity := dbmodels.CampaignJourneyEntity{
			CampaignID: campaignID, Name: command.Name,
			Origin: command.Origin, Destination: command.Destination,
			Distance: command.Distance, DistanceUnit: command.DistanceUnit,
			Terrain: command.Terrain, Pace: command.Pace, GoodRoads: command.GoodRoads,
			EncounterDistanceFeet: command.EncounterDistanceFeet, Weather: weather,
			RouteInputMode: command.RouteInputMode,
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
		result = JourneyWriteResult{
			CampaignJourney: models.CampaignJourney{
				ID: entity.ID, CampaignID: campaignID, Name: entity.Name, Origin: entity.Origin,
				Destination: entity.Destination, Distance: entity.Distance,
				DistanceUnit: entity.DistanceUnit, Terrain: entity.Terrain, Pace: entity.Pace,
				GoodRoads: entity.GoodRoads, EncounterDistanceFeet: entity.EncounterDistanceFeet,
				Weather: command.Weather, RouteInputMode: entity.RouteInputMode,
				CreatedAt: entity.CreatedAt, UpdatedAt: entity.UpdatedAt,
			},
			AuthoringWriteMetadata: AuthoringWriteMetadata{
				Operation: "created", AppURL: s.AppURL("/campaigns/" + campaignID + "/world"), Warnings: []string{},
			},
		}
		return saveIdempotency(
			ctx, tx, principal, "create_journey", command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}
