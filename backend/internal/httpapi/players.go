package httpapi

import (
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
	"context"
	"errors"
	"net/http"
	"strings"
)

func (s *Server) listPlayers(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	players, err := s.stores.Players.List(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list players")
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
	player, err := s.stores.Players.Create(r.Context(), userID, playerInputFromRequest(req))
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
	player, err := s.stores.Players.Update(r.Context(), currentUserIDMust(r.Context()), playerID, playerInputFromRequest(req))
	if err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "player not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not update player")
		return
	}
	player.CampaignName = campaignName
	writeJSON(w, http.StatusOK, map[string]any{"player": player})
}

func (s *Server) movePlayer(w http.ResponseWriter, r *http.Request) {
	playerID := strings.TrimSpace(r.PathValue("playerID"))
	var req movePlayerRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.CampaignID = strings.TrimSpace(req.CampaignID)
	if req.CampaignID != "" {
		if _, err := s.campaignByID(r.Context(), req.CampaignID); err != nil {
			writeError(w, http.StatusNotFound, "campaign not found")
			return
		}
	}
	player, err := s.stores.Players.Move(
		r.Context(), currentUserIDMust(r.Context()), playerID, req.CampaignID,
	)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "player not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not move player")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"player": player})
}

func (s *Server) clonePlayer(w http.ResponseWriter, r *http.Request) {
	playerID := strings.TrimSpace(r.PathValue("playerID"))
	player, err := s.stores.Players.Clone(
		r.Context(), currentUserIDMust(r.Context()), playerID,
	)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "player not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not clone player")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"player": player})
}

func (s *Server) deletePlayer(w http.ResponseWriter, r *http.Request) {
	playerID := strings.TrimSpace(r.PathValue("playerID"))
	if err := s.stores.Players.Delete(r.Context(), currentUserIDMust(r.Context()), playerID); err != nil {
		if !store.IsNotFound(err) {
			writeError(w, http.StatusInternalServerError, "could not delete player")
			return
		}
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
	return s.stores.Players.ByID(ctx, userID, playerID)
}

func playerInputFromRequest(req playerRequest) store.PlayerInput {
	return store.PlayerInput{
		CampaignID:            req.CampaignID,
		CharacterName:         req.CharacterName,
		PlayerName:            req.PlayerName,
		AvatarAssetID:         req.AvatarAssetID,
		AvatarURL:             req.AvatarURL,
		ArmorClass:            req.ArmorClass,
		MaxHitPoints:          req.MaxHitPoints,
		TemporaryHitPoints:    req.TemporaryHitPoints,
		TemporaryMaxHitPoints: req.TemporaryMaxHitPoints,
		ExperiencePoints:      req.ExperiencePoints,
		CharacterSheet:        req.CharacterSheet,
	}
}
