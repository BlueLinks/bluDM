package httpapi

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
)

type npcLocationLinkRequest struct {
	CreatureID string `json:"creatureId"`
	LocationID string `json:"locationId"`
	LinkType   string `json:"linkType"`
	Visibility string `json:"visibility"`
	Notes      string `json:"notes"`
}

func (s *Server) listCampaignNpcLocationLinks(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	links, err := s.npcLocationLinksForCampaign(r.Context(), campaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list campaign NPC location links")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"links": links})
}

func (s *Server) createCampaignNpcLocationLink(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	var req npcLocationLinkRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := validateNpcLocationLinkRequest(req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	link, err := s.insertCampaignNpcLocationLink(r.Context(), campaignID, req)
	if err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusBadRequest, "NPC and location must belong to the campaign")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not create campaign NPC location link")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"link": link})
}

func (s *Server) deleteCampaignNpcLocationLink(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	linkID := strings.TrimSpace(r.PathValue("linkID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	if err := s.stores.Travel.DeleteNpcLocationLink(r.Context(), currentUserIDMust(r.Context()), campaignID, linkID); err != nil {
		if !store.IsNotFound(err) {
			writeError(w, http.StatusInternalServerError, "could not delete campaign NPC location link")
			return
		}
		writeError(w, http.StatusNotFound, "NPC location link not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (req *npcLocationLinkRequest) normalize() {
	req.CreatureID = strings.TrimSpace(req.CreatureID)
	req.LocationID = strings.TrimSpace(req.LocationID)
	req.LinkType = normalizeLocationToken(req.LinkType)
	if req.LinkType == "" {
		req.LinkType = "frequents"
	}
	req.Visibility = normalizeLocationToken(req.Visibility)
	if req.Visibility == "" {
		req.Visibility = "dm"
	}
	req.Notes = strings.TrimSpace(req.Notes)
}

func validateNpcLocationLinkRequest(req npcLocationLinkRequest) error {
	switch {
	case req.CreatureID == "":
		return errors.New("creatureId is required")
	case req.LocationID == "":
		return errors.New("locationId is required")
	default:
		return nil
	}
}

func (s *Server) npcLocationLinksForCampaign(ctx context.Context, campaignID string) ([]models.CampaignNpcLocationLink, error) {
	return s.stores.Travel.NpcLocationLinksForCampaign(ctx, currentUserIDMust(ctx), campaignID)
}

func (s *Server) insertCampaignNpcLocationLink(ctx context.Context, campaignID string, req npcLocationLinkRequest) (models.CampaignNpcLocationLink, error) {
	return s.stores.Travel.CreateNpcLocationLink(ctx, currentUserIDMust(ctx), campaignID, store.NpcLocationLinkInput{
		CreatureID: req.CreatureID,
		LocationID: req.LocationID,
		LinkType:   req.LinkType,
		Visibility: req.Visibility,
		Notes:      req.Notes,
	})
}
