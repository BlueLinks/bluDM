package app

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"bludm/backend/internal/app/statblocks"
	"bludm/backend/internal/generation"
	"bludm/backend/internal/markdownencounter"
	"bludm/backend/internal/models"
	"bludm/backend/internal/rulesets"
)

type EncounterDetails struct {
	Encounter          models.Encounter              `json:"encounter"`
	Combatants         []models.EncounterCombatant   `json:"combatants"`
	DifficultyEvidence generation.DifficultyEvidence `json:"difficultyEvidence"`
	AppURL             string                        `json:"appUrl"`
}

type EvaluateEncounterInput struct {
	AllCampaignPlayers  bool               `json:"allCampaignPlayers"`
	PlayerIDs           []string           `json:"playerIds"`
	Enemies             []EvaluateEnemyRef `json:"enemies"`
	RequestedDifficulty string             `json:"requestedDifficulty"`
}

type EvaluateEnemyRef struct {
	CreatureID string `json:"creatureId"`
	Quantity   int    `json:"quantity"`
}

type EncounterFilters struct {
	Query      string `json:"query,omitempty"`
	Status     string `json:"status,omitempty"`
	LocationID string `json:"locationId,omitempty"`
}

type EncounterSummary struct {
	models.Encounter
	AppURL string `json:"appUrl"`
}

func (s *Service) ListEncounters(
	ctx context.Context,
	campaignID string,
) ([]EncounterSummary, error) {
	return s.ListEncountersWithFilters(ctx, campaignID, EncounterFilters{})
}

func (s *Service) ListEncountersWithFilters(
	ctx context.Context,
	campaignID string,
	filters EncounterFilters,
) ([]EncounterSummary, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeEncountersRead)
	if err != nil {
		return nil, err
	}
	values, err := s.stores.Campaigns.Encounters(ctx, principal.UserID, campaignID)
	if err != nil {
		return nil, err
	}
	query := strings.ToLower(strings.TrimSpace(filters.Query))
	status := strings.ToLower(strings.TrimSpace(filters.Status))
	locationID := strings.TrimSpace(filters.LocationID)
	result := make([]EncounterSummary, 0, len(values))
	for _, value := range values {
		if status != "" && !strings.EqualFold(value.Status, status) {
			continue
		}
		if locationID != "" && (value.LocationID == nil || *value.LocationID != locationID) {
			continue
		}
		if query != "" && !strings.Contains(strings.ToLower(
			value.Name+" "+value.Description+" "+value.Location+" "+value.RoomNumber,
		), query) {
			continue
		}
		result = append(result, EncounterSummary{
			Encounter: value,
			AppURL:    s.AppURL("/campaigns/" + campaignID + "/encounters/" + value.ID),
		})
	}
	return result, nil
}

func (s *Service) GetEncounter(
	ctx context.Context,
	campaignID string,
	encounterID string,
) (EncounterDetails, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeEncountersRead)
	if err != nil {
		return EncounterDetails{}, err
	}
	encounter, err := s.stores.Encounters.ByID(ctx, principal.UserID, encounterID)
	if err != nil || encounter.CampaignID != campaignID {
		return EncounterDetails{}, NewError(CodeNotFound, "encounter not found", nil)
	}
	combatants, err := s.stores.Encounters.Combatants(ctx, principal.UserID, encounterID)
	if err != nil {
		return EncounterDetails{}, err
	}
	ruleset := encounter.DifficultyRuleset
	if !rulesets.IsEncounterRuleset(ruleset) {
		campaign, err := s.stores.Campaigns.ByID(ctx, principal.UserID, campaignID)
		if err != nil {
			return EncounterDetails{}, err
		}
		ruleset, err = campaignEncounterRuleset(campaign)
		if err != nil {
			return EncounterDetails{}, err
		}
	}
	players, enemies := encounterDifficultyInputs(combatants)
	evidence := generation.EvaluateEncounterForRuleset(ruleset, players, enemies, "")
	for _, combatant := range combatants {
		if combatant.SourceType != "player" && combatant.Side == "friendly" {
			evidence.Warnings = append(
				evidence.Warnings,
				"Non-player allies are present but are not included in the encounter XP budget.",
			)
			break
		}
	}
	return EncounterDetails{
		Encounter: encounter, Combatants: combatants,
		DifficultyEvidence: evidence,
		AppURL:             s.AppURL("/campaigns/" + campaignID + "/encounters/" + encounterID),
	}, nil
}

