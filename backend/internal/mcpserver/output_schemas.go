package mcpserver

import (
	"fmt"
	"reflect"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/app/statblocks"
	"bludm/backend/internal/generation"
	"bludm/backend/internal/models"

	"github.com/google/jsonschema-go/jsonschema"
)

type campaignsOutput struct {
	Campaigns []appdomain.CampaignSummary `json:"campaigns"`
	Page      pageInfo                    `json:"page"`
}

type campaignSearchOutput struct {
	Results []appdomain.CampaignSearchResult `json:"results"`
	Page    pageInfo                         `json:"page"`
}

type playersOutput struct {
	Players []appdomain.PartySummary `json:"players"`
	Page    pageInfo                 `json:"page"`
}

type locationsOutput struct {
	Locations []appdomain.LocationSummary `json:"locations"`
	Page      pageInfo                    `json:"page"`
}

type prepGapsOutput struct {
	Gaps []appdomain.PrepGap `json:"gaps"`
	Page pageInfo            `json:"page"`
}

type encountersOutput struct {
	Encounters []appdomain.EncounterSummary `json:"encounters"`
	Page       pageInfo                     `json:"page"`
}

type creaturesOutput struct {
	Creatures []appdomain.CreatureSummary `json:"creatures"`
	Page      pageInfo                    `json:"page"`
}

type librarySearchOutput struct {
	Creatures []appdomain.CreatureSummary     `json:"creatures,omitempty"`
	Spells    []appdomain.SpellSummary        `json:"spells,omitempty"`
	Items     []appdomain.ItemSummary         `json:"items,omitempty"`
	Entries   []appdomain.LibraryEntrySummary `json:"entries,omitempty"`
	Page      pageInfo                        `json:"page"`
}

type compatibilityOutput struct {
	Creature  *statblocks.CompatibilityReport  `json:"creature"`
	Encounter []statblocks.CompatibilityReport `json:"encounter"`
}

type encounterRevisionsOutput struct {
	Revisions []appdomain.EncounterRevisionSummary `json:"revisions"`
	Page      pageInfo                             `json:"page"`
}

type rollTablesOutput struct {
	Tables []appdomain.RollTableSummary `json:"tables"`
	Page   pageInfo                     `json:"page"`
}

type toolErrorOutput struct {
	Error appdomain.DomainError `json:"error"`
}

func outputSchemaFor(name string) *jsonschema.Schema {
	var prototype any
	switch name {
	case "list_campaigns":
		prototype = campaignsOutput{}
	case "get_campaign_context":
		prototype = appdomain.CampaignContext{}
	case "create_campaign", "update_campaign":
		prototype = appdomain.CampaignWriteResult{}
	case "search_campaign_content":
		prototype = campaignSearchOutput{}
	case "list_players":
		prototype = playersOutput{}
	case "get_player":
		prototype = appdomain.PlayerDetails{}
	case "create_player", "update_player", "move_player", "clone_player":
		prototype = appdomain.PlayerWriteResult{}
	case "list_locations":
		prototype = locationsOutput{}
	case "get_location":
		prototype = appdomain.LocationContext{}
	case "get_world_graph":
		prototype = appdomain.WorldGraph{}
	case "get_prep_gaps":
		prototype = prepGapsOutput{}
	case "list_encounters":
		prototype = encountersOutput{}
	case "get_encounter":
		prototype = appdomain.EncounterDetails{}
	case "evaluate_encounter":
		prototype = generation.DifficultyEvidence{}
	case "search_creatures":
		prototype = creaturesOutput{}
	case "get_creature":
		prototype = appdomain.CreatureDetails{}
	case "search_library":
		prototype = librarySearchOutput{}
	case "get_library_entry":
		prototype = appdomain.LibraryEntryResult{}
	case "check_statblock_compatibility":
		prototype = compatibilityOutput{}
	case "export_creature_statblock":
		prototype = statblocks.Result{}
	case "export_encounter_statblocks", "export_encounter_bundle":
		prototype = appdomain.EncounterExport{}
	case "create_generated_encounter", "regenerate_encounter":
		prototype = appdomain.EncounterAuthoringResult{}
	case "list_encounter_revisions":
		prototype = encounterRevisionsOutput{}
	case "restore_encounter_revision", "create_encounter", "update_encounter":
		prototype = appdomain.EncounterWriteResult{}
	case "create_location", "update_location":
		prototype = appdomain.LocationWriteResult{}
	case "create_npc", "update_npc":
		prototype = appdomain.NPCWriteResult{}
	case "link_npc_to_location":
		prototype = appdomain.NPCLinkWriteResult{}
	case "create_location_link":
		prototype = appdomain.LocationLinkWriteResult{}
	case "preview_campaign_changes":
		prototype = appdomain.CampaignChangesPreview{}
	case "apply_campaign_changes":
		prototype = appdomain.AppliedCampaignChanges{}
	case "list_roll_tables":
		prototype = rollTablesOutput{}
	case "roll_on_table":
		prototype = models.RollTableRollResult{}
	case "create_roll_table", "update_roll_table":
		prototype = appdomain.RollTableWriteResult{}
	case "calculate_travel":
		prototype = appdomain.TravelCalculation{}
	case "create_journey":
		prototype = appdomain.JourneyWriteResult{}
	case "generate_dungeon_preview":
		prototype = appdomain.DungeonPreview{}
	case "save_generated_dungeon":
		prototype = appdomain.SavedDungeon{}
	case "get_completed_run_summary":
		prototype = appdomain.CompletedRunSummary{}
	case "get_campaign_continuity_context":
		prototype = appdomain.CampaignContinuityContext{}
	case "preview_shop_stock_changes":
		prototype = appdomain.ShopStockPreview{}
	case "apply_shop_stock_changes":
		prototype = appdomain.AppliedShopStockChanges{}
	default:
		panic(fmt.Sprintf("MCP tool %q has no declared output contract", name))
	}
	successSchema, err := jsonschema.ForType(
		reflect.TypeOf(prototype),
		&jsonschema.ForOptions{IgnoreInvalidTypes: true},
	)
	if err != nil {
		panic(fmt.Sprintf("MCP tool %q output schema: %v", name, err))
	}
	errorSchema, err := jsonschema.ForType(
		reflect.TypeOf(toolErrorOutput{}),
		&jsonschema.ForOptions{IgnoreInvalidTypes: true},
	)
	if err != nil {
		panic(fmt.Sprintf("MCP tool %q error schema: %v", name, err))
	}
	return &jsonschema.Schema{
		Type:  "object",
		OneOf: []*jsonschema.Schema{successSchema, errorSchema},
	}
}
