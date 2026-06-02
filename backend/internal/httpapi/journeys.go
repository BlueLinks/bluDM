package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strings"
)

type locationRequest struct {
	Name  string `json:"name"`
	Notes string `json:"notes"`
}

type travelRequest struct {
	Origin       string               `json:"origin"`
	Destination  string               `json:"destination"`
	Distance     float64              `json:"distance"`
	DistanceUnit string               `json:"distanceUnit"`
	Terrain      string               `json:"terrain"`
	Pace         string               `json:"pace"`
	GoodRoads    bool                 `json:"goodRoads"`
	Weather      models.TravelWeather `json:"weather"`
	RollWeather  travelWeatherRolls   `json:"rollWeather"`
}

type travelCalculation struct {
	DurationHours        float64                 `json:"durationHours"`
	DurationDays         float64                 `json:"durationDays"`
	DurationLabel        string                  `json:"durationLabel"`
	EffectivePace        string                  `json:"effectivePace"`
	TerrainMaximumPace   string                  `json:"terrainMaximumPace"`
	GoodRoadsMaximumPace string                  `json:"goodRoadsMaximumPace"`
	EncounterDistance    travelEncounterDistance `json:"encounterDistance"`
	Assumptions          []string                `json:"assumptions"`
	Weather              models.TravelWeather    `json:"weather"`
}

type travelWeatherRolls struct {
	Temperature   bool `json:"temperature"`
	Wind          bool `json:"wind"`
	Precipitation bool `json:"precipitation"`
}

type travelEncounterDistance struct {
	DiceExpression string  `json:"diceExpression"`
	AverageFeet    float64 `json:"averageFeet"`
	Windows        int     `json:"windows"`
}