func (s *Service) EvaluateEncounter(
	ctx context.Context,
	campaignID string,
	input EvaluateEncounterInput,
) (generation.DifficultyEvidence, error) {
	principal, err := s.authorize(ctx, campaignID, ScopeGenerationRun)
	if err != nil {
		return generation.DifficultyEvidence{}, err
	}
	campaign, err := s.stores.Campaigns.ByID(ctx, principal.UserID, campaignID)
	if err != nil {
		return generation.DifficultyEvidence{}, err
	}
	ruleset, err := campaignEncounterRuleset(campaign)
	if err != nil {
		return generation.DifficultyEvidence{}, err
	}
	requested, err := normalizeDifficultyForRuleset(ruleset, input.RequestedDifficulty)
	if err != nil {
		return generation.DifficultyEvidence{}, err
	}
	players, err := s.resolvePlayers(ctx, principal, campaignID, input.AllCampaignPlayers, input.PlayerIDs)
	if err != nil {
		return generation.DifficultyEvidence{}, err
	}
	if len(input.Enemies) == 0 {
		return generation.DifficultyEvidence{}, ValidationError(
			"missing_enemies", "at least one enemy is required", nil,
		)
	}
	enemies := make([]generation.EncounterEnemy, 0, len(input.Enemies))
	seen := map[string]bool{}
	for _, reference := range input.Enemies {
		if seen[reference.CreatureID] {
			return generation.DifficultyEvidence{}, ValidationError(
				"duplicate_creature", "duplicate creature IDs must be combined with quantity", nil,
			)
		}
		seen[reference.CreatureID] = true
		if reference.Quantity < 1 || reference.Quantity > 50 {
			return generation.DifficultyEvidence{}, ValidationError(
				"invalid_quantity", "enemy quantity must be between 1 and 50", nil,
			)
		}
		details, err := s.GetCreature(ctx, campaignID, reference.CreatureID)
		if err != nil {
			return generation.DifficultyEvidence{}, err
		}
		enemies = append(enemies, generation.EncounterEnemy{
			Creature: details.Creature, Quantity: reference.Quantity, Side: "enemy",
		})
	}
	return generation.EvaluateEncounterForRuleset(ruleset, players, enemies, requested), nil
}

func (s *Service) resolvePlayers(
	ctx context.Context,
	principal Principal,
	campaignID string,
	all bool,
	ids []string,
) ([]models.Player, error) {
	if all == (len(ids) > 0) {
		return nil, ValidationError(
			"party_selection", "select allCampaignPlayers or explicit playerIds, but not both", nil,
		)
	}
	players, err := s.stores.Campaigns.Players(ctx, principal.UserID, campaignID)
	if err != nil {
		return nil, err
	}
	if all {
		return players, nil
	}
	byID := map[string]models.Player{}
	for _, player := range players {
		byID[player.ID] = player
	}
	selected := []models.Player{}
	seen := map[string]bool{}
	for _, id := range ids {
		id = strings.TrimSpace(id)
		if seen[id] {
			return nil, ValidationError("duplicate_player", "duplicate player ID", map[string]any{"playerId": id})
		}
		player, ok := byID[id]
		if !ok {
			return nil, ValidationError("unknown_player", "unknown or cross-campaign player ID", map[string]any{"playerId": id})
		}
		seen[id] = true
		selected = append(selected, player)
	}
	if len(selected) == 0 {
		return nil, ValidationError("missing_players", "at least one player is required", nil)
	}
	return selected, nil
}

func (s *Service) ExportEncounter(
	ctx context.Context,
	campaignID string,
	encounterID string,
	allowPartial bool,
) (EncounterExport, error) {
	return s.ExportEncounterWithCreatureData(
		ctx, campaignID, encounterID, "latest", allowPartial,
	)
}

