package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"bludm/backend/internal/store"
)

type campaignMapRequest struct {
	ParentLocationID       string         `json:"parentLocationId"`
	Name                   string         `json:"name"`
	Description            string         `json:"description"`
	MapType                string         `json:"mapType"`
	Mode                   string         `json:"mode"`
	ImageAssetID           string         `json:"imageAssetId"`
	Width                  float64        `json:"width"`
	Height                 float64        `json:"height"`
	ScaleDistancePerPixel  float64        `json:"scaleDistancePerPixel"`
	ScaleDistanceUnit      string         `json:"scaleDistanceUnit"`
	CalibrationPixelLength float64        `json:"calibrationPixelLength"`
	CalibrationDistance    float64        `json:"calibrationDistance"`
	Metadata               map[string]any `json:"metadata"`
}

type campaignMapPinRequest struct {
	LocationID    string         `json:"locationId"`
	X             float64        `json:"x"`
	Y             float64        `json:"y"`
	LabelOverride string         `json:"labelOverride"`
	Visibility    string         `json:"visibility"`
	State         string         `json:"state"`
	Metadata      map[string]any `json:"metadata"`
}

func (s *Server) listCampaignMaps(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	maps, err := s.stores.Travel.MapsForCampaign(r.Context(), currentUserIDMust(r.Context()), campaignID, strings.TrimSpace(r.URL.Query().Get("parentLocationId")))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list campaign maps")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"maps": maps})
}

func (s *Server) createCampaignMap(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var req campaignMapRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := validateCampaignMapRequest(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if req.ImageAssetID != "" {
		if err := s.validateOwnedAsset(r.Context(), req.ImageAssetID); err != nil {
			writeError(w, http.StatusNotFound, "image asset not found")
			return
		}
	}
	campaignMap, err := s.stores.Travel.CreateMap(r.Context(), currentUserIDMust(r.Context()), campaignID, campaignMapInputFromRequest(req))
	if err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusBadRequest, "parent location must belong to the campaign")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not create campaign map")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"map": campaignMap})
}

func (s *Server) updateCampaignMap(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	mapID := strings.TrimSpace(r.PathValue("mapID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var req campaignMapRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := validateCampaignMapRequest(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if req.ImageAssetID != "" {
		if err := s.validateOwnedAsset(r.Context(), req.ImageAssetID); err != nil {
			writeError(w, http.StatusNotFound, "image asset not found")
			return
		}
	}
	campaignMap, err := s.stores.Travel.UpdateMap(r.Context(), currentUserIDMust(r.Context()), campaignID, mapID, campaignMapInputFromRequest(req))
	if err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "campaign map not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not update campaign map")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"map": campaignMap})
}

func (s *Server) deleteCampaignMap(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	mapID := strings.TrimSpace(r.PathValue("mapID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	if err := s.stores.Travel.DeleteMap(r.Context(), currentUserIDMust(r.Context()), campaignID, mapID); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "campaign map not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not delete campaign map")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) listCampaignMapPins(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	mapID := strings.TrimSpace(r.PathValue("mapID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	pins, err := s.stores.Travel.PinsForMap(r.Context(), currentUserIDMust(r.Context()), campaignID, mapID)
	if err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "campaign map not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not list map pins")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"pins": pins})
}

