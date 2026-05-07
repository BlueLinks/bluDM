package httpapi

import (
	"bludm/backend/internal/models"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
)

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	defer r.Body.Close()
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func withJSON(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		next.ServeHTTP(w, r)
	})
}

func withRecover(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				logger.Error("panic recovered", "panic", recovered)
				writeError(w, http.StatusInternalServerError, "internal server error")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

type scanner interface {
	Scan(dest ...any) error
}

func scanCreature(row scanner) (models.Creature, error) {
	var creature models.Creature
	var statBlockBytes []byte
	err := row.Scan(
		&creature.ID,
		&creature.Name,
		&creature.Description,
		&creature.Size,
		&creature.CreatureType,
		&creature.Alignment,
		&creature.ArmorClass,
		&creature.HitPoints,
		&creature.HitDice,
		&creature.ChallengeRating,
		&creature.XP,
		&creature.ImageAssetID,
		&creature.AvatarURL,
		&statBlockBytes,
		&creature.CreatedAt,
		&creature.UpdatedAt,
	)
	if err != nil {
		return models.Creature{}, err
	}
	creature.StatBlock, err = unmarshalJSONMap(statBlockBytes)
	if err != nil {
		return models.Creature{}, err
	}
	return creature, nil
}

func scanPlayer(row scanner) (models.Player, error) {
	var player models.Player
	var characterSheetBytes []byte
	err := row.Scan(
		&player.ID,
		&player.CampaignID,
		&player.CampaignName,
		&player.CharacterName,
		&player.PlayerName,
		&player.AvatarAssetID,
		&player.AvatarURL,
		&player.ArmorClass,
		&player.MaxHitPoints,
		&player.CurrentHitPoints,
		&player.TemporaryHitPoints,
		&player.TemporaryMaxHitPoints,
		&player.ExperiencePoints,
		&characterSheetBytes,
		&player.CreatedAt,
		&player.UpdatedAt,
	)
	if err != nil {
		return models.Player{}, err
	}
	player.CharacterSheet, err = unmarshalJSONMap(characterSheetBytes)
	if err != nil {
		return models.Player{}, err
	}
	return player, nil
}

func marshalJSONMap(value map[string]any) ([]byte, error) {
	if value == nil {
		value = map[string]any{}
	}
	return json.Marshal(value)
}

func unmarshalJSONMap(value []byte) (map[string]any, error) {
	if len(value) == 0 {
		return map[string]any{}, nil
	}
	target := map[string]any{}
	if err := json.Unmarshal(value, &target); err != nil {
		return nil, err
	}
	return target, nil
}

func assetOrExternalURL(assetID, externalURL string) string {
	if strings.TrimSpace(assetID) != "" {
		return "/api/assets/" + strings.TrimSpace(assetID)
	}
	return strings.TrimSpace(externalURL)
}
