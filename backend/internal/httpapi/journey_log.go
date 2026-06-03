package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"database/sql"
	"encoding/json"
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
	tag, err := s.db.Exec(r.Context(), `
		delete from campaign_journeys where id = $1 and campaign_id = $2
	`, journeyID, campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete campaign journey")
		return
	}
	if tag.RowsAffected() == 0 {
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
	rows, err := s.db.Query(ctx, `
		select id, campaign_id, name, origin, destination, distance, distance_unit, terrain, pace,
		       good_roads, encounter_distance_feet, weather, route_input_mode, created_at, updated_at
		from campaign_journeys
		where campaign_id = $1
		order by created_at desc
	`, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	journeys := []models.CampaignJourney{}
	for rows.Next() {
		journey, err := scanCampaignJourney(rows)
		if err != nil {
			return nil, err
		}
		journeys = append(journeys, journey)
	}
	return journeys, rows.Err()
}

func (s *Server) insertCampaignJourney(ctx context.Context, campaignID string, req journeyRequest) (models.CampaignJourney, error) {
	weatherJSON, err := json.Marshal(req.Weather)
	if err != nil {
		return models.CampaignJourney{}, err
	}
	row := s.db.QueryRow(ctx, `
		insert into campaign_journeys (
			campaign_id, name, origin, destination, distance, distance_unit, terrain, pace,
			good_roads, encounter_distance_feet, weather, route_input_mode
		)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		returning id, campaign_id, name, origin, destination, distance, distance_unit, terrain, pace,
		          good_roads, encounter_distance_feet, weather, route_input_mode, created_at, updated_at
	`, campaignID, req.Name, req.Origin, req.Destination, req.Distance, req.DistanceUnit,
		req.Terrain, req.Pace, req.GoodRoads, req.EncounterDistanceFeet, weatherJSON, req.RouteInputMode)
	return scanCampaignJourney(row)
}

func (s *Server) updateCampaignJourneyRecord(ctx context.Context, campaignID string, journeyID string, req journeyRequest) (models.CampaignJourney, error) {
	weatherJSON, err := json.Marshal(req.Weather)
	if err != nil {
		return models.CampaignJourney{}, err
	}
	row := s.db.QueryRow(ctx, `
		update campaign_journeys
		set name = $3, origin = $4, destination = $5, distance = $6, distance_unit = $7,
		    terrain = $8, pace = $9, good_roads = $10, encounter_distance_feet = $11,
		    weather = $12, route_input_mode = $13, updated_at = now()
		where id = $1 and campaign_id = $2
		returning id, campaign_id, name, origin, destination, distance, distance_unit, terrain, pace,
		          good_roads, encounter_distance_feet, weather, route_input_mode, created_at, updated_at
	`, journeyID, campaignID, req.Name, req.Origin, req.Destination, req.Distance, req.DistanceUnit,
		req.Terrain, req.Pace, req.GoodRoads, req.EncounterDistanceFeet, weatherJSON, req.RouteInputMode)
	return scanCampaignJourney(row)
}

func (s *Server) cloneCampaignJourneyRecord(ctx context.Context, campaignID string, journeyID string) (models.CampaignJourney, error) {
	row := s.db.QueryRow(ctx, `
		insert into campaign_journeys (
			campaign_id, name, origin, destination, distance, distance_unit, terrain, pace,
			good_roads, encounter_distance_feet, weather, route_input_mode
		)
		select campaign_id, 'Copy of ' || name, origin, destination, distance, distance_unit, terrain, pace,
		       good_roads, encounter_distance_feet, weather, route_input_mode
		from campaign_journeys
		where id = $1 and campaign_id = $2
		returning id, campaign_id, name, origin, destination, distance, distance_unit, terrain, pace,
		          good_roads, encounter_distance_feet, weather, route_input_mode, created_at, updated_at
	`, journeyID, campaignID)
	return scanCampaignJourney(row)
}

func scanCampaignJourney(row scanner) (models.CampaignJourney, error) {
	var journey models.CampaignJourney
	var weatherJSON []byte
	var encounterDistanceFeet sql.NullInt64
	err := row.Scan(
		&journey.ID,
		&journey.CampaignID,
		&journey.Name,
		&journey.Origin,
		&journey.Destination,
		&journey.Distance,
		&journey.DistanceUnit,
		&journey.Terrain,
		&journey.Pace,
		&journey.GoodRoads,
		&encounterDistanceFeet,
		&weatherJSON,
		&journey.RouteInputMode,
		&journey.CreatedAt,
		&journey.UpdatedAt,
	)
	if err != nil {
		return journey, err
	}
	if encounterDistanceFeet.Valid {
		value := int(encounterDistanceFeet.Int64)
		journey.EncounterDistanceFeet = &value
	}
	if err := json.Unmarshal(weatherJSON, &journey.Weather); err != nil {
		return journey, err
	}
	return journey, nil
}
