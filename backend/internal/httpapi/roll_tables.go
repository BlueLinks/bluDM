package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type rollTableRequest struct {
	Name          string                `json:"name"`
	Description   string                `json:"description"`
	Category      string                `json:"category"`
	Tags          []string              `json:"tags"`
	DieExpression string                `json:"dieExpression"`
	Rows          []rollTableRowRequest `json:"rows"`
}

type rollTableRowRequest struct {
	MinRoll    int    `json:"minRoll"`
	MaxRoll    int    `json:"maxRoll"`
	Label      string `json:"label"`
	ResultText string `json:"resultText"`
	Notes      string `json:"notes"`
}

func (s *Server) listCampaignRollTables(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	tables, err := s.rollTablesForCampaign(r.Context(), campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list roll tables")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"tables": append(providedRollTables(), tables...)})
}

func (s *Server) getCampaignRollTable(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	tableID := strings.TrimSpace(r.PathValue("tableID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	table, err := s.rollTableByID(r.Context(), campaignID, tableID)
	if err != nil {
		writeError(w, http.StatusNotFound, "roll table not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"table": table})
}

func (s *Server) createCampaignRollTable(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var req rollTableRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := validateRollTableRequest(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	table, err := s.insertRollTable(r.Context(), campaignID, req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create roll table")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"table": table})
}

func (s *Server) updateCampaignRollTable(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	tableID := strings.TrimSpace(r.PathValue("tableID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var req rollTableRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := validateRollTableRequest(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	table, err := s.updateRollTableRecord(r.Context(), campaignID, tableID, req)
	if err != nil {
		writeError(w, http.StatusNotFound, "roll table not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"table": table})
}

func (s *Server) deleteCampaignRollTable(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	tableID := strings.TrimSpace(r.PathValue("tableID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	tag, err := s.db.Exec(r.Context(), `
		delete from roll_tables where id = $1 and campaign_id = $2 and source = 'campaign'
	`, tableID, campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete roll table")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "roll table not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) cloneCampaignRollTable(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	tableID := strings.TrimSpace(r.PathValue("tableID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	sourceTable, err := s.rollTableByID(r.Context(), campaignID, tableID)
	if err != nil {
		writeError(w, http.StatusNotFound, "roll table not found")
		return
	}
	req := requestFromRollTable(sourceTable)
	req.Name = "Copy of " + sourceTable.Name
	table, err := s.insertRollTable(r.Context(), campaignID, req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not clone roll table")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"table": table})
}

func (s *Server) rollCampaignRollTable(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	tableID := strings.TrimSpace(r.PathValue("tableID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	table, err := s.rollTableByID(r.Context(), campaignID, tableID)
	if err != nil {
		writeError(w, http.StatusNotFound, "roll table not found")
		return
	}
	result, err := rollOnTable(table)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"roll": result})
}

func (req *rollTableRequest) normalize() {
	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)
	req.Category = normalizeRollTableOption(req.Category)
	if req.Category == "" {
		req.Category = "custom"
	}
	req.DieExpression = strings.ToLower(strings.TrimSpace(req.DieExpression))
	req.Tags = normalizeRollTableTags(req.Tags)
	for index := range req.Rows {
		req.Rows[index].Label = strings.TrimSpace(req.Rows[index].Label)
		req.Rows[index].ResultText = strings.TrimSpace(req.Rows[index].ResultText)
		req.Rows[index].Notes = strings.TrimSpace(req.Rows[index].Notes)
	}
	sort.SliceStable(req.Rows, func(i, j int) bool {
		if req.Rows[i].MinRoll == req.Rows[j].MinRoll {
			return req.Rows[i].MaxRoll < req.Rows[j].MaxRoll
		}
		return req.Rows[i].MinRoll < req.Rows[j].MinRoll
	})
}

func validateRollTableRequest(req rollTableRequest) error {
	if req.Name == "" {
		return errors.New("name is required")
	}
	dieSize := rollTableDieSize(req.DieExpression)
	if dieSize == 0 {
		return errors.New("dieExpression is invalid")
	}
	if !rollTableCategories[req.Category] {
		return errors.New("category is invalid")
	}
	if len(req.Rows) == 0 {
		return errors.New("rows are required")
	}
	expectedMin := 1
	for _, row := range req.Rows {
		switch {
		case row.MinRoll < 1 || row.MaxRoll > dieSize || row.MinRoll > row.MaxRoll:
			return errors.New("row range is invalid")
		case row.MinRoll != expectedMin:
			return errors.New("row ranges must cover the die without gaps or overlaps")
		case row.Label == "":
			return errors.New("row label is required")
		case row.ResultText == "":
			return errors.New("row resultText is required")
		}
		expectedMin = row.MaxRoll + 1
	}
	if expectedMin != dieSize+1 {
		return errors.New("row ranges must cover the die without gaps or overlaps")
	}
	return nil
}

func (s *Server) rollTablesForCampaign(ctx context.Context, campaignID string) ([]models.RollTable, error) {
	rows, err := s.db.Query(ctx, `
		select id, campaign_id, source, name, description, category, tags, die_expression, created_at, updated_at
		from roll_tables
		where campaign_id = $1 and source = 'campaign'
		order by updated_at desc, name asc
	`, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	tables := []models.RollTable{}
	for rows.Next() {
		table, err := scanRollTable(rows)
		if err != nil {
			return nil, err
		}
		tables = append(tables, table)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return s.attachRollTableRows(ctx, tables)
}

func (s *Server) rollTableByID(ctx context.Context, campaignID string, tableID string) (models.RollTable, error) {
	if table, ok := providedRollTableByID(tableID); ok {
		return table, nil
	}
	row := s.db.QueryRow(ctx, `
		select id, campaign_id, source, name, description, category, tags, die_expression, created_at, updated_at
		from roll_tables
		where id = $1 and campaign_id = $2 and source = 'campaign'
	`, tableID, campaignID)
	table, err := scanRollTable(row)
	if err != nil {
		return models.RollTable{}, err
	}
	tables, err := s.attachRollTableRows(ctx, []models.RollTable{table})
	if err != nil {
		return models.RollTable{}, err
	}
	if len(tables) == 0 {
		return models.RollTable{}, pgx.ErrNoRows
	}
	return tables[0], nil
}

func (s *Server) insertRollTable(ctx context.Context, campaignID string, req rollTableRequest) (models.RollTable, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return models.RollTable{}, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	row := tx.QueryRow(ctx, `
		insert into roll_tables (campaign_id, source, name, description, category, tags, die_expression)
		values ($1, 'campaign', $2, $3, $4, $5, $6)
		returning id, campaign_id, source, name, description, category, tags, die_expression, created_at, updated_at
	`, campaignID, req.Name, req.Description, req.Category, req.Tags, req.DieExpression)
	table, err := scanRollTable(row)
	if err != nil {
		return models.RollTable{}, err
	}
	if err := replaceRollTableRows(ctx, tx, table.ID, req.Rows); err != nil {
		return models.RollTable{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.RollTable{}, err
	}
	tables, err := s.attachRollTableRows(ctx, []models.RollTable{table})
	if err != nil {
		return models.RollTable{}, err
	}
	return tables[0], nil
}

func (s *Server) updateRollTableRecord(ctx context.Context, campaignID string, tableID string, req rollTableRequest) (models.RollTable, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return models.RollTable{}, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	row := tx.QueryRow(ctx, `
		update roll_tables
		set name = $3, description = $4, category = $5, tags = $6, die_expression = $7, updated_at = now()
		where id = $1 and campaign_id = $2 and source = 'campaign'
		returning id, campaign_id, source, name, description, category, tags, die_expression, created_at, updated_at
	`, tableID, campaignID, req.Name, req.Description, req.Category, req.Tags, req.DieExpression)
	table, err := scanRollTable(row)
	if err != nil {
		return models.RollTable{}, err
	}
	if _, err := tx.Exec(ctx, `delete from roll_table_rows where table_id = $1`, tableID); err != nil {
		return models.RollTable{}, err
	}
	if err := replaceRollTableRows(ctx, tx, table.ID, req.Rows); err != nil {
		return models.RollTable{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.RollTable{}, err
	}
	tables, err := s.attachRollTableRows(ctx, []models.RollTable{table})
	if err != nil {
		return models.RollTable{}, err
	}
	return tables[0], nil
}

func replaceRollTableRows(ctx context.Context, tx pgx.Tx, tableID string, rows []rollTableRowRequest) error {
	for index, row := range rows {
		if _, err := tx.Exec(ctx, `
			insert into roll_table_rows (table_id, min_roll, max_roll, label, result_text, notes, sort_order)
			values ($1, $2, $3, $4, $5, $6, $7)
		`, tableID, row.MinRoll, row.MaxRoll, row.Label, row.ResultText, row.Notes, index); err != nil {
			return err
		}
	}
	return nil
}

func (s *Server) attachRollTableRows(ctx context.Context, tables []models.RollTable) ([]models.RollTable, error) {
	result := make([]models.RollTable, 0, len(tables))
	for _, table := range tables {
		if table.Source == "provided" {
			result = append(result, table)
			continue
		}
		rows, err := s.db.Query(ctx, `
			select id, table_id, min_roll, max_roll, label, result_text, notes, sort_order
			from roll_table_rows
			where table_id = $1
			order by min_roll asc, max_roll asc
		`, table.ID)
		if err != nil {
			return nil, err
		}
		tableRows := []models.RollTableRow{}
		for rows.Next() {
			row, err := scanRollTableRow(rows)
			if err != nil {
				rows.Close()
				return nil, err
			}
			tableRows = append(tableRows, row)
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			return nil, err
		}
		rows.Close()
		table.Rows = tableRows
		result = append(result, table)
	}
	return result, nil
}

func scanRollTable(row scanner) (models.RollTable, error) {
	var table models.RollTable
	err := row.Scan(
		&table.ID,
		&table.CampaignID,
		&table.Source,
		&table.Name,
		&table.Description,
		&table.Category,
		&table.Tags,
		&table.DieExpression,
		&table.CreatedAt,
		&table.UpdatedAt,
	)
	return table, err
}

func scanRollTableRow(row scanner) (models.RollTableRow, error) {
	var tableRow models.RollTableRow
	err := row.Scan(
		&tableRow.ID,
		&tableRow.TableID,
		&tableRow.MinRoll,
		&tableRow.MaxRoll,
		&tableRow.Label,
		&tableRow.ResultText,
		&tableRow.Notes,
		&tableRow.SortOrder,
	)
	return tableRow, err
}

func rollOnTable(table models.RollTable) (models.RollTableRollResult, error) {
	dieSize := rollTableDieSize(table.DieExpression)
	if dieSize == 0 {
		return models.RollTableRollResult{}, errors.New("dieExpression is invalid")
	}
	value, err := secureRollDie(dieSize)
	if err != nil {
		return models.RollTableRollResult{}, err
	}
	for _, row := range table.Rows {
		if value >= row.MinRoll && value <= row.MaxRoll {
			return models.RollTableRollResult{
				TableID:       table.ID,
				TableName:     table.Name,
				DieExpression: table.DieExpression,
				RolledValue:   value,
				MatchedRange:  rollRangeLabel(row.MinRoll, row.MaxRoll),
				Label:         row.Label,
				ResultText:    row.ResultText,
				Notes:         row.Notes,
				RolledAt:      time.Now().UTC(),
			}, nil
		}
	}
	return models.RollTableRollResult{}, errors.New("no row matched roll")
}

func secureRollDie(sides int) (int, error) {
	if sides < 1 {
		return 0, errors.New("die size is invalid")
	}
	value, err := rand.Int(rand.Reader, big.NewInt(int64(sides)))
	if err != nil {
		return 0, err
	}
	return int(value.Int64()) + 1, nil
}

func rollRangeLabel(minRoll int, maxRoll int) string {
	if minRoll == maxRoll {
		return fmt.Sprintf("%d", minRoll)
	}
	return fmt.Sprintf("%d-%d", minRoll, maxRoll)
}
