package app

import (
	"context"
	"strconv"
	"strings"

	"bludm/backend/internal/app/statblocks"
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
)

type CreatureDetails struct {
	Creature     models.Creature                    `json:"creature"`
	Actions      []models.CreatureAction            `json:"actions"`
	Spellcasting models.CreatureSpellcastingProfile `json:"spellcasting"`
	CampaignIDs  []string                           `json:"campaignIds"`
	AppURL       string                             `json:"appUrl"`
}

type LibrarySearchResult struct {
	Creatures []CreatureSummary     `json:"creatures,omitempty"`
	Spells    []SpellSummary        `json:"spells,omitempty"`
	Items     []ItemSummary         `json:"items,omitempty"`
	Entries   []LibraryEntrySummary `json:"entries,omitempty"`
}

type CreatureSummary struct {
	models.Creature
	AppURL string `json:"appUrl"`
}

type SpellSummary struct {
	models.Spell
	AppURL string `json:"appUrl"`
}

type ItemSummary struct {
	models.Item
	AppURL string `json:"appUrl"`
}

type LibraryEntrySummary struct {
	models.StandardLibraryEntry
	AppURL string `json:"appUrl"`
}

type LibraryEntryResult struct {
	ContentType   string                       `json:"contentType"`
	LibrarySource string                       `json:"librarySource"`
	Spell         *models.Spell                `json:"spell,omitempty"`
	Item          *models.Item                 `json:"item,omitempty"`
	Entry         *models.StandardLibraryEntry `json:"entry,omitempty"`
	AppURL        string                       `json:"appUrl"`
}

type CreatureSearchFilters struct {
	Query        string   `json:"query,omitempty"`
	CreatureType string   `json:"creatureType,omitempty"`
	MinimumCR    *float64 `json:"minimumCr,omitempty"`
	MaximumCR    *float64 `json:"maximumCr,omitempty"`
	SourceKey    string   `json:"sourceKey,omitempty"`
}

func (s *Service) SearchCreatures(
	ctx context.Context,
	campaignID string,
	query string,
) ([]CreatureSummary, error) {
	return s.SearchCreaturesWithFilters(ctx, campaignID, CreatureSearchFilters{Query: query})
}

func (s *Service) SearchCreaturesWithFilters(
	ctx context.Context,
	campaignID string,
	filters CreatureSearchFilters,
) ([]CreatureSummary, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeLibraryRead)
	if err != nil {
		return nil, err
	}
	campaign, err := s.stores.Campaigns.ByID(ctx, principal.UserID, campaignID)
	if err != nil {
		return nil, storeError(err, "campaign")
	}
	if filters.MinimumCR != nil && filters.MaximumCR != nil && *filters.MinimumCR > *filters.MaximumCR {
		return nil, ValidationError(
			"invalid_cr_range", "minimumCr cannot exceed maximumCr", nil,
		)
	}
	values, err := s.stores.Creatures.List(
		ctx, principal.UserID, strings.TrimSpace(filters.Query), true, true,
		campaign.AllowedStandardSources,
	)
	if err != nil {
		return nil, err
	}
	result := make([]CreatureSummary, 0, len(values))
	for _, value := range values {
		if filters.CreatureType != "" && !strings.EqualFold(value.CreatureType, filters.CreatureType) {
			continue
		}
		if filters.SourceKey != "" && !strings.EqualFold(value.SourceKey, filters.SourceKey) {
			continue
		}
		cr, valid := parseChallengeRating(value.ChallengeRating)
		if filters.MinimumCR != nil && (!valid || cr < *filters.MinimumCR) {
			continue
		}
		if filters.MaximumCR != nil && (!valid || cr > *filters.MaximumCR) {
			continue
		}
		result = append(result, CreatureSummary{
			Creature: value, AppURL: s.AppURL("/creatures/" + value.ID),
		})
	}
	return result, nil
}

