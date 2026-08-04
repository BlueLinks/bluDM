package httpapi

import (
	"errors"

	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
)

var errInvalidMarkdownEncounter = errors.New("invalid Markdown encounter")

type markdownEncounterRequest struct {
	Markdown   string `json:"markdown"`
	SourcePath string `json:"sourcePath"`
}

type markdownEncounterPreview struct {
	SourcePath string                    `json:"sourcePath"`
	CanImport  bool                      `json:"canImport"`
	Encounters []markdownEncounterChange `json:"encounters"`
}

type markdownEncounterChange struct {
	BlockID             string                        `json:"blockId"`
	Line                int                           `json:"line"`
	Name                string                        `json:"name"`
	Description         string                        `json:"description"`
	Status              string                        `json:"status"`
	Location            string                        `json:"location"`
	LocationID          string                        `json:"locationId,omitempty"`
	Room                string                        `json:"room"`
	Loot                string                        `json:"loot"`
	Operation           string                        `json:"operation"`
	ExistingEncounterID string                        `json:"existingEncounterId,omitempty"`
	Combatants          []markdownCombatantResolution `json:"combatants"`
	Warnings            []string                      `json:"warnings"`
	Errors              []string                      `json:"errors"`
}

type markdownCombatantResolution struct {
	Name       string `json:"name"`
	Side       string `json:"side"`
	Quantity   int    `json:"quantity"`
	Source     string `json:"source"`
	ResolvedID string `json:"resolvedId,omitempty"`
	ArmorClass int    `json:"armorClass"`
	HitPoints  int    `json:"hitPoints"`
	RolledHP   bool   `json:"rolledHp"`
}

type preparedMarkdownImport struct {
	Preview markdownEncounterPreview
	Inputs  []store.MarkdownEncounterImportInput
}

type resolvedMarkdownCombatant struct {
	Preview markdownCombatantResolution
	Inputs  []store.EncounterCombatantInput
}

type markdownImportResponse struct {
	Encounters []models.Encounter `json:"encounters"`
	Operations []string           `json:"operations"`
}
