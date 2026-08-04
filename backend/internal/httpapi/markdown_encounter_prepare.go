package httpapi

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"path/filepath"
	"strings"

	"bludm/backend/internal/markdownencounter"
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
)

func (s *Server) prepareMarkdownImport(
	ctx context.Context,
	campaignID string,
	request markdownEncounterRequest,
) (preparedMarkdownImport, error) {
	campaign, err := s.campaignByID(ctx, campaignID)
	if err != nil {
		return preparedMarkdownImport{}, err
	}
	blocks, err := markdownencounter.Parse(request.Markdown)
	if err != nil {
		return preparedMarkdownImport{}, fmt.Errorf("%w: %v", errInvalidMarkdownEncounter, err)
	}
	sourcePath := normalizeMarkdownSourcePath(request.SourcePath)
	if len(sourcePath) > 500 {
		return preparedMarkdownImport{}, fmt.Errorf(
			"%w: sourcePath must be 500 characters or fewer",
			errInvalidMarkdownEncounter,
		)
	}
	players, err := s.playersForCampaign(ctx, campaignID)
	if err != nil {
		return preparedMarkdownImport{}, err
	}
	locations, err := s.stores.Travel.LocationsForCampaign(
		ctx,
		currentUserIDMust(ctx),
		campaignID,
	)
	if err != nil {
		return preparedMarkdownImport{}, err
	}

	prepared := preparedMarkdownImport{
		Preview: markdownEncounterPreview{
			SourcePath: sourcePath,
			CanImport:  true,
			Encounters: make([]markdownEncounterChange, 0, len(blocks)),
		},
		Inputs: make([]store.MarkdownEncounterImportInput, 0, len(blocks)),
	}
	seenKeys := map[string]bool{}
	for _, block := range blocks {
		change, input := s.prepareMarkdownBlock(
			ctx,
			campaign,
			sourcePath,
			block,
			players,
			locations,
		)
		if seenKeys[input.SourceKey] {
			change.Errors = append(change.Errors, "duplicate encounter id in this Markdown file")
		}
		seenKeys[input.SourceKey] = true
		if len(change.Errors) > 0 {
			prepared.Preview.CanImport = false
		}
		prepared.Preview.Encounters = append(prepared.Preview.Encounters, change)
		prepared.Inputs = append(prepared.Inputs, input)
	}
	return prepared, nil
}

func (s *Server) prepareMarkdownBlock(
	ctx context.Context,
	campaign models.Campaign,
	sourcePath string,
	block markdownencounter.Block,
	players []models.Player,
	locations []models.CampaignLocation,
) (markdownEncounterChange, store.MarkdownEncounterImportInput) {
	document := block.Document
	warnings, _ := document.NormalizeAndValidate()
	sourceKey := strings.ToLower(sourcePath) + "#" + document.ID
	change := markdownEncounterChange{
		BlockID:     document.ID,
		Line:        block.Line,
		Name:        document.Name,
		Description: document.Description,
		Status:      document.Status,
		Location:    document.Location,
		Room:        document.Room,
		Loot:        document.Loot,
		Operation:   "create",
		Combatants:  []markdownCombatantResolution{},
		Warnings:    warnings,
		Errors:      []string{},
	}
	input := store.MarkdownEncounterImportInput{
		SourceKey:   sourceKey,
		SourcePath:  sourcePath,
		BlockID:     document.ID,
		ContentHash: markdownBlockHash(block.Raw),
		Encounter: store.EncounterInput{
			Name:        document.Name,
			Description: document.Description,
			Status:      document.Status,
			Location:    document.Location,
			RoomNumber:  document.Room,
		},
		LootNotes:  document.Loot,
		Combatants: []store.EncounterCombatantInput{},
	}

	if existing, err := s.stores.Encounters.ByMarkdownSourceKey(
		ctx,
		currentUserIDMust(ctx),
		campaign.ID,
		sourceKey,
	); err == nil {
		change.Operation = "update"
		change.ExistingEncounterID = existing.ID
	} else if !store.IsNotFound(err) {
		change.Errors = append(change.Errors, "could not check for an existing imported encounter")
	}
	resolveMarkdownLocation(&change, &input, document, locations)

	includedPlayers := map[string]bool{}
	if document.AddParty {
		for _, player := range players {
			appendResolvedPlayer(&change, &input, player)
			includedPlayers[player.ID] = true
		}
		if len(players) == 0 {
			change.Warnings = append(change.Warnings, "add_party is set but the campaign has no players")
		}
	}
	for _, combatant := range document.Combatants {
		resolved, err := s.resolveMarkdownCombatant(ctx, campaign, combatant, players)
		if err != nil {
			change.Errors = append(change.Errors, err.Error())
			continue
		}
		if len(resolved.Inputs) == 1 && resolved.Inputs[0].PlayerID != "" {
			if includedPlayers[resolved.Inputs[0].PlayerID] {
				change.Warnings = append(
					change.Warnings,
					fmt.Sprintf("%s is already included by add_party", resolved.Preview.Name),
				)
				continue
			}
			includedPlayers[resolved.Inputs[0].PlayerID] = true
		}
		change.Combatants = append(change.Combatants, resolved.Preview)
		input.Combatants = append(input.Combatants, resolved.Inputs...)
	}
	return change, input
}

