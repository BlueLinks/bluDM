package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"crypto/rand"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strings"
)

type journeyRequest struct {
	Name           string                `json:"name"`
	Origin         string                `json:"origin"`
	Destination    string                `json:"destination"`
	Distance       float64               `json:"distance"`
	DistanceUnit   string                `json:"distanceUnit"`
	Terrain        string                `json:"terrain"`
	Pace           string                `json:"pace"`
	RouteCondition string                `json:"routeCondition"`
	Climate        string                `json:"climate"`
	Weather        models.JourneyWeather `json:"weather"`
	Notes          string                `json:"notes"`
	RerollWeather  bool                  `json:"rerollWeather"`
}

type journeyCalculation struct {
	DurationHours float64               `json:"durationHours"`
	DurationDays  float64               `json:"durationDays"`
	DurationLabel string                `json:"durationLabel"`
	Assumptions   []string              `json:"assumptions"`
	Weather       models.JourneyWeather `json:"weather"`
}

func (s *Server) listCampaignJourneys(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	journeys, err := s.journeysForCampaign(r.Context(), campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list journeys")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"journeys": journeys})
}

func (s *Server) calculateJourney(w http.ResponseWriter, r *http.Request) {
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
	calculation, err := calculateJourneyRequest(req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"calculation": calculation})
}

