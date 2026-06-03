package httpapi

import (
	"bludm/backend/internal/models"
	"math"
	"strings"
	"testing"
)

func TestTravelCalculationUsesTerrainMaximumPace(t *testing.T) {
	req := travelRequest{
		Distance: 30, DistanceUnit: "miles", Terrain: "mountain",
		Pace: "fast", Weather: clearWeather(),
	}
	req.normalize()
	calculation, err := calculateTravelRequest(req)
	if err != nil {
		t.Fatalf("expected valid calculation: %v", err)
	}
	if calculation.EffectivePace != "slow" {
		t.Fatalf("expected slow effective pace, got %q", calculation.EffectivePace)
	}
	if calculation.DurationHours != 40 {
		t.Fatalf("expected 40 hours, got %.2f", calculation.DurationHours)
	}
	if calculation.DurationLabel != "1.7 days" {
		t.Fatalf("expected 1.7 days, got %q", calculation.DurationLabel)
	}
}

func TestTravelCalculationGoodRoadsRaiseMaximumPace(t *testing.T) {
	req := travelRequest{
		Distance: 30, DistanceUnit: "miles", Terrain: "mountain",
		Pace: "fast", GoodRoads: true, Weather: clearWeather(),
	}
	req.normalize()
	calculation, err := calculateTravelRequest(req)
	if err != nil {
		t.Fatalf("expected valid calculation: %v", err)
	}
	if calculation.GoodRoadsMaximumPace != "normal" || calculation.EffectivePace != "normal" {
		t.Fatalf("expected normal road/effective pace, got %+v", calculation)
	}
	if calculation.DurationHours != 30 {
		t.Fatalf("expected 30 hours, got %.2f", calculation.DurationHours)
	}
}

func TestTravelCalculationConvertsUnitsAndEncounterDistance(t *testing.T) {
	req := travelRequest{
		Distance: 1, DistanceUnit: "hexes", Terrain: "forest",
		Pace: "normal", EncounterDistanceFeet: intPointer(90), Weather: clearWeather(),
	}
	req.normalize()
	calculation, err := calculateTravelRequest(req)
	if err != nil {
		t.Fatalf("expected valid calculation: %v", err)
	}
	if math.Abs(calculation.DurationHours-5) > 0.02 {
		t.Fatalf("expected 5 hours, got %.2f", calculation.DurationHours)
	}
	if calculation.EncounterDistance.DiceExpression != "2d8 x 10 feet" {
		t.Fatalf("expected forest encounter dice, got %+v", calculation.EncounterDistance)
	}
	if calculation.EncounterDistance.AverageFeet != 90 {
		t.Fatalf("expected 90 average feet, got %.2f", calculation.EncounterDistance.AverageFeet)
	}
	if calculation.EncounterDistance.RolledFeet != 90 {
		t.Fatalf("expected manual awareness distance, got %+v", calculation.EncounterDistance)
	}
	if !strings.Contains(strings.Join(calculation.Assumptions, " "), "creatures may become aware") {
		t.Fatalf("expected awareness distance assumption, got %+v", calculation.Assumptions)
	}
}

func TestTravelCalculationRollsLegalEncounterDistance(t *testing.T) {
	req := travelRequest{
		Distance: 12, DistanceUnit: "miles", Terrain: "underdark",
		Pace: "normal", RollEncounterDistance: true, Weather: clearWeather(),
	}
	req.normalize()
	calculation, err := calculateTravelRequest(req)
	if err != nil {
		t.Fatalf("expected valid calculation: %v", err)
	}
	if calculation.EncounterDistance.RolledFeet < 20 || calculation.EncounterDistance.RolledFeet > 120 || calculation.EncounterDistance.RolledFeet%10 != 0 {
		t.Fatalf("expected legal 2d6 x 10 roll, got %+v", calculation.EncounterDistance)
	}
	if len(calculation.EncounterDistance.Rolls) != 2 {
		t.Fatalf("expected two d6 rolls, got %+v", calculation.EncounterDistance.Rolls)
	}
}

func TestTravelCalculationWaterborneUsesNormalPace(t *testing.T) {
	req := travelRequest{
		Distance: 24, DistanceUnit: "miles", Terrain: "waterborne",
		Pace: "fast", GoodRoads: true, Weather: clearWeather(),
	}
	req.normalize()
	calculation, err := calculateTravelRequest(req)
	if err != nil {
		t.Fatalf("expected valid calculation: %v", err)
	}
	if calculation.TerrainMaximumPace != "special" || calculation.EffectivePace != "normal" {
		t.Fatalf("expected waterborne to resolve to normal pace, got %+v", calculation)
	}
	if calculation.DurationLabel != "1 day" {
		t.Fatalf("expected 1 day, got %q", calculation.DurationLabel)
	}
}

