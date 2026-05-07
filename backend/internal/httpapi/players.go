package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
)

func (s *Server) listPlayers(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `
		select players.id, players.campaign_id, campaigns.name, players.character_name, players.player_name,
			coalesce(players.image_asset_id::text, ''), players.avatar_url,
			players.armor_class, players.max_hit_points, players.current_hit_points,
			players.temporary_hit_points, players.temporary_max_hit_points,
			players.experience_points, players.character_sheet, players.created_at, players.updated_at
		from players
		join campaigns on campaigns.id = players.campaign_id
		order by campaigns.name asc, players.character_name asc
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list players")
		return
	}
	defer rows.Close()

	players := []models.Player{}
	for rows.Next() {
		player, err := scanPlayer(rows)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not read players")
			return
		}
		players = append(players, player)
	}
	if rows.Err() != nil {
		writeError(w, http.StatusInternalServerError, "could not read players")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"players": players})
}

func (s *Server) createPlayer(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}

	var req playerRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := req.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	characterSheet, err := marshalJSONMap(req.CharacterSheet)
	if err != nil {
		writeError(w, http.StatusBadRequest, "characterSheet must be a JSON object")
		return
	}

	row := s.db.QueryRow(r.Context(), `
		insert into players (
			campaign_id, character_name, player_name, image_asset_id, avatar_url, armor_class, max_hit_points,
			current_hit_points, temporary_hit_points, temporary_max_hit_points, experience_points, character_sheet
		)
		values ($1, $2, $3, nullif($4, '')::uuid, $5, $6, $7, $7, $8, $9, $10, $11)
		returning id, campaign_id, ''::text, character_name, player_name, coalesce(image_asset_id::text, ''), avatar_url, armor_class,
			max_hit_points, current_hit_points, temporary_hit_points, temporary_max_hit_points,
			experience_points, character_sheet, created_at, updated_at
	`, campaignID, req.CharacterName, req.PlayerName, req.AvatarAssetID, req.AvatarURL, req.ArmorClass, req.MaxHitPoints,
		req.TemporaryHitPoints, req.TemporaryMaxHitPoints, req.ExperiencePoints, characterSheet)

	player, err := scanPlayer(row)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create player")
		return
	}
	campaign, _ := s.campaignByID(r.Context(), campaignID)
	player.CampaignName = campaign.Name

	writeJSON(w, http.StatusCreated, map[string]any{"player": player})
}

func (s *Server) getPlayer(w http.ResponseWriter, r *http.Request) {
	playerID := strings.TrimSpace(r.PathValue("playerID"))
	player, err := s.playerByID(r.Context(), playerID)
	if err != nil {
		writeError(w, http.StatusNotFound, "player not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"player": player})
}

func (s *Server) updatePlayer(w http.ResponseWriter, r *http.Request) {
	playerID := strings.TrimSpace(r.PathValue("playerID"))
	var req playerRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := req.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if _, err := s.campaignByID(r.Context(), req.CampaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	characterSheet, err := marshalJSONMap(req.CharacterSheet)
	if err != nil {
		writeError(w, http.StatusBadRequest, "characterSheet must be a JSON object")
		return
	}
	row := s.db.QueryRow(r.Context(), `
		update players
		set campaign_id = $2, character_name = $3, player_name = $4, image_asset_id = nullif($5, '')::uuid,
			avatar_url = $6, armor_class = $7, max_hit_points = $8, current_hit_points = least(current_hit_points, $8),
			temporary_hit_points = $9, temporary_max_hit_points = $10, experience_points = $11, character_sheet = $12
		where id = $1
		returning id, campaign_id, ''::text, character_name, player_name, coalesce(image_asset_id::text, ''), avatar_url, armor_class,
			max_hit_points, current_hit_points, temporary_hit_points, temporary_max_hit_points,
			experience_points, character_sheet, created_at, updated_at
	`, playerID, req.CampaignID, req.CharacterName, req.PlayerName, req.AvatarAssetID, req.AvatarURL, req.ArmorClass, req.MaxHitPoints,
		req.TemporaryHitPoints, req.TemporaryMaxHitPoints, req.ExperiencePoints, characterSheet)
	player, err := scanPlayer(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "player not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not update player")
		return
	}
	campaign, _ := s.campaignByID(r.Context(), req.CampaignID)
	player.CampaignName = campaign.Name
	writeJSON(w, http.StatusOK, map[string]any{"player": player})
}

func (s *Server) deletePlayer(w http.ResponseWriter, r *http.Request) {
	playerID := strings.TrimSpace(r.PathValue("playerID"))
	tag, err := s.db.Exec(r.Context(), `delete from players where id = $1`, playerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete player")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "player not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) playerByID(ctx context.Context, playerID string) (models.Player, error) {
	row := s.db.QueryRow(ctx, `
		select players.id, players.campaign_id, campaigns.name, players.character_name, players.player_name,
			coalesce(players.image_asset_id::text, ''), players.avatar_url,
			players.armor_class, players.max_hit_points, players.current_hit_points,
			players.temporary_hit_points, players.temporary_max_hit_points,
			players.experience_points, players.character_sheet, players.created_at, players.updated_at
		from players join campaigns on campaigns.id = players.campaign_id
		where players.id = $1
	`, playerID)
	return scanPlayer(row)
}