func (s *Server) createJourney(w http.ResponseWriter, r *http.Request) {
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
	calculation, err := calculateJourneyRequest(req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	journey, err := s.insertJourney(r.Context(), campaignID, req, calculation)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create journey")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"journey": journey})
}

func (s *Server) updateJourney(w http.ResponseWriter, r *http.Request) {
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
	calculation, err := calculateJourneyRequest(req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	journey, err := s.updateJourneyRecord(r.Context(), campaignID, journeyID, req, calculation)
	if err != nil {
		writeError(w, http.StatusNotFound, "journey not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"journey": journey})
}

func (s *Server) deleteJourney(w http.ResponseWriter, r *http.Request) {
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
		writeError(w, http.StatusInternalServerError, "could not delete journey")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "journey not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (req *journeyRequest) normalize() {
	req.Name = strings.TrimSpace(req.Name)
	req.Origin = strings.TrimSpace(req.Origin)
	req.Destination = strings.TrimSpace(req.Destination)
	req.DistanceUnit = normalizeJourneyOption(req.DistanceUnit)
	req.Terrain = normalizeJourneyOption(req.Terrain)
	req.Pace = normalizeJourneyOption(req.Pace)
	req.RouteCondition = normalizeJourneyOption(req.RouteCondition)
	req.Climate = normalizeJourneyOption(req.Climate)
	req.Notes = strings.TrimSpace(req.Notes)
	req.Weather = normalizeJourneyWeather(req.Weather)
}

func calculateJourneyRequest(req journeyRequest) (journeyCalculation, error) {
	if err := validateJourneyRequest(req); err != nil {
		return journeyCalculation{}, err
	}
	convertedMiles := distanceInMiles(req.Distance, req.DistanceUnit)
	basePace := journeyPaceMilesPerDay[req.Pace]
	routeMultiplier := journeyRouteMultipliers[req.RouteCondition]
	terrainMultiplier := journeyTerrainMultipliers[req.Terrain]
	effectiveMilesPerDay := math.Max(1, basePace*routeMultiplier*terrainMultiplier)
	durationDays := convertedMiles / effectiveMilesPerDay
	durationHours := durationDays * 24
	weather := req.Weather
	if req.RerollWeather || !validJourneyWeather(weather) {
		weather = generateJourneyWeather(req)
	}
	return journeyCalculation{
		DurationHours: roundTo(durationHours, 2),
		DurationDays:  roundTo(durationDays, 2),
		DurationLabel: journeyDurationLabel(durationHours, durationDays),
		Assumptions: []string{
			fmt.Sprintf("%s converted to %s miles.", formatJourneyNumber(req.Distance), formatJourneyNumber(convertedMiles)),
			fmt.Sprintf("%s pace uses %s miles per day.", journeyOptionLabel(req.Pace), formatJourneyNumber(basePace)),
			fmt.Sprintf("%s route applies a %s multiplier.", journeyOptionLabel(req.RouteCondition), formatJourneyNumber(routeMultiplier)),
			fmt.Sprintf("%s terrain applies a %s multiplier.", journeyOptionLabel(req.Terrain), formatJourneyNumber(terrainMultiplier)),
			fmt.Sprintf("Effective travel pace is %s miles per day.", formatJourneyNumber(effectiveMilesPerDay)),
		},
		Weather: weather,
	}, nil
}

func validateJourneyRequest(req journeyRequest) error {
	switch {
	case req.Name == "":
		return errors.New("name is required")
	case req.Distance <= 0:
		return errors.New("distance must be greater than 0")
	case !journeyDistanceUnits[req.DistanceUnit]:
		return errors.New("distanceUnit must be miles, kilometers, or hexes")
	case !journeyPaces[req.Pace]:
		return errors.New("pace must be slow, normal, or fast")
	case !journeyTerrains[req.Terrain]:
		return errors.New("terrain is invalid")
	case !journeyRouteConditions[req.RouteCondition]:
		return errors.New("routeCondition is invalid")
	case !journeyClimates[req.Climate]:
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

func journeyDurationLabel(hours float64, days float64) string {
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

func normalizeJourneyOption(value string) string {
	return strings.Trim(strings.ToLower(strings.ReplaceAll(strings.TrimSpace(value), "_", "-")), "-")
}

func normalizeJourneyWeather(weather models.JourneyWeather) models.JourneyWeather {
	weather.Severity = normalizeJourneyOption(weather.Severity)
	weather.Title = strings.TrimSpace(weather.Title)
	weather.Text = strings.TrimSpace(weather.Text)
	weather.Prompt = strings.TrimSpace(weather.Prompt)
	return weather
}

func validJourneyWeather(weather models.JourneyWeather) bool {
	return journeyWeatherSeverities[weather.Severity] && weather.Title != "" && weather.Text != ""
}

func generateJourneyWeather(req journeyRequest) models.JourneyWeather {
	table := journeyWeatherTable("default")
	switch {
	case req.Climate == "cold" || req.Climate == "winter" || req.Terrain == "arctic":
		table = journeyWeatherTable("cold")
	case req.Climate == "hot" || req.Climate == "dry" || req.Terrain == "desert":
		table = journeyWeatherTable("hot")
	case req.Climate == "wet" || req.Terrain == "swamp" || req.Terrain == "coastal":
		table = journeyWeatherTable("wet")
	case req.Terrain == "mountains":
		table = journeyWeatherTable("mountains")
	}
	return table[randomJourneyIndex(len(table))]
}

func journeyWeatherTable(kind string) []models.JourneyWeather {
	tables := map[string][]models.JourneyWeather{
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

func randomJourneyIndex(length int) int {
	if length <= 1 {
		return 0
	}
	var data [8]byte
	if _, err := rand.Read(data[:]); err != nil {
		return 0
	}
	return int(binary.LittleEndian.Uint64(data[:]) % uint64(length))
}

func formatJourneyNumber(value float64) string {
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

func journeyOptionLabel(value string) string {
	value = strings.ReplaceAll(value, "-", " ")
	words := strings.Fields(value)
	for index, word := range words {
		words[index] = strings.ToUpper(word[:1]) + word[1:]
	}
	return strings.Join(words, " ")
}

func (s *Server) journeysForCampaign(ctx context.Context, campaignID string) ([]models.Journey, error) {
	rows, err := s.db.Query(ctx, `
		select id, campaign_id, name, origin, destination, distance, distance_unit, terrain, pace,
			route_condition, climate, duration_hours, duration_days, weather, assumptions, notes,
			created_at, updated_at
		from campaign_journeys
		where campaign_id = $1
		order by updated_at desc, name asc
	`, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	journeys := []models.Journey{}
	for rows.Next() {
		journey, err := scanJourney(rows)
		if err != nil {
			return nil, err
		}
		journeys = append(journeys, journey)
	}
	return journeys, rows.Err()
}

func (s *Server) insertJourney(ctx context.Context, campaignID string, req journeyRequest, calculation journeyCalculation) (models.Journey, error) {
	weatherBytes, assumptionsBytes, err := marshalJourneyCalculation(calculation)
	if err != nil {
		return models.Journey{}, err
	}
	row := s.db.QueryRow(ctx, `
		insert into campaign_journeys (
			campaign_id, name, origin, destination, distance, distance_unit, terrain, pace,
			route_condition, climate, duration_hours, duration_days, weather, assumptions, notes
		)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		returning id, campaign_id, name, origin, destination, distance, distance_unit, terrain, pace,
			route_condition, climate, duration_hours, duration_days, weather, assumptions, notes,
			created_at, updated_at
	`, campaignID, req.Name, req.Origin, req.Destination, req.Distance, req.DistanceUnit, req.Terrain, req.Pace,
		req.RouteCondition, req.Climate, calculation.DurationHours, calculation.DurationDays, weatherBytes, assumptionsBytes, req.Notes)
	return scanJourney(row)
}

func (s *Server) updateJourneyRecord(ctx context.Context, campaignID string, journeyID string, req journeyRequest, calculation journeyCalculation) (models.Journey, error) {
	weatherBytes, assumptionsBytes, err := marshalJourneyCalculation(calculation)
	if err != nil {
		return models.Journey{}, err
	}
	row := s.db.QueryRow(ctx, `
		update campaign_journeys
		set name = $3, origin = $4, destination = $5, distance = $6, distance_unit = $7, terrain = $8,
			pace = $9, route_condition = $10, climate = $11, duration_hours = $12, duration_days = $13,
			weather = $14, assumptions = $15, notes = $16, updated_at = now()
		where id = $1 and campaign_id = $2
		returning id, campaign_id, name, origin, destination, distance, distance_unit, terrain, pace,
			route_condition, climate, duration_hours, duration_days, weather, assumptions, notes,
			created_at, updated_at
	`, journeyID, campaignID, req.Name, req.Origin, req.Destination, req.Distance, req.DistanceUnit, req.Terrain,
		req.Pace, req.RouteCondition, req.Climate, calculation.DurationHours, calculation.DurationDays, weatherBytes, assumptionsBytes, req.Notes)
	return scanJourney(row)
}

func marshalJourneyCalculation(calculation journeyCalculation) ([]byte, []byte, error) {
	weatherBytes, err := json.Marshal(calculation.Weather)
	if err != nil {
		return nil, nil, err
	}
	assumptionsBytes, err := json.Marshal(calculation.Assumptions)
	if err != nil {
		return nil, nil, err
	}
	return weatherBytes, assumptionsBytes, nil
}

func scanJourney(row scanner) (models.Journey, error) {
	var journey models.Journey
	var weatherBytes []byte
	var assumptionsBytes []byte
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
		&journey.RouteCondition,
		&journey.Climate,
		&journey.DurationHours,
		&journey.DurationDays,
		&weatherBytes,
		&assumptionsBytes,
		&journey.Notes,
		&journey.CreatedAt,
		&journey.UpdatedAt,
	)
	if err != nil {
		return models.Journey{}, err
	}
	if err := json.Unmarshal(weatherBytes, &journey.Weather); err != nil {
		return models.Journey{}, err
	}
	if err := json.Unmarshal(assumptionsBytes, &journey.Assumptions); err != nil {
		return models.Journey{}, err
	}
	journey.DurationLabel = journeyDurationLabel(journey.DurationHours, journey.DurationDays)
	return journey, nil
}

var journeyDistanceUnits = map[string]bool{
	"miles":      true,
	"kilometers": true,
	"hexes":      true,
}

var journeyPaces = map[string]bool{"slow": true, "normal": true, "fast": true}

var journeyPaceMilesPerDay = map[string]float64{
	"slow":   18,
	"normal": 24,
	"fast":   30,
}

var journeyTerrains = map[string]bool{
	"road": true, "plains": true, "forest": true, "swamp": true, "mountains": true,
	"desert": true, "arctic": true, "coastal": true, "underground": true, "urban": true,
	"water": true, "custom": true,
}

var journeyTerrainMultipliers = map[string]float64{
	"road": 1, "plains": 1, "forest": 0.75, "swamp": 0.5, "mountains": 0.5,
	"desert": 0.75, "arctic": 0.5, "coastal": 1, "underground": 0.75, "urban": 1,
	"water": 1, "custom": 1,
}

var journeyRouteConditions = map[string]bool{
	"road-or-trail": true, "trackless": true, "difficult-terrain": true, "hazardous-terrain": true,
	"forced-march": true, "mounted": true, "vehicle": true, "boat": true, "flight": true,
	"magic-assisted": true,
}

var journeyRouteMultipliers = map[string]float64{
	"road-or-trail": 1, "trackless": 0.5, "difficult-terrain": 0.5, "hazardous-terrain": 0.5,
	"forced-march": 1.25, "mounted": 1.5, "vehicle": 1.25, "boat": 1.25, "flight": 2,
	"magic-assisted": 2,
}

var journeyClimates = map[string]bool{
	"temperate": true, "hot": true, "cold": true, "wet": true, "dry": true,
	"winter": true, "spring": true, "summer": true, "autumn": true,
}

var journeyWeatherSeverities = map[string]bool{
	"calm": true, "notable": true, "harsh": true, "dangerous": true,
}
