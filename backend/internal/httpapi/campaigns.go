package httpapi

import (
	"context"
	"errors"
	"net/http"
	"strings"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/models"
	"bludm/backend/internal/rulesets"
	"bludm/backend/internal/store"
)

func (s *Server) listCampaigns(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	campaigns, err := s.stores.Campaigns.List(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list campaigns")
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
	sources := normalizeStandardSources(req.AllowedStandardSources)
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	encounterRuleset, err := rulesets.ResolveEncounterRuleset(sources, req.EncounterRuleset)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	campaign, err := s.stores.Campaigns.Create(r.Context(), user.ID, store.CampaignInput{
		Name:                   req.Name,
		Description:            req.Description,
		AllowedStandardSources: sources,
		EncounterRuleset:       encounterRuleset,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create campaign")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"campaign": campaign})
}

func (s *Server) updateCampaign(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	existing, err := s.campaignByID(r.Context(), campaignID)
	if err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
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
	sources := normalizeStandardSources(req.AllowedStandardSources)
	selectedRuleset := req.EncounterRuleset
	if selectedRuleset == "" {
		selectedRuleset = existing.EncounterRuleset
	}
	encounterRuleset, err := rulesets.ResolveEncounterRuleset(sources, selectedRuleset)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	campaign, err := s.stores.Campaigns.Update(r.Context(), currentUserIDMust(r.Context()), campaignID, store.CampaignInput{
		Name:                   req.Name,
		Description:            req.Description,
		AllowedStandardSources: sources,
		EncounterRuleset:       encounterRuleset,
	})
	if err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "campaign not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not update campaign")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"campaign": campaign})
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
	locationCount, err := s.countCampaignRows(r.Context(), "campaign_locations", campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load campaign locations")
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
		"locationCount":  locationCount,
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
	campaign, err := s.campaignByID(r.Context(), campaignID)
	if err != nil {
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
	req.LocationID = strings.TrimSpace(req.LocationID)
	req.RoomNumber = strings.TrimSpace(req.RoomNumber)
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if req.IdempotencyKey != "" || len(req.Combatants) > 0 {
		encounter, err := s.app.CreateEncounter(
			r.Context(), campaignID, appdomain.EncounterCommand{
				IdempotencyKey: req.IdempotencyKey, Name: req.Name,
				PreviewFingerprint: req.PreviewFingerprint,
				Description:        req.Description, Status: req.Status, Location: req.Location,
				LocationID: req.LocationID, RoomNumber: req.RoomNumber,
				Combatants: req.Combatants,
			},
		)
		if err != nil {
			info := appdomain.ErrorInfo(err)
			status := http.StatusBadRequest
			if info.Code == appdomain.CodeNotFound {
				status = http.StatusNotFound
			} else if info.Code == appdomain.CodeConflict ||
				info.Code == appdomain.CodeIdempotencyConflict {
				status = http.StatusConflict
			} else if info.Code == appdomain.CodeInternal {
				status = http.StatusInternalServerError
			}
			writeError(w, status, info.Message)
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{"encounter": encounter})
		return
	}
	encounter, err := s.stores.Campaigns.CreateEncounter(r.Context(), currentUserIDMust(r.Context()), campaignID, store.CampaignEncounterInput{
		Name:              req.Name,
		Description:       req.Description,
		Status:            req.Status,
		Location:          req.Location,
		LocationID:        req.LocationID,
		RoomNumber:        req.RoomNumber,
		DifficultyRuleset: campaign.EncounterRuleset,
	})
	if err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "campaign location not found")
			return
		}
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
	if err := s.stores.Campaigns.LinkCreature(r.Context(), currentUserIDMust(r.Context()), campaignID, req.CreatureID, req.Disposition); err != nil {
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
	err := s.stores.Campaigns.UnlinkCreature(r.Context(), currentUserIDMust(r.Context()), campaignID, creatureID)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "campaign NPC link not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not unlink NPC from campaign")
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

	snapshot, rested, err := s.stores.Campaigns.LongRest(r.Context(), currentUserIDMust(r.Context()), campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not long rest party")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"restedPlayers": rested, "snapshot": snapshot})
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
	players := make([]store.LongRestSnapshot, 0, len(req.Players))
	for _, player := range req.Players {
		if player.SpellSlotsRemaining == nil {
			player.SpellSlotsRemaining = map[string]any{}
		}
		players = append(players, store.LongRestSnapshot(player))
	}
	restored, err := s.stores.Campaigns.UndoLongRest(r.Context(), currentUserIDMust(r.Context()), campaignID, players)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not undo long rest")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"restoredPlayers": restored})
}

func (s *Server) playersForCampaign(ctx context.Context, campaignID string) ([]models.Player, error) {
	return s.stores.Campaigns.Players(ctx, currentUserIDMust(ctx), campaignID)
}

func (s *Server) creaturesForCampaign(ctx context.Context, campaignID string) ([]models.Creature, error) {
	return s.stores.Campaigns.Creatures(ctx, currentUserIDMust(ctx), campaignID)
}

func (s *Server) campaignsForCreature(ctx context.Context, creatureID string) ([]models.Campaign, error) {
	userID, ok := currentUserID(ctx)
	if !ok {
		return nil, errors.New("authentication required")
	}
	return s.stores.Campaigns.CampaignsForCreature(ctx, userID, creatureID)
}

func (s *Server) encountersForCampaign(ctx context.Context, campaignID string) ([]models.Encounter, error) {
	return s.stores.Campaigns.Encounters(ctx, currentUserIDMust(ctx), campaignID)
}

func (s *Server) countCampaignRows(ctx context.Context, tableName string, campaignID string) (int64, error) {
	return s.stores.Campaigns.CountRows(ctx, currentUserIDMust(ctx), tableName, campaignID)
}
