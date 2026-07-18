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

type locationRequest struct {
	ParentLocationID string         `json:"parentLocationId"`
	Name             string         `json:"name"`
	LocationType     string         `json:"locationType"`
	CustomTypeLabel  string         `json:"customTypeLabel"`
	Summary          string         `json:"summary"`
	Notes            string         `json:"notes"`
	PublicNotes      string         `json:"publicNotes"`
	DMNotes          string         `json:"dmNotes"`
	Tags             []string       `json:"tags"`
	SortOrder        int            `json:"sortOrder"`
	Status           string         `json:"status"`
	MapAnchor        map[string]any `json:"mapAnchor"`
}

type locationLinkRequest struct {
	SourceLocationID string `json:"sourceLocationId"`
	TargetLocationID string `json:"targetLocationId"`
	LinkType         string `json:"linkType"`
	Label            string `json:"label"`
	Direction        string `json:"direction"`
	Visibility       string `json:"visibility"`
	Notes            string `json:"notes"`
}

type travelRequest struct {
	Origin                string               `json:"origin"`
	Destination           string               `json:"destination"`
	Distance              float64              `json:"distance"`
	DistanceUnit          string               `json:"distanceUnit"`
	Terrain               string               `json:"terrain"`
	Pace                  string               `json:"pace"`
	GoodRoads             bool                 `json:"goodRoads"`
	EncounterDistanceFeet *int                 `json:"encounterDistanceFeet"`
	RollEncounterDistance bool                 `json:"rollEncounterDistance"`
	Weather               models.TravelWeather `json:"weather"`
	RollWeather           travelWeatherRolls   `json:"rollWeather"`
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
	RolledFeet     int     `json:"rolledFeet"`
	Rolls          []int   `json:"rolls"`
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
	if err := s.stores.Travel.DeleteLocation(r.Context(), currentUserIDMust(r.Context()), campaignID, locationID); err != nil {
		if !store.IsNotFound(err) {
			writeError(w, http.StatusInternalServerError, "could not delete campaign location")
			return
		}
		writeError(w, http.StatusNotFound, "location not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) listCampaignLocationLinks(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	links, err := s.locationLinksForCampaign(r.Context(), campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list campaign location links")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"links": links})
}

func (s *Server) createCampaignLocationLink(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var req locationLinkRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := validateLocationLinkRequest(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	link, err := s.insertCampaignLocationLink(r.Context(), campaignID, req)
	if err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusBadRequest, "linked locations must belong to the campaign")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not create campaign location link")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"link": link})
}

