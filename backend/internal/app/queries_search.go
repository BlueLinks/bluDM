package app

import (
	"context"
	"strings"
	"time"

	"bludm/backend/internal/models"
)

type CampaignSearchResult struct {
	EntityType string    `json:"entityType"`
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Excerpt    string    `json:"excerpt"`
	Path       string    `json:"path,omitempty"`
	UpdatedAt  time.Time `json:"updatedAt"`
	AppURL     string    `json:"appUrl"`
}

type PrepGap struct {
	Kind       string `json:"kind"`
	EntityType string `json:"entityType"`
	EntityID   string `json:"entityId"`
	Name       string `json:"name"`
	Message    string `json:"message"`
	AppURL     string `json:"appUrl"`
}

func (s *Service) SearchCampaignContent(
	ctx context.Context,
	campaignID string,
	query string,
) ([]CampaignSearchResult, error) {
	return s.SearchCampaignContentWithTypes(ctx, campaignID, query, nil)
}

func (s *Service) SearchCampaignContentWithTypes(
	ctx context.Context,
	campaignID string,
	query string,
	entityTypes []string,
) ([]CampaignSearchResult, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeCampaignsRead)
	if err != nil {
		return nil, err
	}
	query = strings.ToLower(strings.TrimSpace(query))
	allowedTypes, err := normalizedEntityTypes(entityTypes)
	if err != nil {
		return nil, err
	}
	if err := requireExplicitSearchScopes(principal, campaignID, allowedTypes); err != nil {
		return nil, err
	}
	results := []CampaignSearchResult{}
	campaign, err := s.stores.Campaigns.ByID(ctx, principal.UserID, campaignID)
	if err != nil {
		return nil, err
	}
	if entityTypeAllowed(allowedTypes, "note") &&
		strings.Contains(strings.ToLower(campaign.Name+" "+campaign.Description), query) &&
		strings.TrimSpace(campaign.Description) != "" {
		results = append(results, CampaignSearchResult{
			EntityType: "note", ID: campaign.ID, Name: campaign.Name + " campaign brief",
			Excerpt: campaign.Description, UpdatedAt: campaign.UpdatedAt,
			AppURL: s.AppURL("/campaigns/" + campaignID),
		})
	}
	if principal.HasScope(ScopeWorldRead) {
		locations, err := s.stores.Travel.LocationsForCampaign(ctx, principal.UserID, campaignID)
		if err != nil {
			return nil, err
		}
		for _, location := range locations {
			haystack := strings.ToLower(strings.Join(
				[]string{location.Name, location.Summary, location.Notes, location.PublicNotes, location.DMNotes},
				" ",
			))
			if entityTypeAllowed(allowedTypes, "location") && strings.Contains(haystack, query) {
				results = append(results, CampaignSearchResult{
					EntityType: "location", ID: location.ID, Name: location.Name,
					Excerpt: excerpt(location.Summary, location.Notes),
					Path:    locationPath(location.Path), UpdatedAt: location.UpdatedAt,
					AppURL: s.AppURL("/campaigns/" + campaignID + "/world/location/" + location.ID),
				})
			}
		}
		journeys, err := s.stores.Travel.JourneysForCampaign(ctx, principal.UserID, campaignID)
		if err != nil {
			return nil, err
		}
		for _, journey := range journeys {
			if entityTypeAllowed(allowedTypes, "journey") && strings.Contains(strings.ToLower(
				journey.Name+" "+journey.Origin+" "+journey.Destination,
			), query) {
				results = append(results, CampaignSearchResult{
					EntityType: "journey", ID: journey.ID, Name: journey.Name,
					Excerpt:   journey.Origin + " → " + journey.Destination,
					UpdatedAt: journey.UpdatedAt,
					AppURL:    s.AppURL("/campaigns/" + campaignID + "/world"),
				})
			}
		}
		tables, err := s.stores.RollTables.ListForCampaign(ctx, principal.UserID, campaignID)
		if err != nil {
			return nil, err
		}
		for _, table := range tables {
			if entityTypeAllowed(allowedTypes, "roll_table") && strings.Contains(strings.ToLower(
				table.Name+" "+table.Description+" "+table.Category+" "+strings.Join(table.Tags, " "),
			), query) {
				results = append(results, CampaignSearchResult{
					EntityType: "roll_table", ID: table.ID, Name: table.Name,
					Excerpt: table.Description, UpdatedAt: table.UpdatedAt,
					AppURL: s.AppURL("/campaigns/" + campaignID + "/world"),
				})
			}
		}
	}
	if principal.HasScope(ScopeEncountersRead) {
		encounters, err := s.stores.Campaigns.Encounters(ctx, principal.UserID, campaignID)
		if err != nil {
			return nil, err
		}
		for _, encounter := range encounters {
			if entityTypeAllowed(allowedTypes, "encounter") && strings.Contains(strings.ToLower(
				encounter.Name+" "+encounter.Description+" "+encounter.Location,
			), query) {
				results = append(results, CampaignSearchResult{
					EntityType: "encounter", ID: encounter.ID, Name: encounter.Name,
					Excerpt: excerpt(encounter.Description, encounter.Location),
					Path:    encounter.Location, UpdatedAt: encounter.UpdatedAt,
					AppURL: s.AppURL("/campaigns/" + campaignID + "/encounters/" + encounter.ID),
				})
			}
		}
	}
	if principal.HasScope(ScopeLibraryRead) {
		creatures, err := s.stores.Campaigns.Creatures(ctx, principal.UserID, campaignID)
		if err != nil {
			return nil, err
		}
		for _, creature := range creatures {
			if entityTypeAllowed(allowedTypes, "npc") && strings.Contains(strings.ToLower(
				creature.Name+" "+creature.Description+" "+creature.CreatureType,
			), query) {
				results = append(results, CampaignSearchResult{
					EntityType: "npc", ID: creature.ID, Name: creature.Name,
					Excerpt:   excerpt(creature.Description, creature.CreatureType),
					UpdatedAt: creature.UpdatedAt, AppURL: s.AppURL("/creatures/" + creature.ID),
				})
			}
		}
	}
	return results, nil
}

