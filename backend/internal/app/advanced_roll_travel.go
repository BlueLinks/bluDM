package app

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"github.com/lib/pq"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (s *Service) ListRollTables(
	ctx context.Context,
	campaignID string,
) ([]RollTableSummary, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeWorldRead)
	if err != nil {
		return nil, err
	}
	tables, err := s.stores.RollTables.ListForCampaign(ctx, principal.UserID, campaignID)
	if err != nil {
		return nil, err
	}
	result := make([]RollTableSummary, 0, len(tables))
	for _, table := range tables {
		result = append(result, RollTableSummary{
			RollTable: table, AppURL: s.AppURL("/campaigns/" + campaignID + "/world"),
		})
	}
	return result, nil
}

type RollTableSummary struct {
	models.RollTable
	AppURL string `json:"appUrl"`
}

func (s *Service) RollOnTable(
	ctx context.Context,
	campaignID string,
	tableID string,
	suppliedRoll int,
	seed string,
) (models.RollTableRollResult, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeWorldRead)
	if err != nil {
		return models.RollTableRollResult{}, err
	}
	table, err := s.stores.RollTables.ByID(ctx, principal.UserID, campaignID, tableID)
	if err != nil {
		return models.RollTableRollResult{}, storeError(err, "roll table")
	}
	sides := dieSize(table.DieExpression)
	if sides == 0 {
		return models.RollTableRollResult{}, ValidationError(
			"invalid_die_expression", "only 1dN roll-table expressions are supported", nil,
		)
	}
	value := suppliedRoll
	if value != 0 && strings.TrimSpace(seed) != "" {
		return models.RollTableRollResult{}, ValidationError(
			"ambiguous_roll_input", "provide either roll or seed, not both", nil,
		)
	}
	if value == 0 {
		if strings.TrimSpace(seed) == "" {
			return models.RollTableRollResult{}, ValidationError(
				"missing_roll_seed", "provide an explicit roll or a caller-stable seed", nil,
			)
		}
		value = deterministicSeed(table.ID+":"+strings.TrimSpace(seed))%sides + 1
	}
	if value < 1 || value > sides {
		return models.RollTableRollResult{}, ValidationError(
			"roll_out_of_range", "roll must be within the table die range",
			map[string]any{"minimum": 1, "maximum": sides},
		)
	}
	for _, row := range table.Rows {
		if value < row.MinRoll || value > row.MaxRoll {
			continue
		}
		return models.RollTableRollResult{
			TableID: table.ID, TableName: table.Name, DieExpression: table.DieExpression,
			RolledValue: value, MatchedRange: rangeLabel(row.MinRoll, row.MaxRoll),
			Label: row.Label, ResultText: row.ResultText, Notes: row.Notes,
			RolledAt: time.Now().UTC(),
		}, nil
	}
	return models.RollTableRollResult{}, ValidationError(
		"unmatched_roll", "the roll table has no row for this value", map[string]any{"roll": value},
	)
}

