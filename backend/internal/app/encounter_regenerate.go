package app

import (
	"context"
	"crypto/rand"
	"encoding/binary"
	"fmt"
	"slices"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/generation"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (s *Service) RegenerateEncounter(
	ctx context.Context,
	campaignID string,
	encounterID string,
	command RegenerateEncounterCommand,
) (EncounterAuthoringResult, error) {
	principal, err := s.authorize(
		ctx, campaignID, ScopeEncountersWrite, ScopeGenerationRun,
	)
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	if command.ExpectedRevision < 1 {
		return EncounterAuthoringResult{}, ValidationError(
			"missing_revision", "expectedRevision is required", nil,
		)
	}
	if command.FreshSeed && command.Seed != 0 {
		return EncounterAuthoringResult{}, ValidationError(
			"conflicting_seed", "seed must be omitted when freshSeed is true", nil,
		)
	}
	normalized, err := normalizeGenerateEncounterCommand(GenerateEncounterCommand{
		IdempotencyKey: command.IdempotencyKey, Options: command.Options,
		RequiredCreatureIDs:  command.RequiredCreatureIDs,
		ForbiddenCreatureIDs: command.ForbiddenCreatureIDs,
		AllowedSourceKeys:    command.AllowedSourceKeys,
		MinimumEnemyBodies:   command.MinimumEnemyBodies,
		MaximumEnemyBodies:   command.MaximumEnemyBodies,
	})
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	command.IdempotencyKey = normalized.IdempotencyKey
	command.Options = normalized.Options
	if !command.FreshSeed && command.Seed == 0 {
		command.Seed = deterministicSeed(command.IdempotencyKey)
	}
	inputHash, err := normalizedHash(command)
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	var result EncounterAuthoringResult
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[EncounterAuthoringResult](
			ctx, tx, principal, "regenerate_encounter:"+encounterID,
			command.IdempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			replay.IdempotencyReplay = true
			result = replay
			return nil
		}
		entity, combatants, err := lockedEncounter(ctx, tx, campaignID, encounterID)
		if err != nil {
			return err
		}
		if entity.Revision != command.ExpectedRevision {
			return NewError(CodeConflict, "encounter revision changed", map[string]any{
				"expectedRevision": command.ExpectedRevision, "actualRevision": entity.Revision,
			})
		}
		players, err := s.playersFromCombatants(ctx, principal, campaignID, combatants)
		if err != nil {
			return err
		}
		campaign, err := s.stores.Campaigns.ByID(ctx, principal.UserID, campaignID)
		if err != nil {
			return err
		}
		ruleset, err := persistedEncounterRuleset(entity, campaign)
		if err != nil {
			return err
		}
		command.Options.Challenge, err = normalizeDifficultyForRuleset(
			ruleset, command.Options.Challenge,
		)
		if err != nil {
			return err
		}
		location, err := s.generationLocation(
			ctx, principal, campaignID, valueFromPointer(entity.LocationID),
		)
		if err != nil {
			return err
		}
		generateCommand := GenerateEncounterCommand{
			Options: command.Options, RequiredCreatureIDs: command.RequiredCreatureIDs,
			ForbiddenCreatureIDs: command.ForbiddenCreatureIDs,
			AllowedSourceKeys:    command.AllowedSourceKeys,
			MinimumEnemyBodies:   command.MinimumEnemyBodies,
			MaximumEnemyBodies:   command.MaximumEnemyBodies,
		}
		creatures, err := s.generationCreatures(ctx, principal, campaign, generateCommand)
		if err != nil {
			return err
		}
		seed := command.Seed
		if command.FreshSeed {
			seed = randomSeed()
		} else if seed == 0 {
			seed = deterministicSeed(command.IdempotencyKey)
		}
		preview := generation.GenerateEncounterForRuleset(
			ruleset, creatures, location, command.Options, players, seed,
		)
		if entity.LocationID != nil && !principal.HasScope(ScopeWorldRead) &&
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
			return err
		}
		result, err = s.persistRegeneration(
			ctx, tx, principal, campaign, location, entity, combatants, command, preview, players, seed,
		)
		if err != nil {
			return err
		}
		return saveIdempotency(
			ctx, tx, principal, "regenerate_encounter:"+encounterID,
			command.IdempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func lockedEncounter(
	ctx context.Context,
	tx *gorm.DB,
	campaignID string,
	encounterID string,
) (dbmodels.EncounterEntity, []dbmodels.EncounterCombatantEntity, error) {
	var entity dbmodels.EncounterEntity
	err := tx.WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ? and campaign_id = ?", encounterID, campaignID).
		First(&entity).Error
	if err != nil {
		return entity, nil, storeError(err, "encounter")
	}
	var combatants []dbmodels.EncounterCombatantEntity
	err = tx.WithContext(ctx).
		Where("encounter_id = ?", encounterID).
		Order("sort_order asc, created_at asc").
		Find(&combatants).Error
	return entity, combatants, err
}

func (s *Service) playersFromCombatants(
	ctx context.Context,
	principal Principal,
	campaignID string,
	combatants []dbmodels.EncounterCombatantEntity,
) ([]models.Player, error) {
	players := []models.Player{}
	for _, combatant := range combatants {
		if combatant.SourceType != "player" {
			continue
		}
		if combatant.PlayerID != nil {
			player, err := s.stores.Players.ByID(ctx, principal.UserID, *combatant.PlayerID)
			if err == nil && player.CampaignID == campaignID {
				players = append(players, player)
				continue
			}
		}
		players = append(players, models.Player{
			CharacterName: combatant.DisplayName, CharacterSheet: map[string]any(combatant.Snapshot),
			ArmorClass: combatant.ArmorClass, MaxHitPoints: combatant.MaxHitPoints,
			CurrentHitPoints: combatant.CurrentHitPoints,
		})
	}
	if len(players) == 0 {
		return nil, ValidationError(
			"missing_players", "the encounter has no player roster to evaluate", nil,
		)
	}
	return players, nil
}

func (s *Service) persistRegeneration(
	ctx context.Context,
	tx *gorm.DB,
	principal Principal,
	campaign models.Campaign,
	location *models.CampaignLocation,
	entity dbmodels.EncounterEntity,
	combatants []dbmodels.EncounterCombatantEntity,
	command RegenerateEncounterCommand,
	preview generation.EncounterPreview,
	players []models.Player,
	seed int,
) (EncounterAuthoringResult, error) {
	preserved, replaced := 0, 0
	replaceManagedOnly := command.ReplaceManagedOnly == nil || *command.ReplaceManagedOnly
	if err := validatePreservationReferences(combatants, command); err != nil {
		return EncounterAuthoringResult{}, err
	}
	nextOrder := 0
	for _, combatant := range combatants {
		nextOrder = max(nextOrder, combatant.SortOrder+1)
		managed := combatant.Snapshot["authoringOrigin"] == "generator"
		replaceable := managed || (!replaceManagedOnly && combatant.SourceType != "player" && combatant.Side == "enemy")
		keep := !replaceable || slices.Contains(command.PreserveCombatantIDs, combatant.ID) ||
			(combatant.CreatureID != nil && slices.Contains(command.PreserveCreatureIDs, *combatant.CreatureID))
		if keep {
			preserved++
			continue
		}
		if err := tx.WithContext(ctx).Delete(&combatant).Error; err != nil {
			return EncounterAuthoringResult{}, err
		}
		replaced++
	}
	newRevision := entity.Revision + 1
	batchID := fmt.Sprintf("%s:revision:%d", entity.ID, newRevision)
	managedIDs := []string{}
	created := 0
	for _, enemy := range preview.Enemies {
		for quantity := 0; quantity < enemy.Quantity; quantity++ {
			combatant, err := generatedCombatant(
				entity.ID, enemy.Creature, nextOrder+created, batchID,
				preview.GeneratorVersion, seed,
			)
			if err != nil {
				return EncounterAuthoringResult{}, err
			}
			if err := s.enrichCreatureSnapshot(ctx, principal, enemy.Creature, &combatant); err != nil {
				return EncounterAuthoringResult{}, err
			}
			if err := tx.WithContext(ctx).Create(&combatant).Error; err != nil {
				return EncounterAuthoringResult{}, err
			}
			managedIDs = append(managedIDs, combatant.ID)
			created++
		}
	}
	var finalCombatants []dbmodels.EncounterCombatantEntity
	if err := tx.WithContext(ctx).
		Where("encounter_id = ?", entity.ID).
		Order("sort_order asc, created_at asc").
		Find(&finalCombatants).Error; err != nil {
		return EncounterAuthoringResult{}, err
	}
	actualDifficulty := difficultyFromStoredRoster(
		players, finalCombatants, preview.DifficultyEvidence.RequestedDifficulty,
		preview.DifficultyEvidence.Ruleset,
	)
	preview.DifficultyEvidence = actualDifficulty
	preview.Difficulty = actualDifficulty.ActualDifficulty
	metadata := cloneJSONMap(entity.Metadata)
	metadata["authoringOrigin"] = "generator"
	metadata["generatorVersion"] = preview.GeneratorVersion
	metadata["seed"] = seed
	metadata["difficultyEvidence"] = preview.DifficultyEvidence
	metadata["difficultyRuleset"] = preview.DifficultyEvidence.Ruleset
	entity.Metadata = metadata
	entity.DifficultyRuleset = preview.DifficultyEvidence.Ruleset
	entity.Revision = newRevision
	if err := tx.WithContext(ctx).Save(&entity).Error; err != nil {
		return EncounterAuthoringResult{}, err
	}
	snapshot, err := encounterSnapshot(ctx, tx, entity)
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	inputMap, _ := jsonMap(command)
	outputMap, _ := jsonMap(preview)
	if err := tx.WithContext(ctx).Create(&dbmodels.EncounterRevisionEntity{
		EncounterID: entity.ID, Revision: newRevision, Snapshot: snapshot,
		GenerationInput: inputMap, GenerationOutput: outputMap,
		ChangeReason: regenerationChangeReason(replaceManagedOnly),
		ActorUserID:  principal.UserID, ActorTokenID: optionalID(principal.TokenID),
	}).Error; err != nil {
		return EncounterAuthoringResult{}, err
	}
	enemyCount := 0
	for _, combatant := range finalCombatants {
		if combatant.Side == "enemy" {
			enemyCount++
		}
	}
	warnings := append([]string{}, actualDifficulty.Warnings...)
	if preview.TargetNotice != "" {
		warnings = append(warnings, preview.TargetNotice)
	}
	return EncounterAuthoringResult{
		Encounter:        encounterModel(entity, len(finalCombatants), enemyCount),
		Campaign:         authoringCampaignSnapshot(campaign, principal),
		Location:         authoringLocationSnapshot(location, principal),
		Revision:         newRevision,
		AppURL:           s.AppURL("/campaigns/" + entity.CampaignID + "/encounters/" + entity.ID),
		GeneratorVersion: preview.GeneratorVersion, Seed: seed, Preview: preview,
		DifficultyEvidence: preview.DifficultyEvidence, SelectedParty: summaries(players),
		ManagedCombatantIDs: managedIDs, CreatedCombatantCount: created,
		PreservedCombatantCount: preserved, ReplacedCombatantCount: replaced,
		Warnings:    uniqueStrings(warnings),
		ExportLinks: encounterExportLinks(entity.CampaignID, entity.ID),
	}, nil
}

func difficultyFromStoredRoster(
	players []models.Player,
	combatants []dbmodels.EncounterCombatantEntity,
	requestedDifficulty string,
	ruleset string,
) generation.DifficultyEvidence {
	enemiesByID := map[string]int{}
	enemies := []generation.EncounterEnemy{}
	alliesNotBudgeted := false
	for _, combatant := range combatants {
		if combatant.SourceType != "player" && combatant.Side == "ally" {
			alliesNotBudgeted = true
		}
		if combatant.Side != "enemy" {
			continue
		}
		key := combatant.DisplayName
		if combatant.CreatureID != nil {
			key = *combatant.CreatureID
		}
		if index, ok := enemiesByID[key]; ok {
			enemies[index].Quantity++
			continue
		}
		enemiesByID[key] = len(enemies)
		enemies = append(enemies, generation.EncounterEnemy{
			Creature: models.Creature{
				ID: valueFromPointer(combatant.CreatureID), Name: combatant.DisplayName,
				XP: storedXP(combatant.Snapshot["xp"]),
			},
			Quantity: 1, Side: "enemy",
		})
	}
	evidence := generation.EvaluateEncounterForRuleset(
		ruleset, players, enemies, requestedDifficulty,
	)
	if alliesNotBudgeted {
		evidence.Warnings = append(
			evidence.Warnings,
			"Non-player allies are present but are not included in the encounter XP budget.",
		)
	}
	return evidence
}

func storedXP(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	default:
		return 0
	}
}

