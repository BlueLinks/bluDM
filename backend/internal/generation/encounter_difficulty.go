package generation

import (
	"math"
	"strings"

	"bludm/backend/internal/models"
	"bludm/backend/internal/rulesets"
)

const DifficultyRuleset = rulesets.Encounter2014
const DifficultyRuleset2024 = rulesets.Encounter2024

type Thresholds struct {
	Easy     int `json:"easy"`
	Medium   int `json:"medium"`
	Hard     int `json:"hard"`
	Deadly   int `json:"deadly"`
	Low      int `json:"low"`
	Moderate int `json:"moderate"`
	High     int `json:"high"`
}

type DifficultyEvidence struct {
	Ruleset             string     `json:"ruleset"`
	RequestedDifficulty string     `json:"requestedDifficulty,omitempty"`
	ActualDifficulty    string     `json:"actualDifficulty"`
	Thresholds          Thresholds `json:"thresholds"`
	RawXP               int        `json:"rawXp"`
	XPBudget            int        `json:"xpBudget,omitempty"`
	XPSpent             int        `json:"xpSpent"`
	EnemyCount          int        `json:"enemyCount"`
	BaseMultiplier      float64    `json:"baseMultiplier"`
	PartySizeAdjustment int        `json:"partySizeAdjustment"`
	Multiplier          float64    `json:"multiplier"`
	AdjustedXP          int        `json:"adjustedXp"`
	TargetMinimum       int        `json:"targetMinimum,omitempty"`
	TargetMaximum       int        `json:"targetMaximum,omitempty"`
	WithinTarget        bool       `json:"withinTarget"`
	Warnings            []string   `json:"warnings"`
}

type thresholds = Thresholds
type difficulty struct {
	Thresholds thresholds
	AdjustedXP int
	Label      string
	Ruleset    string
}

var xpThresholds = map[int]thresholds{
	1:  {Easy: 25, Medium: 50, Hard: 75, Deadly: 100},
	2:  {Easy: 50, Medium: 100, Hard: 150, Deadly: 200},
	3:  {Easy: 75, Medium: 150, Hard: 225, Deadly: 400},
	4:  {Easy: 125, Medium: 250, Hard: 375, Deadly: 500},
	5:  {Easy: 250, Medium: 500, Hard: 750, Deadly: 1100},
	6:  {Easy: 300, Medium: 600, Hard: 900, Deadly: 1400},
	7:  {Easy: 350, Medium: 750, Hard: 1100, Deadly: 1700},
	8:  {Easy: 450, Medium: 900, Hard: 1400, Deadly: 2100},
	9:  {Easy: 550, Medium: 1100, Hard: 1600, Deadly: 2400},
	10: {Easy: 600, Medium: 1200, Hard: 1900, Deadly: 2800},
	11: {Easy: 800, Medium: 1600, Hard: 2400, Deadly: 3600},
	12: {Easy: 1000, Medium: 2000, Hard: 3000, Deadly: 4500},
	13: {Easy: 1100, Medium: 2200, Hard: 3400, Deadly: 5100},
	14: {Easy: 1250, Medium: 2500, Hard: 3800, Deadly: 5700},
	15: {Easy: 1400, Medium: 2800, Hard: 4300, Deadly: 6400},
	16: {Easy: 1600, Medium: 3200, Hard: 4800, Deadly: 7200},
	17: {Easy: 2000, Medium: 3900, Hard: 5900, Deadly: 8800},
	18: {Easy: 2100, Medium: 4200, Hard: 6300, Deadly: 9500},
	19: {Easy: 2400, Medium: 4900, Hard: 7300, Deadly: 10900},
	20: {Easy: 2800, Medium: 5700, Hard: 8500, Deadly: 12700},
}

var xpBudgets2024 = map[int]thresholds{
	1:  {Low: 50, Moderate: 75, High: 100},
	2:  {Low: 100, Moderate: 150, High: 200},
	3:  {Low: 150, Moderate: 225, High: 400},
	4:  {Low: 250, Moderate: 375, High: 500},
	5:  {Low: 500, Moderate: 750, High: 1100},
	6:  {Low: 600, Moderate: 1000, High: 1400},
	7:  {Low: 750, Moderate: 1300, High: 1700},
	8:  {Low: 1000, Moderate: 1700, High: 2100},
	9:  {Low: 1300, Moderate: 2000, High: 2600},
	10: {Low: 1600, Moderate: 2300, High: 3100},
	11: {Low: 1900, Moderate: 2900, High: 4100},
	12: {Low: 2200, Moderate: 3700, High: 4700},
	13: {Low: 2600, Moderate: 4200, High: 5400},
	14: {Low: 2900, Moderate: 4900, High: 6200},
	15: {Low: 3300, Moderate: 5400, High: 7800},
	16: {Low: 3800, Moderate: 6100, High: 9800},
	17: {Low: 4500, Moderate: 7200, High: 11700},
	18: {Low: 5000, Moderate: 8700, High: 14200},
	19: {Low: 5500, Moderate: 10700, High: 17200},
	20: {Low: 6400, Moderate: 13200, High: 22000},
}

