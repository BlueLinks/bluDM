package httpapi

import (
	"fmt"
	"strings"

	"bludm/backend/internal/markdownencounter"
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
)

func resolveMarkdownLocation(
	change *markdownEncounterChange,
	input *store.MarkdownEncounterImportInput,
	document markdownencounter.Document,
	locations []models.CampaignLocation,
) {
	if document.LocationID != "" {
		for _, location := range locations {
			if location.ID == document.LocationID {
				change.Location = location.Name
				change.LocationID = location.ID
				input.Encounter.Location = location.Name
				input.Encounter.LocationID = location.ID
				return
			}
		}
		change.Errors = append(
			change.Errors,
			fmt.Sprintf("location_id %q was not found in this campaign", document.LocationID),
		)
		return
	}
	if document.Location == "" {
		return
	}
	matches := []models.CampaignLocation{}
	for _, location := range locations {
		if strings.EqualFold(location.Name, document.Location) {
			matches = append(matches, location)
		}
	}
	switch len(matches) {
	case 0:
		change.Warnings = append(
			change.Warnings,
			fmt.Sprintf("location %q will remain unlinked free text", document.Location),
		)
	case 1:
		change.Location = matches[0].Name
		change.LocationID = matches[0].ID
		input.Encounter.Location = matches[0].Name
		input.Encounter.LocationID = matches[0].ID
	default:
		change.Errors = append(
			change.Errors,
			fmt.Sprintf("location %q is ambiguous; use location_id", document.Location),
		)
	}
}

func appendResolvedPlayer(
	change *markdownEncounterChange,
	input *store.MarkdownEncounterImportInput,
	player models.Player,
) {
	combatant := playerCombatantInput(player)
	change.Combatants = append(change.Combatants, markdownCombatantResolution{
		Name:       player.CharacterName,
		Side:       "player",
		Quantity:   1,
		Source:     "campaign player",
		ResolvedID: player.ID,
		ArmorClass: player.ArmorClass,
		HitPoints:  player.MaxHitPoints,
	})
	input.Combatants = append(input.Combatants, combatant)
}

func playerCombatantInput(player models.Player) store.EncounterCombatantInput {
	return store.EncounterCombatantInput{
		SourceType:       "player",
		PlayerID:         player.ID,
		Side:             "player",
		DisplayName:      player.CharacterName,
		ColorLabel:       "slate",
		AvatarURL:        assetOrExternalURL(player.AvatarAssetID, player.AvatarURL),
		ArmorClass:       player.ArmorClass,
		MaxHitPoints:     player.MaxHitPoints,
		CurrentHitPoints: player.CurrentHitPoints,
		Snapshot:         map[string]any{"player": player},
	}
}

func resolveInlineMarkdownCombatant(
	spec markdownencounter.Combatant,
) resolvedMarkdownCombatant {
	color := spec.Color
	if color == "" {
		color = "slate"
	}
	baseCreature := models.Creature{
		Name:          spec.Name,
		ArmorClass:    spec.ArmorClass,
		HitPoints:     spec.HitPoints,
		AvatarURL:     spec.AvatarURL,
		LibrarySource: "markdown",
		StatBlock:     map[string]any{},
	}
	inputs := make([]store.EncounterCombatantInput, 0, spec.Quantity)
	for index := 0; index < spec.Quantity; index++ {
		inputs = append(inputs, store.EncounterCombatantInput{
			SourceType:       "creature",
			Side:             spec.Side,
			DisplayName:      quantityName(spec.Name, spec.Quantity, index),
			ColorLabel:       color,
			AvatarURL:        spec.AvatarURL,
			ArmorClass:       spec.ArmorClass,
			MaxHitPoints:     spec.HitPoints,
			CurrentHitPoints: spec.HitPoints,
			Snapshot: map[string]any{
				"creature": baseCreature,
				"markdown": map[string]any{"inline": true},
			},
		})
	}
	return resolvedMarkdownCombatant{
		Preview: markdownCombatantResolution{
			Name:       spec.Name,
			Side:       spec.Side,
			Quantity:   spec.Quantity,
			Source:     "inline stats",
			ArmorClass: spec.ArmorClass,
			HitPoints:  spec.HitPoints,
		},
		Inputs: inputs,
	}
}

func resolvedCreatureCombatants(
	creature models.Creature,
	spec markdownencounter.Combatant,
) resolvedMarkdownCombatant {
	displayName := creature.Name
	if spec.Name != "" {
		displayName = spec.Name
	}
	color := spec.Color
	if color == "" {
		color = "slate"
	}
	avatarURL := assetOrExternalURL(creature.ImageAssetID, creature.AvatarURL)
	if spec.AvatarURL != "" {
		avatarURL = spec.AvatarURL
	}
	snapshot := map[string]any{"creature": creature}
	source := "custom creature"
	creatureID := creature.ID
	if creature.LibrarySource == "standard" {
		source = creature.SourceLabel
		if source == "" {
			source = "standard rules"
		}
		snapshot["standardCreatureId"] = creature.ID
		creatureID = ""
	}

	inputs := make([]store.EncounterCombatantInput, 0, spec.Quantity)
	for index := 0; index < spec.Quantity; index++ {
		maxHP := creature.HitPoints
		if spec.RolledHP {
			maxHP = rollHitDice(creature.HitDice, creature.HitPoints)
		}
		inputs = append(inputs, store.EncounterCombatantInput{
			SourceType:       "creature",
			CreatureID:       creatureID,
			Side:             spec.Side,
			DisplayName:      quantityName(displayName, spec.Quantity, index),
			ColorLabel:       color,
			AvatarURL:        avatarURL,
			ArmorClass:       creature.ArmorClass,
			MaxHitPoints:     maxHP,
			CurrentHitPoints: maxHP,
			RolledHP:         spec.RolledHP,
			Snapshot:         snapshot,
		})
	}
	return resolvedMarkdownCombatant{
		Preview: markdownCombatantResolution{
			Name:       displayName,
			Side:       spec.Side,
			Quantity:   spec.Quantity,
			Source:     source,
			ResolvedID: creature.ID,
			ArmorClass: creature.ArmorClass,
			HitPoints:  creature.HitPoints,
			RolledHP:   spec.RolledHP,
		},
		Inputs: inputs,
	}
}

func quantityName(name string, quantity, index int) string {
	if quantity <= 1 {
		return name
	}
	return fmt.Sprintf("%s (%d)", name, index+1)
}
