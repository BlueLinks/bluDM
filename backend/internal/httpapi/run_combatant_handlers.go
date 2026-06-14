package httpapi

import (
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
	"context"
	"net/http"
	"strconv"
	"strings"
)

func (s *Server) addRunCombatants(w http.ResponseWriter, r *http.Request) {
	runID := strings.TrimSpace(r.PathValue("runID"))
	if _, err := s.encounterRunByID(r.Context(), runID); err != nil {
		writeError(w, http.StatusNotFound, "encounter run not found")
		return
	}
	var req addRunCombatantRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.CreatureID = strings.TrimSpace(req.CreatureID)
	req.StandardCreatureID = strings.TrimSpace(req.StandardCreatureID)
	if req.CreatureID == "" && req.StandardCreatureID == "" {
		writeError(w, http.StatusBadRequest, "creatureId is required")
		return
	}
	if req.Quantity < 1 {
		req.Quantity = 1
	}
	side := normalizeSide(req.Side)
	if side == "player" {
		side = "friendly"
	}
	creature, isStandard, err := s.runAddCreatureByRequest(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusNotFound, "creature not found")
		return
	}
	inputs := []store.RunCombatantInput{}
	for index := 0; index < req.Quantity; index++ {
		maxHP := creature.HitPoints
		if req.RolledHP {
			maxHP = rollHitDice(creature.HitDice, creature.HitPoints)
		}
		name := strings.TrimSpace(req.DisplayName)
		if name == "" {
			name = creature.Name
			if req.Quantity > 1 {
				name += " (" + strconv.Itoa(index+1) + ")"
			}
		}
		avatarURL := strings.TrimSpace(req.AvatarURL)
		if avatarURL == "" {
			avatarURL = assetOrExternalURL(creature.ImageAssetID, creature.AvatarURL)
		}
		inputs = append(inputs, store.RunCombatantInput{
			SourceType:       "creature",
			CreatureID:       nullableUserCreatureID(creature.ID, isStandard),
			Side:             side,
			DisplayName:      name,
			ColorLabel:       strings.TrimSpace(req.ColorLabel),
			AvatarURL:        avatarURL,
			ArmorClass:       creature.ArmorClass,
			MaxHitPoints:     maxHP,
			CurrentHitPoints: maxHP,
			Initiative:       req.Initiative,
			InitiativeSet:    req.InitiativeSet,
			Snapshot: map[string]any{
				"creature":           creature,
				"standardCreatureId": req.StandardCreatureID,
				"addedMidFight":      true,
			},
		})
	}
	created, err := s.stores.Runs.AddCombatants(r.Context(), runID, inputs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not add combatants")
		return
	}
	_ = s.appendCombatLogEvent(r.Context(), runID, "combatants_added", "", "", map[string]any{"combatants": created})
	run, _ := s.encounterRunByID(r.Context(), runID)
	writeJSON(w, http.StatusCreated, map[string]any{"combatants": created, "run": run})
}

func (s *Server) runAddCreatureByRequest(ctx context.Context, req addRunCombatantRequest) (models.Creature, bool, error) {
	if strings.TrimSpace(req.StandardCreatureID) != "" {
		creature, err := s.standardCreatureByID(ctx, req.StandardCreatureID)
		return creature, true, err
	}
	creature, err := s.creatureByID(ctx, req.CreatureID)
	return creature, false, err
}

func nullableUserCreatureID(creatureID string, isStandard bool) string {
	if isStandard {
		return ""
	}
	return creatureID
}
