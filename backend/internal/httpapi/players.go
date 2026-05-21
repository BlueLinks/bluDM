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
	user, _ := s.currentUser(r)
	rows, err := s.db.Query(r.Context(), `
		select players.id, coalesce(players.campaign_id::text, ''), coalesce(campaigns.name, ''), players.character_name, players.player_name,
			coalesce(players.image_asset_id::text, ''), players.avatar_url,
			players.armor_class, players.max_hit_points, players.current_hit_points,
			players.temporary_hit_points, players.temporary_max_hit_points,
			players.experience_points, players.character_sheet, players.created_at, players.updated_at
		from players
		left join campaigns on campaigns.id = players.campaign_id
		where players.owner_user_id = $1
		order by coalesce(campaigns.name, '') asc, players.character_name asc
	`, user.ID)
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
	userID := currentUserIDMust(r.Context())
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))

	var req playerRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if campaignID != "" {
		req.CampaignID = campaignID
	}
	req.normalize()
	if err := req.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	var campaignName string
	if req.CampaignID != "" {
		campaign, err := s.campaignByID(r.Context(), req.CampaignID)
		if err != nil {
			writeError(w, http.StatusNotFound, "campaign not found")
			return
		}
		campaignName = campaign.Name
	}
	if err := s.validateOwnedAsset(r.Context(), req.AvatarAssetID); err != nil {
		writeError(w, http.StatusNotFound, "image asset not found")
		return
	}
	characterSheet, err := marshalJSONMap(req.CharacterSheet)
	if err != nil {
		writeError(w, http.StatusBadRequest, "characterSheet must be a JSON object")
		return
	}

	row := s.db.QueryRow(r.Context(), `
		insert into players (
			owner_user_id, campaign_id, character_name, player_name, image_asset_id, avatar_url, armor_class, max_hit_points,
			current_hit_points, temporary_hit_points, temporary_max_hit_points, experience_points, character_sheet
		)
		values ($1, nullif($2, '')::uuid, $3, $4, nullif($5, '')::uuid, $6, $7, $8, $8, $9, $10, $11, $12)
		returning id, coalesce(campaign_id::text, ''), ''::text, character_name, player_name, coalesce(image_asset_id::text, ''), avatar_url, armor_class,
			max_hit_points, current_hit_points, temporary_hit_points, temporary_max_hit_points,
			experience_points, character_sheet, created_at, updated_at
	`, userID, req.CampaignID, req.CharacterName, req.PlayerName, req.AvatarAssetID, req.AvatarURL, req.ArmorClass, req.MaxHitPoints,
		req.TemporaryHitPoints, req.TemporaryMaxHitPoints, req.ExperiencePoints, characterSheet)

	player, err := scanPlayer(row)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create player")
		return
	}
	player.CampaignName = campaignName

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
	if err := s.validateOwnedAsset(r.Context(), req.AvatarAssetID); err != nil {
		writeError(w, http.StatusNotFound, "image asset not found")
		return
	}
	var campaignName string
	if req.CampaignID != "" {
		campaign, err := s.campaignByID(r.Context(), req.CampaignID)
		if err != nil {
			writeError(w, http.StatusNotFound, "campaign not found")
			return
		}
		campaignName = campaign.Name
	}
	characterSheet, err := marshalJSONMap(req.CharacterSheet)
	if err != nil {
		writeError(w, http.StatusBadRequest, "characterSheet must be a JSON object")
		return
	}
	row := s.db.QueryRow(r.Context(), `
		update players
		set campaign_id = nullif($2, '')::uuid, character_name = $3, player_name = $4, image_asset_id = nullif($5, '')::uuid,
			avatar_url = $6, armor_class = $7, max_hit_points = $8, current_hit_points = least(current_hit_points, $8),
			temporary_hit_points = $9, temporary_max_hit_points = $10, experience_points = $11, character_sheet = $12
		where id = $1 and owner_user_id = $13
		returning id, coalesce(campaign_id::text, ''), ''::text, character_name, player_name, coalesce(image_asset_id::text, ''), avatar_url, armor_class,
			max_hit_points, current_hit_points, temporary_hit_points, temporary_max_hit_points,
			experience_points, character_sheet, created_at, updated_at
	`, playerID, req.CampaignID, req.CharacterName, req.PlayerName, req.AvatarAssetID, req.AvatarURL, req.ArmorClass, req.MaxHitPoints,
		req.TemporaryHitPoints, req.TemporaryMaxHitPoints, req.ExperiencePoints, characterSheet, currentUserIDMust(r.Context()))
	player, err := scanPlayer(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "player not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not update player")
		return
	}
	player.CampaignName = campaignName
	writeJSON(w, http.StatusOK, map[string]any{"player": player})
}

func (s *Server) deletePlayer(w http.ResponseWriter, r *http.Request) {
	playerID := strings.TrimSpace(r.PathValue("playerID"))
	tag, err := s.db.Exec(r.Context(), `
		delete from players
		where players.id = $1 and players.owner_user_id = $2
	`, playerID, currentUserIDMust(r.Context()))
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
	userID, ok := currentUserID(ctx)
	if !ok {
		return models.Player{}, errors.New("authentication required")
	}
	row := s.db.QueryRow(ctx, `
		select players.id, coalesce(players.campaign_id::text, ''), coalesce(campaigns.name, ''), players.character_name, players.player_name,
			coalesce(players.image_asset_id::text, ''), players.avatar_url,
			players.armor_class, players.max_hit_points, players.current_hit_points,
			players.temporary_hit_points, players.temporary_max_hit_points,
			players.experience_points, players.character_sheet, players.created_at, players.updated_at
		from players left join campaigns on campaigns.id = players.campaign_id
		where players.id = $1 and players.owner_user_id = $2
	`, playerID, userID)
	return scanPlayer(row)
}
