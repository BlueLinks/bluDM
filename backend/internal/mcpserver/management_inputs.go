package mcpserver

import appdomain "bludm/backend/internal/app"

type playerListInput struct {
	CampaignID string `json:"campaignId,omitempty" jsonschema:"Optional campaign ID returned by list_campaigns; omit to include every accessible campaign and Unassigned when permitted"`
	Limit      int    `json:"limit,omitempty" jsonschema:"Page size from 1 to 100; defaults to 50"`
	Cursor     string `json:"cursor,omitempty" jsonschema:"Opaque cursor returned by the previous page"`
}

type createCampaignInput struct {
	Campaign appdomain.CampaignCreateCommand `json:"campaign" jsonschema:"Campaign fields; encounterRuleset accepts 2014 or 2024"`
}

type updateCampaignInput struct {
	CampaignID string                          `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns"`
	Campaign   appdomain.CampaignUpdateCommand `json:"campaign" jsonschema:"Changed fields plus the exact expectedUpdatedAt and an idempotency key"`
}

type createPlayerInput struct {
	CampaignID string                        `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns, or an empty string for Unassigned"`
	Player     appdomain.PlayerCreateCommand `json:"player" jsonschema:"New character fields and an idempotency key"`
}

type updatePlayerInput struct {
	CampaignID string                        `json:"campaignId" jsonschema:"The player's current campaign ID, or an empty string for Unassigned"`
	PlayerID   string                        `json:"playerId" jsonschema:"Player ID returned by list_players"`
	Player     appdomain.PlayerUpdateCommand `json:"player" jsonschema:"Changed fields plus the exact expectedUpdatedAt and an idempotency key"`
}

type movePlayerInput struct {
	CampaignID string                      `json:"campaignId" jsonschema:"The player's current campaign ID, or an empty string for Unassigned"`
	PlayerID   string                      `json:"playerId" jsonschema:"Player ID returned by list_players"`
	Move       appdomain.PlayerMoveCommand `json:"move" jsonschema:"Destination campaign ID (empty for Unassigned), exact expectedUpdatedAt, and an idempotency key"`
}

type clonePlayerInput struct {
	CampaignID string                       `json:"campaignId" jsonschema:"The player's current campaign ID, or an empty string for Unassigned"`
	PlayerID   string                       `json:"playerId" jsonschema:"Player ID returned by list_players"`
	Clone      appdomain.PlayerCloneCommand `json:"clone" jsonschema:"Exact expectedUpdatedAt and an idempotency key"`
}
