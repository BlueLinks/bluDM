package httpapi

import (
	"bludm/backend/internal/models"
	"crypto/rand"
	"encoding/binary"
	"errors"
	"fmt"
	"math"
	"strings"
)

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

func validateTravelWeather(weather models.TravelWeather, rolls travelWeatherRolls) error {
	if !travelTemperatures[weather.Temperature] && !rolls.Temperature {
		return errors.New("temperature is invalid")
	}
	if !travelWinds[weather.Wind] && !rolls.Wind {
		return errors.New("wind is invalid")
	}
	if !travelPrecipitations[weather.Precipitation] && !rolls.Precipitation {
		return errors.New("precipitation is invalid")
	}
	if !rolls.Temperature && weather.Temperature != "normal" {
		if weather.TemperatureDeltaF == nil {
			return errors.New("temperatureDeltaF is required for colder or warmer weather")
		}
		if *weather.TemperatureDeltaF < 10 || *weather.TemperatureDeltaF > 40 || *weather.TemperatureDeltaF%10 != 0 {
			return errors.New("temperatureDeltaF must be 10, 20, 30, or 40")
		}
	}
	return nil
}

func applyTravelWeatherRolls(weather models.TravelWeather, rolls travelWeatherRolls) models.TravelWeather {
	result := weather
	metadata := models.TravelWeatherRolls{}
	rolled := false
	if rolls.Temperature {
		rolled = true
		d20 := rollDie(20)
		metadata.TemperatureD20 = &d20
		result.TemperatureDeltaF = nil
		switch {
		case d20 <= 14:
			result.Temperature = "normal"
		case d20 <= 17:
			result.Temperature = "colder"
			d4 := rollDie(4)
			metadata.TemperatureD4 = &d4
			delta := d4 * 10
			result.TemperatureDeltaF = &delta
		default:
			result.Temperature = "warmer"
			d4 := rollDie(4)
			metadata.TemperatureD4 = &d4
			delta := d4 * 10
			result.TemperatureDeltaF = &delta
		}
	}
	if rolls.Wind {
		rolled = true
		d20 := rollDie(20)
		metadata.WindD20 = &d20
		switch {
		case d20 <= 14:
			result.Wind = "none"
		case d20 <= 17:
			result.Wind = "light"
		default:
			result.Wind = "strong"
		}
	}
	if rolls.Precipitation {
		rolled = true
		d20 := rollDie(20)
		metadata.PrecipitationD20 = &d20
		switch {
		case d20 <= 14:
			result.Precipitation = "none"
		case d20 <= 17:
			result.Precipitation = "light-rain-or-heavy-snow"
		default:
			result.Precipitation = "heavy-rain-or-heavy-snow"
		}
	}
	if rolled {
		result.Rolls = &metadata
	}
	return result
}

func increaseTravelPace(pace string) string {
	switch pace {
	case "slow":
		return "normal"
	case "normal":
		return "fast"
	default:
		return pace
	}
}

func clampTravelPace(requested string, maximum string) string {
	if travelPaceOrder[requested] > travelPaceOrder[maximum] {
		return maximum
	}
	return requested
}

func rollDie(sides int) int {
	var data [8]byte
	if _, err := rand.Read(data[:]); err != nil {
		return 1
	}
	return int(binary.LittleEndian.Uint64(data[:])%uint64(sides)) + 1
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

var travelPaceOrder = map[string]int{"slow": 1, "normal": 2, "fast": 3}

type travelTerrainRule struct {
	MaximumPace          string
	EncounterDice        string
	EncounterAverageFeet float64
}

var travelTerrains = map[string]travelTerrainRule{
	"arctic":     {MaximumPace: "fast", EncounterDice: "6d6 x 10 feet", EncounterAverageFeet: 210},
	"coastal":    {MaximumPace: "normal", EncounterDice: "2d10 x 10 feet", EncounterAverageFeet: 110},
	"desert":     {MaximumPace: "normal", EncounterDice: "6d6 x 10 feet", EncounterAverageFeet: 210},
	"forest":     {MaximumPace: "normal", EncounterDice: "2d8 x 10 feet", EncounterAverageFeet: 90},
	"grassland":  {MaximumPace: "fast", EncounterDice: "6d6 x 10 feet", EncounterAverageFeet: 210},
	"hill":       {MaximumPace: "normal", EncounterDice: "2d10 x 10 feet", EncounterAverageFeet: 110},
	"mountain":   {MaximumPace: "slow", EncounterDice: "4d10 x 10 feet", EncounterAverageFeet: 220},
	"swamp":      {MaximumPace: "slow", EncounterDice: "2d8 x 10 feet", EncounterAverageFeet: 90},
	"underdark":  {MaximumPace: "normal", EncounterDice: "2d6 x 10 feet", EncounterAverageFeet: 70},
	"urban":      {MaximumPace: "normal", EncounterDice: "2d6 x 10 feet", EncounterAverageFeet: 70},
	"waterborne": {MaximumPace: "special", EncounterDice: "6d6 x 10 feet", EncounterAverageFeet: 210},
}

var travelTemperatures = map[string]bool{"normal": true, "colder": true, "warmer": true}
var travelWinds = map[string]bool{"none": true, "light": true, "strong": true}
var travelPrecipitations = map[string]bool{
	"none":                     true,
	"light-rain-or-heavy-snow": true,
	"heavy-rain-or-heavy-snow": true,
}
