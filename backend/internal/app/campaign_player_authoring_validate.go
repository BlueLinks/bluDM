package app

import (
	"slices"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"
	"bludm/backend/internal/rulesets"
	"bludm/backend/internal/store"
)

func normalizeCampaignCreate(command CampaignCreateCommand) (store.CampaignInput, []string, error) {
	name := strings.TrimSpace(command.Name)
	if name == "" {
		return store.CampaignInput{}, nil, ValidationError("missing_name", "campaign name is required", nil)
	}
	sources, err := normalizeCampaignSources(command.AllowedStandardSources)
	if err != nil {
		return store.CampaignInput{}, nil, err
	}
	ruleset, err := normalizeEncounterRuleset(command.EncounterRuleset)
	if err != nil {
		return store.CampaignInput{}, nil, err
	}
	if len(sources) == 0 {
		sources = []string{sourceForRuleset(ruleset)}
	}
	resolved, err := rulesets.ResolveEncounterRuleset(sources, ruleset)
	if err != nil {
		return store.CampaignInput{}, nil, ValidationError("invalid_ruleset", err.Error(), nil)
	}
	return store.CampaignInput{
		Name: name, Description: strings.TrimSpace(command.Description),
		AllowedStandardSources: sources, EncounterRuleset: resolved,
	}, []string{}, nil
}

func mergeCampaignUpdate(
	entity dbmodels.CampaignEntity,
	command CampaignUpdateCommand,
) (store.CampaignInput, []string, error) {
	name, description := entity.Name, entity.Description
	if command.Name != nil {
		name = strings.TrimSpace(*command.Name)
	}
	if command.Description != nil {
		description = strings.TrimSpace(*command.Description)
	}
	if name == "" {
		return store.CampaignInput{}, nil, ValidationError("missing_name", "campaign name is required", nil)
	}
	sources := append([]string(nil), entity.AllowedStandardSources...)
	var err error
	if command.AllowedStandardSources != nil {
		sources, err = normalizeCampaignSources(*command.AllowedStandardSources)
		if err != nil {
			return store.CampaignInput{}, nil, err
		}
	}
	ruleset := entity.EncounterRuleset
	if command.EncounterRuleset != nil {
		ruleset, err = normalizeEncounterRuleset(*command.EncounterRuleset)
		if err != nil {
			return store.CampaignInput{}, nil, err
		}
	}
	warnings := []string{}
	if command.EncounterRuleset != nil && command.AllowedStandardSources == nil {
		requiredSource := sourceForRuleset(ruleset)
		if !slices.Contains(sources, requiredSource) {
			sources = append(sources, requiredSource)
			warnings = append(warnings, "enabled "+requiredSource+" because the selected ruleset requires it")
		}
	}
	if len(sources) == 0 {
		sources = []string{sourceForRuleset(ruleset)}
	}
	resolved, err := rulesets.ResolveEncounterRuleset(sources, ruleset)
	if err != nil {
		return store.CampaignInput{}, nil, ValidationError("invalid_ruleset", err.Error(), nil)
	}
	return store.CampaignInput{
		Name: name, Description: description,
		AllowedStandardSources: sources, EncounterRuleset: resolved,
	}, warnings, nil
}

func normalizeCampaignSources(values []string) ([]string, error) {
	result := []string{}
	for _, value := range values {
		value = strings.ToLower(strings.TrimSpace(value))
		if value != rulesets.Source2014 && value != rulesets.Source2024 {
			return nil, ValidationError("unsupported_source", "unsupported standard source", map[string]any{
				"source": value,
			})
		}
		if !slices.Contains(result, value) {
			result = append(result, value)
		}
	}
	return result, nil
}

func normalizeEncounterRuleset(value string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "2014", rulesets.Encounter2014:
		return rulesets.Encounter2014, nil
	case "2024", rulesets.Encounter2024:
		return rulesets.Encounter2024, nil
	default:
		return "", ValidationError(
			"unsupported_ruleset", "encounterRuleset must be 2014 or 2024", nil,
		)
	}
}

func sourceForRuleset(value string) string {
	if value == rulesets.Encounter2024 {
		return rulesets.Source2024
	}
	return rulesets.Source2014
}

func campaignUpdateHasChanges(command CampaignUpdateCommand) bool {
	return command.Name != nil || command.Description != nil ||
		command.AllowedStandardSources != nil || command.EncounterRuleset != nil
}