func (s *Service) UpdateRollTable(
	ctx context.Context,
	campaignID string,
	tableID string,
	command RollTableCommand,
) (RollTableWriteResult, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeWorldWrite)
	if err != nil {
		return RollTableWriteResult{}, err
	}
	if err := validateRollTableCommand(command); err != nil {
		return RollTableWriteResult{}, err
	}
	if command.ExpectedUpdatedAt == nil {
		return RollTableWriteResult{}, ValidationError(
			"missing_concurrency", "expectedUpdatedAt is required", nil,
		)
	}
	inputHash, _ := normalizedHash(command)
	var result RollTableWriteResult
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[RollTableWriteResult](
			ctx, tx, principal, "update_roll_table:"+tableID,
			command.IdempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			result = replay
			result.IdempotencyReplay = true
			return nil
		}
		var entity dbmodels.RollTableEntity
		err = tx.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? and campaign_id = ?", tableID, campaignID).
			First(&entity).Error
		if err != nil {
			return storeError(err, "roll table")
		}
		if !databaseTimestampEqual(entity.UpdatedAt, *command.ExpectedUpdatedAt) {
			return NewError(
				CodeConflict, "roll table changed after it was read",
				map[string]any{"currentUpdatedAt": entity.UpdatedAt},
			)
		}
		entity.Name = strings.TrimSpace(command.Name)
		entity.Description = strings.TrimSpace(command.Description)
		entity.Category = normalizedToken(command.Category, "custom")
		entity.Tags = pq.StringArray(normalizedStringList(command.Tags))
		entity.DieExpression = strings.ToLower(strings.TrimSpace(command.DieExpression))
		if err := tx.WithContext(ctx).Clauses(clause.Returning{}).Save(&entity).Error; err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Where("table_id = ?", entity.ID).
			Delete(&dbmodels.RollTableRowEntity{}).Error; err != nil {
			return err
		}
		rows := make([]models.RollTableRow, 0, len(command.Rows))
		for index, row := range command.Rows {
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
				Tags: []string(entity.Tags), DieExpression: entity.DieExpression, Rows: rows,
				CreatedAt: entity.CreatedAt, UpdatedAt: entity.UpdatedAt,
			},
			AuthoringWriteMetadata: AuthoringWriteMetadata{
				Operation: "updated", AppURL: s.AppURL("/campaigns/" + campaignID + "/world"), Warnings: []string{},
			},
		}
		return saveIdempotency(
			ctx, tx, principal, "update_roll_table:"+tableID,
			command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func validateRollTableCommand(command RollTableCommand) error {
	if strings.TrimSpace(command.Name) == "" || len(command.Rows) == 0 {
		return ValidationError(
			"invalid_roll_table", "name and at least one row are required", nil,
		)
	}
	sides := dieSize(command.DieExpression)
	if sides == 0 {
		return ValidationError(
			"invalid_die_expression", "dieExpression must use the 1dN form", nil,
		)
	}
	expected := 1
	for index, row := range command.Rows {
		if row.MinRoll != expected || row.MaxRoll < row.MinRoll || row.MaxRoll > sides ||
			strings.TrimSpace(row.Label) == "" || strings.TrimSpace(row.ResultText) == "" {
			return ValidationError(
				"invalid_roll_table_row",
				"rows must completely cover the die without gaps or overlaps and include labels and results",
				map[string]any{"row": index},
			)
		}
		expected = row.MaxRoll + 1
	}
	if expected != sides+1 {
		return ValidationError(
			"incomplete_roll_table", "rows must completely cover the die", nil,
		)
	}
	return nil
}

func dieSize(expression string) int {
	parts := strings.Split(strings.ToLower(strings.TrimSpace(expression)), "d")
	if len(parts) != 2 || parts[0] != "1" {
		return 0
	}
	sides, err := strconv.Atoi(parts[1])
	if err != nil || sides < 2 || sides > 1000 {
		return 0
	}
	return sides
}

func rangeLabel(minimum, maximum int) string {
	if minimum == maximum {
		return strconv.Itoa(minimum)
	}
	return fmt.Sprintf("%d-%d", minimum, maximum)
}

func (s *Service) CalculateTravel(
	ctx context.Context,
	campaignID string,
	command TravelCalculationCommand,
) (TravelCalculation, error) {
	if _, err := s.authorize(ctx, campaignID, ScopeWorldRead); err != nil {
		return TravelCalculation{}, err
	}
	unit := normalizedToken(command.DistanceUnit, "")
	terrain := normalizedToken(command.Terrain, "")
	pace := normalizedToken(command.Pace, "")
	if command.Distance <= 0 || travelUnitMiles[unit] == 0 {
		return TravelCalculation{}, ValidationError(
			"invalid_distance", "use a positive distance in miles, kilometers, or hexes", nil,
		)
	}
	milesPerDay, ok := travelMilesPerDay[pace]
	if !ok {
		return TravelCalculation{}, ValidationError(
			"invalid_pace", "pace must be slow, normal, or fast", nil,
		)
	}
	rule, ok := travelTerrainRules[terrain]
	if !ok {
		return TravelCalculation{}, ValidationError("invalid_terrain", "unsupported terrain", nil)
	}
	maximum := rule.maximumPace
	if command.GoodRoads && maximum == "slow" {
		maximum = "normal"
	} else if command.GoodRoads && maximum == "normal" {
		maximum = "fast"
	}
	if travelPaceOrder[pace] > travelPaceOrder[maximum] {
		pace = maximum
		milesPerDay = travelMilesPerDay[pace]
	}
	miles := command.Distance * travelUnitMiles[unit]
	days := miles / milesPerDay
	return TravelCalculation{
		DistanceMiles: roundNumber(miles, 2), DurationHours: roundNumber(days*24, 2),
		DurationDays: roundNumber(days, 2), EffectivePace: pace, MilesPerDay: milesPerDay,
		TerrainMaximumPace: rule.maximumPace, EncounterDistance: rule.encounterDistance,
		Assumptions: []string{
			fmt.Sprintf("%.2f %s converts to %.2f miles.", command.Distance, unit, miles),
			fmt.Sprintf("%s terrain caps ordinary movement at %s pace.", terrain, rule.maximumPace),
			"Travel days use the 2014 core rates of 18, 24, or 30 miles per day.",
		},
		Ruleset: "dnd-5e-2014",
	}, nil
}

type travelRule struct {
	maximumPace       string
	encounterDistance string
}

var travelUnitMiles = map[string]float64{"miles": 1, "kilometers": 0.621371, "hexes": 5}
var travelMilesPerDay = map[string]float64{"slow": 18, "normal": 24, "fast": 30}
var travelPaceOrder = map[string]int{"slow": 1, "normal": 2, "fast": 3}
var travelTerrainRules = map[string]travelRule{
	"arctic": {"fast", "6d6 × 10 feet"}, "coastal": {"normal", "2d10 × 10 feet"},
	"desert": {"normal", "6d6 × 10 feet"}, "forest": {"normal", "2d8 × 10 feet"},
	"grassland": {"fast", "6d6 × 10 feet"}, "hill": {"normal", "2d10 × 10 feet"},
	"mountain": {"slow", "4d10 × 10 feet"}, "swamp": {"slow", "2d8 × 10 feet"},
	"underdark": {"normal", "2d6 × 10 feet"}, "urban": {"normal", "2d6 × 10 feet"},
	"waterborne": {"normal", "6d6 × 10 feet"},
}

func roundNumber(value float64, places int) float64 {
	scale := math.Pow10(places)
	return math.Round(value*scale) / scale
}
