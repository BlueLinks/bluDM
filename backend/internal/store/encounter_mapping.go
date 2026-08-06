package store

import (
	"strings"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"
)

func encounterCombatantEntityFromInput(encounterID string, sortOrder int, input EncounterCombatantInput) dbmodels.EncounterCombatantEntity {
	return dbmodels.EncounterCombatantEntity{
		EncounterID:      strings.TrimSpace(encounterID),
		SourceType:       input.SourceType,
		PlayerID:         stringPointer(input.PlayerID),
		CreatureID:       stringPointer(input.CreatureID),
		Side:             canonicalCombatantSide(input.SourceType, input.Side),
		DisplayName:      input.DisplayName,
		ColorLabel:       input.ColorLabel,
		AvatarURL:        input.AvatarURL,
		ArmorClass:       input.ArmorClass,
		MaxHitPoints:     input.MaxHitPoints,
		CurrentHitPoints: input.CurrentHitPoints,
		RolledHP:         input.RolledHP,
		SortOrder:        sortOrder,
		Snapshot:         jsonMap(input.Snapshot),
	}
}

func encounterCombatantFromEntity(entity dbmodels.EncounterCombatantEntity) models.EncounterCombatant {
	return models.EncounterCombatant{
		ID:               entity.ID,
		EncounterID:      entity.EncounterID,
		SourceType:       entity.SourceType,
		PlayerID:         stringFromPointer(entity.PlayerID),
		CreatureID:       stringFromPointer(entity.CreatureID),
		Side:             canonicalCombatantSide(entity.SourceType, entity.Side),
		DisplayName:      entity.DisplayName,
		ColorLabel:       entity.ColorLabel,
		AvatarURL:        entity.AvatarURL,
		ArmorClass:       entity.ArmorClass,
		MaxHitPoints:     entity.MaxHitPoints,
		CurrentHitPoints: entity.CurrentHitPoints,
		RolledHP:         entity.RolledHP,
		SortOrder:        entity.SortOrder,
		Snapshot:         map[string]any(entity.Snapshot),
		CreatedAt:        entity.CreatedAt,
		UpdatedAt:        entity.UpdatedAt,
	}
}

func canonicalCombatantSide(sourceType, side string) string {
	sourceType = strings.ToLower(strings.TrimSpace(sourceType))
	side = strings.ToLower(strings.TrimSpace(side))
	if sourceType == "player" {
		return "player"
	}
	if side == "ally" {
		return "friendly"
	}
	return side
}
