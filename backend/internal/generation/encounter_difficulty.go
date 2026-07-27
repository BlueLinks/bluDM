package generation

import (
	"math"

	"bludm/backend/internal/models"
)

type thresholds struct{ Easy, Medium, Hard, Deadly int }
type difficulty struct {
	Thresholds thresholds
	AdjustedXP int
	Label      string
}

var xpThresholds = map[int]thresholds{
	1: {25, 50, 75, 100}, 2: {50, 100, 150, 200}, 3: {75, 150, 225, 400},
	4: {125, 250, 375, 500}, 5: {250, 500, 750, 1100}, 6: {300, 600, 900, 1400},
	7: {350, 750, 1100, 1700}, 8: {450, 900, 1400, 2100}, 9: {550, 1100, 1600, 2400},
	10: {600, 1200, 1900, 2800}, 11: {800, 1600, 2400, 3600}, 12: {1000, 2000, 3000, 4500},
	13: {1100, 2200, 3400, 5100}, 14: {1250, 2500, 3800, 5700}, 15: {1400, 2800, 4300, 6400},
	16: {1600, 3200, 4800, 7200}, 17: {2000, 3900, 5900, 8800}, 18: {2100, 4200, 6300, 9500},
	19: {2400, 4900, 7300, 10900}, 20: {2800, 5700, 8500, 12700},
}

func encounterDifficulty(players []models.Player, enemies []EncounterEnemy) difficulty {
	total := thresholds{}
	for _, player := range players {
		level := intValue(player.CharacterSheet["level"], 1)
		level = max(1, min(20, level))
		value := xpThresholds[level]
		total.Easy += value.Easy
		total.Medium += value.Medium
		total.Hard += value.Hard
		total.Deadly += value.Deadly
	}
	enemyXP, enemyCount := 0, 0
	for _, enemy := range enemies {
		enemyXP += enemy.Creature.XP * enemy.Quantity
		enemyCount += enemy.Quantity
	}
	adjusted := int(math.Round(float64(enemyXP) * encounterMultiplier(enemyCount)))
	label := "Trivial"
	if total.Deadly > 0 && float64(adjusted) >= float64(total.Deadly)*1.5 {
		label = "Over Deadly"
	} else if adjusted >= total.Deadly {
		label = "Deadly"
	} else if adjusted >= total.Hard {
		label = "Hard"
	} else if adjusted >= total.Medium {
		label = "Medium"
	} else if adjusted >= total.Easy {
		label = "Easy"
	}
	return difficulty{Thresholds: total, AdjustedXP: adjusted, Label: label}
}

func challengeScore(challenge string, result difficulty) float64 {
	minimum, maximum := result.Thresholds.Medium, result.Thresholds.Hard
	switch challenge {
	case "easy":
		minimum, maximum = result.Thresholds.Easy, result.Thresholds.Medium
	case "hard":
		minimum, maximum = result.Thresholds.Hard, result.Thresholds.Deadly
	case "deadly":
		minimum, maximum = result.Thresholds.Deadly, int(float64(result.Thresholds.Deadly)*1.5)
	}
	if maximum == 0 {
		maximum = math.MaxInt
	}
	midpoint := float64(minimum+maximum) / 2
	bandMiss := 0
	if result.AdjustedXP < minimum || result.AdjustedXP >= maximum {
		bandMiss = min(abs(result.AdjustedXP-minimum), abs(result.AdjustedXP-maximum))
	}
	target := capitalize(challenge)
	labelPenalty := 0
	if result.Label != target {
		labelPenalty = labelDistance(target, result.Label) * 100000
	}
	return float64(labelPenalty+bandMiss) + math.Abs(float64(result.AdjustedXP)-midpoint)/100
}

func encounterMultiplier(count int) float64 {
	switch {
	case count <= 0:
		return 0
	case count == 1:
		return 1
	case count == 2:
		return 1.5
	case count <= 6:
		return 2
	case count <= 10:
		return 2.5
	case count <= 14:
		return 3
	default:
		return 4
	}
}

func intValue(value any, fallback int) int {
	switch typed := value.(type) {
	case int:
		return typed
	case float64:
		return int(typed)
	case float32:
		return int(typed)
	default:
		return fallback
	}
}

func labelDistance(target, actual string) int {
	order := []string{"Trivial", "Easy", "Medium", "Hard", "Deadly", "Over Deadly"}
	targetIndex, actualIndex := 0, len(order)
	for index, label := range order {
		if label == target {
			targetIndex = index
		}
		if label == actual {
			actualIndex = index
		}
	}
	return abs(targetIndex - actualIndex)
}

func abs(value int) int {
	if value < 0 {
		return -value
	}
	return value
}
