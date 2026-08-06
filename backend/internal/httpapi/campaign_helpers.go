package httpapi

import (
	"context"
	"errors"
	"strings"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/models"
)

func (s *Server) campaignByID(ctx context.Context, campaignID string) (models.Campaign, error) {
	userID, ok := currentUserID(ctx)
	if !ok {
		return models.Campaign{}, errors.New("authentication required")
	}
	return s.stores.Campaigns.ByID(ctx, userID, campaignID)
}

func scanCampaign(row scanner, campaign *models.Campaign) error {
	return row.Scan(
		&campaign.ID,
		&campaign.Name,
		&campaign.Description,
		&campaign.AllowedStandardSources,
		&campaign.EncounterRuleset,
		&campaign.CreatedAt,
		&campaign.UpdatedAt,
	)
}

func normalizeEncounterStatus(status string) string {
	status = strings.TrimSpace(strings.ToLower(status))
	switch status {
	case "completed", "skipped":
		return status
	default:
		return "planned"
	}
}

func normalizeStandardSources(sources []string) []string {
	allowed := map[string]bool{"srd-2014": true, "srd-5-2-1": true}
	seen := map[string]bool{}
	normalized := []string{}
	for _, source := range sources {
		source = strings.TrimSpace(strings.ToLower(source))
		if !allowed[source] || seen[source] {
			continue
		}
		seen[source] = true
		normalized = append(normalized, source)
	}
	if len(normalized) == 0 {
		return []string{"srd-2014"}
	}
	return normalized
}

type campaignRequest struct {
	Name                   string   `json:"name"`
	Description            string   `json:"description"`
	AllowedStandardSources []string `json:"allowedStandardSources"`
	EncounterRuleset       string   `json:"encounterRuleset"`
}

type encounterRequest struct {
	IdempotencyKey     string                                `json:"idempotencyKey"`
	PreviewFingerprint string                                `json:"previewFingerprint"`
	Name               string                                `json:"name"`
	Description        string                                `json:"description"`
	Status             string                                `json:"status"`
	Location           string                                `json:"location"`
	LocationID         string                                `json:"locationId"`
	RoomNumber         string                                `json:"roomNumber"`
	Combatants         []appdomain.EncounterCombatantCommand `json:"combatants"`
}

type campaignCreatureRequest struct {
	CreatureID  string `json:"creatureId"`
	Disposition string `json:"disposition"`
}