func playerCreateInput(campaignID string, command PlayerCreateCommand) (store.PlayerInput, error) {
	input := store.PlayerInput{
		CampaignID: strings.TrimSpace(campaignID), CharacterName: strings.TrimSpace(command.CharacterName),
		PlayerName: strings.TrimSpace(command.PlayerName), AvatarURL: strings.TrimSpace(command.AvatarURL),
		ArmorClass: command.ArmorClass, MaxHitPoints: command.MaxHitPoints,
		TemporaryHitPoints:    command.TemporaryHitPoints,
		TemporaryMaxHitPoints: command.TemporaryMaxHitPoints,
		ExperiencePoints:      command.ExperiencePoints, CharacterSheet: command.CharacterSheet,
	}
	if input.ArmorClass == 0 {
		input.ArmorClass = 10
	}
	if input.MaxHitPoints == 0 {
		input.MaxHitPoints = 1
	}
	return input, validatePlayerInput(input)
}

func mergePlayerUpdate(source models.Player, command PlayerUpdateCommand) (store.PlayerInput, error) {
	input := store.PlayerInput{
		CampaignID: source.CampaignID, CharacterName: source.CharacterName,
		PlayerName: source.PlayerName, AvatarAssetID: source.AvatarAssetID, AvatarURL: source.AvatarURL,
		ArmorClass: source.ArmorClass, MaxHitPoints: source.MaxHitPoints,
		TemporaryHitPoints:    source.TemporaryHitPoints,
		TemporaryMaxHitPoints: source.TemporaryMaxHitPoints,
		ExperiencePoints:      source.ExperiencePoints, CharacterSheet: source.CharacterSheet,
	}
	if command.CharacterName != nil {
		input.CharacterName = strings.TrimSpace(*command.CharacterName)
	}
	if command.PlayerName != nil {
		input.PlayerName = strings.TrimSpace(*command.PlayerName)
	}
	if command.AvatarURL != nil {
		input.AvatarURL = strings.TrimSpace(*command.AvatarURL)
	}
	if command.ArmorClass != nil {
		input.ArmorClass = *command.ArmorClass
	}
	if command.MaxHitPoints != nil {
		input.MaxHitPoints = *command.MaxHitPoints
	}
	if command.TemporaryHitPoints != nil {
		input.TemporaryHitPoints = *command.TemporaryHitPoints
	}
	if command.TemporaryMaxHitPoints != nil {
		input.TemporaryMaxHitPoints = *command.TemporaryMaxHitPoints
	}
	if command.ExperiencePoints != nil {
		input.ExperiencePoints = *command.ExperiencePoints
	}
	if command.CharacterSheet != nil {
		input.CharacterSheet = *command.CharacterSheet
	}
	return input, validatePlayerInput(input)
}

func validatePlayerInput(input store.PlayerInput) error {
	if input.CharacterName == "" {
		return ValidationError("missing_name", "characterName is required", nil)
	}
	if input.ArmorClass < 0 || input.ArmorClass > 40 {
		return ValidationError("invalid_armor_class", "armorClass must be between 0 and 40", nil)
	}
	if input.MaxHitPoints < 1 {
		return ValidationError("invalid_hit_points", "maxHitPoints must be at least 1", nil)
	}
	if input.TemporaryHitPoints < 0 || input.TemporaryMaxHitPoints < 0 {
		return ValidationError("invalid_temporary_hit_points", "temporary hit point values cannot be negative", nil)
	}
	if input.ExperiencePoints < 0 {
		return ValidationError("invalid_experience", "experiencePoints cannot be negative", nil)
	}
	return nil
}

func playerUpdateHasChanges(command PlayerUpdateCommand) bool {
	return command.CharacterName != nil || command.PlayerName != nil || command.AvatarURL != nil ||
		command.ArmorClass != nil || command.MaxHitPoints != nil ||
		command.TemporaryHitPoints != nil || command.TemporaryMaxHitPoints != nil ||
		command.ExperiencePoints != nil || command.CharacterSheet != nil
}

func playerWriteResult(s *Service, player models.Player, operation string, warnings []string) PlayerWriteResult {
	if warnings == nil {
		warnings = []string{}
	}
	return PlayerWriteResult{
		Player: player,
		AuthoringWriteMetadata: AuthoringWriteMetadata{
			Operation: operation, AppURL: s.AppURL("/players/" + player.ID + "/edit"),
			Warnings: warnings,
		},
	}
}
