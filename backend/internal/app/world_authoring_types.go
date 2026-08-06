package app

import (
	"time"

	"bludm/backend/internal/generation"
	"bludm/backend/internal/models"
)

type LocationCommand struct {
	IdempotencyKey    string         `json:"idempotencyKey"`
	ExpectedUpdatedAt *time.Time     `json:"expectedUpdatedAt,omitempty"`
	ParentLocationID  string         `json:"parentLocationId,omitempty"`
	Name              string         `json:"name"`
	LocationType      string         `json:"locationType"`
	CustomTypeLabel   string         `json:"customTypeLabel,omitempty"`
	Summary           string         `json:"summary,omitempty"`
	Notes             string         `json:"notes,omitempty"`
	PublicNotes       string         `json:"publicNotes,omitempty"`
	DMNotes           string         `json:"dmNotes,omitempty"`
	Tags              []string       `json:"tags,omitempty"`
	SortOrder         int            `json:"sortOrder,omitempty"`
	Status            string         `json:"status,omitempty"`
	MapAnchor         map[string]any `json:"mapAnchor,omitempty"`
}

// AuthoringWriteMetadata is embedded into write results so existing entity
// fields remain at the JSON root while external clients also receive the
// transport-neutral write evidence required to reason about retries.
type AuthoringWriteMetadata struct {
	Operation         string   `json:"operation"`
	AppURL            string   `json:"appUrl"`
	Warnings          []string `json:"warnings"`
	IdempotencyReplay bool     `json:"idempotencyReplay"`
}

type LocationWriteResult struct {
	models.CampaignLocation
	AuthoringWriteMetadata
}

type NPCWriteResult struct {
	models.Creature
	Actions      []models.CreatureAction            `json:"actions"`
	Spellcasting models.CreatureSpellcastingProfile `json:"spellcasting"`
	AuthoringWriteMetadata
}

type NPCLinkWriteResult struct {
	models.CampaignNpcLocationLink
	AuthoringWriteMetadata
}

type LocationLinkWriteResult struct {
	models.CampaignLocationLink
	AuthoringWriteMetadata
}

type RollTableWriteResult struct {
	models.RollTable
	AuthoringWriteMetadata
}

type JourneyWriteResult struct {
	models.CampaignJourney
	AuthoringWriteMetadata
}

type NPCCommand struct {
	IdempotencyKey    string                  `json:"idempotencyKey"`
	ExpectedUpdatedAt *time.Time              `json:"expectedUpdatedAt,omitempty"`
	Name              string                  `json:"name"`
	Description       string                  `json:"description,omitempty"`
	Size              string                  `json:"size"`
	CreatureType      string                  `json:"creatureType"`
	Alignment         string                  `json:"alignment,omitempty"`
	ArmorClass        int                     `json:"armorClass"`
	HitPoints         int                     `json:"hitPoints"`
	HitDice           string                  `json:"hitDice"`
	ChallengeRating   string                  `json:"challengeRating"`
	XP                int                     `json:"xp"`
	AvatarURL         string                  `json:"avatarUrl,omitempty"`
	StatBlock         map[string]any          `json:"statBlock"`
	Disposition       string                  `json:"disposition,omitempty"`
	Actions           *[]NPCActionCommand     `json:"actions,omitempty" jsonschema:"When supplied, atomically replace the NPC's complete typed action list; use an empty array to clear it"`
	Spellcasting      *NPCSpellcastingCommand `json:"spellcasting,omitempty" jsonschema:"When supplied, atomically replace the NPC's spellcasting profile and attached spells"`
}

