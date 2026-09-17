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

type partyAdjustmentRequest struct {
	TargetIDs              []string `json:"targetIds"`
	Kind                   string   `json:"kind"`
	Amount                 int      `json:"amount"`
	ActorID                string   `json:"actorId"`
	SlotLevel              int      `json:"slotLevel"`
	ConsumeSpellSlot       bool     `json:"consumeSpellSlot"`
	AdjustCurrentHitPoints bool     `json:"adjustCurrentHitPoints"`
	DamageType             string   `json:"damageType"`
	Reason                 string   `json:"reason"`
}

func (s *Server) adjustCampaignParty(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	campaign, err := s.campaignByID(r.Context(), campaignID)
	if err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var req partyAdjustmentRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	input, err := partyAdjustmentInput(req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	players, err := s.stores.Players.ApplyPartyAdjustment(
		r.Context(), currentUserIDMust(r.Context()), campaignID, input,
	)
	if err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "party member not found in this campaign")
			return
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	for index := range players {
		players[index].CampaignName = campaign.Name
	}
	writeJSON(w, http.StatusOK, map[string]any{"players": players})
}

func partyAdjustmentInput(req partyAdjustmentRequest) (store.PartyAdjustmentInput, error) {
	seen := map[string]bool{}
	targetIDs := make([]string, 0, len(req.TargetIDs))
	for _, value := range req.TargetIDs {
		id := strings.TrimSpace(value)
		if id == "" || seen[id] {
			return store.PartyAdjustmentInput{}, errors.New("party adjustment targets must be unique")
		}
		seen[id] = true
		targetIDs = append(targetIDs, id)
	}
	if len(targetIDs) == 0 {
		return store.PartyAdjustmentInput{}, errors.New("choose at least one party member")
	}
	if len(targetIDs) > 20 {
		return store.PartyAdjustmentInput{}, errors.New("party adjustment cannot exceed 20 targets")
	}
	kind := strings.ToLower(strings.TrimSpace(req.Kind))
	switch kind {
	case "damage", "healing", "temporary_hit_points", "temporary_max_hit_points", "aid", "inspiring_leader":
	default:
		return store.PartyAdjustmentInput{}, errors.New("unsupported party adjustment")
	}
	actorID := strings.TrimSpace(req.ActorID)
	if kind == "aid" {
		if len(targetIDs) > 3 {
			return store.PartyAdjustmentInput{}, errors.New("Aid can affect no more than 3 party members")
		}
		if actorID == "" {
			return store.PartyAdjustmentInput{}, errors.New("choose who is casting Aid")
		}
		if req.SlotLevel < 2 || req.SlotLevel > 9 {
			return store.PartyAdjustmentInput{}, errors.New("Aid requires a spell slot from level 2 to 9")
		}
		req.Amount = 5 * (req.SlotLevel - 1)
	}
	if req.Amount < 1 || req.Amount > 10000 {
		return store.PartyAdjustmentInput{}, errors.New("amount must be between 1 and 10000")
	}
	if kind == "inspiring_leader" {
		if len(targetIDs) > 6 {
			return store.PartyAdjustmentInput{}, errors.New("Inspiring Leader can affect no more than 6 party members")
		}
		if actorID == "" {
			return store.PartyAdjustmentInput{}, errors.New("choose who is using Inspiring Leader")
		}
	}
	if req.ConsumeSpellSlot && actorID == "" {
		return store.PartyAdjustmentInput{}, errors.New("spell slot use requires a caster")
	}
	return store.PartyAdjustmentInput{
		TargetIDs:              targetIDs,
		Kind:                   kind,
		Amount:                 req.Amount,
		ActorID:                actorID,
		SlotLevel:              req.SlotLevel,
		ConsumeSpellSlot:       req.ConsumeSpellSlot,
		AdjustCurrentHitPoints: req.AdjustCurrentHitPoints,
	}, nil
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
