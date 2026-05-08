package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"errors"
	"net/http"
	"strings"
)

func (s *Server) listCampaigns(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	rows, err := s.db.Query(r.Context(), `
		select id, name, description, created_at, updated_at
		from campaigns
		where owner_user_id = $1
		order by updated_at desc
	`, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list campaigns")
		return
	}
	defer rows.Close()

	campaigns := []models.Campaign{}
	for rows.Next() {
		var campaign models.Campaign
		if err := rows.Scan(&campaign.ID, &campaign.Name, &campaign.Description, &campaign.CreatedAt, &campaign.UpdatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "could not read campaigns")
			return
		}
		campaigns = append(campaigns, campaign)
	}
	if rows.Err() != nil {
		writeError(w, http.StatusInternalServerError, "could not read campaigns")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"campaigns": campaigns})
}

func (s *Server) createCampaign(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	var req campaignRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	var campaign models.Campaign
	err := s.db.QueryRow(r.Context(), `
		insert into campaigns (owner_user_id, name, description)
		values ($1, $2, $3)
		returning id, name, description, created_at, updated_at
	`, user.ID, req.Name, req.Description).Scan(&campaign.ID, &campaign.Name, &campaign.Description, &campaign.CreatedAt, &campaign.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create campaign")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"campaign": campaign})
}

func (s *Server) getCampaign(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	campaign, err := s.campaignByID(r.Context(), campaignID)
	if err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}

	players, err := s.playersForCampaign(r.Context(), campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load campaign players")
		return
	}
	encounterCount, err := s.countCampaignRows(r.Context(), "encounters", campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load campaign encounters")
		return
	}
	npcs, err := s.creaturesForCampaign(r.Context(), campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load campaign NPCs")
		return
	}

	encounters, err := s.encountersForCampaign(r.Context(), campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load campaign encounters")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"campaign":       campaign,
		"players":        players,
		"encounters":     encounters,
		"npcs":           npcs,
		"playerCount":    len(players),
		"encounterCount": encounterCount,
	})
}

func (s *Server) listCampaignEncounters(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	encounters, err := s.encountersForCampaign(r.Context(), campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list encounters")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"encounters": encounters})
}

func (s *Server) createEncounter(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var req encounterRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)
	req.Status = normalizeEncounterStatus(req.Status)
	req.Location = strings.TrimSpace(req.Location)
	req.RoomNumber = strings.TrimSpace(req.RoomNumber)
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	row := s.db.QueryRow(r.Context(), `
		insert into encounters (campaign_id, name, description, status, location, room_number)
		values ($1, $2, $3, $4, $5, $6)
		returning id, campaign_id, name, description, status, location, room_number, loot_notes, 0, 0, created_at, updated_at
	`, campaignID, req.Name, req.Description, req.Status, req.Location, req.RoomNumber)
	encounter, err := scanEncounter(row)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create encounter")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"encounter": encounter})
}

func (s *Server) linkCampaignCreature(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var req campaignCreatureRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.CreatureID = strings.TrimSpace(req.CreatureID)
	req.Disposition = strings.TrimSpace(req.Disposition)
	if req.Disposition == "" {
		req.Disposition = "neutral"
	}
	if _, err := s.creatureExists(r.Context(), req.CreatureID); err != nil {
		writeError(w, http.StatusNotFound, "creature not found")
		return
	}
	_, err := s.db.Exec(r.Context(), `
		insert into campaign_creatures (campaign_id, creature_id, disposition)
		values ($1, $2, $3)
		on conflict (campaign_id, creature_id) do update set disposition = excluded.disposition
	`, campaignID, req.CreatureID, req.Disposition)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not link NPC to campaign")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "linked"})
}

func (s *Server) unlinkCampaignCreature(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	creatureID := strings.TrimSpace(r.PathValue("creatureID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign NPC link not found")
		return
	}
	tag, err := s.db.Exec(r.Context(), `delete from campaign_creatures where campaign_id = $1 and creature_id = $2`, campaignID, creatureID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not unlink NPC from campaign")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "campaign NPC link not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) longRestCampaign(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}

	rows, err := s.db.Query(r.Context(), `
		select id, current_hit_points, temporary_hit_points, temporary_max_hit_points
		from players
		where campaign_id = $1
	`, campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not long rest party")
		return
	}
	snapshot := []longRestPlayerSnapshot{}
	for rows.Next() {
		var item longRestPlayerSnapshot
		if err := rows.Scan(&item.ID, &item.CurrentHitPoints, &item.TemporaryHitPoints, &item.TemporaryMaxHitPoints); err != nil {
			rows.Close()
			writeError(w, http.StatusInternalServerError, "could not long rest party")
			return
		}
		snapshot = append(snapshot, item)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		writeError(w, http.StatusInternalServerError, "could not long rest party")
		return
	}
	rows.Close()

	tag, err := s.db.Exec(r.Context(), `
		update players
		set current_hit_points = max_hit_points,
			temporary_hit_points = 0,
			temporary_max_hit_points = 0
		where campaign_id = $1
	`, campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not long rest party")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"restedPlayers": tag.RowsAffected(), "snapshot": snapshot})
}

func (s *Server) undoLongRestCampaign(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var req longRestUndoRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not undo long rest")
		return
	}
	defer tx.Rollback(r.Context())
	restored := int64(0)
	for _, player := range req.Players {
		tag, err := tx.Exec(r.Context(), `
			update players
			set current_hit_points = $3,
				temporary_hit_points = $4,
				temporary_max_hit_points = $5
			where campaign_id = $1 and id = $2
		`, campaignID, strings.TrimSpace(player.ID), player.CurrentHitPoints, player.TemporaryHitPoints, player.TemporaryMaxHitPoints)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not undo long rest")
			return
		}
		restored += tag.RowsAffected()
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not undo long rest")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"restoredPlayers": restored})
}

