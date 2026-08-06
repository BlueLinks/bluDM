package app

import (
	"context"
	"strings"

	"bludm/backend/internal/models"
)

type CampaignContext struct {
	Campaign       CampaignSummary   `json:"campaign"`
	PlayerCount    int               `json:"playerCount"`
	LocationCount  int               `json:"locationCount"`
	EncounterCount int               `json:"encounterCount"`
	Party          []PartySummary    `json:"party"`
	Links          map[string]string `json:"links"`
}

type CampaignSummary struct {
	models.Campaign
	AppURL string `json:"appUrl"`
}

type PartySummary struct {
	ID               string `json:"id"`
	CampaignID       string `json:"campaignId,omitempty"`
	CampaignName     string `json:"campaignName,omitempty"`
	CharacterName    string `json:"characterName"`
	PlayerName       string `json:"playerName"`
	Level            int    `json:"level"`
	ArmorClass       int    `json:"armorClass"`
	CurrentHitPoints int    `json:"currentHitPoints"`
	MaxHitPoints     int    `json:"maxHitPoints"`
	AppURL           string `json:"appUrl"`
}

type PlayerDetails struct {
	models.Player
	AppURL string `json:"appUrl"`
}

func (s *Service) ListCampaigns(ctx context.Context) ([]CampaignSummary, error) {
	principal, err := s.authorize(ctx, "", ScopeCampaignsRead)
	if err != nil {
		return nil, err
	}
	campaigns, err := s.stores.Campaigns.List(ctx, principal.UserID)
	if err != nil {
		return nil, err
	}
	result := make([]CampaignSummary, 0, len(campaigns))
	for _, campaign := range campaigns {
		if principal.AllowsCampaign(campaign.ID) {
			result = append(result, CampaignSummary{
				Campaign: campaign, AppURL: s.AppURL("/campaigns/" + campaign.ID),
			})
		}
	}
	return result, nil
}

func (s *Service) CampaignContext(ctx context.Context, campaignID string) (CampaignContext, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeCampaignsRead)
	if err != nil {
		return CampaignContext{}, err
	}
	campaign, err := s.stores.Campaigns.ByID(ctx, principal.UserID, campaignID)
	if err != nil {
		return CampaignContext{}, storeError(err, "campaign")
	}
	players, err := s.stores.Campaigns.Players(ctx, principal.UserID, campaignID)
	if err != nil {
		return CampaignContext{}, err
	}
	locations, err := s.stores.Travel.LocationsForCampaign(ctx, principal.UserID, campaignID)
	if err != nil {
		return CampaignContext{}, err
	}
	encounters, err := s.stores.Campaigns.Encounters(ctx, principal.UserID, campaignID)
	if err != nil {
		return CampaignContext{}, err
	}
	party := make([]PartySummary, 0, len(players))
	for _, player := range players {
		party = append(party, s.linkedPlayerSummary(player))
	}
	return CampaignContext{
		Campaign: CampaignSummary{
			Campaign: campaign, AppURL: s.AppURL("/campaigns/" + campaign.ID),
		}, PlayerCount: len(players), LocationCount: len(locations),
		EncounterCount: len(encounters), Party: party,
		Links: map[string]string{
			"campaign":   s.AppURL("/campaigns/" + campaignID),
			"world":      s.AppURL("/campaigns/" + campaignID + "/world"),
			"encounters": s.AppURL("/campaigns/" + campaignID + "/encounters"),
		},
	}, nil
}

func (s *Service) ListPlayers(ctx context.Context, campaignID string) ([]PartySummary, error) {
	principal, err := s.authorize(ctx, "", ScopePartyRead)
	if err != nil {
		return nil, err
	}
	campaignID = strings.TrimSpace(campaignID)
	var players []models.Player
	if campaignID != "" {
		if _, err := s.authorize(ctx, campaignID, ScopePartyRead); err != nil {
			return nil, err
		}
		players, err = s.stores.Campaigns.Players(ctx, principal.UserID, campaignID)
	} else {
		players, err = s.stores.Players.List(ctx, principal.UserID)
	}
	if err != nil {
		return nil, err
	}
	result := make([]PartySummary, 0, len(players))
	for _, player := range players {
		if player.CampaignID == "" && principal.CampaignRestrictionMode == "selected" {
			continue
		}
		if player.CampaignID != "" && !principal.AllowsCampaign(player.CampaignID) {
			continue
		}
		result = append(result, s.linkedPlayerSummary(player))
	}
	return result, nil
}

func (s *Service) GetPlayer(
	ctx context.Context,
	campaignID string,
	playerID string,
) (PlayerDetails, error) {
	principal, err := s.authorize(ctx, "", ScopePartyRead)
	if err != nil {
		return PlayerDetails{}, err
	}
	player, err := s.stores.Players.ByID(ctx, principal.UserID, playerID)
	if err != nil || player.CampaignID != strings.TrimSpace(campaignID) {
		return PlayerDetails{}, NewError(CodeNotFound, "player not found", nil)
	}
	if player.CampaignID == "" && principal.CampaignRestrictionMode == "selected" {
		return PlayerDetails{}, NewError(CodeForbidden, "token cannot access unassigned players", nil)
	}
	if player.CampaignID != "" {
		if _, err := s.authorize(ctx, player.CampaignID, ScopePartyRead); err != nil {
			return PlayerDetails{}, err
		}
	}
	return PlayerDetails{
		Player: player,
		AppURL: s.AppURL("/players/" + player.ID + "/edit"),
	}, nil
}

func playerSummary(player models.Player) PartySummary {
	return PartySummary{
		ID: player.ID, CampaignID: player.CampaignID, CampaignName: player.CampaignName,
		CharacterName: player.CharacterName, PlayerName: player.PlayerName,
		Level: integerFromAny(player.CharacterSheet["level"]), ArmorClass: player.ArmorClass,
		CurrentHitPoints: player.CurrentHitPoints, MaxHitPoints: player.MaxHitPoints,
	}
}

func (s *Service) linkedPlayerSummary(player models.Player) PartySummary {
	result := playerSummary(player)
	result.AppURL = s.AppURL("/players/" + player.ID + "/edit")
	return result
}

func integerFromAny(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case float64:
		return int(typed)
	case float32:
		return int(typed)
	default:
		return 0
	}
}
