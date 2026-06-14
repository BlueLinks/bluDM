package httpapi

import (
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"sort"
	"strings"
	"time"
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
	table, err := s.stores.RollTables.Create(r.Context(), currentUserIDMust(r.Context()), campaignID, rollTableInputFromRequest(req))
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
	table, err := s.stores.RollTables.Update(r.Context(), currentUserIDMust(r.Context()), campaignID, tableID, rollTableInputFromRequest(req))
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
	if err := s.stores.RollTables.Delete(r.Context(), currentUserIDMust(r.Context()), campaignID, tableID); err != nil {
		if !store.IsNotFound(err) {
			writeError(w, http.StatusInternalServerError, "could not delete roll table")
			return
		}
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
	table, err := s.stores.RollTables.Create(r.Context(), currentUserIDMust(r.Context()), campaignID, rollTableInputFromRequest(req))
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
	return s.stores.RollTables.ListForCampaign(ctx, currentUserIDMust(ctx), campaignID)
}

func (s *Server) rollTableByID(ctx context.Context, campaignID string, tableID string) (models.RollTable, error) {
	if table, ok := providedRollTableByID(tableID); ok {
		return table, nil
	}
	return s.stores.RollTables.ByID(ctx, currentUserIDMust(ctx), campaignID, tableID)
}

func rollTableInputFromRequest(req rollTableRequest) store.RollTableInput {
	rows := make([]store.RollTableRowInput, 0, len(req.Rows))
	for _, row := range req.Rows {
		rows = append(rows, store.RollTableRowInput{
			MinRoll:    row.MinRoll,
			MaxRoll:    row.MaxRoll,
			Label:      row.Label,
			ResultText: row.ResultText,
			Notes:      row.Notes,
		})
	}
	return store.RollTableInput{
		Name:          req.Name,
		Description:   req.Description,
		Category:      req.Category,
		Tags:          req.Tags,
		DieExpression: req.DieExpression,
		Rows:          rows,
	}
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
