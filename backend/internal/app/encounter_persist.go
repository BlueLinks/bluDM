package app

import (
	"context"
	"encoding/json"
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/generation"
	"bludm/backend/internal/models"

	"gorm.io/gorm"
)

func (s *Service) persistGeneratedEncounter(
	ctx context.Context,
	tx *gorm.DB,
	principal Principal,
	campaign models.Campaign,
	location *models.CampaignLocation,
	players []models.Player,
	command GenerateEncounterCommand,
	preview generation.EncounterPreview,
	seed int,
) (EncounterAuthoringResult, error) {
	locationName := ""
	if location != nil {
		locationName = location.Name
	}
	name := strings.TrimSpace(command.Name)
	if name == "" {
		name = preview.Title
	}
	metadata, err := jsonMap(map[string]any{
		"authoringOrigin": "generator", "generatorVersion": preview.GeneratorVersion,
		"seed": seed, "difficultyEvidence": preview.DifficultyEvidence,
		"difficultyRuleset": preview.DifficultyEvidence.Ruleset,
		"candidatePoolSize": preview.CandidatePoolSize,
		"selectionReasons":  preview.SelectionReasons,
		"narrativePurpose":  command.NarrativePurpose, "roomTheme": command.RoomTheme,
	})
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	entity := dbmodels.EncounterEntity{
		CampaignID: campaign.ID, Name: name, Description: command.Description,
		Status: "planned", Location: locationName, LocationID: optionalID(command.LocationID),
		RoomNumber: command.RoomNumber, Metadata: metadata, Revision: 1,
		DifficultyRuleset: preview.DifficultyEvidence.Ruleset,
	}
	if err := tx.WithContext(ctx).Create(&entity).Error; err != nil {
		return EncounterAuthoringResult{}, err
	}
	managedIDs := []string{}
	created := 0
	addPlayers := command.AddPlayersToRoster == nil || *command.AddPlayersToRoster
	if addPlayers {
		for _, player := range players {
			combatant, err := playerCombatant(entity.ID, player, created)
			if err != nil {
				return EncounterAuthoringResult{}, err
			}
			if err := tx.WithContext(ctx).Create(&combatant).Error; err != nil {
				return EncounterAuthoringResult{}, err
			}
			created++
		}
	}
	batchID := entity.ID + ":revision:1"
	for _, enemy := range preview.Enemies {
		for quantity := 0; quantity < enemy.Quantity; quantity++ {
			combatant, err := generatedCombatant(
				entity.ID, enemy.Creature, created, batchID, preview.GeneratorVersion, seed,
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
	snapshot, err := encounterSnapshot(ctx, tx, entity)
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	inputMap, err := jsonMap(command)
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	outputMap, err := jsonMap(preview)
	if err != nil {
		return EncounterAuthoringResult{}, err
	}
	if err := tx.WithContext(ctx).Create(&dbmodels.EncounterRevisionEntity{
		EncounterID: entity.ID, Revision: 1, Snapshot: snapshot,
		GenerationInput: inputMap, GenerationOutput: outputMap,
		ChangeReason: "generated encounter created", ActorUserID: principal.UserID,
		ActorTokenID: optionalID(principal.TokenID),
	}).Error; err != nil {
		return EncounterAuthoringResult{}, err
	}
	encounter := encounterModel(entity, created, preview.DifficultyEvidence.EnemyCount)
	warnings := append([]string{}, preview.DifficultyEvidence.Warnings...)
	if preview.TargetNotice != "" {
		warnings = append(warnings, preview.TargetNotice)
	}
	return EncounterAuthoringResult{
		Encounter: encounter, Campaign: authoringCampaignSnapshot(campaign, principal),
		Location: authoringLocationSnapshot(location, principal), Revision: 1,
		AppURL:           s.AppURL("/campaigns/" + campaign.ID + "/encounters/" + entity.ID),
		GeneratorVersion: preview.GeneratorVersion, Seed: seed, Preview: preview,
		DifficultyEvidence: preview.DifficultyEvidence, SelectedParty: summaries(players),
		ManagedCombatantIDs: managedIDs, CreatedCombatantCount: created,
		Warnings:    uniqueStrings(warnings),
		ExportLinks: encounterExportLinks(campaign.ID, entity.ID),
	}, nil
}

func authoringCampaignSnapshot(
	campaign models.Campaign,
	principal Principal,
) AuthoringCampaignSnapshot {
	result := AuthoringCampaignSnapshot{ID: campaign.ID}
	if principal.HasScope(ScopeCampaignsRead) {
		result.Name = campaign.Name
	}
	return result
}

func authoringLocationSnapshot(
	location *models.CampaignLocation,
	principal Principal,
) *AuthoringLocationSnapshot {
	if location == nil {
		return nil
	}
	result := &AuthoringLocationSnapshot{ID: location.ID}
	if principal.HasScope(ScopeWorldRead) {
		result.Name = location.Name
	}
	return result
}

func uniqueStrings(values []string) []string {
	result := []string{}
	seen := map[string]bool{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" && !seen[value] {
			seen[value] = true
			result = append(result, value)
		}
	}
	return result
}

func playerCombatant(
	encounterID string,
	player models.Player,
	sortOrder int,
) (dbmodels.EncounterCombatantEntity, error) {
	snapshot, err := jsonMap(player.CharacterSheet)
	if err != nil {
		return dbmodels.EncounterCombatantEntity{}, err
	}
	snapshot["playerId"] = player.ID
	snapshot["characterName"] = player.CharacterName
	return dbmodels.EncounterCombatantEntity{
		EncounterID: encounterID, SourceType: "player", PlayerID: optionalID(player.ID),
		Side: "ally", DisplayName: player.CharacterName, ColorLabel: "primary",
		AvatarURL: player.AvatarURL, ArmorClass: player.ArmorClass,
		MaxHitPoints:     max(1, player.MaxHitPoints),
		CurrentHitPoints: max(1, player.CurrentHitPoints),
		SortOrder:        sortOrder, Snapshot: snapshot,
	}, nil
}

func generatedCombatant(
	encounterID string,
	creature models.Creature,
	sortOrder int,
	batchID string,
	generatorVersion string,
	seed int,
) (dbmodels.EncounterCombatantEntity, error) {
	snapshot, err := jsonMap(creature)
	if err != nil {
		return dbmodels.EncounterCombatantEntity{}, err
	}
	snapshot["authoringOrigin"] = "generator"
	snapshot["generationBatchId"] = batchID
	snapshot["generatorVersion"] = generatorVersion
	snapshot["seed"] = seed
	creatureID := optionalID(creature.ID)
	if creature.LibrarySource == "standard" {
		// Standard creatures live in standard_creatures, while creature_id is a
		// foreign key to the user-owned creatures table. Keep the standard
		// reference in the snapshot, matching the authored encounter path.
		creatureID = nil
		snapshot["standardCreatureId"] = creature.ID
	}
	return dbmodels.EncounterCombatantEntity{
		EncounterID: encounterID, SourceType: "creature", CreatureID: creatureID,
		Side: "enemy", DisplayName: creature.Name, ColorLabel: "danger",
		AvatarURL: creature.AvatarURL, ArmorClass: creature.ArmorClass,
		MaxHitPoints: max(1, creature.HitPoints), CurrentHitPoints: max(1, creature.HitPoints),
		SortOrder: sortOrder, Snapshot: snapshot,
	}, nil
}

func (s *Service) enrichCreatureSnapshot(
	ctx context.Context,
	principal Principal,
	creature models.Creature,
	combatant *dbmodels.EncounterCombatantEntity,
) error {
	if creature.LibrarySource == "standard" {
		return nil
	}
	actions, err := s.stores.Actions.ListCreatureActions(ctx, principal.UserID, creature.ID)
	if err != nil {
		return err
	}
	spellcasting, err := s.stores.Spellcasts.Profile(ctx, principal.UserID, creature.ID)
	if err != nil {
		return err
	}
	combatant.Snapshot["actions"] = actions
	combatant.Snapshot["spellcasting"] = spellcasting
	return nil
}

func encounterSnapshot(
	ctx context.Context,
	tx *gorm.DB,
	entity dbmodels.EncounterEntity,
) (dbmodels.JSONMap, error) {
	var combatants []dbmodels.EncounterCombatantEntity
	if err := tx.WithContext(ctx).
		Where("encounter_id = ?", entity.ID).
		Order("sort_order asc, created_at asc").
		Find(&combatants).Error; err != nil {
		return nil, err
	}
	return jsonMap(map[string]any{"encounter": entity, "combatants": combatants})
}

func encounterModel(entity dbmodels.EncounterEntity, combatants, enemies int) models.Encounter {
	return models.Encounter{
		ID: entity.ID, CampaignID: entity.CampaignID, Name: entity.Name,
		Description: entity.Description, Status: entity.Status, Location: entity.Location,
		LocationID: entity.LocationID, RoomNumber: entity.RoomNumber, LootNotes: entity.LootNotes,
		DifficultyRuleset: entity.DifficultyRuleset,
		CombatantCount:    combatants, EnemyCount: enemies, Revision: entity.Revision,
		Metadata: map[string]any(entity.Metadata), CreatedAt: entity.CreatedAt, UpdatedAt: entity.UpdatedAt,
	}
}

func summaries(players []models.Player) []PartySummary {
	result := make([]PartySummary, 0, len(players))
	for _, player := range players {
		result = append(result, playerSummary(player))
	}
	return result
}

func optionalID(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}

func cloneJSONMap(value dbmodels.JSONMap) dbmodels.JSONMap {
	data, _ := json.Marshal(value)
	result := dbmodels.JSONMap{}
	_ = json.Unmarshal(data, &result)
	return result
}
