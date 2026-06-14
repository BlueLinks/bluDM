package httpapi

import (
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
)

type journeyRequest struct {
	Name                  string               `json:"name"`
	Origin                string               `json:"origin"`
	Destination           string               `json:"destination"`
	Distance              float64              `json:"distance"`
	DistanceUnit          string               `json:"distanceUnit"`
	Terrain               string               `json:"terrain"`
	Pace                  string               `json:"pace"`
	GoodRoads             bool                 `json:"goodRoads"`
	EncounterDistanceFeet *int                 `json:"encounterDistanceFeet"`
	Weather               models.TravelWeather `json:"weather"`
	RouteInputMode        string               `json:"routeInputMode"`
}

func (s *Server) listCampaignJourneys(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	journeys, err := s.journeysForCampaign(r.Context(), campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list campaign journeys")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"journeys": journeys})
}

func (s *Server) createCampaignJourney(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var req journeyRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := validateJourneyRequest(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	journey, err := s.insertCampaignJourney(r.Context(), campaignID, req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create campaign journey")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"journey": journey})
}

func (s *Server) updateCampaignJourney(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	journeyID := strings.TrimSpace(r.PathValue("journeyID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var req journeyRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := validateJourneyRequest(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	journey, err := s.updateCampaignJourneyRecord(r.Context(), campaignID, journeyID, req)
	if err != nil {
		writeError(w, http.StatusNotFound, "journey not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"journey": journey})
}

func (s *Server) deleteCampaignJourney(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	journeyID := strings.TrimSpace(r.PathValue("journeyID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	if err := s.stores.Travel.DeleteJourney(r.Context(), currentUserIDMust(r.Context()), campaignID, journeyID); err != nil {
		if !store.IsNotFound(err) {
			writeError(w, http.StatusInternalServerError, "could not delete campaign journey")
			return
		}
		writeError(w, http.StatusNotFound, "journey not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) cloneCampaignJourney(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	journeyID := strings.TrimSpace(r.PathValue("journeyID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	journey, err := s.cloneCampaignJourneyRecord(r.Context(), campaignID, journeyID)
	if err != nil {
		writeError(w, http.StatusNotFound, "journey not found")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"journey": journey})
}

func (req *journeyRequest) normalize() {
	req.Name = strings.TrimSpace(req.Name)
	req.Origin = strings.TrimSpace(req.Origin)
	req.Destination = strings.TrimSpace(req.Destination)
	req.DistanceUnit = normalizeTravelOption(req.DistanceUnit)
	req.Terrain = normalizeTravelOption(req.Terrain)
	req.Pace = normalizeTravelOption(req.Pace)
	req.RouteInputMode = normalizeTravelOption(req.RouteInputMode)
	if req.RouteInputMode == "" {
		req.RouteInputMode = "route"
	}
	req.Weather = normalizeTravelWeather(req.Weather)
	if req.Name == "" {
		req.Name = defaultJourneyName(*req)
	}
}

func validateJourneyRequest(req journeyRequest) error {
	if req.Name == "" {
		return errors.New("name is required")
	}
	if req.RouteInputMode != "route" && req.RouteInputMode != "distance" {
		return errors.New("routeInputMode must be route or distance")
	}
	return validateTravelRequest(travelRequest{
		Origin:                req.Origin,
		Destination:           req.Destination,
		Distance:              req.Distance,
		DistanceUnit:          req.DistanceUnit,
		Terrain:               req.Terrain,
		Pace:                  req.Pace,
		GoodRoads:             req.GoodRoads,
		EncounterDistanceFeet: req.EncounterDistanceFeet,
		Weather:               req.Weather,
	})
}

func defaultJourneyName(req journeyRequest) string {
	if req.Origin != "" && req.Destination != "" {
		return fmt.Sprintf("%s to %s", req.Origin, req.Destination)
	}
	unit := travelOptionLabel(req.DistanceUnit)
	if unit == "" {
		unit = req.DistanceUnit
	}
	return fmt.Sprintf("%s %s", formatTravelNumber(req.Distance), unit)
}

func (s *Server) journeysForCampaign(ctx context.Context, campaignID string) ([]models.CampaignJourney, error) {
	return s.stores.Travel.JourneysForCampaign(ctx, currentUserIDMust(ctx), campaignID)
}

func (s *Server) insertCampaignJourney(ctx context.Context, campaignID string, req journeyRequest) (models.CampaignJourney, error) {
	return s.stores.Travel.CreateJourney(ctx, currentUserIDMust(ctx), campaignID, journeyInputFromRequest(req))
}

func (s *Server) updateCampaignJourneyRecord(ctx context.Context, campaignID string, journeyID string, req journeyRequest) (models.CampaignJourney, error) {
	return s.stores.Travel.UpdateJourney(ctx, currentUserIDMust(ctx), campaignID, journeyID, journeyInputFromRequest(req))
}

func (s *Server) cloneCampaignJourneyRecord(ctx context.Context, campaignID string, journeyID string) (models.CampaignJourney, error) {
	return s.stores.Travel.CloneJourney(ctx, currentUserIDMust(ctx), campaignID, journeyID)
}

func journeyInputFromRequest(req journeyRequest) store.JourneyInput {
	return store.JourneyInput{
		Name:                  req.Name,
		Origin:                req.Origin,
		Destination:           req.Destination,
		Distance:              req.Distance,
		DistanceUnit:          req.DistanceUnit,
		Terrain:               req.Terrain,
		Pace:                  req.Pace,
		GoodRoads:             req.GoodRoads,
		EncounterDistanceFeet: req.EncounterDistanceFeet,
		Weather:               req.Weather,
		RouteInputMode:        req.RouteInputMode,
	}
}
