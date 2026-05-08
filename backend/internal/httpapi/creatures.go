package httpapi

import (
	"bludm/backend/internal/models"
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

	creatures := []models.Creature{}
	if includeUser {
		rows, err := s.db.Query(r.Context(), `
			select id, name, description, size, creature_type, alignment, armor_class, hit_points,
				hit_dice, challenge_rating, xp, coalesce(image_asset_id::text, ''), avatar_url, stat_block, created_at, updated_at
			from creatures
			where owner_user_id = $2 and ($1 = '' or name ilike '%' || $1 || '%' or creature_type ilike '%' || $1 || '%')
			order by updated_at desc
			limit 100
		`, q, user.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list creatures")
			return
		}
		defer rows.Close()
		for rows.Next() {
			creature, err := scanCreature(rows)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "could not read creatures")
				return
			}
			creatures = append(creatures, creature)
		}
		if rows.Err() != nil {
			writeError(w, http.StatusInternalServerError, "could not read creatures")
			return
		}
	}
	if includeStandard {
		rows, err := s.db.Query(r.Context(), `
			select id, name, description, size, creature_type, alignment, armor_class, hit_points,
				hit_dice, challenge_rating, xp, avatar_url, source_label, stat_block, created_at, updated_at
			from standard_creatures
			where $1 = '' or name ilike '%' || $1 || '%' or creature_type ilike '%' || $1 || '%'
			order by name asc
			limit 500
		`, q)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list standard creatures")
			return
		}
		defer rows.Close()
		for rows.Next() {
			creature, err := scanStandardCreature(rows)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "could not read standard creatures")
				return
			}
			creatures = append(creatures, creature)
		}
		if rows.Err() != nil {
			writeError(w, http.StatusInternalServerError, "could not read standard creatures")
			return
		}
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

	statBlock, err := marshalJSONMap(req.StatBlock)
	if err != nil {
		writeError(w, http.StatusBadRequest, "statBlock must be a JSON object")
		return
	}

	row := s.db.QueryRow(r.Context(), `
		insert into creatures (
			owner_user_id, name, description, size, creature_type, alignment, armor_class, hit_points,
			hit_dice, challenge_rating, xp, image_asset_id, avatar_url, stat_block
		)
		values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, nullif($12, '')::uuid, $13, $14)
		returning id, name, description, size, creature_type, alignment, armor_class, hit_points,
			hit_dice, challenge_rating, xp, coalesce(image_asset_id::text, ''), avatar_url, stat_block, created_at, updated_at
	`, user.ID, req.Name, req.Description, req.Size, req.CreatureType, req.Alignment, req.ArmorClass, req.HitPoints,
		req.HitDice, req.ChallengeRating, req.XP, req.ImageAssetID, req.AvatarURL, statBlock)

	creature, err := scanCreature(row)
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
	statBlock, err := marshalJSONMap(req.StatBlock)
	if err != nil {
		writeError(w, http.StatusBadRequest, "statBlock must be a JSON object")
		return
	}
	row := s.db.QueryRow(r.Context(), `
		update creatures
		set name = $2, description = $3, size = $4, creature_type = $5, alignment = $6,
			armor_class = $7, hit_points = $8, hit_dice = $9, challenge_rating = $10,
			xp = $11, image_asset_id = nullif($12, '')::uuid, avatar_url = $13, stat_block = $14
		where id = $1
		returning id, name, description, size, creature_type, alignment, armor_class, hit_points,
			hit_dice, challenge_rating, xp, coalesce(image_asset_id::text, ''), avatar_url, stat_block, created_at, updated_at
	`, creatureID, req.Name, req.Description, req.Size, req.CreatureType, req.Alignment,
		req.ArmorClass, req.HitPoints, req.HitDice, req.ChallengeRating, req.XP, req.ImageAssetID, req.AvatarURL, statBlock)
	creature, err := scanCreature(row)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not update creature")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"creature": creature})
}

func (s *Server) deleteCreature(w http.ResponseWriter, r *http.Request) {
	creatureID := strings.TrimSpace(r.PathValue("creatureID"))
	user, _ := s.currentUser(r)
	tag, err := s.db.Exec(r.Context(), `delete from creatures where id = $1 and owner_user_id = $2`, creatureID, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not delete creature")
		return
	}
	if tag.RowsAffected() == 0 {
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
	var exists bool
	err := s.db.QueryRow(ctx, `select exists(select 1 from creatures where id = $1 and owner_user_id = $2)`, creatureID, userID).Scan(&exists)
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
	row := s.db.QueryRow(ctx, `
		select id, name, description, size, creature_type, alignment, armor_class, hit_points,
			hit_dice, challenge_rating, xp, coalesce(image_asset_id::text, ''), avatar_url, stat_block, created_at, updated_at
		from creatures
		where id = $1 and owner_user_id = $2
	`, creatureID, userID)
	return scanCreature(row)
}

func (s *Server) standardCreatureByID(ctx context.Context, creatureID string) (models.Creature, error) {
	row := s.db.QueryRow(ctx, `
		select id, name, description, size, creature_type, alignment, armor_class, hit_points,
			hit_dice, challenge_rating, xp, avatar_url, source_label, stat_block, created_at, updated_at
		from standard_creatures
		where id = $1
	`, strings.TrimSpace(creatureID))
	return scanStandardCreature(row)
}
