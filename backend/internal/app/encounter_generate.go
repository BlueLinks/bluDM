package app

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"slices"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/generation"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
)

func deterministicSeed(value string) int {
	sum := sha256.Sum256([]byte(value))
	return int(binary.BigEndian.Uint32(sum[:4]) & 0x7fffffff)
}

func (s *Service) CreateGeneratedEncounter(
	ctx context.Context,
	campaignID string,
	command GenerateEncounterCommand,
) (EncounterAuthoringResult, error) {
	principal, err := s.authorize(
		ctx, campaignID, ScopeEncountersWrite, ScopeGenerationRun,
	)
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	command, err = normalizeGenerateEncounterCommand(command)
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	if command.Seed == 0 {
		command.Seed = deterministicSeed(command.IdempotencyKey)
	}
	campaign, err := s.stores.Campaigns.ByID(ctx, principal.UserID, campaignID)
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	ruleset, err := campaignEncounterRuleset(campaign)
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	command.Options.Challenge, err = normalizeDifficultyForRuleset(ruleset, command.Options.Challenge)
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	inputHash, err := normalizedHash(command)
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	replay, found, err := idempotencyReplay[EncounterAuthoringResult](
		ctx, s.db, principal, "create_generated_encounter", command.IdempotencyKey, inputHash,
	)
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	if found {
		replay.IdempotencyReplay = true
		return replay, nil
	}
	players, err := s.resolvePlayers(
		ctx, principal, campaignID, command.AllCampaignPlayers, command.PlayerIDs,
	)
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	location, err := s.generationLocation(ctx, principal, campaignID, command.LocationID)
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	creatures, err := s.generationCreatures(ctx, principal, campaign, command)
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	seed := command.Seed
	preview := generation.GenerateEncounterForRuleset(
		ruleset, creatures, location, command.Options, players, seed,
	)
	if command.LocationID != "" && !principal.HasScope(ScopeWorldRead) &&
		(command.Options.UseLocationTheme || command.Options.UseLocationNotes) {
		preview.SelectionReasons = append(
			preview.SelectionReasons,
			"Location theme and notes were not read because this principal does not grant world:read.",
		)
	}
	preview, err = enforceRequiredCreatures(
		preview, creatures, command.RequiredCreatureIDs, players, command.Options.Challenge, ruleset,
	)
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	result := EncounterAuthoringResult{}
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[EncounterAuthoringResult](
			ctx, tx, principal, "create_generated_encounter", command.IdempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			replay.IdempotencyReplay = true
			result = replay
			return nil
		}
		result, err = s.persistGeneratedEncounter(
			ctx, tx, principal, campaign, location, players, command, preview, seed,
		)
		if err != nil {
			return err
		}
		return saveIdempotency(
			ctx, tx, principal, "create_generated_encounter",
			command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func normalizeGenerateEncounterCommand(
	command GenerateEncounterCommand,
) (GenerateEncounterCommand, error) {
	command.IdempotencyKey = strings.TrimSpace(command.IdempotencyKey)
	command.Name = strings.TrimSpace(command.Name)
	command.Description = strings.TrimSpace(command.Description)
	command.LocationID = strings.TrimSpace(command.LocationID)
	command.RoomNumber = strings.TrimSpace(command.RoomNumber)
	command.NarrativePurpose = strings.TrimSpace(command.NarrativePurpose)
	command.RoomTheme = strings.TrimSpace(command.RoomTheme)
	command.Options.Archetype = strings.TrimSpace(command.Options.Archetype)
	if command.Options.Archetype == "" {
		command.Options.Archetype = "monsters"
	}
	validArchetype := false
	for _, value := range []string{
		"large-monster", "humanoids", "monsters", "undead", "beasts",
		"spellcasters", "melee", "stealth", "mixed", "custom-mix",
	} {
		if command.Options.Archetype == value {
			validArchetype = true
			break
		}
	}
	if !validArchetype {
		return command, ValidationError("invalid_archetype", "unsupported encounter archetype", nil)
	}
	command.Options.Challenge = strings.ToLower(strings.TrimSpace(command.Options.Challenge))
	if command.Options.Challenge == "" {
		command.Options.Challenge = "medium"
	}
	switch command.Options.Challenge {
	case "easy", "medium", "hard", "deadly", "low", "moderate", "high":
	default:
		return command, ValidationError(
			"invalid_difficulty", "challenge must be a supported 2014 or 2024 difficulty", nil,
		)
	}
	if command.Options.EnemyCount == 0 {
		command.Options.EnemyCount = 1
	}
	if command.Options.EnemyCount < 1 || command.Options.EnemyCount > 6 {
		return command, ValidationError(
			"invalid_enemy_count", "enemyCount must be between 1 and 6", nil,
		)
	}
	command.Options.Terrain = strings.TrimSpace(command.Options.Terrain)
	if command.Options.Terrain == "" {
		command.Options.Terrain = "location-theme"
	}
	var err error
	command.Options, err = normalizeBodyConstraints(command.Options, command)
	return command, err
}

func (s *Service) generationLocation(
	ctx context.Context,
	principal Principal,
	campaignID string,
	locationID string,
) (*models.CampaignLocation, error) {
	if strings.TrimSpace(locationID) == "" {
		return nil, nil
	}
	if !principal.HasScope(ScopeWorldRead) {
		var count int64
		if err := s.db.WithContext(ctx).Model(&dbmodels.CampaignLocationEntity{}).
			Where("id = ? and campaign_id = ?", locationID, campaignID).
			Count(&count).Error; err != nil {
			return nil, err
		}
		if count == 0 {
			return nil, ValidationError(
				"unknown_location", "unknown or cross-campaign location ID",
				map[string]any{"locationId": locationID},
			)
		}
		return &models.CampaignLocation{ID: locationID, CampaignID: campaignID}, nil
	}
	locations, err := s.stores.Travel.LocationsForCampaign(ctx, principal.UserID, campaignID)
	if err != nil {
		return nil, err
	}
	for index := range locations {
		if locations[index].ID == locationID {
			return &locations[index], nil
		}
	}
	return nil, ValidationError(
		"unknown_location", "unknown or cross-campaign location ID",
		map[string]any{"locationId": locationID},
	)
}

func (s *Service) generationCreatures(
	ctx context.Context,
	principal Principal,
	campaign models.Campaign,
	command GenerateEncounterCommand,
) ([]models.Creature, error) {
	sources := campaign.AllowedStandardSources
	if len(command.AllowedSourceKeys) > 0 {
		sources = []string{}
		for _, source := range command.AllowedSourceKeys {
			if !slices.Contains(campaign.AllowedStandardSources, source) {
				return nil, ValidationError(
					"unknown_source", "source is not enabled for the campaign",
					map[string]any{"sourceKey": source},
				)
			}
			sources = append(sources, source)
		}
	}
	creatures, err := s.stores.Creatures.List(
		ctx, principal.UserID, "", true, true, sources,
	)
	if err != nil {
		return nil, err
	}
	forbidden := map[string]bool{}
	for _, id := range command.ForbiddenCreatureIDs {
		id = strings.TrimSpace(id)
		if id == "" {
			return nil, ValidationError("empty_creature_id", "creature constraint IDs cannot be empty", nil)
		}
		if forbidden[id] {
			return nil, ValidationError(
				"duplicate_creature", "forbiddenCreatureIds cannot contain duplicates",
				map[string]any{"creatureId": id},
			)
		}
		forbidden[id] = true
	}
	result := make([]models.Creature, 0, len(creatures))
	available := map[string]bool{}
	for _, creature := range creatures {
		available[creature.ID] = true
		if !forbidden[creature.ID] && creature.XP > 0 {
			result = append(result, creature)
		}
	}
	required := map[string]bool{}
	for _, rawID := range command.RequiredCreatureIDs {
		id := strings.TrimSpace(rawID)
		if id == "" {
			return nil, ValidationError("empty_creature_id", "creature constraint IDs cannot be empty", nil)
		}
		if required[id] {
			return nil, ValidationError(
				"duplicate_creature", "requiredCreatureIds cannot contain duplicates",
				map[string]any{"creatureId": id},
			)
		}
		required[id] = true
		if forbidden[id] {
			return nil, ValidationError(
				"contradictory_creature_constraint",
				"a creature cannot be both required and forbidden",
				map[string]any{"creatureId": id},
			)
		}
		if !available[id] {
			return nil, ValidationError(
				"unknown_creature", "required creature is unavailable",
				map[string]any{"creatureId": id},
			)
		}
	}
	maximum := command.MaximumEnemyBodies
	if maximum == 0 {
		maximum = 6
	}
	if len(required) > maximum {
		return nil, ValidationError(
			"required_creatures_exceed_body_limit",
			"requiredCreatureIds cannot exceed maximumEnemyBodies or the generator limit",
			map[string]any{"requiredCount": len(required), "maximumEnemyBodies": maximum},
		)
	}
	if len(result) == 0 {
		return nil, ValidationError(
			"empty_candidate_pool", "no eligible positive-XP creatures are available", nil,
		)
	}
	return result, nil
}

func normalizeBodyConstraints(
	options generation.EncounterOptions,
	command GenerateEncounterCommand,
) (generation.EncounterOptions, error) {
	minimum, maximum := command.MinimumEnemyBodies, command.MaximumEnemyBodies
	if minimum < 0 || maximum < 0 {
		return options, ValidationError(
			"invalid_enemy_body_range",
			"minimumEnemyBodies and maximumEnemyBodies cannot be negative",
			nil,
		)
	}
	if minimum > 6 || maximum > 6 {
		return options, ValidationError(
			"invalid_enemy_body_range",
			"enemy body constraints cannot exceed the generator limit of 6",
			nil,
		)
	}
	if minimum > 0 && maximum > 0 && maximum < minimum {
		return options, ValidationError(
			"invalid_enemy_body_range",
			"maximumEnemyBodies must be greater than or equal to minimumEnemyBodies",
			nil,
		)
	}
	// An omitted range must not change an explicitly requested enemy count. Each
	// supplied boundary is independently useful for clients that only need a floor
	// or a ceiling; the generator's own normalization handles a wholly omitted count.
	if minimum > 0 && options.EnemyCount < minimum {
		options.EnemyCount = minimum
	}
	if maximum > 0 && options.EnemyCount > maximum {
		options.EnemyCount = maximum
	}
	return options, nil
}

func enforceRequiredCreatures(
	preview generation.EncounterPreview,
	candidates []models.Creature,
	requiredIDs []string,
	players []models.Player,
	requested string,
	ruleset string,
) (generation.EncounterPreview, error) {
	if len(requiredIDs) == 0 {
		return preview, nil
	}
	byID := map[string]models.Creature{}
	for _, creature := range candidates {
		byID[creature.ID] = creature
	}
	required := []generation.EncounterEnemy{}
	for _, rawID := range requiredIDs {
		id := strings.TrimSpace(rawID)
		creature, ok := byID[id]
		if !ok {
			return preview, ValidationError(
				"unknown_creature", "required creature is unavailable",
				map[string]any{"creatureId": id},
			)
		}
		required = append(required, generation.EncounterEnemy{
			ID: "required-" + id, Creature: creature, Quantity: 1, Side: "enemy",
		})
	}
	targetBodies := max(1, preview.DifficultyEvidence.EnemyCount)
	currentBodies := len(required)
	for _, enemy := range preview.Enemies {
		if currentBodies >= targetBodies {
			break
		}
		if !containsTrimmed(requiredIDs, enemy.Creature.ID) {
			enemy.Quantity = min(enemy.Quantity, targetBodies-currentBodies)
			required = append(required, enemy)
			currentBodies += enemy.Quantity
		}
	}
	preview.Enemies = required
	preview.DifficultyEvidence = generation.EvaluateEncounterForRuleset(
		ruleset, players, required, requested,
	)
	preview.Difficulty = preview.DifficultyEvidence.ActualDifficulty
	preview.EstimatedXP = preview.DifficultyEvidence.RawXP
	preview.SelectionReasons = append(
		preview.SelectionReasons,
		"Required creature references were placed before deterministic scoring results.",
	)
	if !preview.DifficultyEvidence.WithinTarget {
		preview.TargetNotice = fmt.Sprintf(
			"Required creatures produced %s instead of the requested %s target.",
			preview.Difficulty, requested,
		)
	}
	return preview, nil
}

func containsTrimmed(values []string, target string) bool {
	for _, value := range values {
		if strings.TrimSpace(value) == target {
			return true
		}
	}
	return false
}