func (s *Server) listCampaignLocations(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	locations, err := s.locationsForCampaign(r.Context(), campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list campaign locations")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"locations": locations})
}

func (s *Server) createCampaignLocation(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var req locationRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := validateLocationRequest(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	location, err := s.insertCampaignLocation(r.Context(), campaignID, req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create campaign location")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"location": location})
}

func (s *Server) updateCampaignLocation(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	locationID := strings.TrimSpace(r.PathValue("locationID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var req locationRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := validateLocationRequest(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	location, err := s.updateCampaignLocationRecord(r.Context(), campaignID, locationID, req)
	if err != nil {
		writeError(w, http.StatusNotFound, "location not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"location": location})
}

func (s *Server) deleteCampaignLocation(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	locationID := strings.TrimSpace(r.PathValue("locationID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	tag, err := s.db.Exec(r.Context(), `
		delete from campaign_locations where id = $1 and campaign_id = $2
	`, locationID, campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete campaign location")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "location not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) calculateTravel(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var req travelRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	calculation, err := calculateTravelRequest(req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"calculation": calculation})
}

func (req *locationRequest) normalize() {
	req.Name = strings.TrimSpace(req.Name)
	req.Notes = strings.TrimSpace(req.Notes)
}

func validateLocationRequest(req locationRequest) error {
	if req.Name == "" {
		return errors.New("name is required")
	}
	return nil
}

func (req *travelRequest) normalize() {
	req.Origin = strings.TrimSpace(req.Origin)
	req.Destination = strings.TrimSpace(req.Destination)
	req.DistanceUnit = normalizeTravelOption(req.DistanceUnit)
	req.Terrain = normalizeTravelOption(req.Terrain)
	req.Pace = normalizeTravelOption(req.Pace)
	req.Weather = normalizeTravelWeather(req.Weather)
}

func calculateTravelRequest(req travelRequest) (travelCalculation, error) {
	if err := validateTravelRequest(req); err != nil {
		return travelCalculation{}, err
	}
	convertedMiles := distanceInMiles(req.Distance, req.DistanceUnit)
	terrain := travelTerrains[req.Terrain]
	terrainMaximumPace := terrain.MaximumPace
	movementMaximumPace := terrainMaximumPace
	if req.Terrain == "waterborne" {
		movementMaximumPace = "normal"
	}
	goodRoadsMaximumPace := movementMaximumPace
	if req.GoodRoads && req.Terrain != "waterborne" {
		goodRoadsMaximumPace = increaseTravelPace(movementMaximumPace)
	}
	effectivePace := clampTravelPace(req.Pace, goodRoadsMaximumPace)
	effectiveMilesPerDay := travelPaceMilesPerDay[effectivePace]
	durationDays := convertedMiles / effectiveMilesPerDay
	durationHours := durationDays * 24
	weather := applyTravelWeatherRolls(req.Weather, req.RollWeather)
	encounterDistance := travelEncounterDistance{
		DiceExpression: terrain.EncounterDice,
		AverageFeet:    roundTo(terrain.EncounterAverageFeet, 2),
		Windows:        int(math.Floor(convertedMiles * 5280 / terrain.EncounterAverageFeet)),
	}
	return travelCalculation{
		DurationHours:        roundTo(durationHours, 2),
		DurationDays:         roundTo(durationDays, 2),
		DurationLabel:        travelDurationLabel(durationHours, durationDays),
		EffectivePace:        effectivePace,
		TerrainMaximumPace:   terrainMaximumPace,
		GoodRoadsMaximumPace: goodRoadsMaximumPace,
		EncounterDistance:    encounterDistance,
		Assumptions: []string{
			fmt.Sprintf("%s converted to %s miles.", formatTravelNumber(req.Distance), formatTravelNumber(convertedMiles)),
			fmt.Sprintf("%s terrain has a maximum pace of %s.", travelOptionLabel(req.Terrain), travelOptionLabel(terrain.MaximumPace)),
			fmt.Sprintf("Good roads maximum pace is %s.", travelOptionLabel(goodRoadsMaximumPace)),
			fmt.Sprintf("Requested %s pace resolves to %s pace.", travelOptionLabel(req.Pace), travelOptionLabel(effectivePace)),
			fmt.Sprintf("Effective travel pace is %s miles per day.", formatTravelNumber(effectiveMilesPerDay)),
			fmt.Sprintf("%s creates about %d possible encounter-distance windows.", terrain.EncounterDice, encounterDistance.Windows),
		},
		Weather: weather,
	}, nil
}

func validateTravelRequest(req travelRequest) error {
	switch {
	case req.Distance <= 0:
		return errors.New("distance must be greater than 0")
	case !travelDistanceUnits[req.DistanceUnit]:
		return errors.New("distanceUnit must be miles, kilometers, or hexes")
	case !travelPaces[req.Pace]:
		return errors.New("pace must be slow, normal, or fast")
	case travelTerrains[req.Terrain].MaximumPace == "":
		return errors.New("terrain is invalid")
	default:
		return validateTravelWeather(req.Weather, req.RollWeather)
	}
}

func normalizeTravelWeather(weather models.TravelWeather) models.TravelWeather {
	weather.Temperature = normalizeTravelOption(weather.Temperature)
	if weather.Temperature == "" {
		weather.Temperature = "normal"
	}
	weather.Wind = normalizeTravelOption(weather.Wind)
	if weather.Wind == "" {
		weather.Wind = "none"
	}
	weather.Precipitation = normalizeTravelOption(weather.Precipitation)
	if weather.Precipitation == "" {
		weather.Precipitation = "none"
	}
	if weather.Temperature == "normal" {
		weather.TemperatureDeltaF = nil
	}
	weather.Rolls = nil
	return weather
}

func (s *Server) locationsForCampaign(ctx context.Context, campaignID string) ([]models.CampaignLocation, error) {
	rows, err := s.db.Query(ctx, `
		select id, campaign_id, name, notes, created_at, updated_at
		from campaign_locations
		where campaign_id = $1
		order by name asc
	`, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	locations := []models.CampaignLocation{}
	for rows.Next() {
		location, err := scanCampaignLocation(rows)
		if err != nil {
			return nil, err
		}
		locations = append(locations, location)
	}
	return locations, rows.Err()
}

func (s *Server) insertCampaignLocation(ctx context.Context, campaignID string, req locationRequest) (models.CampaignLocation, error) {
	row := s.db.QueryRow(ctx, `
		insert into campaign_locations (campaign_id, name, notes)
		values ($1, $2, $3)
		returning id, campaign_id, name, notes, created_at, updated_at
	`, campaignID, req.Name, req.Notes)
	return scanCampaignLocation(row)
}

func (s *Server) updateCampaignLocationRecord(ctx context.Context, campaignID string, locationID string, req locationRequest) (models.CampaignLocation, error) {
	row := s.db.QueryRow(ctx, `
		update campaign_locations
		set name = $3, notes = $4, updated_at = now()
		where id = $1 and campaign_id = $2
		returning id, campaign_id, name, notes, created_at, updated_at
	`, locationID, campaignID, req.Name, req.Notes)
	return scanCampaignLocation(row)
}

func scanCampaignLocation(row scanner) (models.CampaignLocation, error) {
	var location models.CampaignLocation
	err := row.Scan(
		&location.ID,
		&location.CampaignID,
		&location.Name,
		&location.Notes,
		&location.CreatedAt,
		&location.UpdatedAt,
	)
	return location, err
}