func (s *Server) resolveMarkdownCombatant(
	ctx context.Context,
	campaign models.Campaign,
	spec markdownencounter.Combatant,
	players []models.Player,
) (resolvedMarkdownCombatant, error) {
	if spec.PlayerID != "" || spec.Player != "" {
		player, err := resolveMarkdownPlayer(spec, players)
		if err != nil {
			return resolvedMarkdownCombatant{}, err
		}
		input := playerCombatantInput(player)
		if spec.Name != "" {
			input.DisplayName = spec.Name
		}
		return resolvedMarkdownCombatant{
			Preview: markdownCombatantResolution{
				Name:       input.DisplayName,
				Side:       "player",
				Quantity:   1,
				Source:     "campaign player",
				ResolvedID: player.ID,
				ArmorClass: input.ArmorClass,
				HitPoints:  input.MaxHitPoints,
			},
			Inputs: []store.EncounterCombatantInput{input},
		}, nil
	}

	if spec.CreatureID == "" && spec.StandardCreatureID == "" && spec.Creature == "" {
		return resolveInlineMarkdownCombatant(spec), nil
	}
	creature, err := s.resolveMarkdownCreature(ctx, campaign, spec)
	if err != nil {
		return resolvedMarkdownCombatant{}, err
	}
	return resolvedCreatureCombatants(creature, spec), nil
}

func resolveMarkdownPlayer(
	spec markdownencounter.Combatant,
	players []models.Player,
) (models.Player, error) {
	matches := []models.Player{}
	for _, player := range players {
		if spec.PlayerID != "" && player.ID == spec.PlayerID {
			return player, nil
		}
		if spec.Player != "" && strings.EqualFold(player.CharacterName, spec.Player) {
			matches = append(matches, player)
		}
	}
	if len(matches) == 1 {
		return matches[0], nil
	}
	reference := spec.Player
	if spec.PlayerID != "" {
		reference = spec.PlayerID
	}
	if len(matches) > 1 {
		return models.Player{}, fmt.Errorf("player %q is ambiguous; use player_id", reference)
	}
	return models.Player{}, fmt.Errorf("player %q was not found in this campaign", reference)
}

func (s *Server) resolveMarkdownCreature(
	ctx context.Context,
	campaign models.Campaign,
	spec markdownencounter.Combatant,
) (models.Creature, error) {
	if spec.CreatureID != "" {
		creature, err := s.stores.Creatures.ByID(ctx, currentUserIDMust(ctx), spec.CreatureID)
		if err != nil {
			return models.Creature{}, fmt.Errorf("custom creature %q was not found", spec.CreatureID)
		}
		return creature, nil
	}
	if spec.StandardCreatureID != "" {
		creature, err := s.stores.Creatures.StandardByID(ctx, spec.StandardCreatureID)
		if err != nil || !stringInSlice(creature.SourceKey, campaign.AllowedStandardSources) {
			return models.Creature{}, fmt.Errorf("standard creature %q is not allowed for this campaign", spec.StandardCreatureID)
		}
		return creature, nil
	}

	candidates, err := s.stores.Creatures.List(
		ctx,
		currentUserIDMust(ctx),
		spec.Creature,
		true,
		true,
		campaign.AllowedStandardSources,
	)
	if err != nil {
		return models.Creature{}, fmt.Errorf("could not resolve creature %q", spec.Creature)
	}
	custom := exactCreatureMatches(candidates, spec.Creature, "user")
	standard := exactCreatureMatches(candidates, spec.Creature, "standard")
	if len(custom) == 1 {
		return custom[0], nil
	}
	if len(custom) > 1 {
		return models.Creature{}, fmt.Errorf("creature %q matches multiple custom creatures; use creature_id", spec.Creature)
	}
	if len(standard) == 1 {
		return standard[0], nil
	}
	if len(standard) > 1 {
		return models.Creature{}, fmt.Errorf("creature %q matches multiple rule sources; use standard_creature_id", spec.Creature)
	}
	return models.Creature{}, fmt.Errorf("creature %q was not found; use an exact library name or inline stats", spec.Creature)
}

func exactCreatureMatches(
	candidates []models.Creature,
	name string,
	librarySource string,
) []models.Creature {
	matches := []models.Creature{}
	for _, creature := range candidates {
		if creature.LibrarySource == librarySource && strings.EqualFold(creature.Name, name) {
			matches = append(matches, creature)
		}
	}
	return matches
}

func normalizeMarkdownSourcePath(sourcePath string) string {
	sourcePath = strings.TrimSpace(strings.ReplaceAll(sourcePath, "\\", "/"))
	sourcePath = strings.TrimPrefix(filepath.ToSlash(filepath.Clean(sourcePath)), "./")
	if sourcePath == "." || sourcePath == "" {
		return "manual.md"
	}
	return sourcePath
}

func markdownBlockHash(raw string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(raw)))
	return hex.EncodeToString(sum[:])
}

func stringInSlice(value string, values []string) bool {
	for _, candidate := range values {
		if value == candidate {
			return true
		}
	}
	return false
}