type NPCActionCommand struct {
	Name            string                 `json:"name"`
	Description     string                 `json:"description,omitempty"`
	Recharge        string                 `json:"recharge,omitempty"`
	LimitedUses     int                    `json:"limitedUses,omitempty"`
	LimitType       string                 `json:"limitType,omitempty" jsonschema:"day or turn; defaults to day"`
	Reach           int                    `json:"reach,omitempty"`
	Range           int                    `json:"range,omitempty"`
	AOEType         string                 `json:"aoeType,omitempty"`
	AOESize         int                    `json:"aoeSize,omitempty"`
	ActionType      string                 `json:"actionType,omitempty" jsonschema:"melee_weapon, ranged_weapon, spell_attack, save, damage, healing, or other"`
	DisplaySection  string                 `json:"displaySection,omitempty" jsonschema:"trait, action, bonus_action, reaction, legendary_action, mythic_action, or lair_action"`
	AttackModifier  int                    `json:"attackModifier,omitempty"`
	MissEffect      string                 `json:"missEffect,omitempty" jsonschema:"none, half, or full; defaults to none"`
	HitSpecialEvent string                 `json:"hitSpecialEvent,omitempty"`
	Rolls           []NPCActionRollCommand `json:"rolls,omitempty"`
}

type NPCActionRollCommand struct {
	RollKind   string `json:"rollKind,omitempty" jsonschema:"damage, healing, or another supported combat roll kind"`
	DamageType string `json:"damageType,omitempty"`
	Magical    bool   `json:"magical,omitempty"`
	DiceCount  int    `json:"diceCount,omitempty"`
	DieSize    int    `json:"dieSize,omitempty"`
	FixedValue int    `json:"fixedValue,omitempty"`
}

type NPCSpellcastingCommand struct {
	SpellcastingAbility       string                     `json:"spellcastingAbility,omitempty"`
	InnateSpellcastingAbility string                     `json:"innateSpellcastingAbility,omitempty"`
	CasterLevel               int                        `json:"casterLevel,omitempty"`
	SpellSaveDC               int                        `json:"spellSaveDC,omitempty"`
	SpellAttackBonus          int                        `json:"spellAttackBonus,omitempty"`
	Slots                     map[string]any             `json:"slots"`
	Spells                    []NPCSpellReferenceCommand `json:"spells"`
}

type NPCSpellReferenceCommand struct {
	SpellID       string `json:"spellId" jsonschema:"Spell ID returned by search_library"`
	LibrarySource string `json:"librarySource" jsonschema:"standard or user"`
	SpellLevel    int    `json:"spellLevel"`
	Prepared      bool   `json:"prepared,omitempty"`
	Innate        bool   `json:"innate,omitempty"`
}

type NPCLinkCommand struct {
	IdempotencyKey string `json:"idempotencyKey"`
	CreatureID     string `json:"creatureId"`
	LocationID     string `json:"locationId"`
	LinkType       string `json:"linkType,omitempty"`
	Visibility     string `json:"visibility,omitempty"`
	Notes          string `json:"notes,omitempty"`
}

type LocationLinkCommand struct {
	IdempotencyKey   string `json:"idempotencyKey"`
	SourceLocationID string `json:"sourceLocationId"`
	TargetLocationID string `json:"targetLocationId"`
	LinkType         string `json:"linkType"`
	Label            string `json:"label,omitempty"`
	Direction        string `json:"direction,omitempty"`
	Visibility       string `json:"visibility,omitempty"`
	Notes            string `json:"notes,omitempty"`
}

type RollTableCommand struct {
	IdempotencyKey    string                `json:"idempotencyKey"`
	ExpectedUpdatedAt *time.Time            `json:"expectedUpdatedAt,omitempty"`
	Name              string                `json:"name"`
	Description       string                `json:"description,omitempty"`
	Category          string                `json:"category"`
	Tags              []string              `json:"tags,omitempty"`
	DieExpression     string                `json:"dieExpression"`
	Rows              []RollTableRowCommand `json:"rows"`
}

type RollTableRowCommand struct {
	MinRoll    int    `json:"minRoll"`
	MaxRoll    int    `json:"maxRoll"`
	Label      string `json:"label"`
	ResultText string `json:"resultText"`
	Notes      string `json:"notes,omitempty"`
}

type JourneyCommand struct {
	IdempotencyKey        string               `json:"idempotencyKey"`
	Name                  string               `json:"name"`
	Origin                string               `json:"origin"`
	Destination           string               `json:"destination"`
	Distance              float64              `json:"distance"`
	DistanceUnit          string               `json:"distanceUnit"`
	Terrain               string               `json:"terrain"`
	Pace                  string               `json:"pace"`
	GoodRoads             bool                 `json:"goodRoads"`
	EncounterDistanceFeet *int                 `json:"encounterDistanceFeet,omitempty"`
	Weather               models.TravelWeather `json:"weather"`
	RouteInputMode        string               `json:"routeInputMode,omitempty"`
}

