package app

import (
	"bludm/backend/internal/app/statblocks"
	"bludm/backend/internal/models"
)

// EncounterExport is the transport-neutral representation used by browser,
// external API, and MCP export endpoints.
type EncounterExport struct {
	Profile           string                           `json:"profile"`
	Output            string                           `json:"output"`
	AppURL            string                           `json:"appUrl"`
	ExportURL         string                           `json:"exportUrl"`
	Encounter         models.Encounter                 `json:"encounter"`
	CreatureData      string                           `json:"creatureData"`
	Roster            []EncounterExportRoster          `json:"roster"`
	Results           []statblocks.Result              `json:"results"`
	Compatibility     []statblocks.CompatibilityReport `json:"compatibility"`
	OmittedCombatants []EncounterExportOmission        `json:"omittedCombatants"`
	Warnings          []string                         `json:"warnings"`
	Markdown          string                           `json:"markdown,omitempty"`
	EncounterMarkdown string                           `json:"encounterMarkdown,omitempty"`
	BundleMarkdown    string                           `json:"bundleMarkdown,omitempty"`
}

type EncounterExportOmission struct {
	CombatantID string `json:"combatantId"`
	Name        string `json:"name"`
	Side        string `json:"side"`
	Reason      string `json:"reason"`
}

type EncounterExportRoster struct {
	CreatureID string         `json:"creatureId"`
	Name       string         `json:"name"`
	Quantity   int            `json:"quantity"`
	Sides      map[string]int `json:"sides"`
}