func (s *Server) deleteCampaignLocationLink(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	linkID := strings.TrimSpace(r.PathValue("linkID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	if err := s.stores.Travel.DeleteLocationLink(r.Context(), currentUserIDMust(r.Context()), campaignID, linkID); err != nil {
		if !store.IsNotFound(err) {
			writeError(w, http.StatusInternalServerError, "could not delete campaign location link")
			return
		}
		writeError(w, http.StatusNotFound, "location link not found")
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
	req.ParentLocationID = strings.TrimSpace(req.ParentLocationID)
	req.Name = strings.TrimSpace(req.Name)
	req.LocationType = normalizeLocationToken(req.LocationType)
	if req.LocationType == "" {
		req.LocationType = "custom"
	}
	req.CustomTypeLabel = strings.TrimSpace(req.CustomTypeLabel)
	req.Summary = strings.TrimSpace(req.Summary)
	req.Notes = strings.TrimSpace(req.Notes)
	req.PublicNotes = strings.TrimSpace(req.PublicNotes)
	req.DMNotes = strings.TrimSpace(req.DMNotes)
	req.Tags = normalizeLocationTags(req.Tags)
	req.Status = normalizeLocationToken(req.Status)
	if req.Status == "" {
		req.Status = "active"
	}
	if req.MapAnchor == nil {
		req.MapAnchor = map[string]any{}
	}
}

func validateLocationRequest(req locationRequest) error {
	if req.Name == "" {
		return errors.New("name is required")
	}
	return nil
}

func (req *locationLinkRequest) normalize() {
	req.SourceLocationID = strings.TrimSpace(req.SourceLocationID)
	req.TargetLocationID = strings.TrimSpace(req.TargetLocationID)
	req.LinkType = normalizeLocationToken(req.LinkType)
	if req.LinkType == "" {
		req.LinkType = "link"
	}
	req.Label = strings.TrimSpace(req.Label)
	req.Direction = normalizeLocationToken(req.Direction)
	if req.Direction == "" {
		req.Direction = "two-way"
	}
	req.Visibility = normalizeLocationToken(req.Visibility)
	if req.Visibility == "" {
		req.Visibility = "public"
	}
	req.Notes = strings.TrimSpace(req.Notes)
}

func validateLocationLinkRequest(req locationLinkRequest) error {
	switch {
	case req.SourceLocationID == "":
		return errors.New("sourceLocationId is required")
	case req.TargetLocationID == "":
		return errors.New("targetLocationId is required")
	case req.SourceLocationID == req.TargetLocationID:
		return errors.New("sourceLocationId and targetLocationId must be different")
	default:
		return nil
	}
}

func normalizeLocationToken(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, "_", "-")
	value = strings.ReplaceAll(value, " ", "-")
	return value
}

func normalizeLocationTags(tags []string) []string {
	seen := map[string]bool{}
	normalized := []string{}
	for _, tag := range tags {
		tag = strings.TrimSpace(tag)
		if tag == "" || seen[tag] {
			continue
		}
		seen[tag] = true
		normalized = append(normalized, tag)
	}
	return normalized
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
	rolledFeet, rolls := req.encounterDistance(terrain)
	encounterDistance := travelEncounterDistance{
		DiceExpression: terrain.EncounterDice,
		AverageFeet:    roundTo(terrain.EncounterAverageFeet, 2),
		RolledFeet:     rolledFeet,
		Rolls:          rolls,
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
			fmt.Sprintf("%s rolled %d feet as the distance where creatures may become aware of each other.", terrain.EncounterDice, encounterDistance.RolledFeet),
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
	case !req.RollEncounterDistance && req.EncounterDistanceFeet != nil && !travelTerrains[req.Terrain].validEncounterDistance(*req.EncounterDistanceFeet):
		return errors.New("encounterDistanceFeet is invalid for terrain")
	default:
		return validateTravelWeather(req.Weather, req.RollWeather)
	}
}

func (req travelRequest) encounterDistance(terrain travelTerrainRule) (int, []int) {
	if req.RollEncounterDistance || req.EncounterDistanceFeet == nil {
		return terrain.rollEncounterDistance()
	}
	return *req.EncounterDistanceFeet, []int{}
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
	return s.stores.Travel.LocationsForCampaign(ctx, currentUserIDMust(ctx), campaignID)
}

func (s *Server) locationLinksForCampaign(ctx context.Context, campaignID string) ([]models.CampaignLocationLink, error) {
	return s.stores.Travel.LocationLinksForCampaign(ctx, currentUserIDMust(ctx), campaignID)
}

func (s *Server) insertCampaignLocation(ctx context.Context, campaignID string, req locationRequest) (models.CampaignLocation, error) {
	return s.stores.Travel.CreateLocation(ctx, currentUserIDMust(ctx), campaignID, locationInputFromRequest(req))
}

func (s *Server) updateCampaignLocationRecord(ctx context.Context, campaignID string, locationID string, req locationRequest) (models.CampaignLocation, error) {
	return s.stores.Travel.UpdateLocation(ctx, currentUserIDMust(ctx), campaignID, locationID, locationInputFromRequest(req))
}

func (s *Server) insertCampaignLocationLink(ctx context.Context, campaignID string, req locationLinkRequest) (models.CampaignLocationLink, error) {
	return s.stores.Travel.CreateLocationLink(ctx, currentUserIDMust(ctx), campaignID, store.LocationLinkInput{
		SourceLocationID: req.SourceLocationID,
		TargetLocationID: req.TargetLocationID,
		LinkType:         req.LinkType,
		Label:            req.Label,
		Direction:        req.Direction,
		Visibility:       req.Visibility,
		Notes:            req.Notes,
	})
}

func locationInputFromRequest(req locationRequest) store.LocationInput {
	return store.LocationInput{
		ParentLocationID: req.ParentLocationID,
		Name:             req.Name,
		LocationType:     req.LocationType,
		CustomTypeLabel:  req.CustomTypeLabel,
		Summary:          req.Summary,
		Notes:            req.Notes,
		PublicNotes:      req.PublicNotes,
		DMNotes:          req.DMNotes,
		Tags:             req.Tags,
		SortOrder:        req.SortOrder,
		Status:           req.Status,
		MapAnchor:        req.MapAnchor,
	}
}
