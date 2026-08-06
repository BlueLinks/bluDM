package mcpserver

import (
	"context"
	"strings"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/app/statblocks"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func registerEncounterReads(
	server *mcp.Server,
	service *appdomain.Service,
	principal appdomain.Principal,
) {
	mcp.AddTool(server, tool("list_encounters", "List encounters",
		"Find prepared encounters by stable ID before reading, revising, or exporting them.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in encounterListInput) (*mcp.CallToolResult, any, error) {
		value, err := service.ListEncountersWithFilters(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID,
			appdomain.EncounterFilters{
				Query: in.Query, Status: in.Status, LocationID: in.LocationID,
			},
		)
		if err != nil {
			return nil, nil, err
		}
		values, page, err := pageValues(value, in.Limit, in.Cursor)
		return nil, encountersOutput{Encounters: values, Page: page}, err
	})
	mcp.AddTool(server, tool("get_encounter", "Get encounter",
		"Read metadata, revision, full roster, generation provenance, persisted encounter ruleset, and ruleset-aware difficulty evidence.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in encounterInput) (*mcp.CallToolResult, any, error) {
		value, err := service.GetEncounter(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.EncounterID,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("evaluate_encounter", "Evaluate encounter",
		"Calculate server-authoritative campaign difficulty without saving: 2014 adjusted XP or 2024 Low/Moderate/High raw XP budgets. The result includes the effective ruleset.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in evaluateInput) (*mcp.CallToolResult, any, error) {
		value, err := service.EvaluateEncounter(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID,
			appdomain.EvaluateEncounterInput{
				AllCampaignPlayers: in.AllCampaignPlayers, PlayerIDs: in.PlayerIDs,
				Enemies: in.Enemies, RequestedDifficulty: in.RequestedDifficulty,
			},
		)
		return nil, value, err
	})
}

func registerLibraryReads(
	server *mcp.Server,
	service *appdomain.Service,
	principal appdomain.Principal,
) {
	mcp.AddTool(server, tool("search_creatures", "Search creatures",
		"Search campaign-visible custom and enabled standard creatures; use returned IDs for get or generation.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in creatureSearchInput) (*mcp.CallToolResult, any, error) {
		value, err := service.SearchCreaturesWithFilters(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID,
			appdomain.CreatureSearchFilters{
				Query: in.Query, CreatureType: in.CreatureType,
				MinimumCR: in.MinimumCR, MaximumCR: in.MaximumCR, SourceKey: in.SourceKey,
			},
		)
		if err != nil {
			return nil, nil, err
		}
		values, page, err := pageValues(value, in.Limit, in.Cursor)
		return nil, creaturesOutput{Creatures: values, Page: page}, err
	})
	mcp.AddTool(server, tool("get_creature", "Get creature",
		"Read a full creature stat block, typed actions, spellcasting, source, and campaign use.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in creatureInput) (*mcp.CallToolResult, any, error) {
		value, err := service.GetCreature(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.CreatureID,
		)
		return nil, value, err
	})
	mcp.AddTool(server, tool("search_library", "Search library",
		"Search spells, items, creatures, equipment, and supported rules entries by explicit content type.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in librarySearchInput) (*mcp.CallToolResult, any, error) {
		value, err := service.SearchLibrary(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.ContentType, in.Query,
		)
		if err != nil {
			return nil, nil, err
		}
		paged, err := pageLibrarySearch(value, in.Limit, in.Cursor)
		return nil, paged, err
	})
	mcp.AddTool(server, tool("get_library_entry", "Get library entry",
		"Retrieve exactly one discovered spell, item, equipment, or rules entry by stable ID, content type, and source.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in libraryEntryInput) (*mcp.CallToolResult, any, error) {
		value, err := service.GetLibraryEntry(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.ContentType,
			in.EntryID, in.LibrarySource,
		)
		return nil, value, err
	})
}

func registerExportReads(
	server *mcp.Server,
	service *appdomain.Service,
	principal appdomain.Principal,
) {
	mcp.AddTool(server, tool("check_statblock_compatibility", "Check stat-block compatibility",
		"Explain direct, derived, flattened, adjacent-only, omitted, unmapped, and blocking fields before export.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in compatibilityInput) (*mcp.CallToolResult, any, error) {
		ctx = appdomain.WithPrincipal(ctx, principal)
		if (in.CreatureID == "") == (in.EncounterID == "") {
			return nil, nil, appdomain.ValidationError(
				"exactly_one_export_target",
				"provide exactly one of creatureId or encounterId",
				nil,
			)
		}
		if in.CreatureID != "" {
			value, err := service.ExportCreature(ctx, in.CampaignID, in.CreatureID, "", true)
			return nil, compatibilityOutput{
				Creature: &value.Compatibility, Encounter: []statblocks.CompatibilityReport{},
			}, err
		}
		value, err := service.ExportEncounter(ctx, in.CampaignID, in.EncounterID, true)
		return nil, compatibilityOutput{
			Creature: nil, Encounter: value.Compatibility,
		}, err
	})
	mcp.AddTool(server, tool("export_creature_statblock", "Export creature stat block",
		"Return a self-contained Fantasy Statblocks 4.10.3 Basic 5e block and structured compatibility metadata.",
		true, false, false,
	), func(ctx context.Context, _ *mcp.CallToolRequest, in exportCreatureInput) (*mcp.CallToolResult, any, error) {
		if err := validateExportContract(in.Profile, in.Layout, in.Output, false); err != nil {
			return nil, nil, err
		}
		strict := in.Strict == nil || *in.Strict
		value, err := service.ExportCreature(
			appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.CreatureID,
			in.VaultImagePath, !strict,
		)
		value.Output = normalizedExportOutput(in.Output, "markdown")
		return nil, value, err
	})
	for _, name := range []string{
		"export_encounter_statblocks", "export_encounter_bundle",
	} {
		name := name
		mcp.AddTool(server, tool(name, "Export encounter bundle",
			"Return a deduplicated roster and one Fantasy Statblocks block per distinct encounter creature.",
			true, false, false,
		), func(ctx context.Context, _ *mcp.CallToolRequest, in exportEncounterInput) (*mcp.CallToolResult, any, error) {
			if err := validateExportContract(in.Profile, in.Layout, in.Output, true); err != nil {
				return nil, nil, err
			}
			strict := in.Strict == nil || *in.Strict
			value, err := service.ExportEncounterWithCreatureData(
				appdomain.WithPrincipal(ctx, principal), in.CampaignID, in.EncounterID,
				in.CreatureData, !strict,
			)
			fallback := "markdown"
			if name == "export_encounter_bundle" {
				fallback = "obsidian-bundle"
			}
			value.Output = normalizedExportOutput(in.Output, fallback)
			return nil, value, err
		})
	}
}

func validateExportContract(profile, layout, output string, encounter bool) error {
	if profile != "" && profile != statblocks.Profile {
		return appdomain.ValidationError("unsupported_profile", "unsupported export profile", nil)
	}
	if layout != "" && layout != "Basic 5e Layout" {
		return appdomain.ValidationError("unsupported_layout", "layout must be Basic 5e Layout", nil)
	}
	output = normalizedExportOutput(output, "")
	allowed := map[string]bool{"": true, "structured": true, "markdown": true}
	if encounter {
		allowed["obsidian-bundle"] = true
	} else {
		allowed["yaml"] = true
	}
	if !allowed[output] {
		return appdomain.ValidationError("unsupported_output", "unsupported export output", nil)
	}
	return nil
}

func normalizedExportOutput(value, fallback string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return fallback
	}
	return value
}

func pageLibrarySearch(
	value appdomain.LibrarySearchResult,
	limit int,
	cursor string,
) (librarySearchOutput, error) {
	length := max(len(value.Creatures), len(value.Spells), len(value.Items), len(value.Entries))
	start, end, page, err := pageBounds(length, limit, cursor)
	if err != nil {
		return librarySearchOutput{}, err
	}
	return librarySearchOutput{
		Creatures: boundedSlice(value.Creatures, start, end),
		Spells:    boundedSlice(value.Spells, start, end),
		Items:     boundedSlice(value.Items, start, end),
		Entries:   boundedSlice(value.Entries, start, end),
		Page:      page,
	}, nil
}

func boundedSlice[T any](values []T, start, end int) []T {
	start = min(start, len(values))
	end = min(end, len(values))
	if end < start {
		end = start
	}
	return values[start:end]
}