func NormalizeDifficulty(ruleset, value string) (string, bool) {
	value = strings.ToLower(strings.TrimSpace(value))
	if ruleset == rulesets.Encounter2024 {
		switch value {
		case "low":
			return "low", true
		case "medium", "moderate":
			return "moderate", true
		case "high":
			return "high", true
		default:
			return "", false
		}
	}
	switch value {
	case "easy", "medium", "hard", "deadly":
		return value, true
	default:
		return "", false
	}
}

func encounterDifficulty(players []models.Player, enemies []EncounterEnemy) difficulty {
	return encounterDifficultyForRuleset(rulesets.Encounter2014, players, enemies)
}

func encounterDifficultyForRuleset(
	ruleset string,
	players []models.Player,
	enemies []EncounterEnemy,
) difficulty {
	evidence := EvaluateEncounterForRuleset(ruleset, players, enemies, "")
	return difficulty{
		Thresholds: evidence.Thresholds,
		AdjustedXP: evidence.AdjustedXP,
		Label:      evidence.ActualDifficulty,
		Ruleset:    evidence.Ruleset,
	}
}

func EvaluateEncounter(
	players []models.Player,
	enemies []EncounterEnemy,
	requestedDifficulty string,
) DifficultyEvidence {
	return EvaluateEncounterForRuleset(
		rulesets.Encounter2014, players, enemies, requestedDifficulty,
	)
}

func EvaluateEncounterForRuleset(
	ruleset string,
	players []models.Player,
	enemies []EncounterEnemy,
	requestedDifficulty string,
) DifficultyEvidence {
	if ruleset == rulesets.Encounter2024 {
		return evaluateEncounter2024(players, enemies, requestedDifficulty)
	}
	return evaluateEncounter2014(players, enemies, requestedDifficulty)
}

func evaluateEncounter2014(
	players []models.Player,
	enemies []EncounterEnemy,
	requestedDifficulty string,
) DifficultyEvidence {
	total := thresholds{}
	warnings := []string{}
	for _, player := range players {
		level := intValue(player.CharacterSheet["level"], 1)
		if _, ok := player.CharacterSheet["level"]; !ok {
			warnings = append(warnings, "A player was missing a level; level 1 was used.")
		}
		level = max(1, min(20, level))
		value := xpThresholds[level]
		total.Easy += value.Easy
		total.Medium += value.Medium
		total.Hard += value.Hard
		total.Deadly += value.Deadly
	}
	enemyXP, enemyCount := enemyXPAndCount(enemies, &warnings)
	baseMultiplier := encounterMultiplier(enemyCount)
	multiplier, partyAdjustment := adjustedEncounterMultiplier(baseMultiplier, len(players))
	adjusted := int(math.Round(float64(enemyXP) * multiplier))
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
	minimum, maximum := targetBand(strings.ToLower(strings.TrimSpace(requestedDifficulty)), total)
	within := requestedDifficulty == "" || adjusted >= minimum && (maximum == 0 || adjusted < maximum)
	if len(players) == 0 {
		warnings = append(warnings, "No players were supplied; difficulty thresholds are unavailable.")
	}
	if len(players) < 3 && len(players) > 0 {
		warnings = append(warnings, "The encounter multiplier was increased for a party smaller than three.")
	}
	if len(players) >= 6 {
		warnings = append(warnings, "The encounter multiplier was decreased for a party of six or more.")
	}
	return DifficultyEvidence{
		Ruleset:             rulesets.Encounter2014,
		RequestedDifficulty: capitalize(requestedDifficulty),
		ActualDifficulty:    label,
		Thresholds:          total,
		RawXP:               enemyXP,
		XPSpent:             enemyXP,
		EnemyCount:          enemyCount,
		BaseMultiplier:      baseMultiplier,
		PartySizeAdjustment: partyAdjustment,
		Multiplier:          multiplier,
		AdjustedXP:          adjusted,
		TargetMinimum:       minimum,
		TargetMaximum:       maximum,
		WithinTarget:        within,
		Warnings:            uniqueWarnings(warnings),
	}
}