type TravelCalculationCommand struct {
	Distance     float64 `json:"distance"`
	DistanceUnit string  `json:"distanceUnit"`
	Terrain      string  `json:"terrain"`
	Pace         string  `json:"pace"`
	GoodRoads    bool    `json:"goodRoads"`
}

type TravelCalculation struct {
	DistanceMiles      float64  `json:"distanceMiles"`
	DurationHours      float64  `json:"durationHours"`
	DurationDays       float64  `json:"durationDays"`
	EffectivePace      string   `json:"effectivePace"`
	MilesPerDay        float64  `json:"milesPerDay"`
	TerrainMaximumPace string   `json:"terrainMaximumPace"`
	EncounterDistance  string   `json:"encounterDistance"`
	Assumptions        []string `json:"assumptions"`
	Ruleset            string   `json:"ruleset"`
}

type DungeonCommand struct {
	IdempotencyKey   string                     `json:"idempotencyKey"`
	Name             string                     `json:"name"`
	Summary          string                     `json:"summary,omitempty"`
	ParentLocationID string                     `json:"parentLocationId,omitempty"`
	Settings         generation.DungeonSettings `json:"settings"`
}

type DungeonPreview struct {
	Document generation.DungeonDocument `json:"document"`
	Warnings []string                   `json:"warnings"`
}

type SavedDungeon struct {
	Location          models.CampaignLocation    `json:"location"`
	Rooms             []models.CampaignLocation  `json:"rooms"`
	Map               models.CampaignMap         `json:"map"`
	Document          generation.DungeonDocument `json:"document"`
	AppURL            string                     `json:"appUrl"`
	Operation         string                     `json:"operation"`
	Warnings          []string                   `json:"warnings"`
	IdempotencyReplay bool                       `json:"idempotencyReplay"`
}

type ShopStockCommand struct {
	LocationID    string `json:"locationId"`
	ItemID        string `json:"itemId"`
	LibrarySource string `json:"librarySource"`
	Quantity      int    `json:"quantity"`
	PriceAmount   int    `json:"priceAmount"`
	PriceUnit     string `json:"priceUnit"`
	Availability  string `json:"availability,omitempty"`
	Notes         string `json:"notes,omitempty"`
	SortOrder     int    `json:"sortOrder,omitempty"`
}

type ShopStockChangesCommand struct {
	IdempotencyKey string             `json:"idempotencyKey"`
	PreviewToken   string             `json:"previewToken,omitempty"`
	Stock          []ShopStockCommand `json:"stock"`
}

type CampaignChange struct {
	Operation string         `json:"operation"`
	ClientRef string         `json:"clientRef,omitempty"`
	Data      map[string]any `json:"data"`
}

type CampaignChangesCommand struct {
	IdempotencyKey string           `json:"idempotencyKey"`
	PreviewToken   string           `json:"previewToken,omitempty"`
	Changes        []CampaignChange `json:"changes"`
}

type CampaignChangesPreview struct {
	PreviewToken string           `json:"previewToken"`
	ExpiresAt    time.Time        `json:"expiresAt"`
	Changes      []CampaignChange `json:"changes"`
	Warnings     []string         `json:"warnings"`
}

type AppliedCampaignChanges struct {
	Applied           bool     `json:"applied"`
	Operations        []any    `json:"operations"`
	OperationCount    int      `json:"operationCount"`
	Operation         string   `json:"operation"`
	AppURL            string   `json:"appUrl"`
	Warnings          []string `json:"warnings"`
	IdempotencyReplay bool     `json:"idempotencyReplay"`
}

type AppliedShopStockChanges struct {
	Applied           bool                           `json:"applied"`
	Stock             []models.CampaignLocationStock `json:"stock"`
	OperationCount    int                            `json:"operationCount"`
	Operation         string                         `json:"operation"`
	AppURL            string                         `json:"appUrl"`
	Warnings          []string                       `json:"warnings"`
	IdempotencyReplay bool                           `json:"idempotencyReplay"`
}
