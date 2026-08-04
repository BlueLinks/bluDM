package app

import (
	"context"
	"strings"

	"bludm/backend/internal/models"
)

type LocationContext struct {
	Location   models.CampaignLocation          `json:"location"`
	Children   []models.CampaignLocation        `json:"children"`
	Links      []models.CampaignLocationLink    `json:"links"`
	NPCs       []models.CampaignNpcLocationLink `json:"npcs"`
	Encounters []models.Encounter               `json:"encounters"`
	Maps       []models.CampaignMap             `json:"maps"`
	Stock      []models.CampaignLocationStock   `json:"stock"`
	AppURL     string                           `json:"appUrl"`
}

type WorldGraph struct {
	Locations []LocationSummary             `json:"locations"`
	Links     []models.CampaignLocationLink `json:"links"`
	AppURL    string                        `json:"appUrl"`
}

type LocationSummary struct {
	models.CampaignLocation
	AppURL string `json:"appUrl"`
}

type LocationFilters struct {
	Query            string  `json:"query,omitempty"`
	LocationType     string  `json:"locationType,omitempty"`
	ParentLocationID *string `json:"parentLocationId,omitempty"`
	Status           string  `json:"status,omitempty"`
}

func (s *Service) ListLocations(
	ctx context.Context,
	campaignID string,
) ([]LocationSummary, error) {
	return s.ListLocationsWithFilters(ctx, campaignID, LocationFilters{})
}

func (s *Service) ListLocationsWithFilters(
	ctx context.Context,
	campaignID string,
	filters LocationFilters,
) ([]LocationSummary, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeWorldRead)
	if err != nil {
		return nil, err
	}
	values, err := s.stores.Travel.LocationsForCampaign(ctx, principal.UserID, campaignID)
	if err != nil {
		return nil, err
	}
	query := strings.ToLower(strings.TrimSpace(filters.Query))
	result := make([]LocationSummary, 0, len(values))
	for _, value := range values {
		if filters.LocationType != "" && !strings.EqualFold(value.LocationType, filters.LocationType) {
			continue
		}
		if filters.Status != "" && !strings.EqualFold(value.Status, filters.Status) {
			continue
		}
		if filters.ParentLocationID != nil && value.ParentLocationID != strings.TrimSpace(*filters.ParentLocationID) {
			continue
		}
		if query != "" && !strings.Contains(strings.ToLower(strings.Join([]string{
			value.Name, value.Summary, value.Notes, value.PublicNotes, value.DMNotes,
		}, " ")), query) {
			continue
		}
		result = append(result, LocationSummary{
			CampaignLocation: value,
			AppURL:           s.AppURL("/campaigns/" + campaignID + "/world/location/" + value.ID),
		})
	}
	return result, nil
}

func (s *Service) GetLocation(
	ctx context.Context,
	campaignID string,
	locationID string,
) (LocationContext, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeWorldRead)
	if err != nil {
		return LocationContext{}, err
	}
	locations, err := s.stores.Travel.LocationsForCampaign(ctx, principal.UserID, campaignID)
	if err != nil {
		return LocationContext{}, err
	}
	var location models.CampaignLocation
	children := []models.CampaignLocation{}
	for _, candidate := range locations {
		if candidate.ID == locationID {
			location = candidate
		}
		if candidate.ParentLocationID == locationID {
			children = append(children, candidate)
		}
	}
	if location.ID == "" {
		return LocationContext{}, NewError(CodeNotFound, "location not found", nil)
	}
	allLinks, err := s.stores.Travel.LocationLinksForCampaign(ctx, principal.UserID, campaignID)
	if err != nil {
		return LocationContext{}, err
	}
	links := []models.CampaignLocationLink{}
	for _, link := range allLinks {
		if link.SourceLocationID == locationID || link.TargetLocationID == locationID {
			links = append(links, link)
		}
	}
	npcLinks, err := s.stores.Travel.NpcLocationLinksForCampaign(ctx, principal.UserID, campaignID)
	if err != nil {
		return LocationContext{}, err
	}
	npcs := []models.CampaignNpcLocationLink{}
	for _, link := range npcLinks {
		if link.LocationID == locationID {
			npcs = append(npcs, link)
		}
	}
	encounters, err := s.stores.Campaigns.Encounters(ctx, principal.UserID, campaignID)
	if err != nil {
		return LocationContext{}, err
	}
	locationEncounters := []models.Encounter{}
	for _, encounter := range encounters {
		if encounter.LocationID != nil && *encounter.LocationID == locationID {
			locationEncounters = append(locationEncounters, encounter)
		}
	}
	maps, err := s.stores.Travel.MapsForCampaign(ctx, principal.UserID, campaignID, locationID)
	if err != nil {
		return LocationContext{}, err
	}
	allStock, err := s.stores.Travel.LocationStockForCampaign(ctx, principal.UserID, campaignID)
	if err != nil {
		return LocationContext{}, err
	}
	stock := []models.CampaignLocationStock{}
	for _, item := range allStock {
		if item.LocationID == locationID {
			stock = append(stock, item)
		}
	}
	return LocationContext{
		Location: location, Children: children, Links: links, NPCs: npcs,
		Encounters: locationEncounters, Maps: maps, Stock: stock,
		AppURL: s.AppURL("/campaigns/" + campaignID + "/world/location/" + locationID),
	}, nil
}

func (s *Service) GetWorldGraph(ctx context.Context, campaignID string) (WorldGraph, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeWorldRead)
	if err != nil {
		return WorldGraph{}, err
	}
	locations, err := s.stores.Travel.LocationsForCampaign(ctx, principal.UserID, campaignID)
	if err != nil {
		return WorldGraph{}, err
	}
	links, err := s.stores.Travel.LocationLinksForCampaign(ctx, principal.UserID, campaignID)
	if err != nil {
		return WorldGraph{}, err
	}
	result := make([]LocationSummary, 0, len(locations))
	for _, location := range locations {
		result = append(result, LocationSummary{
			CampaignLocation: location,
			AppURL:           s.AppURL("/campaigns/" + campaignID + "/world/location/" + location.ID),
		})
	}
	return WorldGraph{
		Locations: result, Links: links,
		AppURL: s.AppURL("/campaigns/" + campaignID + "/world"),
	}, nil
}
