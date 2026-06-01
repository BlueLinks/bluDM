package httpapi

import (
	"bludm/backend/internal/models"
	"math"
	"strings"
	"testing"
)

func TestTravelCalculationConvertsUnitsAndAppliesMultipliers(t *testing.T) {
	tests := []struct {
		name          string
		req           travelRequest
		expectedHours float64
		expectedLabel string
	}{
		{
			name: "miles normal forest road",
			req: travelRequest{
				Distance: 63, DistanceUnit: "miles", Terrain: "forest",
				Pace: "normal", RouteCondition: "road-or-trail", Climate: "temperate",
				Weather: models.TravelWeather{Severity: "notable", Title: "Cool Rain", Text: "Rain."},
			},
			expectedHours: 84,
			expectedLabel: "3.5 days",
		},
		{
			name: "kilometers fast plains road",
			req: travelRequest{
				Distance: 30, DistanceUnit: "kilometers", Terrain: "plains",
				Pace: "fast", RouteCondition: "road-or-trail", Climate: "temperate",
				Weather: models.TravelWeather{Severity: "calm", Title: "Clear", Text: "Clear."},
			},
			expectedHours: 14.91,
			expectedLabel: "15 hours",
		},
		{
			name: "hexes slow swamp hazardous",
			req: travelRequest{
				Distance: 3, DistanceUnit: "hexes", Terrain: "swamp",
				Pace: "slow", RouteCondition: "hazardous-terrain", Climate: "wet",
				Weather: models.TravelWeather{Severity: "harsh", Title: "Rain", Text: "Rain."},
			},
			expectedHours: 96,
			expectedLabel: "4 days",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			test.req.normalize()
			calculation, err := calculateTravelRequest(test.req)
			if err != nil {
				t.Fatalf("expected valid calculation: %v", err)
			}
			if math.Abs(calculation.DurationHours-test.expectedHours) > 0.02 {
				t.Fatalf("expected %.2f hours, got %.2f", test.expectedHours, calculation.DurationHours)
			}
			if calculation.DurationLabel != test.expectedLabel {
				t.Fatalf("expected label %q, got %q", test.expectedLabel, calculation.DurationLabel)
			}
			if len(calculation.Assumptions) != 5 {
				t.Fatalf("expected assumptions, got %+v", calculation.Assumptions)
			}
		})
	}
}

func TestTravelRequestValidationRejectsInvalidPayloads(t *testing.T) {
	valid := travelRequest{
		Distance: 12, DistanceUnit: "miles", Terrain: "road",
		Pace: "normal", RouteCondition: "road-or-trail", Climate: "temperate",
		Weather: models.TravelWeather{Severity: "calm", Title: "Clear", Text: "Clear."},
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
		{name: "bad route", mutate: func(req *travelRequest) { req.RouteCondition = "lost" }, message: "routeCondition"},
		{name: "bad climate", mutate: func(req *travelRequest) { req.Climate = "volcanic" }, message: "climate"},
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

func TestTravelWeatherGenerationReturnsEditablePayload(t *testing.T) {
	req := travelRequest{
		Distance: 12, DistanceUnit: "miles", Terrain: "swamp",
		Pace: "normal", RouteCondition: "road-or-trail", Climate: "wet", RerollWeather: true,
	}
	req.normalize()
	calculation, err := calculateTravelRequest(req)
	if err != nil {
		t.Fatalf("expected weather calculation: %v", err)
	}
	if calculation.Weather.Severity == "" || calculation.Weather.Title == "" || calculation.Weather.Text == "" {
		t.Fatalf("expected generated weather, got %+v", calculation.Weather)
	}
	if !travelWeatherSeverities[calculation.Weather.Severity] {
		t.Fatalf("expected known severity, got %+v", calculation.Weather)
	}
}

func TestTravelCalculationPreservesEditedWeatherWhenNotRerolling(t *testing.T) {
	req := travelRequest{
		Distance: 12, DistanceUnit: "miles", Terrain: "road",
		Pace: "normal", RouteCondition: "road-or-trail", Climate: "temperate",
		Weather: models.TravelWeather{
			Severity: "notable",
			Title:    "Custom Drizzle",
			Text:     "The DM changed this forecast.",
			Prompt:   "Use the edited prompt.",
		},
	}
	req.normalize()
	calculation, err := calculateTravelRequest(req)
	if err != nil {
		t.Fatalf("expected weather calculation: %v", err)
	}
	if calculation.Weather.Title != "Custom Drizzle" || calculation.Weather.Text != "The DM changed this forecast." {
		t.Fatalf("expected edited weather to be preserved, got %+v", calculation.Weather)
	}
}
