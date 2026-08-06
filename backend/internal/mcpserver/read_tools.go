package mcpserver

import (
	"context"

	appdomain "bludm/backend/internal/app"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func registerReadTools(
	server *mcp.Server,
	service *appdomain.Service,
	principal appdomain.Principal,
) {
	mcp.AddTool(server, tool("list_campaigns", "List campaigns",
		"Find campaigns this credential may access. Use returned IDs in every follow-up call.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in emptyInput) (*mcp.CallToolResult, any, error) {
		value, err := service.ListCampaigns(appdomain.WithPrincipal(ctx, principal))
		if err != nil {
			return nil, nil, err
		}
		values, page, err := pageValues(value, in.Limit, in.Cursor)
		return nil, campaignsOutput{Campaigns: values, Page: page}, err
	})
	mcp.AddTool(server, tool("get_campaign_context", "Get campaign context",
		"Read a compact campaign brief, counts, party summary, links, and follow-up IDs.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in campaignInput) (*mcp.CallToolResult, any, error) {
		value, err := service.CampaignContext(appdomain.WithPrincipal(ctx, principal), in.CampaignID)
		return nil, value, err
	})
	mcp.AddTool(server, tool("search_campaign_content", "Search campaign content",
		"Search locations, NPCs, encounters, notes, journeys, and related campaign content.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in campaignQueryInput) (*mcp.CallToolResult, any, error) {
		value, err := service.SearchCampaignContentWithTypes(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.Query, in.EntityTypes,
		)
		if err != nil {
			return nil, nil, err
		}
		values, page, err := pageValues(value, in.Limit, in.Cursor)
		return nil, campaignSearchOutput{Results: values, Page: page}, err
	})
	registerPartyAndWorldReads(server, service, principal)
	registerEncounterReads(server, service, principal)
	registerLibraryReads(server, service, principal)
	registerExportReads(server, service, principal)
}

func registerPartyAndWorldReads(
	server *mcp.Server,
	service *appdomain.Service,
	principal appdomain.Principal,
) {
	mcp.AddTool(server, tool("list_players", "List players",
		"List accessible characters with stable IDs, campaign assignments, levels, and compact combat context. Omit campaignId to include all accessible campaigns and Unassigned when permitted.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in playerListInput) (*mcp.CallToolResult, any, error) {
		value, err := service.ListPlayers(appdomain.WithPrincipal(ctx, principal), in.CampaignID)
		if err != nil {
			return nil, nil, err
		}
		values, page, err := pageValues(value, in.Limit, in.Cursor)
		return nil, playersOutput{Players: values, Page: page}, err
	})
	mcp.AddTool(server, tool("get_player", "Get player",
		"Read one discovered character sheet and current campaign state.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in playerInput) (*mcp.CallToolResult, any, error) {
		value, err := service.GetPlayer(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.PlayerID,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("list_locations", "List locations",
		"List or filter the Campaign World hierarchy and stable location IDs.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in locationListInput) (*mcp.CallToolResult, any, error) {
		value, err := service.ListLocationsWithFilters(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID,
			appdomain.LocationFilters{
				Query: in.Query, LocationType: in.LocationType,
				ParentLocationID: in.ParentLocationID, Status: in.Status,
			},
		)
		if err != nil {
			return nil, nil, err
		}
		values, page, err := pageValues(value, in.Limit, in.Cursor)
		return nil, locationsOutput{Locations: values, Page: page}, err
	})
	mcp.AddTool(server, tool("get_location", "Get location",
		"Read a location with parent path, notes, links, NPCs, encounters, maps, and shop stock.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in locationInput) (*mcp.CallToolResult, any, error) {
		value, err := service.GetLocation(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.LocationID,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("get_world_graph", "Get world graph",
		"Read the compact location hierarchy and connection graph for route and continuity planning.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in campaignInput) (*mcp.CallToolResult, any, error) {
		value, err := service.GetWorldGraph(appdomain.WithPrincipal(ctx, principal), in.CampaignID)
		return nil, value, err
	})
	mcp.AddTool(server, tool("get_prep_gaps", "Get prep gaps",
		"Return deterministic missing notes, encounters, routes, maps, and other preparation signals.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in campaignInput) (*mcp.CallToolResult, any, error) {
		value, err := service.PrepGaps(appdomain.WithPrincipal(ctx, principal), in.CampaignID)
		if err != nil {
			return nil, nil, err
		}
		values, page, err := pageValues(value, in.Limit, in.Cursor)
		return nil, prepGapsOutput{Gaps: values, Page: page}, err
	})
}
