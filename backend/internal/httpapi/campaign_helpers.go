package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"errors"
	"strings"
)

func (s *Server) campaignByID(ctx context.Context, campaignID string) (models.Campaign, error) {
	userID, ok := currentUserID(ctx)
	if !ok {
		return models.Campaign{}, errors.New("authentication required")
	}
	var campaign models.Campaign
	err := s.db.QueryRow(ctx, `
		select id, name, description, allowed_standard_sources, created_at, updated_at
		from campaigns
		where id = $1 and owner_user_id = $2 and archived_at is null
	`, campaignID, userID).Scan(
		&campaign.ID,
		&campaign.Name,
		&campaign.Description,
		&campaign.AllowedStandardSources,
		&campaign.CreatedAt,
		&campaign.UpdatedAt,
	)
	return campaign, err
}

func scanCampaign(row scanner, campaign *models.Campaign) error {
	return row.Scan(
		&campaign.ID,
		&campaign.Name,
		&campaign.Description,
		&campaign.AllowedStandardSources,
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
}

type encounterRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Location    string `json:"location"`
	RoomNumber  string `json:"roomNumber"`
}

type campaignCreatureRequest struct {
	CreatureID  string `json:"creatureId"`
	Disposition string `json:"disposition"`
}
