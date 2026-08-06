package app

import (
	"time"

	"bludm/backend/internal/generation"
	"bludm/backend/internal/models"
)

type GenerateEncounterCommand struct {
	IdempotencyKey       string                      `json:"idempotencyKey"`
	Name                 string                      `json:"name"`
	Description          string                      `json:"description"`
	LocationID           string                      `json:"locationId"`
	RoomNumber           string                      `json:"roomNumber"`
	AllCampaignPlayers   bool                        `json:"allCampaignPlayers"`
	PlayerIDs            []string                    `json:"playerIds"`
	AddPlayersToRoster   *bool                       `json:"addPlayersToRoster,omitempty"`
	Options              generation.EncounterOptions `json:"options"`
	Seed                 int                         `json:"seed"`
	RequiredCreatureIDs  []string                    `json:"requiredCreatureIds"`
	ForbiddenCreatureIDs []string                    `json:"forbiddenCreatureIds"`
	AllowedSourceKeys    []string                    `json:"allowedSourceKeys"`
	MinimumEnemyBodies   int                         `json:"minimumEnemyBodies"`
	MaximumEnemyBodies   int                         `json:"maximumEnemyBodies"`
	NarrativePurpose     string                      `json:"narrativePurpose"`
	RoomTheme            string                      `json:"roomTheme"`
}

type RegenerateEncounterCommand struct {
	IdempotencyKey       string                      `json:"idempotencyKey"`
	ExpectedRevision     int                         `json:"expectedRevision"`
	Options              generation.EncounterOptions `json:"options"`
	Seed                 int                         `json:"seed"`
	FreshSeed            bool                        `json:"freshSeed"`
	PreserveCombatantIDs []string                    `json:"preserveCombatantIds"`
	PreserveCreatureIDs  []string                    `json:"preserveCreatureIds"`
	ReplaceManagedOnly   *bool                       `json:"replaceManagedCombatantsOnly,omitempty"`
	RequiredCreatureIDs  []string                    `json:"requiredCreatureIds"`
	ForbiddenCreatureIDs []string                    `json:"forbiddenCreatureIds"`
	AllowedSourceKeys    []string                    `json:"allowedSourceKeys"`
	MinimumEnemyBodies   int                         `json:"minimumEnemyBodies"`
	MaximumEnemyBodies   int                         `json:"maximumEnemyBodies"`
}

type EncounterAuthoringResult struct {
	Encounter               models.Encounter              `json:"encounter"`
	Campaign                AuthoringCampaignSnapshot     `json:"campaign"`
	Location                *AuthoringLocationSnapshot    `json:"location,omitempty"`
	Revision                int                           `json:"revision"`
	AppURL                  string                        `json:"appUrl"`
	GeneratorVersion        string                        `json:"generatorVersion"`
	Seed                    int                           `json:"seed"`
	Preview                 generation.EncounterPreview   `json:"preview"`
	DifficultyEvidence      generation.DifficultyEvidence `json:"difficultyEvidence"`
	SelectedParty           []PartySummary                `json:"selectedParty"`
	ManagedCombatantIDs     []string                      `json:"managedCombatantIds"`
	CreatedCombatantCount   int                           `json:"createdCombatantCount"`
	PreservedCombatantCount int                           `json:"preservedCombatantCount"`
	ReplacedCombatantCount  int                           `json:"replacedCombatantCount"`
	Warnings                []string                      `json:"warnings"`
	ExportLinks             map[string]string             `json:"exportLinks"`
	IdempotencyReplay       bool                          `json:"idempotencyReplay"`
}

type AuthoringCampaignSnapshot struct {
	ID   string `json:"id"`
	Name string `json:"name,omitempty"`
}

type AuthoringLocationSnapshot struct {
	ID   string `json:"id"`
	Name string `json:"name,omitempty"`
}

type EncounterRevisionSummary struct {
	Revision         int            `json:"revision"`
	ChangeReason     string         `json:"changeReason"`
	GenerationInput  map[string]any `json:"generationInput"`
	GenerationOutput map[string]any `json:"generationOutput"`
	ActorUserID      string         `json:"actorUserId"`
	ActorTokenID     string         `json:"actorTokenId,omitempty"`
	CreatedAt        time.Time      `json:"createdAt"`
}

