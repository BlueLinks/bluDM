package app

import (
	"context"

	"bludm/backend/internal/models"
	"bludm/backend/internal/store"

	"gorm.io/gorm"
)

type EncounterMarkdownImportResult struct {
	Encounters        []models.Encounter `json:"encounters"`
	Operations        []string           `json:"operations"`
	AppURLs           []string           `json:"appUrls"`
	Warnings          []string           `json:"warnings"`
	IdempotencyReplay bool               `json:"idempotencyReplay"`
}

type WorldMarkdownImportResult struct {
	NPCs              []store.MarkdownNPCImportResult     `json:"npcs"`
	Dungeons          []store.MarkdownDungeonImportResult `json:"dungeons"`
	AppURLs           []string                            `json:"appUrls"`
	Warnings          []string                            `json:"warnings"`
	IdempotencyReplay bool                                `json:"idempotencyReplay"`
}

func (s *Service) ImportMarkdownEncounters(
	ctx context.Context,
	campaignID string,
	idempotencyKey string,
	inputs []store.MarkdownEncounterImportInput,
) (EncounterMarkdownImportResult, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeContentImport, ScopeEncountersWrite)
	if err != nil {
		return EncounterMarkdownImportResult{}, err
	}
	inputHash, err := normalizedHash(inputs)
	if err != nil {
		return EncounterMarkdownImportResult{}, err
	}
	result := EncounterMarkdownImportResult{}
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[EncounterMarkdownImportResult](
			ctx, tx, principal, "import_encounter_markdown", idempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			result = replay
			result.IdempotencyReplay = true
			return nil
		}
		results, err := store.New(tx).Encounters.ImportMarkdown(
			ctx, principal.UserID, campaignID, inputs,
		)
		if err != nil {
			return err
		}
		result.Encounters = make([]models.Encounter, 0, len(results))
		result.Operations = make([]string, 0, len(results))
		result.AppURLs = make([]string, 0, len(results))
		result.Warnings = []string{}
		for _, imported := range results {
			result.Encounters = append(result.Encounters, imported.Encounter)
			result.Operations = append(result.Operations, imported.Operation)
			result.AppURLs = append(result.AppURLs, s.AppURL(
				"/campaigns/"+campaignID+"/encounters/"+imported.Encounter.ID,
			))
		}
		return saveIdempotency(
			ctx, tx, principal, "import_encounter_markdown", idempotencyKey, inputHash, result,
		)
	})
	return result, err
}

func (s *Service) ImportMarkdownWorld(
	ctx context.Context,
	campaignID string,
	idempotencyKey string,
	npcs []store.MarkdownNPCImportInput,
	dungeons []store.MarkdownDungeonImportInput,
) (WorldMarkdownImportResult, error) {
	principal, err := s.authorize(
		ctx, campaignID, ScopeContentImport, ScopeWorldWrite, ScopeLibraryWrite, ScopeEncountersWrite,
	)
	if err != nil {
		return WorldMarkdownImportResult{}, err
	}
	inputHash, err := normalizedHash(map[string]any{"npcs": npcs, "dungeons": dungeons})
	if err != nil {
		return WorldMarkdownImportResult{}, err
	}
	result := WorldMarkdownImportResult{}
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		replay, found, err := idempotencyReplay[WorldMarkdownImportResult](
			ctx, tx, principal, "import_world_markdown", idempotencyKey, inputHash,
		)
		if err != nil {
			return err
		}
		if found {
			result = replay
			result.IdempotencyReplay = true
			return nil
		}
		imported, err := store.New(tx).MarkdownWorld.Import(
			ctx, principal.UserID, campaignID, npcs, dungeons,
		)
		if err != nil {
			return err
		}
		result.NPCs = imported.NPCs
		result.Dungeons = imported.Dungeons
		result.AppURLs = []string{s.AppURL("/campaigns/" + campaignID + "/world")}
		result.Warnings = []string{}
		return saveIdempotency(
			ctx, tx, principal, "import_world_markdown", idempotencyKey, inputHash, result,
		)
	})
	return result, err
}