func (s *Server) createCampaignMapPin(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	mapID := strings.TrimSpace(r.PathValue("mapID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var req campaignMapPinRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := validateCampaignMapPinRequest(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	pin, err := s.stores.Travel.CreateMapPin(r.Context(), currentUserIDMust(r.Context()), campaignID, mapID, campaignMapPinInputFromRequest(req))
	if err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusBadRequest, "map and location must belong to the campaign and coordinates must be in bounds")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not create map pin")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"pin": pin})
}

func (s *Server) updateCampaignMapPin(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	mapID := strings.TrimSpace(r.PathValue("mapID"))
	pinID := strings.TrimSpace(r.PathValue("pinID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var req campaignMapPinRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := validateCampaignMapPinRequest(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	pin, err := s.stores.Travel.UpdateMapPin(r.Context(), currentUserIDMust(r.Context()), campaignID, mapID, pinID, campaignMapPinInputFromRequest(req))
	if err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "map pin not found or coordinates are out of bounds")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not update map pin")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"pin": pin})
}

func (s *Server) deleteCampaignMapPin(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	mapID := strings.TrimSpace(r.PathValue("mapID"))
	pinID := strings.TrimSpace(r.PathValue("pinID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	if err := s.stores.Travel.DeleteMapPin(r.Context(), currentUserIDMust(r.Context()), campaignID, mapID, pinID); err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "map pin not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not delete map pin")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) getCampaignMapDistance(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	mapID := strings.TrimSpace(r.PathValue("mapID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	distance, err := s.stores.Travel.DistanceBetweenLocationPins(
		r.Context(),
		currentUserIDMust(r.Context()),
		campaignID,
		mapID,
		strings.TrimSpace(r.URL.Query().Get("originLocationId")),
		strings.TrimSpace(r.URL.Query().Get("targetLocationId")),
	)
	if err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "locations are not pinned on this map")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not calculate map distance")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"distance": distance})
}

func (req *campaignMapRequest) normalize() {
	req.ParentLocationID = strings.TrimSpace(req.ParentLocationID)
	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)
	req.MapType = normalizeLocationToken(req.MapType)
	if req.MapType == "" {
		req.MapType = "custom"
	}
	req.Mode = normalizeLocationToken(req.Mode)
	if req.Mode == "" {
		req.Mode = "blank"
	}
	req.ImageAssetID = strings.TrimSpace(req.ImageAssetID)
	if req.Mode == "image" && req.ImageAssetID == "" {
		req.Mode = "blank"
	}
	if req.Width == 0 {
		req.Width = 1000
	}
	if req.Height == 0 {
		req.Height = 700
	}
	if req.ScaleDistancePerPixel == 0 && req.CalibrationPixelLength > 0 && req.CalibrationDistance > 0 {
		req.ScaleDistancePerPixel = req.CalibrationDistance / req.CalibrationPixelLength
	}
	if req.ScaleDistancePerPixel == 0 {
		req.ScaleDistancePerPixel = 1
	}
	req.ScaleDistanceUnit = normalizeDistanceUnit(req.ScaleDistanceUnit)
	if req.ScaleDistanceUnit == "" {
		req.ScaleDistanceUnit = "miles"
	}
	if req.Metadata == nil {
		req.Metadata = map[string]any{}
	}
}

func (req *campaignMapPinRequest) normalize() {
	req.LocationID = strings.TrimSpace(req.LocationID)
	req.LabelOverride = strings.TrimSpace(req.LabelOverride)
	req.Visibility = normalizeLocationToken(req.Visibility)
	if req.Visibility == "" {
		req.Visibility = "dm"
	}
	req.State = normalizeLocationToken(req.State)
	if req.State == "" {
		req.State = "active"
	}
	if req.Metadata == nil {
		req.Metadata = map[string]any{}
	}
}

func validateCampaignMapRequest(req campaignMapRequest) error {
	validMapTypes := map[string]bool{"world": true, "region": true, "settlement": true, "dungeon": true, "floor": true, "custom": true}
	switch {
	case req.Name == "":
		return errors.New("name is required")
	case !validMapTypes[req.MapType]:
		return errors.New("mapType must be world, region, settlement, dungeon, floor, or custom")
	case req.Mode != "image" && req.Mode != "blank":
		return errors.New("mode must be image or blank")
	case req.Width <= 0 || req.Height <= 0:
		return errors.New("width and height must be greater than 0")
	case req.ScaleDistancePerPixel <= 0:
		return errors.New("scaleDistancePerPixel must be greater than 0")
	case !validMapDistanceUnit(req.ScaleDistanceUnit):
		return errors.New("scaleDistanceUnit must be feet, miles, kilometers, or kilometres")
	case req.CalibrationPixelLength < 0 || req.CalibrationDistance < 0:
		return errors.New("calibration values cannot be negative")
	default:
		return nil
	}
}

func validateCampaignMapPinRequest(req campaignMapPinRequest) error {
	switch {
	case req.LocationID == "":
		return errors.New("locationId is required")
	case req.X < 0 || req.Y < 0:
		return errors.New("coordinates cannot be negative")
	default:
		return nil
	}
}

func campaignMapInputFromRequest(req campaignMapRequest) store.CampaignMapInput {
	return store.CampaignMapInput{
		ParentLocationID:       req.ParentLocationID,
		Name:                   req.Name,
		Description:            req.Description,
		MapType:                req.MapType,
		Mode:                   req.Mode,
		ImageAssetID:           req.ImageAssetID,
		Width:                  req.Width,
		Height:                 req.Height,
		ScaleDistancePerPixel:  req.ScaleDistancePerPixel,
		ScaleDistanceUnit:      req.ScaleDistanceUnit,
		CalibrationPixelLength: req.CalibrationPixelLength,
		CalibrationDistance:    req.CalibrationDistance,
		Metadata:               req.Metadata,
	}
}

func campaignMapPinInputFromRequest(req campaignMapPinRequest) store.CampaignMapPinInput {
	return store.CampaignMapPinInput{
		LocationID:    req.LocationID,
		X:             req.X,
		Y:             req.Y,
		LabelOverride: req.LabelOverride,
		Visibility:    req.Visibility,
		State:         req.State,
		Metadata:      req.Metadata,
	}
}

func normalizeDistanceUnit(value string) string {
	value = normalizeLocationToken(value)
	if value == "kilometres" || value == "kilometers" || value == "miles" || value == "feet" {
		return value
	}
	return ""
}

func validMapDistanceUnit(value string) bool {
	return value == "feet" || value == "miles" || value == "kilometers" || value == "kilometres"
}
