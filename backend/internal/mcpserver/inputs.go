package mcpserver

import (
	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/generation"
)

type emptyInput struct {
	Limit  int    `json:"limit,omitempty" jsonschema:"Page size from 1 to 100; defaults to 50"`
	Cursor string `json:"cursor,omitempty" jsonschema:"Opaque cursor returned by the previous page"`
}

type campaignInput struct {
	CampaignID string `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns"`
	Limit      int    `json:"limit,omitempty" jsonschema:"Page size from 1 to 100; defaults to 50"`
	Cursor     string `json:"cursor,omitempty" jsonschema:"Opaque cursor returned by the previous page"`
}

type campaignQueryInput struct {
	CampaignID  string   `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns"`
	Query       string   `json:"query,omitempty" jsonschema:"Optional case-insensitive search text"`
	EntityTypes []string `json:"entityTypes,omitempty" jsonschema:"Optional location, npc, encounter, or journey filters"`
	Limit       int      `json:"limit,omitempty" jsonschema:"Page size from 1 to 100; defaults to 50"`
	Cursor      string   `json:"cursor,omitempty" jsonschema:"Opaque cursor returned by the previous page"`
}

type playerInput struct {
	CampaignID string `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns"`
	PlayerID   string `json:"playerId" jsonschema:"Player ID returned by list_players"`
}

type locationInput struct {
	CampaignID string `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns"`
	LocationID string `json:"locationId" jsonschema:"Location ID returned by list_locations"`
}

type locationListInput struct {
	CampaignID       string  `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns"`
	Query            string  `json:"query,omitempty" jsonschema:"Optional name or notes text"`
	LocationType     string  `json:"locationType,omitempty" jsonschema:"Optional exact location type"`
	ParentLocationID *string `json:"parentLocationId,omitempty" jsonschema:"Optional parent ID; use an empty string for root locations"`
	Status           string  `json:"status,omitempty" jsonschema:"Optional exact status"`
	Limit            int     `json:"limit,omitempty" jsonschema:"Page size from 1 to 100; defaults to 50"`
	Cursor           string  `json:"cursor,omitempty" jsonschema:"Opaque cursor returned by the previous page"`
}

type encounterListInput struct {
	CampaignID string `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns"`
	Query      string `json:"query,omitempty" jsonschema:"Optional name, description, location, or room text"`
	Status     string `json:"status,omitempty" jsonschema:"Optional planned, completed, or skipped filter"`
	LocationID string `json:"locationId,omitempty" jsonschema:"Optional location ID returned by list_locations"`
	Limit      int    `json:"limit,omitempty" jsonschema:"Page size from 1 to 100; defaults to 50"`
	Cursor     string `json:"cursor,omitempty" jsonschema:"Opaque cursor returned by the previous page"`
}

type encounterInput struct {
	CampaignID  string `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns"`
	EncounterID string `json:"encounterId" jsonschema:"Encounter ID returned by list_encounters or a write tool"`
	Limit       int    `json:"limit,omitempty" jsonschema:"Page size from 1 to 100; defaults to 50"`
	Cursor      string `json:"cursor,omitempty" jsonschema:"Opaque cursor returned by the previous page"`
}

type creatureInput struct {
	CampaignID string `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns"`
	CreatureID string `json:"creatureId" jsonschema:"Creature ID returned by search_creatures"`
}

type creatureSearchInput struct {
	CampaignID   string   `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns"`
	Query        string   `json:"query,omitempty" jsonschema:"Optional name, text, or creature-type search"`
	CreatureType string   `json:"creatureType,omitempty" jsonschema:"Optional exact creature type filter"`
	MinimumCR    *float64 `json:"minimumCr,omitempty" jsonschema:"Optional inclusive minimum challenge rating"`
	MaximumCR    *float64 `json:"maximumCr,omitempty" jsonschema:"Optional inclusive maximum challenge rating"`
	SourceKey    string   `json:"sourceKey,omitempty" jsonschema:"Optional exact enabled source key"`
	Limit        int      `json:"limit,omitempty" jsonschema:"Page size from 1 to 100; defaults to 50"`
	Cursor       string   `json:"cursor,omitempty" jsonschema:"Opaque cursor returned by the previous page"`
}

type librarySearchInput struct {
	CampaignID  string `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns"`
	ContentType string `json:"contentType" jsonschema:"One of all, creature, spell, item, equipment, rules, or another returned library category"`
	Query       string `json:"query,omitempty" jsonschema:"Optional search text"`
	Limit       int    `json:"limit,omitempty" jsonschema:"Page size from 1 to 100; defaults to 50"`
	Cursor      string `json:"cursor,omitempty" jsonschema:"Opaque cursor returned by the previous page"`
}

