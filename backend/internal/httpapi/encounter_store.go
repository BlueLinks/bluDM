package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"encoding/json"
	"errors"
	"strings"
)

func (s *Server) encounterByID(ctx context.Context, encounterID string) (models.Encounter, error) {
	userID, ok := currentUserID(ctx)
	if !ok {
		return models.Encounter{}, errors.New("authentication required")
	}
	row := s.db.QueryRow(ctx, `
		select encounters.id, encounters.campaign_id, encounters.name, encounters.description,
			encounters.status, encounters.location, encounters.room_number, encounters.loot_notes,
			count(encounter_combatants.id)::int,
			count(encounter_combatants.id) filter (where encounter_combatants.side = 'enemy')::int,
			encounters.created_at, encounters.updated_at
		from encounters
		join campaigns on campaigns.id = encounters.campaign_id
		left join encounter_combatants on encounter_combatants.encounter_id = encounters.id
		where encounters.id = $1 and campaigns.owner_user_id = $2
		group by encounters.id
	`, encounterID, userID)
	return scanEncounter(row)
}

func (s *Server) combatantsForEncounter(ctx context.Context, encounterID string) ([]models.EncounterCombatant, error) {
	rows, err := s.db.Query(ctx, `
		select id, encounter_id, source_type, coalesce(player_id::text, ''), coalesce(creature_id::text, ''),
			side, display_name, color_label, avatar_url, armor_class, max_hit_points, current_hit_points,
			rolled_hp, sort_order, snapshot, created_at, updated_at
		from encounter_combatants
		where encounter_id = $1
		order by sort_order asc, created_at asc
	`, encounterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	combatants := []models.EncounterCombatant{}
	for rows.Next() {
		combatant, err := scanEncounterCombatant(rows)
		if err != nil {
			return nil, err
		}
		combatants = append(combatants, combatant)
	}
	return combatants, rows.Err()
}

func (s *Server) encounterCombatantOwned(ctx context.Context, combatantID string) bool {
	userID, ok := currentUserID(ctx)
	if !ok {
		return false
	}
	var exists bool
	err := s.db.QueryRow(ctx, `
		select exists(
			select 1
			from encounter_combatants
			join encounters on encounters.id = encounter_combatants.encounter_id
			join campaigns on campaigns.id = encounters.campaign_id
			where encounter_combatants.id = $1 and campaigns.owner_user_id = $2
		)
	`, combatantID, userID).Scan(&exists)
	return err == nil && exists
}

func (s *Server) createCombatantFromRequest(ctx context.Context, encounterID string, side string, req addCombatantRequest) (models.EncounterCombatant, error) {
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
		creature, err := s.creatureByID(ctx, strings.TrimSpace(req.CreatureID))
		if err != nil {
			return models.EncounterCombatant{}, errors.New("creature not found")
		}
		creatureID = creature.ID
		displayName = creature.Name
		avatarURL = assetOrExternalURL(creature.ImageAssetID, creature.AvatarURL)
		ac = creature.ArmorClass
		maxHP = creature.HitPoints
		if req.RolledHP {
			maxHP = rollHitDice(creature.HitDice, creature.HitPoints)
		}
		currentHP = maxHP
		snapshot = map[string]any{"creature": creature}
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
	snapshotBytes, err := json.Marshal(snapshot)
	if err != nil {
		return models.EncounterCombatant{}, err
	}
	var nextOrder int
	if err := s.db.QueryRow(ctx, `select coalesce(max(sort_order) + 1, 0) from encounter_combatants where encounter_id = $1`, encounterID).Scan(&nextOrder); err != nil {
		return models.EncounterCombatant{}, err
	}
	row := s.db.QueryRow(ctx, `
		insert into encounter_combatants (
			encounter_id, source_type, player_id, creature_id, side, display_name, color_label,
			avatar_url, armor_class, max_hit_points, current_hit_points, rolled_hp, sort_order, snapshot
		)
		values ($1, $2, nullif($3, '')::uuid, nullif($4, '')::uuid, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		returning id, encounter_id, source_type, coalesce(player_id::text, ''), coalesce(creature_id::text, ''),
			side, display_name, color_label, avatar_url, armor_class, max_hit_points, current_hit_points,
			rolled_hp, sort_order, snapshot, created_at, updated_at
	`, encounterID, sourceType, playerID, creatureID, side, displayName, strings.TrimSpace(req.ColorLabel), avatarURL, ac, maxHP, currentHP, req.RolledHP, nextOrder, snapshotBytes)
	return scanEncounterCombatant(row)
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
