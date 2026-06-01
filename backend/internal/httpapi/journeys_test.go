package httpapi

import (
	"bludm/backend/internal/models"
	"math"
	"strings"
	"testing"
)

func TestJourneyCalculationConvertsUnitsAndAppliesMultipliers(t *testing.T) {
	tests := []struct {
		name          string
		req           journeyRequest
		expectedHours float64
		expectedLabel string
	}{
		{
			name: "miles normal forest road",
			req: journeyRequest{
				Name: "North Road", Distance: 63, DistanceUnit: "miles", Terrain: "forest",
				Pace: "normal", RouteCondition: "road-or-trail", Climate: "temperate",
				Weather: models.JourneyWeather{Severity: "notable", Title: "Cool Rain", Text: "Rain."},
			},
			expectedHours: 84,
			expectedLabel: "3.5 days",
		},
		{
			name: "kilometers fast plains road",
			req: journeyRequest{
				Name: "Metric Road", Distance: 30, DistanceUnit: "kilometers", Terrain: "plains",
				Pace: "fast", RouteCondition: "road-or-trail", Climate: "temperate",
				Weather: models.JourneyWeather{Severity: "calm", Title: "Clear", Text: "Clear."},
			},
			expectedHours: 14.91,
			expectedLabel: "15 hours",
		},
		{
			name: "hexes slow swamp hazardous",
			req: journeyRequest{
				Name: "Mistfen", Distance: 3, DistanceUnit: "hexes", Terrain: "swamp",
				Pace: "slow", RouteCondition: "hazardous-terrain", Climate: "wet",
				Weather: models.JourneyWeather{Severity: "harsh", Title: "Rain", Text: "Rain."},
			},
			expectedHours: 96,
			expectedLabel: "4 days",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			test.req.normalize()
			calculation, err := calculateJourneyRequest(test.req)
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

func TestJourneyRequestValidationRejectsInvalidPayloads(t *testing.T) {
	valid := journeyRequest{
		Name: "Valid", Distance: 12, DistanceUnit: "miles", Terrain: "road",
		Pace: "normal", RouteCondition: "road-or-trail", Climate: "temperate",
		Weather: models.JourneyWeather{Severity: "calm", Title: "Clear", Text: "Clear."},
	}
	tests := []struct {
		name    string
		mutate  func(*journeyRequest)
		message string
	}{
		{name: "missing name", mutate: func(req *journeyRequest) { req.Name = " " }, message: "name is required"},
		{name: "negative distance", mutate: func(req *journeyRequest) { req.Distance = -1 }, message: "distance must be greater than 0"},
		{name: "bad unit", mutate: func(req *journeyRequest) { req.DistanceUnit = "yards" }, message: "distanceUnit"},
		{name: "bad pace", mutate: func(req *journeyRequest) { req.Pace = "sprint" }, message: "pace"},
		{name: "bad terrain", mutate: func(req *journeyRequest) { req.Terrain = "moon" }, message: "terrain"},
		{name: "bad route", mutate: func(req *journeyRequest) { req.RouteCondition = "lost" }, message: "routeCondition"},
		{name: "bad climate", mutate: func(req *journeyRequest) { req.Climate = "volcanic" }, message: "climate"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			req := valid
			test.mutate(&req)
			req.normalize()
			_, err := calculateJourneyRequest(req)
			if err == nil || !strings.Contains(err.Error(), test.message) {
				t.Fatalf("expected error containing %q, got %v", test.message, err)
			}
		})
	}
}

func TestJourneyWeatherGenerationReturnsEditablePayload(t *testing.T) {
	req := journeyRequest{
		Name: "Rain Road", Distance: 12, DistanceUnit: "miles", Terrain: "swamp",
		Pace: "normal", RouteCondition: "road-or-trail", Climate: "wet", RerollWeather: true,
	}
	req.normalize()
	calculation, err := calculateJourneyRequest(req)
	if err != nil {
		t.Fatalf("expected weather calculation: %v", err)
	}
	if calculation.Weather.Severity == "" || calculation.Weather.Title == "" || calculation.Weather.Text == "" {
		t.Fatalf("expected generated weather, got %+v", calculation.Weather)
	}
	if !journeyWeatherSeverities[calculation.Weather.Severity] {
		t.Fatalf("expected known severity, got %+v", calculation.Weather)
	}
}

func TestJourneyCalculationPreservesEditedWeatherWhenNotRerolling(t *testing.T) {
	req := journeyRequest{
		Name: "Edited Weather", Distance: 12, DistanceUnit: "miles", Terrain: "road",
		Pace: "normal", RouteCondition: "road-or-trail", Climate: "temperate",
		Weather: models.JourneyWeather{
			Severity: "notable",
			Title:    "Custom Drizzle",
			Text:     "The DM changed this forecast.",
			Prompt:   "Use the edited prompt.",
		},
	}
	req.normalize()
	calculation, err := calculateJourneyRequest(req)
	if err != nil {
		t.Fatalf("expected weather calculation: %v", err)
	}
	if calculation.Weather.Title != "Custom Drizzle" || calculation.Weather.Text != "The DM changed this forecast." {
		t.Fatalf("expected edited weather to be preserved, got %+v", calculation.Weather)
	}
}