func parseChallengeRating(value string) (float64, bool) {
	value = strings.TrimSpace(value)
	if numerator, denominator, found := strings.Cut(value, "/"); found {
		top, topErr := strconv.ParseFloat(strings.TrimSpace(numerator), 64)
		bottom, bottomErr := strconv.ParseFloat(strings.TrimSpace(denominator), 64)
		return top / bottom, topErr == nil && bottomErr == nil && bottom != 0
	}
	parsed, err := strconv.ParseFloat(value, 64)
	return parsed, err == nil
}

func (s *Service) GetCreature(
	ctx context.Context,
	campaignID string,
	creatureID string,
) (CreatureDetails, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeLibraryRead)
	if err != nil {
		return CreatureDetails{}, err
	}
	campaign, err := s.stores.Campaigns.ByID(ctx, principal.UserID, campaignID)
	if err != nil {
		return CreatureDetails{}, storeError(err, "campaign")
	}
	creature, err := s.stores.Creatures.ByID(ctx, principal.UserID, creatureID)
	actions := []models.CreatureAction{}
	profile := models.CreatureSpellcastingProfile{Slots: map[string]any{}, Spells: []models.CreatureSpell{}}
	campaignIDs := []string{}
	if err == nil {
		actions, err = s.stores.Actions.ListCreatureActions(ctx, principal.UserID, creature.ID)
		if err != nil {
			return CreatureDetails{}, err
		}
		profile, err = s.stores.Spellcasts.Profile(ctx, principal.UserID, creature.ID)
		if err != nil {
			return CreatureDetails{}, err
		}
		campaigns, err := s.stores.Campaigns.CampaignsForCreature(ctx, principal.UserID, creature.ID)
		if err != nil {
			return CreatureDetails{}, err
		}
		for _, linked := range campaigns {
			campaignIDs = append(campaignIDs, linked.ID)
		}
	} else if store.IsNotFound(err) {
		creature, err = s.stores.Creatures.StandardByID(ctx, creatureID)
		if err != nil || !stringAllowed(creature.SourceKey, campaign.AllowedStandardSources) {
			return CreatureDetails{}, NewError(CodeNotFound, "creature not found", nil)
		}
	} else {
		return CreatureDetails{}, err
	}
	return CreatureDetails{
		Creature: creature, Actions: actions, Spellcasting: profile, CampaignIDs: campaignIDs,
		AppURL: s.AppURL("/creatures/" + creature.ID),
	}, nil
}

func (s *Service) ExportCreature(
	ctx context.Context,
	campaignID string,
	creatureID string,
	vaultImagePath string,
	allowPartial bool,
) (statblocks.Result, error) {
	details, err := s.GetCreature(ctx, campaignID, creatureID)
	if err != nil {
		return statblocks.Result{}, err
	}
	result, err := statblocks.BuildAndRender(statblocks.BuildInput{
		Creature: details.Creature, Actions: details.Actions,
		Spellcasting: details.Spellcasting, VaultImagePath: vaultImagePath,
	}, allowPartial)
	result.AppURL = details.AppURL
	result.ExportURL = s.AppURL(
		"/api/external/v1/campaigns/" + campaignID + "/library/creatures/" +
			creatureID + "/exports/fantasy-statblocks",
	)
	if err != nil {
		return result, NewError(CodeUnsupported, err.Error(), map[string]any{
			"compatibility": result.Compatibility,
		})
	}
	return result, nil
}

