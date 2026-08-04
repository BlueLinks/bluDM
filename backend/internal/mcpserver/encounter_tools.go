package mcpserver

import (
	"context"

	appdomain "bludm/backend/internal/app"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func registerEncounterWriteTools(
	server *mcp.Server,
	service *appdomain.Service,
	principal appdomain.Principal,
) {
	mcp.AddTool(server, tool("create_generated_encounter", "Create generated encounter",
		"After user approval, generate and atomically create a durable planned encounter, party roster, managed enemies, and revision 1. This is a write, not a preview.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in generateInput) (*mcp.CallToolResult, any, error) {
		value, err := service.CreateGeneratedEncounter(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID,
			appdomain.GenerateEncounterCommand{
				IdempotencyKey: in.IdempotencyKey, Name: in.Name, Description: in.Description,
				LocationID: in.LocationID, RoomNumber: in.RoomNumber,
				AllCampaignPlayers: in.AllCampaignPlayers, PlayerIDs: in.PlayerIDs,
				AddPlayersToRoster: in.AddPlayersToRoster, Options: in.Options, Seed: in.Seed,
				RequiredCreatureIDs:  in.RequiredCreatureIDs,
				ForbiddenCreatureIDs: in.ForbiddenCreatureIDs,
				AllowedSourceKeys:    in.AllowedSourceKeys,
				MinimumEnemyBodies:   in.MinimumEnemyBodies,
				MaximumEnemyBodies:   in.MaximumEnemyBodies,
				NarrativePurpose:     in.NarrativePurpose, RoomTheme: in.RoomTheme,
			},
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("regenerate_encounter", "Regenerate encounter",
		"After approval, reroll generator-managed enemies on the same encounter ID, preserve manual work by default, require expectedRevision, and append history. Set replaceManagedCombatantsOnly=false only when the user explicitly asks to replace manual enemy rows too; players and allies are always preserved.",
		false, true, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in regenerateInput) (*mcp.CallToolResult, any, error) {
		value, err := service.RegenerateEncounter(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.EncounterID,
			appdomain.RegenerateEncounterCommand{
				IdempotencyKey: in.IdempotencyKey, ExpectedRevision: in.ExpectedRevision,
				Options: in.Options, Seed: in.Seed, FreshSeed: in.FreshSeed,
				PreserveCombatantIDs: in.PreserveCombatantIDs,
				PreserveCreatureIDs:  in.PreserveCreatureIDs,
				ReplaceManagedOnly:   in.ReplaceManagedOnly,
				RequiredCreatureIDs:  in.RequiredCreatureIDs,
				ForbiddenCreatureIDs: in.ForbiddenCreatureIDs,
				AllowedSourceKeys:    in.AllowedSourceKeys,
				MinimumEnemyBodies:   in.MinimumEnemyBodies,
				MaximumEnemyBodies:   in.MaximumEnemyBodies,
			},
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("list_encounter_revisions", "List encounter revisions",
		"Inspect revision numbers, reasons, actors, seeds, difficulty, and timestamps.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in encounterInput) (*mcp.CallToolResult, any, error) {
		value, err := service.ListEncounterRevisions(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.EncounterID,
		)
		if err != nil {
			return nil, nil, err
		}
		values, page, err := pageValues(value, in.Limit, in.Cursor)
		return nil, encounterRevisionsOutput{Revisions: values, Page: page}, err
	})
	mcp.AddTool(server, tool("restore_encounter_revision", "Restore encounter revision",
		"After approval, restore a historical encounter snapshot as a new head revision without erasing later history.",
		false, true, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in restoreInput) (*mcp.CallToolResult, any, error) {
		value, err := service.RestoreEncounterRevision(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.EncounterID, in.Revision,
			appdomain.RestoreRevisionCommand{
				IdempotencyKey: in.IdempotencyKey, ExpectedRevision: in.ExpectedRevision,
			},
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("create_encounter", "Create encounter",
		"After approval, atomically create an authored non-generated encounter, complete roster, and revision 1.",
		false, false, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in authoredEncounterInput) (*mcp.CallToolResult, any, error) {
		value, err := service.CreateEncounter(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.Encounter,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("update_encounter", "Update encounter",
		"After approval, patch only specified encounter metadata or combatants using expectedRevision and append recoverable history. Targeted add/update/remove operations preserve all other rows and generator provenance; replaceRoster is an explicit destructive alternative.",
		false, true, true,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in updateEncounterInput) (*mcp.CallToolResult, any, error) {
		value, err := service.UpdateEncounter(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.EncounterID, in.Encounter,
		)
		return nil, value, err
	})
}