func evaluateEncounter2024(
	players []models.Player,
	enemies []EncounterEnemy,
	requestedDifficulty string,
) DifficultyEvidence {
	total := thresholds{}
	warnings := []string{}
	for _, player := range players {
		level := intValue(player.CharacterSheet["level"], 1)
		if _, ok := player.CharacterSheet["level"]; !ok {
			warnings = append(warnings, "A player was missing a level; level 1 was used.")
		}
		level = max(1, min(20, level))
		value := xpBudgets2024[level]
		total.Low += value.Low
		total.Moderate += value.Moderate
		total.High += value.High
	}
	enemyXP, enemyCount := enemyXPAndCount(enemies, &warnings)
	label := "Trivial"
	if enemyXP > 0 && enemyXP <= total.Low {
		label = "Low"
	} else if enemyXP > 0 && enemyXP <= total.Moderate {
		label = "Moderate"
	} else if enemyXP > 0 && enemyXP <= total.High {
		label = "High"
	} else if enemyXP > 0 {
		label = "Over High"
	}
	normalized, valid := NormalizeDifficulty(rulesets.Encounter2024, requestedDifficulty)
	if requestedDifficulty == "" {
		normalized, valid = "", true
	}
	minimum, maximum := targetBand2024(normalized, total)
	within := requestedDifficulty == "" || valid && enemyXP >= minimum && enemyXP <= maximum
	budget := budget2024(normalized, label, total)
	if len(players) == 0 {
		warnings = append(warnings, "No players were supplied; XP budgets are unavailable.")
	}
	return DifficultyEvidence{
		Ruleset:             rulesets.Encounter2024,
		RequestedDifficulty: capitalize(normalized),
		ActualDifficulty:    label,
		Thresholds:          total,
		RawXP:               enemyXP,
		XPBudget:            budget,
		XPSpent:             enemyXP,
		EnemyCount:          enemyCount,
		BaseMultiplier:      1,
		PartySizeAdjustment: 0,
		Multiplier:          1,
		AdjustedXP:          enemyXP,
		TargetMinimum:       minimum,
		TargetMaximum:       maximum,
		WithinTarget:        within,
		Warnings:            uniqueWarnings(warnings),
	}
}

func enemyXPAndCount(enemies []EncounterEnemy, warnings *[]string) (int, int) {
	enemyXP, enemyCount := 0, 0
	for _, enemy := range enemies {
		enemyXP += enemy.Creature.XP * enemy.Quantity
		enemyCount += enemy.Quantity
		if enemy.Creature.XP <= 0 {
			*warnings = append(*warnings, "A zero-XP enemy does not contribute to the XP budget.")
		}
	}
	return enemyXP, enemyCount
}

func challengeScore(challenge string, result difficulty) float64 {
	if result.Ruleset == rulesets.Encounter2024 {
		return challengeScore2024(challenge, result)
	}
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

func challengeScore2024(challenge string, result difficulty) float64 {
	challenge, _ = NormalizeDifficulty(rulesets.Encounter2024, challenge)
	minimum, maximum := targetBand2024(challenge, result.Thresholds)
	bandMiss := 0
	if result.AdjustedXP < minimum {
		bandMiss = minimum - result.AdjustedXP
	} else if result.AdjustedXP > maximum {
		bandMiss = result.AdjustedXP - maximum
	}
	labelPenalty := 0
	if result.Label != capitalize(challenge) {
		labelPenalty = 100000
	}
	// The 2024 guidance says to spend as much of the budget as possible without
	// going over, so valid candidates are ordered by distance from the cap.
	return float64(labelPenalty+bandMiss) + math.Abs(float64(maximum-result.AdjustedXP))/100
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

func adjustedEncounterMultiplier(base float64, partySize int) (float64, int) {
	steps := []float64{0.5, 1, 1.5, 2, 2.5, 3, 4}
	index := 0
	for candidateIndex, multiplier := range steps {
		if multiplier == base {
			index = candidateIndex
			break
		}
	}
	adjustment := 0
	if partySize > 0 && partySize < 3 {
		adjustment = 1
	} else if partySize >= 6 {
		adjustment = -1
	}
	index = max(0, min(len(steps)-1, index+adjustment))
	return steps[index], adjustment
}

func targetBand(challenge string, value thresholds) (int, int) {
	switch challenge {
	case "easy":
		return value.Easy, value.Medium
	case "medium":
		return value.Medium, value.Hard
	case "hard":
		return value.Hard, value.Deadly
	case "deadly":
		return value.Deadly, int(math.Round(float64(value.Deadly) * 1.5))
	default:
		return 0, 0
	}
}

func targetBand2024(challenge string, value thresholds) (int, int) {
	switch challenge {
	case "low":
		return 1, value.Low
	case "moderate":
		return value.Low + 1, value.Moderate
	case "high":
		return value.Moderate + 1, value.High
	default:
		return 0, 0
	}
}

func budget2024(requested, actual string, value thresholds) int {
	band := requested
	if band == "" {
		band = strings.ToLower(actual)
	}
	switch band {
	case "low":
		return value.Low
	case "moderate":
		return value.Moderate
	case "high", "over high":
		return value.High
	default:
		return 0
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

func uniqueWarnings(values []string) []string {
	result := []string{}
	for _, value := range values {
		found := false
		for _, existing := range result {
			if existing == value {
				found = true
				break
			}
		}
		if !found {
			result = append(result, value)
		}
	}
	return result
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