func normalizedEntityTypes(values []string) (map[string]bool, error) {
	if len(values) == 0 {
		return nil, nil
	}
	allowed := map[string]bool{}
	for _, value := range values {
		value = strings.ToLower(strings.TrimSpace(value))
		value = strings.ReplaceAll(value, "-", "_")
		if value == "rolltable" {
			value = "roll_table"
		}
		switch value {
		case "location", "npc", "encounter", "note", "journey", "roll_table":
			allowed[value] = true
		default:
			return nil, ValidationError(
				"invalid_entity_type", "unsupported campaign search entity type",
				map[string]any{"entityType": value},
			)
		}
	}
	return allowed, nil
}

func entityTypeAllowed(allowed map[string]bool, entityType string) bool {
	return len(allowed) == 0 || allowed[entityType]
}

func requireExplicitSearchScopes(
	principal Principal,
	campaignID string,
	entityTypes map[string]bool,
) error {
	if len(entityTypes) == 0 {
		return nil
	}
	if (entityTypes["location"] || entityTypes["journey"] || entityTypes["roll_table"]) &&
		!principal.HasScope(ScopeWorldRead) {
		return Require(principal, campaignID, ScopeWorldRead)
	}
	if entityTypes["encounter"] && !principal.HasScope(ScopeEncountersRead) {
		return Require(principal, campaignID, ScopeEncountersRead)
	}
	if entityTypes["npc"] && !principal.HasScope(ScopeLibraryRead) {
		return Require(principal, campaignID, ScopeLibraryRead)
	}
	return nil
}

func (s *Service) PrepGaps(ctx context.Context, campaignID string) ([]PrepGap, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeCampaignsRead, ScopeWorldRead)
	if err != nil {
		return nil, err
	}
	locations, err := s.stores.Travel.LocationsForCampaign(ctx, principal.UserID, campaignID)
	if err != nil {
		return nil, err
	}
	encounters, err := s.stores.Campaigns.Encounters(ctx, principal.UserID, campaignID)
	if err != nil {
		return nil, err
	}
	links, err := s.stores.Travel.LocationLinksForCampaign(ctx, principal.UserID, campaignID)
	if err != nil {
		return nil, err
	}
	gaps := []PrepGap{}
	for _, location := range locations {
		url := s.AppURL("/campaigns/" + campaignID + "/world/location/" + location.ID)
		if strings.TrimSpace(location.Summary+location.Notes+location.DMNotes) == "" {
			gaps = append(gaps, PrepGap{
				Kind: "missing_notes", EntityType: "location", EntityID: location.ID,
				Name: location.Name, Message: "Add a scene summary, notes, or secrets.", AppURL: url,
			})
		}
		if isEncounterLocation(location.LocationType) &&
			!hasEncounterAt(encounters, location.ID) {
			gaps = append(gaps, PrepGap{
				Kind: "missing_encounter", EntityType: "location", EntityID: location.ID,
				Name: location.Name, Message: "No prepared encounter is linked to this location.", AppURL: url,
			})
		}
		if isEncounterLocation(location.LocationType) && !hasLocationLink(links, location.ID) {
			gaps = append(gaps, PrepGap{
				Kind: "missing_route", EntityType: "location", EntityID: location.ID,
				Name: location.Name, Message: "No route, exit, or relationship is recorded.", AppURL: url,
			})
		}
	}
	return gaps, nil
}

func excerpt(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		runes := []rune(value)
		if len(runes) > 180 {
			return string(runes[:180]) + "…"
		}
		return value
	}
	return ""
}

func locationPath(path []models.CampaignLocationPathSegment) string {
	parts := []string{}
	for _, segment := range path {
		parts = append(parts, segment.Name)
	}
	return strings.Join(parts, " / ")
}

func isEncounterLocation(value string) bool {
	switch strings.ToLower(value) {
	case "dungeon", "floor", "room":
		return true
	default:
		return false
	}
}

func hasEncounterAt(encounters []models.Encounter, locationID string) bool {
	for _, encounter := range encounters {
		if encounter.LocationID != nil && *encounter.LocationID == locationID {
			return true
		}
	}
	return false
}

func hasLocationLink(links []models.CampaignLocationLink, locationID string) bool {
	for _, link := range links {
		if link.SourceLocationID == locationID || link.TargetLocationID == locationID {
			return true
		}
	}
	return false
}
