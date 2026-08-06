package app

import (
	"testing"

	dbmodels "bludm/backend/internal/db"
	"bludm/backend/internal/models"
	"bludm/backend/internal/rulesets"
)

func TestPersistedEncounterRulesetWinsAfterCampaignChanges(t *testing.T) {
	campaign := models.Campaign{
		AllowedStandardSources: []string{rulesets.Source2024},
		EncounterRuleset:       rulesets.Encounter2024,
	}
	encounter := dbmodels.EncounterEntity{DifficultyRuleset: rulesets.Encounter2014}

	got, err := persistedEncounterRuleset(encounter, campaign)
	if err != nil || got != rulesets.Encounter2014 {
		t.Fatalf("persistedEncounterRuleset() = %q, %v; want historical 2014 rules", got, err)
	}
}