func regenerationChangeReason(replaceManagedOnly bool) string {
	if replaceManagedOnly {
		return "generator-managed enemies regenerated"
	}
	return "all enemy combatants regenerated by explicit request"
}

func validatePreservationReferences(
	combatants []dbmodels.EncounterCombatantEntity,
	command RegenerateEncounterCommand,
) error {
	combatantIDs := map[string]bool{}
	creatureIDs := map[string]bool{}
	for _, combatant := range combatants {
		combatantIDs[combatant.ID] = true
		if combatant.CreatureID != nil {
			creatureIDs[*combatant.CreatureID] = true
		}
	}
	for _, id := range command.PreserveCombatantIDs {
		if !combatantIDs[id] {
			return ValidationError(
				"unknown_combatant", "preserveCombatantIds contains an unknown or cross-encounter ID",
				map[string]any{"combatantId": id},
			)
		}
	}
	for _, id := range command.PreserveCreatureIDs {
		if !creatureIDs[id] {
			return ValidationError(
				"unknown_creature", "preserveCreatureIds contains a creature not present in the encounter",
				map[string]any{"creatureId": id},
			)
		}
	}
	return nil
}

func randomSeed() int {
	var data [4]byte
	if _, err := rand.Read(data[:]); err != nil {
		return deterministicSeed("bludm-regeneration-fallback")
	}
	return int(binary.BigEndian.Uint32(data[:]) & 0x7fffffff)
}

func valueFromPointer(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
