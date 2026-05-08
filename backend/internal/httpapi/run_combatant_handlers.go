package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"encoding/json"
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
	var nextOrder int
	if err := s.db.QueryRow(r.Context(), `select coalesce(max(sort_order) + 1, 0) from encounter_run_combatants where encounter_run_id = $1`, runID).Scan(&nextOrder); err != nil {
		writeError(w, http.StatusInternalServerError, "could not add combatants")
		return
	}
	created := []models.EncounterRunCombatant{}
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
		snapshotBytes, err := json.Marshal(map[string]any{
			"creature":           creature,
			"standardCreatureId": req.StandardCreatureID,
			"addedMidFight":      true,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not add combatants")
			return
		}
		row := s.db.QueryRow(r.Context(), `
			insert into encounter_run_combatants (
				encounter_run_id, source_type, creature_id, side, display_name, color_label, avatar_url,
				armor_class, max_hit_points, current_hit_points, initiative, initiative_set, sort_order, snapshot
			)
			values ($1, 'creature', nullif($2, '')::uuid, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11, $12)
			returning id, encounter_run_id, coalesce(source_combatant_id::text, ''), source_type,
				coalesce(player_id::text, ''), coalesce(creature_id::text, ''), side, display_name,
				color_label, avatar_url, armor_class, max_hit_points, current_hit_points,
				temporary_hit_points, max_hit_points_modifier, armor_class_bonus, armor_class_override,
				max_hit_points_override, current_hit_points_override, coalesce(initiative, 0), initiative_set,
				sort_order, defeated, conditions, damage_dealt, damage_taken, healing_done,
				healing_received, kills, death_save_successes, death_save_failures, stable, snapshot
		`, runID, nullableUserCreatureID(creature.ID, isStandard), side, name, strings.TrimSpace(req.ColorLabel), avatarURL,
			creature.ArmorClass, maxHP, req.Initiative, req.InitiativeSet, nextOrder+index, snapshotBytes)
		combatant, err := scanEncounterRunCombatant(row)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not add combatants")
			return
		}
		created = append(created, combatant)
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
