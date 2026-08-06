package app

import (
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/generation"
	"bludm/backend/internal/models"
	"bludm/backend/internal/rulesets"
)

func campaignEncounterRuleset(campaign models.Campaign) (string, error) {
	resolved, err := rulesets.ResolveEncounterRuleset(
		campaign.AllowedStandardSources, campaign.EncounterRuleset,
	)
	if err != nil {
		return "", ValidationError(
			"encounter_ruleset_required",
			err.Error(),
			map[string]any{"allowedStandardSources": campaign.AllowedStandardSources},
		)
	}
	return resolved, nil
}

func persistedEncounterRuleset(
	encounter dbmodels.EncounterEntity,
	campaign models.Campaign,
) (string, error) {
	if rulesets.IsEncounterRuleset(encounter.DifficultyRuleset) {
		return encounter.DifficultyRuleset, nil
	}
	if value, ok := encounter.Metadata["difficultyRuleset"].(string); ok &&
		rulesets.IsEncounterRuleset(strings.TrimSpace(value)) {
		return strings.TrimSpace(value), nil
	}
	if evidence, ok := encounter.Metadata["difficultyEvidence"].(map[string]any); ok {
		if value, ok := evidence["ruleset"].(string); ok &&
			rulesets.IsEncounterRuleset(strings.TrimSpace(value)) {
			return strings.TrimSpace(value), nil
		}
	}
	return campaignEncounterRuleset(campaign)
}

func normalizeDifficultyForRuleset(ruleset, value string) (string, error) {
	if normalized, ok := generation.NormalizeDifficulty(ruleset, value); ok {
		return normalized, nil
	}
	message := "difficulty must be easy, medium, hard, or deadly for 2014 rules"
	if ruleset == rulesets.Encounter2024 {
		message = "difficulty must be low, moderate (or medium), or high for 2024 rules"
	}
	return "", ValidationError("invalid_difficulty", message, map[string]any{"ruleset": ruleset})
}
