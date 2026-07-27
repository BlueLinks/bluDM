package httpapi

import (
	"net/http"
	"strings"

	"bludm/backend/internal/generation"
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
)

type encounterGenerationRequest struct {
	Options    generation.EncounterOptions `json:"options"`
	PlayerIDs  []string                    `json:"playerIds"`
	LocationID string                      `json:"locationId"`
	Roll       int                         `json:"roll"`
}

func (s *Server) previewGeneratedEncounter(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	campaign, err := s.campaignByID(r.Context(), campaignID)
	if err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var request encounterGenerationRequest
	if !decodeJSON(w, r, &request) {
		return
	}
	players, err := s.playersForCampaign(r.Context(), campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load campaign players")
		return
	}
	players = selectedGenerationPlayers(players, request.PlayerIDs)
	creatures, err := s.stores.Creatures.List(
		r.Context(),
		currentUserIDMust(r.Context()),
		"",
		true,
		true,
		campaign.AllowedStandardSources,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load creature library")
		return
	}
	location, err := s.generationLocation(r, campaignID, request.LocationID)
	if err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "campaign location not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not load campaign location")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"preview": generation.GenerateEncounter(
			creatures,
			location,
			request.Options,
			players,
			request.Roll,
		),
	})
}

func (s *Server) previewGeneratedDungeon(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var request struct {
		Settings generation.DungeonSettings `json:"settings"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"document": generation.GenerateDungeon(request.Settings),
	})
}

func selectedGenerationPlayers(players []models.Player, playerIDs []string) []models.Player {
	selected := map[string]bool{}
	for _, playerID := range playerIDs {
		selected[strings.TrimSpace(playerID)] = true
	}
	result := make([]models.Player, 0, len(playerIDs))
	for _, player := range players {
		if selected[player.ID] {
			result = append(result, player)
		}
	}
	return result
}

func (s *Server) generationLocation(
	r *http.Request,
	campaignID string,
	locationID string,
) (*models.CampaignLocation, error) {
	locationID = strings.TrimSpace(locationID)
	if locationID == "" {
		return nil, nil
	}
	locations, err := s.stores.Travel.LocationsForCampaign(
		r.Context(),
		currentUserIDMust(r.Context()),
		campaignID,
	)
	if err != nil {
		return nil, err
	}
	for index := range locations {
		if locations[index].ID == locationID {
			return &locations[index], nil
		}
	}
	return nil, store.ErrNotFound
}
