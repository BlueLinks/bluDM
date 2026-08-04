package httpapi

import (
	"net/http"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/generation"
)

func (s *Server) externalListRollTables(w http.ResponseWriter, r *http.Request) {
	result, err := s.app.ListRollTables(r.Context(), r.PathValue("campaignID"))
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	start, end, page, err := pageBounds(r, len(result))
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"tables": result[start:end], "page": page})
}

func (s *Server) externalRollOnTable(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Roll int    `json:"roll,omitempty"`
		Seed string `json:"seed,omitempty"`
	}
	if !decodeExternalJSON(s, w, r, &request) {
		return
	}
	result, err := s.app.RollOnTable(
		r.Context(), r.PathValue("campaignID"), r.PathValue("tableID"), request.Roll, request.Seed,
	)
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalUpdateRollTable(w http.ResponseWriter, r *http.Request) {
	var command appdomain.RollTableCommand
	if !decodeExternalJSON(s, w, r, &command) {
		return
	}
	command.IdempotencyKey = idempotencyKey(r, command.IdempotencyKey)
	result, err := s.app.UpdateRollTable(
		r.Context(), r.PathValue("campaignID"), r.PathValue("tableID"), command,
	)
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalCalculateTravel(w http.ResponseWriter, r *http.Request) {
	var command appdomain.TravelCalculationCommand
	if !decodeExternalJSON(s, w, r, &command) {
		return
	}
	result, err := s.app.CalculateTravel(
		r.Context(), r.PathValue("campaignID"), command,
	)
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalDungeonPreview(w http.ResponseWriter, r *http.Request) {
	var settings generation.DungeonSettings
	if !decodeExternalJSON(s, w, r, &settings) {
		return
	}
	result, err := s.app.GenerateDungeonPreview(
		r.Context(), r.PathValue("campaignID"), settings,
	)
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalSaveDungeon(w http.ResponseWriter, r *http.Request) {
	var command appdomain.DungeonCommand
	if !decodeExternalJSON(s, w, r, &command) {
		return
	}
	result, err := s.app.SaveGeneratedDungeon(
		r.Context(), r.PathValue("campaignID"), command,
	)
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, result)
}

func (s *Server) externalCompletedRun(w http.ResponseWriter, r *http.Request) {
	result, err := s.app.GetCompletedRunSummary(
		r.Context(), r.PathValue("campaignID"), r.PathValue("runID"),
	)
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalContinuityContext(w http.ResponseWriter, r *http.Request) {
	result, err := s.app.GetCampaignContinuityContext(
		r.Context(), r.PathValue("campaignID"),
	)
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalPreviewShopStock(w http.ResponseWriter, r *http.Request) {
	var command appdomain.ShopStockChangesCommand
	if !decodeExternalJSON(s, w, r, &command) {
		return
	}
	result, err := s.app.PreviewShopStockChanges(
		r.Context(), r.PathValue("campaignID"), command,
	)
	writeExternalResult(w, r, result, err)
}

func (s *Server) externalApplyShopStock(w http.ResponseWriter, r *http.Request) {
	var command appdomain.ShopStockChangesCommand
	if !decodeExternalJSON(s, w, r, &command) {
		return
	}
	result, err := s.app.ApplyShopStockChanges(
		r.Context(), r.PathValue("campaignID"), command,
	)
	writeExternalResult(w, r, result, err)
}