func (s *Server) campaignByID(ctx context.Context, campaignID string) (models.Campaign, error) {
	userID, ok := currentUserID(ctx)
	if !ok {
		return models.Campaign{}, errors.New("authentication required")
	}
	var campaign models.Campaign
	err := s.db.QueryRow(ctx, `
		select id, name, description, created_at, updated_at
		from campaigns
		where id = $1 and owner_user_id = $2 and archived_at is null
	`, campaignID, userID).Scan(&campaign.ID, &campaign.Name, &campaign.Description, &campaign.CreatedAt, &campaign.UpdatedAt)
	return campaign, err
}

func (s *Server) playersForCampaign(ctx context.Context, campaignID string) ([]models.Player, error) {
	rows, err := s.db.Query(ctx, `
		select players.id, players.campaign_id, campaigns.name, players.character_name, players.player_name,
			coalesce(players.image_asset_id::text, ''), players.avatar_url,
			players.armor_class, players.max_hit_points, players.current_hit_points,
			players.temporary_hit_points, players.temporary_max_hit_points,
			players.experience_points, players.character_sheet, players.created_at, players.updated_at
		from players
		join campaigns on campaigns.id = players.campaign_id
		where players.campaign_id = $1
		order by players.character_name asc
	`, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	players := []models.Player{}
	for rows.Next() {
		player, err := scanPlayer(rows)
		if err != nil {
			return nil, err
		}
		players = append(players, player)
	}
	return players, rows.Err()
}

func (s *Server) creaturesForCampaign(ctx context.Context, campaignID string) ([]models.Creature, error) {
	rows, err := s.db.Query(ctx, `
		select creatures.id, creatures.name, creatures.description, creatures.size, creatures.creature_type,
			creatures.alignment, creatures.armor_class, creatures.hit_points, creatures.hit_dice,
			creatures.challenge_rating, creatures.xp, coalesce(creatures.image_asset_id::text, ''),
			creatures.avatar_url, creatures.stat_block, creatures.created_at, creatures.updated_at
		from campaign_creatures
		join creatures on creatures.id = campaign_creatures.creature_id
		where campaign_creatures.campaign_id = $1
		order by creatures.name asc
	`, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	creatures := []models.Creature{}
	for rows.Next() {
		creature, err := scanCreature(rows)
		if err != nil {
			return nil, err
		}
		creatures = append(creatures, creature)
	}
	return creatures, rows.Err()
}

func (s *Server) campaignsForCreature(ctx context.Context, creatureID string) ([]models.Campaign, error) {
	userID, ok := currentUserID(ctx)
	if !ok {
		return nil, errors.New("authentication required")
	}
	rows, err := s.db.Query(ctx, `
		select campaigns.id, campaigns.name, campaigns.description, campaigns.created_at, campaigns.updated_at
		from campaign_creatures
		join campaigns on campaigns.id = campaign_creatures.campaign_id
		where campaign_creatures.creature_id = $1 and campaigns.owner_user_id = $2 and campaigns.archived_at is null
		order by campaigns.name asc
	`, creatureID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	campaigns := []models.Campaign{}
	for rows.Next() {
		var campaign models.Campaign
		if err := rows.Scan(&campaign.ID, &campaign.Name, &campaign.Description, &campaign.CreatedAt, &campaign.UpdatedAt); err != nil {
			return nil, err
		}
		campaigns = append(campaigns, campaign)
	}
	return campaigns, rows.Err()
}

func (s *Server) encountersForCampaign(ctx context.Context, campaignID string) ([]models.Encounter, error) {
	rows, err := s.db.Query(ctx, `
		select encounters.id, encounters.campaign_id, encounters.name, encounters.description,
			encounters.status, encounters.location, encounters.room_number, encounters.loot_notes,
			count(encounter_combatants.id)::int,
			count(encounter_combatants.id) filter (where encounter_combatants.side = 'enemy')::int,
			encounters.created_at, encounters.updated_at
		from encounters
		left join encounter_combatants on encounter_combatants.encounter_id = encounters.id
		where encounters.campaign_id = $1
		group by encounters.id
		order by encounters.updated_at desc
	`, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	encounters := []models.Encounter{}
	for rows.Next() {
		encounter, err := scanEncounter(rows)
		if err != nil {
			return nil, err
		}
		encounters = append(encounters, encounter)
	}
	return encounters, rows.Err()
}

func (s *Server) countCampaignRows(ctx context.Context, tableName string, campaignID string) (int64, error) {
	var count int64
	query := "select count(*) from " + tableName + " where campaign_id = $1"
	err := s.db.QueryRow(ctx, query, campaignID).Scan(&count)
	return count, err
}

type campaignRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type encounterRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Location    string `json:"location"`
	RoomNumber  string `json:"roomNumber"`
}

type campaignCreatureRequest struct {
	CreatureID  string `json:"creatureId"`
	Disposition string `json:"disposition"`
}

func normalizeEncounterStatus(status string) string {
	status = strings.TrimSpace(strings.ToLower(status))
	switch status {
	case "completed", "skipped":
		return status
	default:
		return "planned"
	}
}
