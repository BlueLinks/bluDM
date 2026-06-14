package httpapi

import (
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
	"context"
	"errors"
	"strings"
)

func (s *Server) createCombatantFromRequest(ctx context.Context, encounterID string, side string, req addCombatantRequest) (models.EncounterCombatant, error) {
	userID, ok := currentUserID(ctx)
	if !ok {
		return models.EncounterCombatant{}, errors.New("authentication required")
	}
	sourceType := strings.TrimSpace(req.SourceType)
	var playerID, creatureID, displayName, avatarURL string
	ac, maxHP, currentHP := req.ArmorClass, req.MaxHitPoints, req.CurrentHitPoints
	snapshot := map[string]any{}
	if sourceType == "player" {
		player, err := s.playerByID(ctx, strings.TrimSpace(req.PlayerID))
		if err != nil {
			return models.EncounterCombatant{}, errors.New("player not found")
		}
		playerID = player.ID
		displayName = player.CharacterName
		avatarURL = assetOrExternalURL(player.AvatarAssetID, player.AvatarURL)
		ac, maxHP, currentHP = player.ArmorClass, player.MaxHitPoints, player.CurrentHitPoints
		snapshot = map[string]any{"player": player}
		side = "player"
	} else {
		sourceType = "creature"
		creature, isStandard, err := s.creatureFromCombatantRequest(ctx, req)
		if err != nil {
			return models.EncounterCombatant{}, errors.New("creature not found")
		}
		if !isStandard {
			creatureID = creature.ID
		}
		displayName = creature.Name
		avatarURL = assetOrExternalURL(creature.ImageAssetID, creature.AvatarURL)
		ac = creature.ArmorClass
		maxHP = creature.HitPoints
		if req.RolledHP {
			maxHP = rollHitDice(creature.HitDice, creature.HitPoints)
		}
		currentHP = maxHP
		snapshot = map[string]any{"creature": creature}
		if isStandard {
			snapshot["standardCreatureId"] = creature.ID
		}
	}
	if req.DisplayName != "" {
		displayName = strings.TrimSpace(req.DisplayName)
	}
	if req.AvatarURL != "" {
		avatarURL = strings.TrimSpace(req.AvatarURL)
	}
	if currentHP == 0 {
		currentHP = maxHP
	}
	return s.stores.Encounters.AddCombatant(ctx, userID, encounterID, store.EncounterCombatantInput{
		SourceType:       sourceType,
		PlayerID:         playerID,
		CreatureID:       creatureID,
		Side:             side,
		DisplayName:      displayName,
		ColorLabel:       strings.TrimSpace(req.ColorLabel),
		AvatarURL:        avatarURL,
		ArmorClass:       ac,
		MaxHitPoints:     maxHP,
		CurrentHitPoints: currentHP,
		RolledHP:         req.RolledHP,
		Snapshot:         snapshot,
	})
}

func (s *Server) creatureFromCombatantRequest(ctx context.Context, req addCombatantRequest) (models.Creature, bool, error) {
	if strings.TrimSpace(req.StandardCreatureID) != "" {
		creature, err := s.standardCreatureByID(ctx, req.StandardCreatureID)
		return creature, true, err
	}
	creature, err := s.creatureByID(ctx, strings.TrimSpace(req.CreatureID))
	return creature, false, err
}

func scanEncounter(row scanner) (models.Encounter, error) {
	var encounter models.Encounter
	err := row.Scan(
		&encounter.ID,
		&encounter.CampaignID,
		&encounter.Name,
		&encounter.Description,
		&encounter.Status,
		&encounter.Location,
		&encounter.RoomNumber,
		&encounter.LootNotes,
		&encounter.CombatantCount,
		&encounter.EnemyCount,
		&encounter.CreatedAt,
		&encounter.UpdatedAt,
	)
	return encounter, err
}

func scanEncounterCombatant(row scanner) (models.EncounterCombatant, error) {
	var combatant models.EncounterCombatant
	var snapshotBytes []byte
	err := row.Scan(
		&combatant.ID,
		&combatant.EncounterID,
		&combatant.SourceType,
		&combatant.PlayerID,
		&combatant.CreatureID,
		&combatant.Side,
		&combatant.DisplayName,
		&combatant.ColorLabel,
		&combatant.AvatarURL,
		&combatant.ArmorClass,
		&combatant.MaxHitPoints,
		&combatant.CurrentHitPoints,
		&combatant.RolledHP,
		&combatant.SortOrder,
		&snapshotBytes,
		&combatant.CreatedAt,
		&combatant.UpdatedAt,
	)
	if err != nil {
		return models.EncounterCombatant{}, err
	}
	combatant.Snapshot, err = unmarshalJSONMap(snapshotBytes)
	return combatant, err
}