func (s *Service) ExportEncounterWithCreatureData(
	ctx context.Context,
	campaignID string,
	encounterID string,
	creatureData string,
	allowPartial bool,
) (EncounterExport, error) {
	if _, err := s.authorize(ctx, campaignID, ScopeEncountersRead, ScopeLibraryRead); err != nil {
		return EncounterExport{}, err
	}
	creatureData = strings.ToLower(strings.TrimSpace(creatureData))
	if creatureData == "" {
		creatureData = "latest"
	}
	if creatureData != "latest" && creatureData != "snapshot" {
		return EncounterExport{}, ValidationError(
			"invalid_creature_data", "creatureData must be latest or snapshot", nil,
		)
	}
	details, err := s.GetEncounter(ctx, campaignID, encounterID)
	if err != nil {
		return EncounterExport{}, err
	}
	quantities := map[string]int{}
	sides := map[string]map[string]int{}
	names := map[string]string{}
	representatives := map[string]models.EncounterCombatant{}
	orderedIDs := []string{}
	omissions := []EncounterExportOmission{}
	for _, combatant := range details.Combatants {
		if combatant.CreatureID != "" {
			if quantities[combatant.CreatureID] == 0 {
				orderedIDs = append(orderedIDs, combatant.CreatureID)
				representatives[combatant.CreatureID] = combatant
				sides[combatant.CreatureID] = map[string]int{}
			}
			quantities[combatant.CreatureID]++
			sides[combatant.CreatureID][combatant.Side]++
			names[combatant.CreatureID] = combatant.DisplayName
		} else if combatant.SourceType != "player" {
			omissions = append(omissions, EncounterExportOmission{
				CombatantID: combatant.ID, Name: combatant.DisplayName, Side: combatant.Side,
				Reason: "no linked creature stat block is available",
			})
			// The export is still coherent because the round-trippable encounter block
			// retains this combatant; only its Fantasy Statblocks block is unavailable.
		}
	}
	export := EncounterExport{
		Profile: statblocks.Profile, Output: "structured",
		AppURL: details.AppURL,
		ExportURL: s.AppURL(
			"/api/external/v1/campaigns/" + campaignID + "/encounters/" +
				encounterID + "/exports/fantasy-statblocks",
		),
		Encounter: details.Encounter, CreatureData: creatureData,
		OmittedCombatants: omissions, Warnings: []string{},
	}
	if len(export.OmittedCombatants) > 0 {
		export.Warnings = append(export.Warnings,
			"One or more non-player combatants have no linked creature stat block; they remain in the encounter block but have no Fantasy Statblocks block.",
		)
	}
	for _, creatureID := range orderedIDs {
		quantity := quantities[creatureID]
		var result statblocks.Result
		var resultErr error
		if creatureData == "snapshot" {
			result, resultErr = s.exportSnapshotCreature(
				ctx, campaignID, representatives[creatureID], allowPartial,
			)
		} else {
			result, resultErr = s.ExportCreature(ctx, campaignID, creatureID, "", allowPartial)
		}
		result.AppURL = s.AppURL("/creatures/" + creatureID)
		result.ExportURL = s.AppURL(
			"/api/external/v1/campaigns/" + campaignID + "/library/creatures/" +
				creatureID + "/exports/fantasy-statblocks",
		)
		export.Results = append(export.Results, result)
		export.Compatibility = append(export.Compatibility, result.Compatibility)
		export.Roster = append(export.Roster, EncounterExportRoster{
			CreatureID: creatureID, Name: names[creatureID], Quantity: quantity,
			Sides: sides[creatureID],
		})
		if resultErr != nil && !allowPartial {
			export.Markdown = ""
			export.EncounterMarkdown = ""
			export.BundleMarkdown = ""
			return export, resultErr
		}
		if result.Markdown != "" {
			export.Markdown += fmt.Sprintf("## %s\n\n%s\n", names[creatureID], result.Markdown)
		}
	}
	export.EncounterMarkdown, err = renderEncounterMarkdown(details.Encounter, details.Combatants)
	if err != nil {
		return export, err
	}
	export.BundleMarkdown = "# " + details.Encounter.Name + "\n\n" +
		export.EncounterMarkdown + "\n" + export.Markdown
	return export, nil
}