func TestTravelRequestValidationRejectsInvalidPayloads(t *testing.T) {
	valid := travelRequest{
		Distance: 12, DistanceUnit: "miles", Terrain: "grassland",
		Pace: "normal", Weather: clearWeather(),
	}
	tests := []struct {
		name    string
		mutate  func(*travelRequest)
		message string
	}{
		{name: "negative distance", mutate: func(req *travelRequest) { req.Distance = -1 }, message: "distance must be greater than 0"},
		{name: "bad unit", mutate: func(req *travelRequest) { req.DistanceUnit = "yards" }, message: "distanceUnit"},
		{name: "bad pace", mutate: func(req *travelRequest) { req.Pace = "sprint" }, message: "pace"},
		{name: "bad terrain", mutate: func(req *travelRequest) { req.Terrain = "moon" }, message: "terrain"},
		{name: "bad encounter distance", mutate: func(req *travelRequest) { req.EncounterDistanceFeet = intPointer(95) }, message: "encounterDistanceFeet"},
		{name: "bad temperature", mutate: func(req *travelRequest) { req.Weather.Temperature = "boiling" }, message: "temperature"},
		{name: "bad wind", mutate: func(req *travelRequest) { req.Weather.Wind = "sideways" }, message: "wind"},
		{name: "bad precipitation", mutate: func(req *travelRequest) { req.Weather.Precipitation = "hail" }, message: "precipitation"},
		{name: "missing temperature delta", mutate: func(req *travelRequest) { req.Weather.Temperature = "colder" }, message: "temperatureDeltaF"},
		{name: "bad temperature delta", mutate: func(req *travelRequest) {
			delta := 5
			req.Weather.Temperature = "warmer"
			req.Weather.TemperatureDeltaF = &delta
		}, message: "temperatureDeltaF"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			req := valid
			test.mutate(&req)
			req.normalize()
			_, err := calculateTravelRequest(req)
			if err == nil || !strings.Contains(err.Error(), test.message) {
				t.Fatalf("expected error containing %q, got %v", test.message, err)
			}
		})
	}
}

func TestTravelWeatherRollsPreserveManualComponents(t *testing.T) {
	req := travelRequest{
		Distance: 12, DistanceUnit: "miles", Terrain: "grassland",
		Pace: "normal",
		Weather: models.TravelWeather{
			Temperature:       "colder",
			TemperatureDeltaF: intPointer(20),
			Wind:              "strong",
			Precipitation:     "heavy-rain-or-heavy-snow",
		},
		RollWeather: travelWeatherRolls{Wind: true},
	}
	req.normalize()
	calculation, err := calculateTravelRequest(req)
	if err != nil {
		t.Fatalf("expected weather calculation: %v", err)
	}
	if calculation.Weather.Temperature != "colder" || *calculation.Weather.TemperatureDeltaF != 20 {
		t.Fatalf("expected temperature to be preserved, got %+v", calculation.Weather)
	}
	if calculation.Weather.Precipitation != "heavy-rain-or-heavy-snow" {
		t.Fatalf("expected precipitation to be preserved, got %+v", calculation.Weather)
	}
	if calculation.Weather.Rolls == nil || calculation.Weather.Rolls.WindD20 == nil {
		t.Fatalf("expected wind roll metadata, got %+v", calculation.Weather)
	}
}

func TestJourneyRequestDefaultNames(t *testing.T) {
	tests := []struct {
		name     string
		req      journeyRequest
		expected string
	}{
		{
			name: "explicit",
			req: journeyRequest{
				Name: "Road to the keep", Distance: 12, DistanceUnit: "miles",
				Terrain: "grassland", Pace: "normal", Weather: clearWeather(),
			},
			expected: "Road to the keep",
		},
		{
			name: "route",
			req: journeyRequest{
				Origin: "Waterdeep", Destination: "Ironford", Distance: 12, DistanceUnit: "miles",
				Terrain: "grassland", Pace: "normal", Weather: clearWeather(),
			},
			expected: "Waterdeep to Ironford",
		},
		{
			name: "distance",
			req: journeyRequest{
				Distance: 5, DistanceUnit: "hexes", Terrain: "grassland",
				Pace: "normal", Weather: clearWeather(), RouteInputMode: "distance",
			},
			expected: "5 Hexes",
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			test.req.normalize()
			if test.req.Name != test.expected {
				t.Fatalf("expected %q, got %q", test.expected, test.req.Name)
			}
		})
	}
}

func TestJourneyRequestValidationRejectsInvalidPayloads(t *testing.T) {
	valid := journeyRequest{
		Distance: 12, DistanceUnit: "miles", Terrain: "grassland",
		Pace: "normal", Weather: clearWeather(), RouteInputMode: "route",
	}
	tests := []struct {
		name    string
		mutate  func(*journeyRequest)
		message string
	}{
		{name: "bad route mode", mutate: func(req *journeyRequest) { req.RouteInputMode = "portal" }, message: "routeInputMode"},
		{name: "bad distance", mutate: func(req *journeyRequest) { req.Distance = 0 }, message: "distance"},
		{name: "bad unit", mutate: func(req *journeyRequest) { req.DistanceUnit = "yards" }, message: "distanceUnit"},
		{name: "bad encounter distance", mutate: func(req *journeyRequest) { req.EncounterDistanceFeet = intPointer(95) }, message: "encounterDistanceFeet"},
		{name: "bad weather", mutate: func(req *journeyRequest) { req.Weather.Wind = "sideways" }, message: "wind"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			req := valid
			test.mutate(&req)
			req.normalize()
			err := validateJourneyRequest(req)
			if err == nil || !strings.Contains(err.Error(), test.message) {
				t.Fatalf("expected error containing %q, got %v", test.message, err)
			}
		})
	}
}

func clearWeather() models.TravelWeather {
	return models.TravelWeather{Temperature: "normal", Wind: "none", Precipitation: "none"}
}

func intPointer(value int) *int {
	return &value
}
