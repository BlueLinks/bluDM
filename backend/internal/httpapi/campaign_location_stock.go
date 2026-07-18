package httpapi

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
)

type locationStockRequest struct {
	LocationID    string `json:"locationId"`
	ItemID        string `json:"itemId"`
	LibrarySource string `json:"librarySource"`
	Quantity      int    `json:"quantity"`
	PriceAmount   int    `json:"priceAmount"`
	PriceUnit     string `json:"priceUnit"`
	Availability  string `json:"availability"`
	Notes         string `json:"notes"`
	SortOrder     int    `json:"sortOrder"`
}

func (s *Server) listCampaignLocationStock(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	stock, err := s.locationStockForCampaign(r.Context(), campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list campaign location stock")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"stock": stock})
}

func (s *Server) upsertCampaignLocationStock(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var req locationStockRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := validateLocationStockRequest(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	stock, err := s.insertCampaignLocationStock(r.Context(), campaignID, req)
	if err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusBadRequest, "item and location must be available to the campaign")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not save campaign location stock")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"stock": stock})
}

func (s *Server) deleteCampaignLocationStock(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	stockID := strings.TrimSpace(r.PathValue("stockID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	if err := s.stores.Travel.DeleteLocationStock(r.Context(), currentUserIDMust(r.Context()), campaignID, stockID); err != nil {
		if !store.IsNotFound(err) {
			writeError(w, http.StatusInternalServerError, "could not delete campaign location stock")
			return
		}
		writeError(w, http.StatusNotFound, "location stock not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (req *locationStockRequest) normalize() {
	req.LocationID = strings.TrimSpace(req.LocationID)
	req.ItemID = strings.TrimSpace(req.ItemID)
	req.LibrarySource = strings.ToLower(strings.TrimSpace(req.LibrarySource))
	if req.LibrarySource == "" {
		req.LibrarySource = "user"
	}
	req.PriceUnit = strings.ToLower(strings.TrimSpace(req.PriceUnit))
	if req.PriceUnit == "" {
		req.PriceUnit = "gp"
	}
	req.Availability = normalizeLocationToken(req.Availability)
	if req.Availability == "" {
		req.Availability = "in-stock"
	}
	req.Notes = strings.TrimSpace(req.Notes)
}

func validateLocationStockRequest(req locationStockRequest) error {
	switch {
	case req.LocationID == "":
		return errors.New("locationId is required")
	case req.ItemID == "":
		return errors.New("itemId is required")
	case req.LibrarySource != "user" && req.LibrarySource != "standard":
		return errors.New("librarySource must be user or standard")
	case req.Quantity < 0:
		return errors.New("quantity cannot be negative")
	case req.PriceAmount < 0:
		return errors.New("priceAmount cannot be negative")
	default:
		return nil
	}
}

func (s *Server) locationStockForCampaign(ctx context.Context, campaignID string) ([]models.CampaignLocationStock, error) {
	return s.stores.Travel.LocationStockForCampaign(ctx, currentUserIDMust(ctx), campaignID)
}

func (s *Server) insertCampaignLocationStock(ctx context.Context, campaignID string, req locationStockRequest) (models.CampaignLocationStock, error) {
	return s.stores.Travel.UpsertLocationStock(ctx, currentUserIDMust(ctx), campaignID, store.LocationStockInput{
		LocationID:    req.LocationID,
		ItemID:        req.ItemID,
		LibrarySource: req.LibrarySource,
		Quantity:      req.Quantity,
		PriceAmount:   req.PriceAmount,
		PriceUnit:     req.PriceUnit,
		Availability:  req.Availability,
		Notes:         req.Notes,
		SortOrder:     req.SortOrder,
	})
}
