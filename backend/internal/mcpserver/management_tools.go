package mcpserver

import (
	"context"

	appdomain "bludm/backend/internal/app"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func registerManagementTools(
	server *mcp.Server,
	service *appdomain.Service,
	principal appdomain.Principal,
) {
	mcp.AddTool(server, tool("create_campaign", "Create campaign",
		"After approval, create a campaign with an explicit 2014 or 2024 ruleset. Requires an all-campaign credential.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in createCampaignInput) (*mcp.CallToolResult, any, error) {
		value, err := service.CreateCampaign(appdomain.WithPrincipal(ctx, principal), in.Campaign)
		return nil, value, err
	})
	mcp.AddTool(server, tool("update_campaign", "Update campaign",
		"After approval, update a discovered campaign, including its 2014 or 2024 ruleset, using expectedUpdatedAt concurrency protection.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in updateCampaignInput) (*mcp.CallToolResult, any, error) {
		value, err := service.UpdateCampaign(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.Campaign,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("create_player", "Create player",
		"After approval, create a player character in a discovered campaign or explicitly in Unassigned.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in createPlayerInput) (*mcp.CallToolResult, any, error) {
		value, err := service.CreatePlayer(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.Player,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("update_player", "Update player",
		"After approval, update selected character-sheet fields using expectedUpdatedAt concurrency protection. Use move_player for campaign assignment.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in updatePlayerInput) (*mcp.CallToolResult, any, error) {
		value, err := service.UpdatePlayer(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.PlayerID, in.Player,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("move_player", "Move player",
		"After approval, move a discovered player to another accessible campaign or to Unassigned. Moving to the current campaign is an audited no-op.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in movePlayerInput) (*mcp.CallToolResult, any, error) {
		value, err := service.MovePlayer(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.PlayerID, in.Move,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("clone_player", "Clone player",
		"After approval, create a deterministic '<character name> Copy' that preserves the source campaign assignment and character data.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in clonePlayerInput) (*mcp.CallToolResult, any, error) {
		value, err := service.ClonePlayer(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.PlayerID, in.Clone,
		)
		return nil, value, err
	})
}