func (s *Service) exportSnapshotCreature(
	ctx context.Context,
	campaignID string,
	combatant models.EncounterCombatant,
	allowPartial bool,
) (statblocks.Result, error) {
	var creature models.Creature
	data, err := json.Marshal(combatant.Snapshot)
	if err != nil {
		return statblocks.Result{}, err
	}
	if err := json.Unmarshal(data, &creature); err != nil {
		return statblocks.Result{}, err
	}
	if creature.ID == "" {
		creature.ID = combatant.CreatureID
	}
	if creature.LibrarySource == "" || creature.SourceKey == "" || creature.SourceLabel == "" {
		latest, latestErr := s.GetCreature(ctx, campaignID, creature.ID)
		if latestErr != nil {
			return statblocks.Result{}, NewError(
				CodeUnsupported,
				"legacy encounter snapshot lacks source and licensing metadata and the current creature cannot be resolved",
				map[string]any{"creatureId": creature.ID},
			)
		}
		creature.LibrarySource = latest.Creature.LibrarySource
		creature.SourceKey = latest.Creature.SourceKey
		creature.SourceLabel = latest.Creature.SourceLabel
	}
	actions := []models.CreatureAction{}
	spellcasting := models.CreatureSpellcastingProfile{Slots: map[string]any{}, Spells: []models.CreatureSpell{}}
	_ = decodeSnapshotField(combatant.Snapshot, "actions", &actions)
	_ = decodeSnapshotField(combatant.Snapshot, "spellcasting", &spellcasting)
	usedLatestAdjacentData := false
	if creature.LibrarySource != "standard" && len(actions) == 0 {
		principal, _ := PrincipalFromContext(ctx)
		actions, err = s.stores.Actions.ListCreatureActions(ctx, principal.UserID, creature.ID)
		if err != nil {
			return statblocks.Result{}, err
		}
		spellcasting, err = s.stores.Spellcasts.Profile(ctx, principal.UserID, creature.ID)
		if err != nil {
			return statblocks.Result{}, err
		}
		usedLatestAdjacentData = true
	}
	result, buildErr := statblocks.BuildAndRender(statblocks.BuildInput{
		Creature: creature, Actions: actions, Spellcasting: spellcasting,
		Snapshot: combatant.Snapshot,
	}, allowPartial)
	if usedLatestAdjacentData {
		result.Compatibility.LossyFields = append(
			result.Compatibility.LossyFields, "actions", "spellcasting",
		)
		result.Compatibility.Warnings = append(
			result.Compatibility.Warnings,
			"Legacy encounter snapshot lacked adjacent actions or spellcasting; current adjacent data was used.",
		)
	}
	if buildErr != nil {
		return result, NewError(CodeUnsupported, buildErr.Error(), map[string]any{
			"compatibility": result.Compatibility,
		})
	}
	return result, nil
}

func decodeSnapshotField(snapshot map[string]any, key string, target any) error {
	value, ok := snapshot[key]
	if !ok {
		return nil
	}
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, target)
}

func renderEncounterMarkdown(
	encounter models.Encounter,
	combatants []models.EncounterCombatant,
) (string, error) {
	document := markdownencounter.Document{
		Version: markdownencounter.CurrentVersion, ID: encounter.ID, Name: encounter.Name,
		Description: encounter.Description, Status: encounter.Status, Location: encounter.Location,
		Room: encounter.RoomNumber, Loot: encounter.LootNotes,
		Combatants: make([]markdownencounter.Combatant, 0, len(combatants)),
	}
	if encounter.LocationID != nil {
		document.LocationID = *encounter.LocationID
	}
	for _, combatant := range combatants {
		side := combatant.Side
		if combatant.SourceType == "player" {
			side = "player"
		} else if side == "ally" {
			side = "friendly"
		}
		row := markdownencounter.Combatant{
			Name: combatant.DisplayName, Side: side, Quantity: 1,
			RolledHP: combatant.RolledHP, ArmorClass: combatant.ArmorClass,
			HitPoints: combatant.MaxHitPoints, Color: combatant.ColorLabel,
			AvatarURL: combatant.AvatarURL,
		}
		switch {
		case combatant.SourceType == "player" && combatant.PlayerID != "":
			row.PlayerID = combatant.PlayerID
		case combatant.CreatureID != "":
			row.CreatureID = combatant.CreatureID
		}
		document.Combatants = append(document.Combatants, row)
	}
	return markdownencounter.Render(document)
}