type libraryEntryInput struct {
	CampaignID    string `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns"`
	ContentType   string `json:"contentType" jsonschema:"spell, item, equipment, rules, or the category returned by search_library"`
	EntryID       string `json:"entryId" jsonschema:"Stable ID returned by search_library"`
	LibrarySource string `json:"librarySource,omitempty" jsonschema:"user or standard; defaults to standard for spells and user for items"`
}

type compatibilityInput struct {
	CampaignID  string `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns"`
	CreatureID  string `json:"creatureId,omitempty" jsonschema:"Creature ID returned by search_creatures"`
	EncounterID string `json:"encounterId,omitempty" jsonschema:"Encounter ID returned by list_encounters"`
}

type exportCreatureInput struct {
	CampaignID     string `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns"`
	CreatureID     string `json:"creatureId" jsonschema:"Creature ID returned by search_creatures"`
	Output         string `json:"output,omitempty" jsonschema:"structured, yaml, or markdown; defaults to markdown"`
	Profile        string `json:"profile,omitempty" jsonschema:"Must be fantasy-statblocks-basic-5e@1 when set"`
	Layout         string `json:"layout,omitempty" jsonschema:"Must be Basic 5e Layout when set"`
	Strict         *bool  `json:"strict,omitempty" jsonschema:"Strict by default; false explicitly permits diagnostic partial output"`
	VaultImagePath string `json:"vaultImagePath,omitempty" jsonschema:"Optional safe Vault-relative image path"`
}

type exportEncounterInput struct {
	CampaignID   string `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns"`
	EncounterID  string `json:"encounterId" jsonschema:"Encounter ID returned by list_encounters"`
	Output       string `json:"output,omitempty" jsonschema:"structured, markdown, or obsidian-bundle"`
	Profile      string `json:"profile,omitempty" jsonschema:"Must be fantasy-statblocks-basic-5e@1 when set"`
	Layout       string `json:"layout,omitempty" jsonschema:"Must be Basic 5e Layout when set"`
	CreatureData string `json:"creatureData,omitempty" jsonschema:"snapshot or latest; defaults to latest"`
	Strict       *bool  `json:"strict,omitempty" jsonschema:"Strict by default; false explicitly permits diagnostic partial output"`
}

type evaluateInput struct {
	CampaignID          string                       `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns"`
	AllCampaignPlayers  bool                         `json:"allCampaignPlayers,omitempty" jsonschema:"Use every campaign player; mutually exclusive with playerIds"`
	PlayerIDs           []string                     `json:"playerIds,omitempty" jsonschema:"Explicit IDs returned by list_players"`
	Enemies             []appdomain.EvaluateEnemyRef `json:"enemies" jsonschema:"Explicit creature IDs and quantities"`
	RequestedDifficulty string                       `json:"requestedDifficulty" jsonschema:"easy, medium, hard, or deadly"`
}

type generateInput struct {
	CampaignID           string                      `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns"`
	IdempotencyKey       string                      `json:"idempotencyKey" jsonschema:"Caller-stable unique key for this intended creation"`
	Name                 string                      `json:"name,omitempty" jsonschema:"Optional encounter name"`
	Description          string                      `json:"description,omitempty" jsonschema:"Optional authored encounter purpose or setup"`
	LocationID           string                      `json:"locationId,omitempty" jsonschema:"Optional location ID returned by list_locations"`
	RoomNumber           string                      `json:"roomNumber,omitempty"`
	AllCampaignPlayers   bool                        `json:"allCampaignPlayers,omitempty"`
	PlayerIDs            []string                    `json:"playerIds,omitempty"`
	AddPlayersToRoster   *bool                       `json:"addPlayersToRoster,omitempty"`
	Options              generation.EncounterOptions `json:"options"`
	Seed                 int                         `json:"seed,omitempty"`
	RequiredCreatureIDs  []string                    `json:"requiredCreatureIds,omitempty"`
	ForbiddenCreatureIDs []string                    `json:"forbiddenCreatureIds,omitempty"`
	AllowedSourceKeys    []string                    `json:"allowedSourceKeys,omitempty"`
	MinimumEnemyBodies   int                         `json:"minimumEnemyBodies,omitempty"`
	MaximumEnemyBodies   int                         `json:"maximumEnemyBodies,omitempty"`
	NarrativePurpose     string                      `json:"narrativePurpose,omitempty"`
	RoomTheme            string                      `json:"roomTheme,omitempty"`
}

type regenerateInput struct {
	CampaignID           string                      `json:"campaignId"`
	EncounterID          string                      `json:"encounterId"`
	IdempotencyKey       string                      `json:"idempotencyKey"`
	ExpectedRevision     int                         `json:"expectedRevision"`
	Options              generation.EncounterOptions `json:"options"`
	Seed                 int                         `json:"seed,omitempty"`
	FreshSeed            bool                        `json:"freshSeed,omitempty"`
	PreserveCombatantIDs []string                    `json:"preserveCombatantIds,omitempty"`
	PreserveCreatureIDs  []string                    `json:"preserveCreatureIds,omitempty"`
	ReplaceManagedOnly   *bool                       `json:"replaceManagedCombatantsOnly,omitempty"`
	RequiredCreatureIDs  []string                    `json:"requiredCreatureIds,omitempty"`
	ForbiddenCreatureIDs []string                    `json:"forbiddenCreatureIds,omitempty"`
	AllowedSourceKeys    []string                    `json:"allowedSourceKeys,omitempty"`
	MinimumEnemyBodies   int                         `json:"minimumEnemyBodies,omitempty"`
	MaximumEnemyBodies   int                         `json:"maximumEnemyBodies,omitempty"`
}

