package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"crypto/rand"
	"encoding/binary"
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
	Origin         string               `json:"origin"`
	Destination    string               `json:"destination"`
	Distance       float64              `json:"distance"`
	DistanceUnit   string               `json:"distanceUnit"`
	Terrain        string               `json:"terrain"`
	Pace           string               `json:"pace"`
	RouteCondition string               `json:"routeCondition"`
	Climate        string               `json:"climate"`
	Weather        models.TravelWeather `json:"weather"`
	RerollWeather  bool                 `json:"rerollWeather"`
}

type travelCalculation struct {
	DurationHours float64              `json:"durationHours"`
	DurationDays  float64              `json:"durationDays"`
	DurationLabel string               `json:"durationLabel"`
	Assumptions   []string             `json:"assumptions"`
	Weather       models.TravelWeather `json:"weather"`
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
	req.RouteCondition = normalizeTravelOption(req.RouteCondition)
	req.Climate = normalizeTravelOption(req.Climate)
	req.Weather = normalizeTravelWeather(req.Weather)
}

func calculateTravelRequest(req travelRequest) (travelCalculation, error) {
	if err := validateTravelRequest(req); err != nil {
		return travelCalculation{}, err
	}
	convertedMiles := distanceInMiles(req.Distance, req.DistanceUnit)
	basePace := travelPaceMilesPerDay[req.Pace]
	routeMultiplier := travelRouteMultipliers[req.RouteCondition]
	terrainMultiplier := travelTerrainMultipliers[req.Terrain]
	effectiveMilesPerDay := math.Max(1, basePace*routeMultiplier*terrainMultiplier)
	durationDays := convertedMiles / effectiveMilesPerDay
	durationHours := durationDays * 24
	weather := req.Weather
	if req.RerollWeather || !validTravelWeather(weather) {
		weather = generateTravelWeather(req)
	}
	return travelCalculation{
		DurationHours: roundTo(durationHours, 2),
		DurationDays:  roundTo(durationDays, 2),
		DurationLabel: travelDurationLabel(durationHours, durationDays),
		Assumptions: []string{
			fmt.Sprintf("%s converted to %s miles.", formatTravelNumber(req.Distance), formatTravelNumber(convertedMiles)),
			fmt.Sprintf("%s pace uses %s miles per day.", travelOptionLabel(req.Pace), formatTravelNumber(basePace)),
			fmt.Sprintf("%s route applies a %s multiplier.", travelOptionLabel(req.RouteCondition), formatTravelNumber(routeMultiplier)),
			fmt.Sprintf("%s terrain applies a %s multiplier.", travelOptionLabel(req.Terrain), formatTravelNumber(terrainMultiplier)),
			fmt.Sprintf("Effective travel pace is %s miles per day.", formatTravelNumber(effectiveMilesPerDay)),
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
	case !travelTerrains[req.Terrain]:
		return errors.New("terrain is invalid")
	case !travelRouteConditions[req.RouteCondition]:
		return errors.New("routeCondition is invalid")
	case !travelClimates[req.Climate]:
		return errors.New("climate is invalid")
	default:
		return nil
	}
}

func distanceInMiles(distance float64, unit string) float64 {
	switch unit {
	case "kilometers":
		return distance * 0.621371
	case "hexes":
		return distance * 6
	default:
		return distance
	}
}

func travelDurationLabel(hours float64, days float64) string {
	if hours < 24 {
		rounded := int(math.Round(hours))
		if rounded == 1 {
			return "1 hour"
		}
		return fmt.Sprintf("%d hours", rounded)
	}
	rounded := roundTo(days, 1)
	if math.Abs(rounded-math.Round(rounded)) < 0.05 {
		whole := int(math.Round(rounded))
		if whole == 1 {
			return "1 day"
		}
		return fmt.Sprintf("%d days", whole)
	}
	return fmt.Sprintf("%.1f days", rounded)
}

func normalizeTravelOption(value string) string {
	return strings.Trim(strings.ToLower(strings.ReplaceAll(strings.TrimSpace(value), "_", "-")), "-")
}

func normalizeTravelWeather(weather models.TravelWeather) models.TravelWeather {
	weather.Severity = normalizeTravelOption(weather.Severity)
	weather.Title = strings.TrimSpace(weather.Title)
	weather.Text = strings.TrimSpace(weather.Text)
	weather.Prompt = strings.TrimSpace(weather.Prompt)
	return weather
}

func validTravelWeather(weather models.TravelWeather) bool {
	return travelWeatherSeverities[weather.Severity] && weather.Title != "" && weather.Text != ""
}

func generateTravelWeather(req travelRequest) models.TravelWeather {
	table := travelWeatherTable("default")
	switch {
	case req.Climate == "cold" || req.Climate == "winter" || req.Terrain == "arctic":
		table = travelWeatherTable("cold")
	case req.Climate == "hot" || req.Climate == "dry" || req.Terrain == "desert":
		table = travelWeatherTable("hot")
	case req.Climate == "wet" || req.Terrain == "swamp" || req.Terrain == "coastal":
		table = travelWeatherTable("wet")
	case req.Terrain == "mountains":
		table = travelWeatherTable("mountains")
	}
	return table[randomTravelIndex(len(table))]
}

func travelWeatherTable(kind string) []models.TravelWeather {
	tables := map[string][]models.TravelWeather{
		"default": {
			{Severity: "calm", Title: "Clear Traveling Sky", Text: "High clouds drift above the route, leaving the road bright and easy to read.", Prompt: "Good visibility makes navigation straightforward unless local hazards interfere."},
			{Severity: "notable", Title: "Cool Rain", Text: "A steady rain follows the road through the afternoon. Cloaks and bedrolls are damp by nightfall, and tracks are easier to spot in the mud.", Prompt: "Offer advantage to tracking checks, but make open fires harder to keep."},
			{Severity: "harsh", Title: "Crosswind Front", Text: "A restless wind leans against the party for most of the day, carrying grit, leaves, and the smell of distant rain.", Prompt: "Ranged signals and exposed camp chores take longer than expected."},
			{Severity: "dangerous", Title: "Thunderhead Break", Text: "A dark line of storm clouds overtakes the route with hard rain and close thunder.", Prompt: "Ask whether the party seeks shelter or presses on through poor visibility."},
		},
		"cold": {
			{Severity: "calm", Title: "Pale Winter Sun", Text: "Cold light hangs over the route, crisp and quiet, with firm ground underfoot.", Prompt: "The party can travel normally if they have adequate cold-weather gear."},
			{Severity: "notable", Title: "Needle Snow", Text: "Fine snow blows across the path and softens distant landmarks.", Prompt: "Navigation checks may be needed where the route is poorly marked."},
			{Severity: "harsh", Title: "Icy Nightfall", Text: "The day ends with a sudden freeze that coats stones, rope, and wagon fittings.", Prompt: "Camp setup and vehicle handling are slower unless precautions are taken."},
			{Severity: "dangerous", Title: "Whiteout Squall", Text: "A wall of snow collapses over the route, swallowing sound and distance.", Prompt: "Pressing on risks separation, lost time, or exhaustion."},
		},
		"hot": {
			{Severity: "calm", Title: "Dry Bright Morning", Text: "The air is hot but stable, and the horizon stays sharp all day.", Prompt: "Water tracking matters, but travel is otherwise predictable."},
			{Severity: "notable", Title: "Heat Haze", Text: "Wavering air blurs the path ahead and makes distant shapes unreliable.", Prompt: "Landmark-based navigation becomes less certain during the hottest hours."},
			{Severity: "harsh", Title: "Scouring Dust", Text: "Dust rides the wind in low sheets, stinging eyes and finding every pack seam.", Prompt: "Exposed rests recover less comfort unless the party finds cover."},
			{Severity: "dangerous", Title: "Punishing Heat", Text: "The route bakes under still air, turning armor, stone, and tools painfully hot.", Prompt: "Consider exhaustion risk if the party travels through midday."},
		},
		"wet": {
			{Severity: "calm", Title: "Soft Mist", Text: "Mist clings to low ground and beads on grass without becoming a true rain.", Prompt: "Sounds carry strangely, making nearby movement harder to place."},
			{Severity: "notable", Title: "Heavy Fog", Text: "A thick fog settles into hollows and over water, turning the route into a chain of short, uncertain views.", Prompt: "Navigation and ambush awareness both become more tense."},
			{Severity: "harsh", Title: "Soaking Rain", Text: "Rain falls long enough to flood ruts, swell streams, and make dry rest difficult.", Prompt: "Travel continues, but gear care and morale need attention."},
			{Severity: "dangerous", Title: "Flash Flood Warning", Text: "Water rises fast in ditches, gullies, and low crossings after a violent burst of rain.", Prompt: "Crossings may become obstacles or force a detour."},
		},
		"mountains": {
			{Severity: "calm", Title: "Thin Clear Air", Text: "The heights are cold and clear, giving the party long views over the route ahead.", Prompt: "Good visibility may reveal landmarks, smoke, or movement far away."},
			{Severity: "notable", Title: "Slope Winds", Text: "Wind pours down the slopes in uneven gusts and makes exposed ledges feel narrower.", Prompt: "Loose items and campfires need extra care."},
			{Severity: "harsh", Title: "Rockfall Weather", Text: "Rain and wind loosen gravel above the path, sending occasional stones skittering down.", Prompt: "The party may need to slow down or choose safer switchbacks."},
			{Severity: "dangerous", Title: "High Pass Storm", Text: "Clouds swallow the pass and bring hard wind, cold rain, and sudden darkness.", Prompt: "Pressing forward may require checks to avoid losing the trail."},
		},
	}
	if table, ok := tables[kind]; ok {
		return table
	}
	return tables["default"]
}

func randomTravelIndex(length int) int {
	if length <= 1 {
		return 0
	}
	var data [8]byte
	if _, err := rand.Read(data[:]); err != nil {
		return 0
	}
	return int(binary.LittleEndian.Uint64(data[:]) % uint64(length))
}

func formatTravelNumber(value float64) string {
	rounded := roundTo(value, 2)
	if math.Abs(rounded-math.Round(rounded)) < 0.005 {
		return fmt.Sprintf("%d", int(math.Round(rounded)))
	}
	return fmt.Sprintf("%.2f", rounded)
}

func roundTo(value float64, places int) float64 {
	factor := math.Pow10(places)
	return math.Round(value*factor) / factor
}

func travelOptionLabel(value string) string {
	value = strings.ReplaceAll(value, "-", " ")
	words := strings.Fields(value)
	for index, word := range words {
		words[index] = strings.ToUpper(word[:1]) + word[1:]
	}
	return strings.Join(words, " ")
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

var travelDistanceUnits = map[string]bool{
	"miles":      true,
	"kilometers": true,
	"hexes":      true,
}

var travelPaces = map[string]bool{"slow": true, "normal": true, "fast": true}

var travelPaceMilesPerDay = map[string]float64{
	"slow":   18,
	"normal": 24,
	"fast":   30,
}

var travelTerrains = map[string]bool{
	"road": true, "plains": true, "forest": true, "swamp": true, "mountains": true,
	"desert": true, "arctic": true, "coastal": true, "underground": true, "urban": true,
	"water": true, "custom": true,
}

var travelTerrainMultipliers = map[string]float64{
	"road": 1, "plains": 1, "forest": 0.75, "swamp": 0.5, "mountains": 0.5,
	"desert": 0.75, "arctic": 0.5, "coastal": 1, "underground": 0.75, "urban": 1,
	"water": 1, "custom": 1,
}

var travelRouteConditions = map[string]bool{
	"road-or-trail": true, "trackless": true, "difficult-terrain": true, "hazardous-terrain": true,
	"forced-march": true, "mounted": true, "vehicle": true, "boat": true, "flight": true,
	"magic-assisted": true,
}

var travelRouteMultipliers = map[string]float64{
	"road-or-trail": 1, "trackless": 0.5, "difficult-terrain": 0.5, "hazardous-terrain": 0.5,
	"forced-march": 1.25, "mounted": 1.5, "vehicle": 1.25, "boat": 1.25, "flight": 2,
	"magic-assisted": 2,
}

var travelClimates = map[string]bool{
	"temperate": true, "hot": true, "cold": true, "wet": true, "dry": true,
	"winter": true, "spring": true, "summer": true, "autumn": true,
}

var travelWeatherSeverities = map[string]bool{
	"calm": true, "notable": true, "harsh": true, "dangerous": true,
}