func (s *Service) SearchLibrary(
	ctx context.Context,
	campaignID string,
	contentType string,
	query string,
) (LibrarySearchResult, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeLibraryRead)
	if err != nil {
		return LibrarySearchResult{}, err
	}
	campaign, err := s.stores.Campaigns.ByID(ctx, principal.UserID, campaignID)
	if err != nil {
		return LibrarySearchResult{}, storeError(err, "campaign")
	}
	result := LibrarySearchResult{}
	creatures := []models.Creature{}
	spells := []models.Spell{}
	items := []models.Item{}
	entries := []models.StandardLibraryEntry{}
	switch contentType {
	case "", "all":
		creatures, err = s.stores.Creatures.List(
			ctx, principal.UserID, query, true, true, campaign.AllowedStandardSources,
		)
		if err == nil {
			spells, err = s.stores.Spells.List(
				ctx, principal.UserID, query, -1, true, true, campaign.AllowedStandardSources,
			)
		}
		if err == nil {
			items, err = s.stores.Items.List(ctx, principal.UserID, query, "")
		}
	case "creature", "creatures":
		creatures, err = s.stores.Creatures.List(
			ctx, principal.UserID, query, true, true, campaign.AllowedStandardSources,
		)
	case "spell", "spells":
		spells, err = s.stores.Spells.List(
			ctx, principal.UserID, query, -1, true, true, campaign.AllowedStandardSources,
		)
	case "item", "items":
		items, err = s.stores.Items.List(ctx, principal.UserID, query, "")
	default:
		entries, err = s.stores.Library.ListEntries(ctx, store.StandardLibraryFilters{
			Category: contentType, Query: query, Sources: campaign.AllowedStandardSources,
		})
	}
	if err != nil {
		return result, err
	}
	for _, creature := range creatures {
		result.Creatures = append(result.Creatures, CreatureSummary{
			Creature: creature, AppURL: s.AppURL("/creatures/" + creature.ID),
		})
	}
	for _, spell := range spells {
		result.Spells = append(result.Spells, SpellSummary{
			Spell: spell, AppURL: s.AppURL("/spells/" + spell.ID),
		})
	}
	for _, item := range items {
		result.Items = append(result.Items, ItemSummary{
			Item: item, AppURL: s.AppURL("/items/" + item.ID),
		})
	}
	for _, entry := range entries {
		result.Entries = append(result.Entries, LibraryEntrySummary{
			StandardLibraryEntry: entry, AppURL: s.AppURL("/library"),
		})
	}
	return result, err
}

func (s *Service) GetLibraryEntry(
	ctx context.Context,
	campaignID string,
	contentType string,
	entryID string,
	librarySource string,
) (LibraryEntryResult, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeLibraryRead)
	if err != nil {
		return LibraryEntryResult{}, err
	}
	campaign, err := s.stores.Campaigns.ByID(ctx, principal.UserID, campaignID)
	if err != nil {
		return LibraryEntryResult{}, storeError(err, "campaign")
	}
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	librarySource = strings.ToLower(strings.TrimSpace(librarySource))
	switch contentType {
	case "spell", "spells":
		if librarySource == "" {
			librarySource = "standard"
		}
		spell, err := s.stores.Spells.ByID(ctx, principal.UserID, entryID, librarySource)
		if err != nil || (spell.SourceKey != "" && !stringAllowed(spell.SourceKey, campaign.AllowedStandardSources)) {
			return LibraryEntryResult{}, NewError(CodeNotFound, "library entry not found", nil)
		}
		return LibraryEntryResult{
			ContentType: "spell", LibrarySource: spell.LibrarySource, Spell: &spell,
			AppURL: s.AppURL("/spells/" + spell.ID),
		}, nil
	case "item", "items":
		if librarySource == "standard" {
			entry, err := s.stores.Library.EntryByID(
				ctx, entryID, "equipment", campaign.AllowedStandardSources,
			)
			if err != nil {
				return LibraryEntryResult{}, storeError(err, "library entry")
			}
			return LibraryEntryResult{
				ContentType: "equipment", LibrarySource: "standard", Entry: &entry,
				AppURL: s.AppURL("/library"),
			}, nil
		}
		item, err := s.stores.Items.ByID(ctx, principal.UserID, entryID)
		if err != nil {
			return LibraryEntryResult{}, storeError(err, "library entry")
		}
		return LibraryEntryResult{
			ContentType: "item", LibrarySource: "user", Item: &item,
			AppURL: s.AppURL("/items/" + item.ID),
		}, nil
	default:
		entry, err := s.stores.Library.EntryByID(
			ctx, entryID, contentType, campaign.AllowedStandardSources,
		)
		if err != nil {
			return LibraryEntryResult{}, storeError(err, "library entry")
		}
		return LibraryEntryResult{
			ContentType: entry.Category, LibrarySource: "standard", Entry: &entry,
			AppURL: s.AppURL("/library"),
		}, nil
	}
}

func stringAllowed(value string, allowed []string) bool {
	for _, candidate := range allowed {
		if value == candidate {
			return true
		}
	}
	return false
}