type EncounterWriteResult struct {
	models.Encounter
	AuthoringWriteMetadata
	ExportLinks map[string]string `json:"exportLinks"`
}

type RestoreRevisionCommand struct {
	IdempotencyKey   string `json:"idempotencyKey"`
	ExpectedRevision int    `json:"expectedRevision"`
}

type EncounterCommand struct {
	IdempotencyKey     string                      `json:"idempotencyKey"`
	PreviewFingerprint string                      `json:"previewFingerprint,omitempty"`
	ExpectedRevision   int                         `json:"expectedRevision,omitempty"`
	Name               string                      `json:"name"`
	Description        string                      `json:"description,omitempty"`
	Status             string                      `json:"status,omitempty"`
	LocationID         string                      `json:"locationId,omitempty"`
	Location           string                      `json:"location,omitempty"`
	RoomNumber         string                      `json:"roomNumber,omitempty"`
	LootNotes          string                      `json:"lootNotes,omitempty"`
	ReplaceRoster      bool                        `json:"replaceRoster,omitempty"`
	Combatants         []EncounterCombatantCommand `json:"combatants,omitempty"`
}

// UpdateEncounterCommand is deliberately separate from EncounterCommand: PATCH
// callers must be able to distinguish an omitted field from an explicit empty
// value. Roster replacement remains available, while the targeted operations let
// an agent change one row without discarding generator provenance on every other
// combatant.
type UpdateEncounterCommand struct {
	IdempotencyKey     string                           `json:"idempotencyKey"`
	ExpectedRevision   int                              `json:"expectedRevision"`
	Name               *string                          `json:"name,omitempty"`
	Description        *string                          `json:"description,omitempty"`
	Status             *string                          `json:"status,omitempty"`
	LocationID         *string                          `json:"locationId,omitempty"`
	Location           *string                          `json:"location,omitempty"`
	RoomNumber         *string                          `json:"roomNumber,omitempty"`
	LootNotes          *string                          `json:"lootNotes,omitempty"`
	ReplaceRoster      bool                             `json:"replaceRoster,omitempty"`
	Combatants         []EncounterCombatantCommand      `json:"combatants,omitempty"`
	AddCombatants      []EncounterCombatantCommand      `json:"addCombatants,omitempty"`
	UpdateCombatants   []EncounterCombatantPatchCommand `json:"updateCombatants,omitempty"`
	RemoveCombatantIDs []string                         `json:"removeCombatantIds,omitempty"`
}

type EncounterCombatantPatchCommand struct {
	CombatantID      string  `json:"combatantId"`
	CreatureID       *string `json:"creatureId,omitempty" jsonschema:"Replacement custom or enabled standard creature ID; refreshes the linked stat block while preserving this combatant row"`
	Side             *string `json:"side,omitempty"`
	DisplayName      *string `json:"displayName,omitempty"`
	AvatarURL        *string `json:"avatarUrl,omitempty"`
	ArmorClass       *int    `json:"armorClass,omitempty"`
	MaxHitPoints     *int    `json:"maxHitPoints,omitempty"`
	CurrentHitPoints *int    `json:"currentHitPoints,omitempty"`
	RolledHP         *bool   `json:"rolledHp,omitempty"`
}

type EncounterCombatantCommand struct {
	SourceType       string         `json:"sourceType"`
	PlayerID         string         `json:"playerId,omitempty"`
	CreatureID       string         `json:"creatureId,omitempty"`
	Side             string         `json:"side"`
	DisplayName      string         `json:"displayName,omitempty"`
	AvatarURL        string         `json:"avatarUrl,omitempty"`
	ArmorClass       int            `json:"armorClass,omitempty"`
	MaxHitPoints     int            `json:"maxHitPoints,omitempty"`
	CurrentHitPoints int            `json:"currentHitPoints,omitempty"`
	RolledHP         bool           `json:"rolledHp,omitempty"`
	Snapshot         map[string]any `json:"snapshot,omitempty"`
}

func encounterExportLinks(campaignID, encounterID string) map[string]string {
	return map[string]string{
		"markdown": "/api/external/v1/encounters/" + encounterID + "/markdown",
		"obsidianBundle": "/api/external/v1/campaigns/" + campaignID +
			"/encounters/" + encounterID + "/exports/obsidian-bundle",
	}
}
