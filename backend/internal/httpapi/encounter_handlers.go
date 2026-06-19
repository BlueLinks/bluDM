package httpapi

import (
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
	"context"
	"net/http"
	"strconv"
	"strings"
)

func (s *Server) getEncounter(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	encounterID := strings.TrimSpace(r.PathValue("encounterID"))
	encounter, err := s.stores.Encounters.ByID(r.Context(), user.ID, encounterID)
	if err != nil {
		writeError(w, http.StatusNotFound, "encounter not found")
		return
	}
	combatants, err := s.stores.Encounters.Combatants(r.Context(), user.ID, encounterID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load encounter combatants")
		return
	}
	encounter.Combatants = combatants
	writeJSON(w, http.StatusOK, map[string]any{"encounter": encounter})
}

func (s *Server) updateEncounter(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	encounterID := strings.TrimSpace(r.PathValue("encounterID"))
	if _, err := s.stores.Encounters.ByID(r.Context(), user.ID, encounterID); err != nil {
		writeError(w, http.StatusNotFound, "encounter not found")
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
	encounter, err := s.stores.Encounters.Update(r.Context(), user.ID, encounterID, store.EncounterInput{
		Name:        req.Name,
		Description: req.Description,
		Status:      req.Status,
		Location:    req.Location,
		LocationID:  req.LocationID,
		RoomNumber:  req.RoomNumber,
	})
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "encounter or campaign location not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update encounter")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"encounter": encounter})
}

func (s *Server) deleteEncounter(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	encounterID := strings.TrimSpace(r.PathValue("encounterID"))
	err := s.stores.Encounters.Delete(r.Context(), user.ID, encounterID)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "encounter not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete encounter")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) cloneEncounter(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	encounterID := strings.TrimSpace(r.PathValue("encounterID"))
	clone, err := s.stores.Encounters.Clone(r.Context(), user.ID, encounterID)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "encounter not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not clone encounter")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"encounter": clone})
}

func (s *Server) createEncounterCombatants(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	encounterID := strings.TrimSpace(r.PathValue("encounterID"))
	if _, err := s.stores.Encounters.ByID(r.Context(), user.ID, encounterID); err != nil {
		writeError(w, http.StatusNotFound, "encounter not found")
		return
	}
	var req addCombatantRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Quantity < 1 {
		req.Quantity = 1
	}
	side := normalizeSide(req.Side)
	created := []models.EncounterCombatant{}
	for i := 0; i < req.Quantity; i++ {
		itemReq := req
		if req.Quantity > 1 && strings.TrimSpace(itemReq.DisplayName) == "" {
			itemReq.DisplayName = encounterCombatantDisplayName(r.Context(), s, req, i)
		}
		combatant, err := s.createCombatantFromRequest(r.Context(), encounterID, side, itemReq)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		created = append(created, combatant)
	}
	writeJSON(w, http.StatusCreated, map[string]any{"combatants": created})
}

func encounterCombatantDisplayName(ctx context.Context, s *Server, req addCombatantRequest, index int) string {
	if strings.TrimSpace(req.SourceType) == "player" {
		player, err := s.playerByID(ctx, strings.TrimSpace(req.PlayerID))
		if err == nil {
			return player.CharacterName
		}
	}
	creature, _, err := s.creatureFromCombatantRequest(ctx, req)
	if err != nil {
		return strings.TrimSpace(req.DisplayName)
	}
	return creature.Name + " (" + strconv.Itoa(index+1) + ")"
}

func (s *Server) addAllPlayersToEncounter(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	encounterID := strings.TrimSpace(r.PathValue("encounterID"))
	encounter, err := s.stores.Encounters.ByID(r.Context(), user.ID, encounterID)
	if err != nil {
		writeError(w, http.StatusNotFound, "encounter not found")
		return
	}
	players, err := s.playersForCampaign(r.Context(), encounter.CampaignID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load players")
		return
	}
	existingPlayerIDs, err := s.stores.Encounters.ExistingPlayerIDs(r.Context(), user.ID, encounterID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load encounter players")
		return
	}
	created := []models.EncounterCombatant{}
	for _, player := range players {
		if existingPlayerIDs[player.ID] {
			continue
		}
		req := addCombatantRequest{SourceType: "player", PlayerID: player.ID, Side: "player"}
		combatant, err := s.createCombatantFromRequest(r.Context(), encounterID, "player", req)
		if err == nil {
			created = append(created, combatant)
		}
	}
	writeJSON(w, http.StatusCreated, map[string]any{"combatants": created})
}

func (s *Server) updateEncounterCombatant(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	combatantID := strings.TrimSpace(r.PathValue("combatantID"))
	var req updateCombatantRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Side = normalizeSide(req.Side)
	req.DisplayName = strings.TrimSpace(req.DisplayName)
	if req.DisplayName == "" {
		writeError(w, http.StatusBadRequest, "displayName is required")
		return
	}
	combatant, err := s.stores.Encounters.UpdateCombatant(r.Context(), user.ID, combatantID, store.EncounterCombatantInput{
		Side:             req.Side,
		DisplayName:      req.DisplayName,
		ColorLabel:       strings.TrimSpace(req.ColorLabel),
		AvatarURL:        strings.TrimSpace(req.AvatarURL),
		ArmorClass:       req.ArmorClass,
		MaxHitPoints:     req.MaxHitPoints,
		CurrentHitPoints: req.CurrentHitPoints,
	})
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "combatant not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update combatant")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"combatant": combatant})
}

func (s *Server) deleteEncounterCombatant(w http.ResponseWriter, r *http.Request) {
	user, _ := s.currentUser(r)
	combatantID := strings.TrimSpace(r.PathValue("combatantID"))
	err := s.stores.Encounters.DeleteCombatant(r.Context(), user.ID, combatantID)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "combatant not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete combatant")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) startEncounter(w http.ResponseWriter, r *http.Request) {
	encounterID := strings.TrimSpace(r.PathValue("encounterID"))
	var req startEncounterRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	user, _ := s.currentUser(r)
	if _, err := s.stores.Encounters.ByID(r.Context(), user.ID, encounterID); err != nil {
		writeError(w, http.StatusNotFound, "encounter not found")
		return
	}
	run, err := s.stores.Runs.StartEncounter(r.Context(), user.ID, encounterID, req.Test)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not start encounter")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"run": run})
}
