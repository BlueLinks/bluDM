package mcpserver

import (
	"context"

	appdomain "bludm/backend/internal/app"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func registerWorldWriteTools(
	server *mcp.Server,
	service *appdomain.Service,
	principal appdomain.Principal,
) {
	mcp.AddTool(server, tool("create_location", "Create location",
		"After approval, create a typed Campaign World location under an optional discovered parent.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in createLocationInput) (*mcp.CallToolResult, any, error) {
		value, err := service.CreateLocation(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.Location,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("update_location", "Update location",
		"After approval, update authored location fields using expectedUpdatedAt concurrency protection.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in updateLocationInput) (*mcp.CallToolResult, any, error) {
		value, err := service.UpdateLocation(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.LocationID, in.Location,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("create_npc", "Create NPC",
		"After approval, create a custom NPC creature and link it to the campaign.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in createNPCInput) (*mcp.CallToolResult, any, error) {
		value, err := service.CreateNPC(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.NPC,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("update_npc", "Update NPC",
		"After approval, update a discovered custom NPC using expectedUpdatedAt concurrency protection.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in updateNPCInput) (*mcp.CallToolResult, any, error) {
		value, err := service.UpdateNPC(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.NPCID, in.NPC,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("link_npc_to_location", "Link NPC to location",
		"After approval, add or update an NPC's role or relationship at a discovered location.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in npcLinkInput) (*mcp.CallToolResult, any, error) {
		value, err := service.LinkNPCToLocation(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.Link,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("create_location_link", "Create location link",
		"After approval, create a route, door, portal, exit, or narrative relationship between two discovered locations.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in locationLinkInput) (*mcp.CallToolResult, any, error) {
		value, err := service.CreateLocationLink(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.Link,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("preview_campaign_changes", "Preview campaign changes",
		"Validate a structured connected change set and return the normalized diff and short-lived approval token without writing campaign content.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in campaignChangesPreviewInput) (*mcp.CallToolResult, any, error) {
		value, err := service.PreviewCampaignChanges(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID,
			appdomain.CampaignChangesCommand{Changes: in.Changes.Changes},
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("apply_campaign_changes", "Apply campaign changes",
		"After approval, transactionally apply the exact previously previewed change set. Any mismatch or failure rolls everything back.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in campaignChangesApplyInput) (*mcp.CallToolResult, any, error) {
		value, err := service.ApplyCampaignChanges(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID,
			appdomain.CampaignChangesCommand{
				IdempotencyKey: in.Changes.IdempotencyKey,
				PreviewToken:   in.Changes.PreviewToken, Changes: in.Changes.Changes,
			},
		)
		return nil, value, err
	})
}

func registerAdvancedTools(
	server *mcp.Server,
	service *appdomain.Service,
	principal appdomain.Principal,
) {
	mcp.AddTool(server, tool("list_roll_tables", "List roll tables",
		"List campaign-authored roll tables and their complete row ranges before selecting one by ID.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in campaignInput) (*mcp.CallToolResult, any, error) {
		value, err := service.ListRollTables(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID,
		)
		if err != nil {
			return nil, nil, err
		}
		values, page, err := pageValues(value, in.Limit, in.Cursor)
		return nil, rollTablesOutput{Tables: values, Page: page}, err
	})
	mcp.AddTool(server, tool("roll_on_table", "Roll on table",
		"Deterministically roll a discovered campaign table using a caller-stable seed, or supply an explicit in-range roll.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in rollTableIDInput) (*mcp.CallToolResult, any, error) {
		value, err := service.RollOnTable(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.TableID, in.Roll, in.Seed,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("create_roll_table", "Create roll table",
		"After approval, create a campaign roll table with explicit non-overlapping ranges.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in rollTableInput) (*mcp.CallToolResult, any, error) {
		value, err := service.CreateRollTable(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.Table,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("update_roll_table", "Update roll table",
		"After approval, replace a discovered roll table using its exact expectedUpdatedAt value.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in updateRollTableInput) (*mcp.CallToolResult, any, error) {
		value, err := service.UpdateRollTable(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.TableID, in.Table,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("calculate_travel", "Calculate travel",
		"Calculate a deterministic 2014-rules travel duration and terrain assumptions without saving.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in travelInput) (*mcp.CallToolResult, any, error) {
		value, err := service.CalculateTravel(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.Calculation,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("create_journey", "Create journey",
		"After approval, save a planned Campaign World journey using explicit distance and travel assumptions.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in journeyInput) (*mcp.CallToolResult, any, error) {
		value, err := service.CreateJourney(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.Journey,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("generate_dungeon_preview", "Generate dungeon preview",
		"Generate the deterministic Dungeon Studio document without saving locations or maps.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in dungeonPreviewInput) (*mcp.CallToolResult, any, error) {
		value, err := service.GenerateDungeonPreview(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.Settings,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("save_generated_dungeon", "Save generated dungeon",
		"After approval, atomically save a generated dungeon, its room locations, and editable Dungeon Studio map.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in saveDungeonInput) (*mcp.CallToolResult, any, error) {
		value, err := service.SaveGeneratedDungeon(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.Dungeon,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("get_completed_run_summary", "Get completed run summary",
		"Read a completed encounter run, snapshots, outcomes, and combat log for factual session recap writing.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in completedRunInput) (*mcp.CallToolResult, any, error) {
		value, err := service.GetCompletedRunSummary(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.RunID,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("get_campaign_continuity_context", "Get campaign continuity",
		"Read a compact continuity packet with people-place links, unresolved encounters, prep gaps, and recent completed run IDs.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in campaignInput) (*mcp.CallToolResult, any, error) {
		value, err := service.GetCampaignContinuityContext(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("preview_shop_stock_changes", "Preview shop stock changes",
		"Validate exact shop stock upserts and return a short-lived approval token without changing inventory.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in shopStockPreviewInput) (*mcp.CallToolResult, any, error) {
		value, err := service.PreviewShopStockChanges(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID,
			appdomain.ShopStockChangesCommand{Stock: in.Changes.Stock},
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("apply_shop_stock_changes", "Apply shop stock changes",
		"After approval, transactionally apply the exact shop stock preview; unmentioned stock is preserved.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in shopStockApplyInput) (*mcp.CallToolResult, any, error) {
		value, err := service.ApplyShopStockChanges(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID,
			appdomain.ShopStockChangesCommand{
				IdempotencyKey: in.Changes.IdempotencyKey,
				PreviewToken:   in.Changes.PreviewToken, Stock: in.Changes.Stock,
			},
		)
		return nil, value, err
	})
}
