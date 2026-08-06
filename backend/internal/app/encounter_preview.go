package app

import (
	"context"

	"bludm/backend/internal/generation"
)

func (s *Service) PreviewGeneratedEncounter(
	ctx context.Context,
	campaignID string,
	command GenerateEncounterCommand,
) (generation.EncounterPreview, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeGenerationRun)
	if err != nil {
		return generation.EncounterPreview{}, err
	}
	command, err = normalizeGenerateEncounterCommand(command)
	if err != nil {
		return generation.EncounterPreview{}, err
	}
	players, err := s.resolvePlayers(
		ctx, principal, campaignID, command.AllCampaignPlayers, command.PlayerIDs,
	)
	if err != nil {
		return generation.EncounterPreview{}, err
	}
	campaign, err := s.stores.Campaigns.ByID(ctx, principal.UserID, campaignID)
	if err != nil {
		return generation.EncounterPreview{}, storeError(err, "campaign")
	}
	ruleset, err := campaignEncounterRuleset(campaign)
	if err != nil {
		return generation.EncounterPreview{}, err
	}
	command.Options.Challenge, err = normalizeDifficultyForRuleset(ruleset, command.Options.Challenge)
	if err != nil {
		return generation.EncounterPreview{}, err
	}
	location, err := s.generationLocation(ctx, principal, campaignID, command.LocationID)
	if err != nil {
		return generation.EncounterPreview{}, err
	}
	creatures, err := s.generationCreatures(ctx, principal, campaign, command)
	if err != nil {
		return generation.EncounterPreview{}, err
	}
	preview := generation.GenerateEncounterForRuleset(
		ruleset, creatures, location, command.Options, players, command.Seed,
	)
	return enforceRequiredCreatures(
		preview, creatures, command.RequiredCreatureIDs, players, command.Options.Challenge, ruleset,
	)
}
