package httpapi

import (
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
	"context"
	"errors"
	"net/http"
	"strings"
)

func (s *Server) listCreatures(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	includeUser := queryBool(r, "includeUser", true)
	includeStandard := queryBool(r, "includeStandard", false)
	sources := querySources(r)

	creatures, err := s.stores.Creatures.List(r.Context(), user.ID, q, includeUser, includeStandard, sources)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list creatures")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"creatures": creatures})
}

func queryBool(r *http.Request, key string, fallback bool) bool {
	value := strings.TrimSpace(strings.ToLower(r.URL.Query().Get(key)))
	if value == "" {
		return fallback
	}
	return value == "1" || value == "true" || value == "yes"
}

func (s *Server) createCreature(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	var req creatureRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := req.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := s.validateOwnedAsset(r.Context(), req.ImageAssetID); err != nil {
		writeError(w, http.StatusNotFound, "image asset not found")
		return
	}

	creature, err := s.stores.Creatures.Create(r.Context(), user.ID, creatureInputFromRequest(req))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create creature")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"creature": creature})
}

func (s *Server) getCreature(w http.ResponseWriter, r *http.Request) {
	creatureID := strings.TrimSpace(r.PathValue("creatureID"))
	creature, err := s.creatureByID(r.Context(), creatureID)
	if err != nil {
		writeError(w, http.StatusNotFound, "creature not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"creature": creature})
}

func (s *Server) updateCreature(w http.ResponseWriter, r *http.Request) {
	creatureID := strings.TrimSpace(r.PathValue("creatureID"))
	if _, err := s.creatureExists(r.Context(), creatureID); err != nil {
		writeError(w, http.StatusNotFound, "creature not found")
		return
	}
	var req creatureRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.normalize()
	if err := req.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := s.validateOwnedAsset(r.Context(), req.ImageAssetID); err != nil {
		writeError(w, http.StatusNotFound, "image asset not found")
		return
	}
	creature, err := s.stores.Creatures.Update(r.Context(), currentUserIDMust(r.Context()), creatureID, creatureInputFromRequest(req))
	if err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "creature not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not update creature")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"creature": creature})
}

func (s *Server) deleteCreature(w http.ResponseWriter, r *http.Request) {
	creatureID := strings.TrimSpace(r.PathValue("creatureID"))
	user, _ := s.currentUser(r)
	if err := s.stores.Creatures.Delete(r.Context(), user.ID, creatureID); err != nil {
		if !store.IsNotFound(err) {
			writeError(w, http.StatusInternalServerError, "could not delete creature")
			return
		}
		writeError(w, http.StatusNotFound, "creature not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) getCreatureCampaigns(w http.ResponseWriter, r *http.Request) {
	creatureID := strings.TrimSpace(r.PathValue("creatureID"))
	if _, err := s.creatureExists(r.Context(), creatureID); err != nil {
		writeError(w, http.StatusNotFound, "creature not found")
		return
	}
	campaigns, err := s.campaignsForCreature(r.Context(), creatureID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load linked campaigns")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"campaigns": campaigns})
}

func (s *Server) creatureExists(ctx context.Context, creatureID string) (bool, error) {
	userID, ok := currentUserID(ctx)
	if !ok {
		return false, errors.New("authentication required")
	}
	exists, err := s.stores.Creatures.Exists(ctx, userID, creatureID)
	if err != nil {
		return false, err
	}
	if !exists {
		return false, errors.New("creature not found")
	}
	return true, nil
}

func (s *Server) creatureByID(ctx context.Context, creatureID string) (models.Creature, error) {
	userID, ok := currentUserID(ctx)
	if !ok {
		return models.Creature{}, errors.New("authentication required")
	}
	return s.stores.Creatures.ByID(ctx, userID, creatureID)
}

func (s *Server) standardCreatureByID(ctx context.Context, creatureID string) (models.Creature, error) {
	return s.stores.Creatures.StandardByID(ctx, creatureID)
}

func creatureInputFromRequest(req creatureRequest) store.CreatureInput {
	return store.CreatureInput{
		Name:            req.Name,
		Description:     req.Description,
		Size:            req.Size,
		CreatureType:    req.CreatureType,
		Alignment:       req.Alignment,
		ArmorClass:      req.ArmorClass,
		HitPoints:       req.HitPoints,
		HitDice:         req.HitDice,
		ChallengeRating: req.ChallengeRating,
		XP:              req.XP,
		ImageAssetID:    req.ImageAssetID,
		AvatarURL:       req.AvatarURL,
		StatBlock:       req.StatBlock,
	}
}
