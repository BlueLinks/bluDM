package store

import (
	"context"
	"errors"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

type RollTableStore struct {
	db *gorm.DB
}

type RollTableInput struct {
	Name          string
	Description   string
	Category      string
	Tags          []string
	DieExpression string
	Rows          []RollTableRowInput
}

type RollTableRowInput struct {
	MinRoll    int
	MaxRoll    int
	Label      string
	ResultText string
	Notes      string
}

func (s RollTableStore) ListForCampaign(ctx context.Context, campaignID string) ([]models.RollTable, error) {
	var entities []dbmodels.RollTableEntity
	if err := s.db.WithContext(ctx).
		Where("campaign_id = ? and source = 'campaign'", strings.TrimSpace(campaignID)).
		Order("updated_at desc, name asc").
		Find(&entities).Error; err != nil {
		return nil, err
	}
	return s.attachRows(ctx, rollTablesFromEntities(entities))
}

func (s RollTableStore) ByID(ctx context.Context, campaignID, tableID string) (models.RollTable, error) {
	var entity dbmodels.RollTableEntity
	err := s.db.WithContext(ctx).
		Where("id = ? and campaign_id = ? and source = 'campaign'", strings.TrimSpace(tableID), strings.TrimSpace(campaignID)).
		First(&entity).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.RollTable{}, ErrNotFound
	}
	if err != nil {
		return models.RollTable{}, err
	}
	tables, err := s.attachRows(ctx, []models.RollTable{rollTableFromEntity(entity)})
	if err != nil {
		return models.RollTable{}, err
	}
	if len(tables) == 0 {
		return models.RollTable{}, ErrNotFound
	}
	return tables[0], nil
}

func (s RollTableStore) Create(ctx context.Context, campaignID string, input RollTableInput) (models.RollTable, error) {
	var table models.RollTable
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		entity := rollTableEntityFromInput(campaignID, input)
		if err := tx.Create(&entity).Error; err != nil {
			return err
		}
		if err := replaceRollTableRows(ctx, tx, entity.ID, input.Rows); err != nil {
			return err
		}
		table = rollTableFromEntity(entity)
		return nil
	})
	if err != nil {
		return models.RollTable{}, err
	}
	tables, err := s.attachRows(ctx, []models.RollTable{table})
	if err != nil {
		return models.RollTable{}, err
	}
	return tables[0], nil
}

func (s RollTableStore) Update(ctx context.Context, campaignID, tableID string, input RollTableInput) (models.RollTable, error) {
	var table models.RollTable
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var entity dbmodels.RollTableEntity
		err := tx.Where("id = ? and campaign_id = ? and source = 'campaign'", strings.TrimSpace(tableID), strings.TrimSpace(campaignID)).
			First(&entity).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}
		entity.Name = input.Name
		entity.Description = input.Description
		entity.Category = input.Category
		entity.Tags = pq.StringArray(input.Tags)
		entity.DieExpression = input.DieExpression
		if err := tx.Save(&entity).Error; err != nil {
			return err
		}
		if err := tx.Where("table_id = ?", entity.ID).Delete(&dbmodels.RollTableRowEntity{}).Error; err != nil {
			return err
		}
		if err := replaceRollTableRows(ctx, tx, entity.ID, input.Rows); err != nil {
			return err
		}
		table = rollTableFromEntity(entity)
		return nil
	})
	if err != nil {
		return models.RollTable{}, err
	}
	tables, err := s.attachRows(ctx, []models.RollTable{table})
	if err != nil {
		return models.RollTable{}, err
	}
	return tables[0], nil
}

func (s RollTableStore) Delete(ctx context.Context, campaignID, tableID string) error {
	result := s.db.WithContext(ctx).
		Where("id = ? and campaign_id = ? and source = 'campaign'", strings.TrimSpace(tableID), strings.TrimSpace(campaignID)).
		Delete(&dbmodels.RollTableEntity{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s RollTableStore) attachRows(ctx context.Context, tables []models.RollTable) ([]models.RollTable, error) {
	for index := range tables {
		var rowEntities []dbmodels.RollTableRowEntity
		if err := s.db.WithContext(ctx).
			Where("table_id = ?", tables[index].ID).
			Order("min_roll asc, max_roll asc").
			Find(&rowEntities).Error; err != nil {
			return nil, err
		}
		tables[index].Rows = rollTableRowsFromEntities(rowEntities)
	}
	return tables, nil
}

func replaceRollTableRows(ctx context.Context, tx *gorm.DB, tableID string, rows []RollTableRowInput) error {
	for index, row := range rows {
		entity := dbmodels.RollTableRowEntity{
			TableID:    tableID,
			MinRoll:    row.MinRoll,
			MaxRoll:    row.MaxRoll,
			Label:      row.Label,
			ResultText: row.ResultText,
			Notes:      row.Notes,
			SortOrder:  index,
		}
		if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
			return err
		}
	}
	return nil
}

func rollTableEntityFromInput(campaignID string, input RollTableInput) dbmodels.RollTableEntity {
	return dbmodels.RollTableEntity{
		CampaignID:    &campaignID,
		Source:        "campaign",
		Name:          input.Name,
		Description:   input.Description,
		Category:      input.Category,
		Tags:          pq.StringArray(input.Tags),
		DieExpression: input.DieExpression,
	}
}

func rollTablesFromEntities(entities []dbmodels.RollTableEntity) []models.RollTable {
	tables := make([]models.RollTable, 0, len(entities))
	for _, entity := range entities {
		tables = append(tables, rollTableFromEntity(entity))
	}
	return tables
}

func rollTableFromEntity(entity dbmodels.RollTableEntity) models.RollTable {
	return models.RollTable{
		ID:            entity.ID,
		CampaignID:    stringFromPointer(entity.CampaignID),
		Source:        entity.Source,
		Name:          entity.Name,
		Description:   entity.Description,
		Category:      entity.Category,
		Tags:          []string(entity.Tags),
		DieExpression: entity.DieExpression,
		CreatedAt:     entity.CreatedAt,
		UpdatedAt:     entity.UpdatedAt,
	}
}

func rollTableRowsFromEntities(entities []dbmodels.RollTableRowEntity) []models.RollTableRow {
	rows := make([]models.RollTableRow, 0, len(entities))
	for _, entity := range entities {
		rows = append(rows, models.RollTableRow{
			ID:         entity.ID,
			TableID:    entity.TableID,
			MinRoll:    entity.MinRoll,
			MaxRoll:    entity.MaxRoll,
			Label:      entity.Label,
			ResultText: entity.ResultText,
			Notes:      entity.Notes,
			SortOrder:  entity.SortOrder,
		})
	}
	return rows
}