type restoreInput struct {
	CampaignID       string `json:"campaignId"`
	EncounterID      string `json:"encounterId"`
	Revision         int    `json:"revision"`
	ExpectedRevision int    `json:"expectedRevision"`
	IdempotencyKey   string `json:"idempotencyKey"`
}

type authoredEncounterInput struct {
	CampaignID string                     `json:"campaignId"`
	Encounter  appdomain.EncounterCommand `json:"encounter"`
}

type updateEncounterInput struct {
	CampaignID  string                           `json:"campaignId"`
	EncounterID string                           `json:"encounterId"`
	Encounter   appdomain.UpdateEncounterCommand `json:"encounter"`
}

type createLocationInput struct {
	CampaignID string                    `json:"campaignId"`
	Location   appdomain.LocationCommand `json:"location"`
}

type updateLocationInput struct {
	CampaignID string                    `json:"campaignId"`
	LocationID string                    `json:"locationId"`
	Location   appdomain.LocationCommand `json:"location"`
}

type createNPCInput struct {
	CampaignID string               `json:"campaignId"`
	NPC        appdomain.NPCCommand `json:"npc"`
}

type updateNPCInput struct {
	CampaignID string               `json:"campaignId"`
	NPCID      string               `json:"npcId"`
	NPC        appdomain.NPCCommand `json:"npc"`
}

type npcLinkInput struct {
	CampaignID string                   `json:"campaignId"`
	Link       appdomain.NPCLinkCommand `json:"link"`
}

type locationLinkInput struct {
	CampaignID string                        `json:"campaignId"`
	Link       appdomain.LocationLinkCommand `json:"link"`
}

type campaignChangesPreviewInput struct {
	CampaignID string `json:"campaignId"`
	Changes    struct {
		Changes []appdomain.CampaignChange `json:"changes"`
	} `json:"changes"`
}

type campaignChangesApplyInput struct {
	CampaignID string `json:"campaignId"`
	Changes    struct {
		IdempotencyKey string                     `json:"idempotencyKey"`
		PreviewToken   string                     `json:"previewToken"`
		Changes        []appdomain.CampaignChange `json:"changes"`
	} `json:"changes"`
}

type rollTableInput struct {
	CampaignID string                     `json:"campaignId"`
	Table      appdomain.RollTableCommand `json:"table"`
}

type rollTableIDInput struct {
	CampaignID string `json:"campaignId" jsonschema:"Campaign ID returned by list_campaigns"`
	TableID    string `json:"tableId" jsonschema:"Roll table ID returned by list_roll_tables"`
	Roll       int    `json:"roll,omitempty" jsonschema:"Optional explicit in-range roll"`
	Seed       string `json:"seed,omitempty" jsonschema:"Caller-stable seed used when roll is omitted"`
}

type updateRollTableInput struct {
	CampaignID string                     `json:"campaignId"`
	TableID    string                     `json:"tableId"`
	Table      appdomain.RollTableCommand `json:"table"`
}

type travelInput struct {
	CampaignID  string                             `json:"campaignId"`
	Calculation appdomain.TravelCalculationCommand `json:"calculation"`
}

type journeyInput struct {
	CampaignID string                   `json:"campaignId"`
	Journey    appdomain.JourneyCommand `json:"journey"`
}

type dungeonPreviewInput struct {
	CampaignID string                     `json:"campaignId"`
	Settings   generation.DungeonSettings `json:"settings"`
}

type saveDungeonInput struct {
	CampaignID string                   `json:"campaignId"`
	Dungeon    appdomain.DungeonCommand `json:"dungeon"`
}

type completedRunInput struct {
	CampaignID string `json:"campaignId"`
	RunID      string `json:"runId" jsonschema:"Completed run ID returned by get_campaign_continuity_context"`
}

type shopStockPreviewInput struct {
	CampaignID string `json:"campaignId"`
	Changes    struct {
		Stock []appdomain.ShopStockCommand `json:"stock"`
	} `json:"changes"`
}

type shopStockApplyInput struct {
	CampaignID string `json:"campaignId"`
	Changes    struct {
		IdempotencyKey string                       `json:"idempotencyKey"`
		PreviewToken   string                       `json:"previewToken"`
		Stock          []appdomain.ShopStockCommand `json:"stock"`
	} `json:"changes"`
}
