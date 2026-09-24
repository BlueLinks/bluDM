package httpapi

import (
	"math"
	"strconv"
	"strings"
)

func abilityModFromSnapshot(snapshot map[string]any, ability string) int {
	source := sourceMap(snapshot)
	scores, ok := source["abilityScores"].(map[string]any)
	if !ok {
		scores, ok = source["abilities"].(map[string]any)
	}
	if !ok {
		return 0
	}
	score := intFromAny(scores[strings.ToLower(ability)])
	if score == 0 {
		score = 10
	}
	return int(math.Floor(float64(score-10) / 2))
}

func savingThrowBonusFromSnapshot(snapshot map[string]any, ability string) int {
	source := sourceMap(snapshot)
	ability = strings.ToLower(strings.TrimSpace(ability))
	if saves, ok := source["abilitySaveProficiencies"].(map[string]any); ok {
		if value, present := saves[ability]; present {
			return intFromAny(value)
		}
	}
	bonus := abilityModFromSnapshot(snapshot, ability)
	for _, proficient := range stringSliceFromAny(source["savingThrowProficiencies"]) {
		if strings.EqualFold(proficient, ability) {
			proficiency := intFromAny(source["proficiencyBonus"])
			if proficiency <= 0 {
				proficiency = 2
				if creature, ok := snapshot["creature"].(map[string]any); ok {
					if rating, err := strconv.ParseFloat(stringFromAny(creature["challengeRating"]), 64); err == nil {
						proficiency = max(2, int(math.Ceil(rating/4))+1)
					}
				}
			}
			return bonus + proficiency
		}
	}
	return bonus
}
