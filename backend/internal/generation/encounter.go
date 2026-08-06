package generation

import (
	"fmt"
	"sort"
	"strings"

	"bludm/backend/internal/models"
	"bludm/backend/internal/rulesets"
)

const EncounterGeneratorVersion = "bludm-encounter-generator-v2"

type EncounterOptions struct {
	Archetype        string `json:"archetype,omitempty"`
	Challenge        string `json:"challenge,omitempty" jsonschema:"2014: easy, medium, hard, or deadly. 2024: low, moderate (medium alias accepted), or high."`
	EnemyCount       int    `json:"enemyCount,omitempty"`
	IncludeBoss      bool   `json:"includeBoss,omitempty"`
	IncludeHazards   bool   `json:"includeHazards,omitempty"`
	IncludeMinions   bool   `json:"includeMinions,omitempty"`
	Terrain          string `json:"terrain,omitempty"`
	UseLocationTheme bool   `json:"useLocationTheme,omitempty"`
	UseLocationNotes bool   `json:"useLocationNotes,omitempty"`
}

type EncounterEnemy struct {
	ID       string          `json:"id"`
	Creature models.Creature `json:"creature"`
	Quantity int             `json:"quantity"`
	RolledHP bool            `json:"rolledHp"`
	Side     string          `json:"side"`
}

type EncounterPreview struct {
	Version             int                `json:"version"`
	GeneratorVersion    string             `json:"generatorVersion"`
	Seed                int                `json:"seed"`
	Title               string             `json:"title"`
	Difficulty          string             `json:"difficulty"`
	EstimatedXP         int                `json:"estimatedXp"`
	TargetNotice        string             `json:"targetNotice"`
	Summary             string             `json:"summary"`
	Enemies             []EncounterEnemy   `json:"enemies"`
	DifficultyEvidence  DifficultyEvidence `json:"difficultyEvidence"`
	CandidatePoolSize   int                `json:"candidatePoolSize"`
	EnemyCountSemantics string             `json:"enemyCountSemantics"`
	SelectionReasons    []string           `json:"selectionReasons"`
}

type archetype struct {
	Value string
	Label string
	Terms []string
}

var encounterArchetypes = []archetype{
	{Value: "large-monster", Label: "One large monster", Terms: []string{"dragon", "giant", "troll", "owlbear", "hydra"}},
	{Value: "humanoids", Label: "Humanoids", Terms: []string{"bandit", "guard", "pirate", "mercenary", "cultist"}},
	{Value: "monsters", Label: "Monsters", Terms: []string{"goblin", "kobold", "orc", "gnoll", "bugbear"}},
	{Value: "undead", Label: "Undead", Terms: []string{"undead", "skeleton", "zombie", "ghost", "wight"}},
	{Value: "beasts", Label: "Beasts", Terms: []string{"beast", "wolf", "bear", "boar", "spider"}},
	{Value: "spellcasters", Label: "Spellcasters", Terms: []string{"mage", "wizard", "priest", "cult", "warlock"}},
	{Value: "melee", Label: "Melee fighters", Terms: []string{"warrior", "knight", "berserker", "veteran", "gladiator"}},
	{Value: "stealth", Label: "Stealth / assassins", Terms: []string{"rogue", "scout", "assassin", "spy", "thief"}},
	{Value: "mixed", Label: "Mixed encounter"},
	{Value: "custom-mix", Label: "Custom mix"},
}

func GenerateEncounter(
	creatures []models.Creature,
	location *models.CampaignLocation,
	options EncounterOptions,
	players []models.Player,
	roll int,
) EncounterPreview {
	return GenerateEncounterForRuleset(
		rulesets.Encounter2014, creatures, location, options, players, roll,
	)
}

func GenerateEncounterForRuleset(
	ruleset string,
	creatures []models.Creature,
	location *models.CampaignLocation,
	options EncounterOptions,
	players []models.Player,
	roll int,
) EncounterPreview {
	options = normalizeEncounterOptionsForRuleset(ruleset, options)
	selectedArchetype := encounterArchetypes[2]
	for _, candidate := range encounterArchetypes {
		if candidate.Value == options.Archetype {
			selectedArchetype = candidate
			break
		}
	}
	candidates := matchingCreatures(creatures, selectedArchetype.Terms)
	archetypeFallback := false
	if len(candidates) == 0 {
		candidates = creatures
		archetypeFallback = true
	}
	count := options.EnemyCount
	if options.IncludeMinions && count > 1 {
		// Reserve one body for a repeated minion without accidentally dropping
		// the boss when the caller requests the smallest boss/minion roster.
		if !options.IncludeBoss || count > 2 {
			count--
		}
	}
	enemies, notice := targetedEnemies(ruleset, candidates, count, options, players, roll)
	place := "the campaign"
	if location != nil {
		place = location.Name
	}
	terrain := options.Terrain
	if terrain == "location-theme" {
		terrain = "local terrain"
	}
	context := locationContext(location, options)
	summaryParts := []string{
		fmt.Sprintf("%s tuned as %s difficulty.", selectedArchetype.Label, options.Challenge),
		fmt.Sprintf("Terrain: %s.", strings.ReplaceAll(terrain, "-", " ")),
	}
	if context != "" {
		summaryParts = append(summaryParts, "Location context: "+context)
	}
	if options.IncludeBoss {
		summaryParts = append(summaryParts, "Includes a boss-style anchor.")
	}
	if options.IncludeMinions {
		summaryParts = append(summaryParts, "Includes minion pressure around the main threat.")
	}
	if options.IncludeHazards {
		summaryParts = append(summaryParts, "Includes environmental hazards as encounter pressure.")
	}
	estimatedXP := 0
	for _, enemy := range enemies {
		estimatedXP += enemy.Creature.XP * enemy.Quantity
	}
	evidence := EvaluateEncounterForRuleset(ruleset, players, enemies, options.Challenge)
	if notice != "" && !evidence.WithinTarget {
		evidence.Warnings = uniqueWarnings(append(evidence.Warnings, notice))
	}
	if len(candidates) < max(3, options.EnemyCount) {
		evidence.Warnings = uniqueWarnings(append(
			evidence.Warnings,
			fmt.Sprintf("The eligible creature pool is sparse (%d distinct types); target confidence is reduced.", len(candidates)),
		))
	}
	if options.IncludeHazards {
		evidence.Warnings = uniqueWarnings(append(
			evidence.Warnings,
			"Hazards were requested but are not inserted or included in the XP budget; author any hazard explicitly.",
		))
	}
	reasons := []string{
		"Creatures were filtered through campaign source visibility and the selected archetype.",
		"The deterministic roster search minimized distance from the requested XP band.",
	}
	if archetypeFallback {
		reasons = append(
			reasons,
			"No creature matched the requested archetype terms, so the full eligible campaign pool was scored.",
		)
	}
	if options.IncludeBoss {
		reasons = append(reasons, "The highest-XP selected creature was kept as a single boss anchor.")
	}
	if options.IncludeMinions {
		reasons = append(reasons, "Lower-XP selected creatures were allowed additional bodies as minions.")
	}
	if options.IncludeHazards {
		reasons = append(reasons, "The hazard preference was recorded as an authoring warning and did not change creature XP.")
	}
	return EncounterPreview{
		Version:             2,
		GeneratorVersion:    EncounterGeneratorVersion,
		Seed:                roll,
		Title:               fmt.Sprintf("%s at %s", capitalize(selectedArchetype.Label), place),
		Difficulty:          evidence.ActualDifficulty,
		EstimatedXP:         estimatedXP,
		TargetNotice:        notice,
		Summary:             strings.Join(summaryParts, " "),
		Enemies:             enemies,
		DifficultyEvidence:  evidence,
		CandidatePoolSize:   len(candidates),
		EnemyCountSemantics: "total_enemy_bodies_grouped_by_creature",
		SelectionReasons:    reasons,
	}
}

func normalizeEncounterOptions(options EncounterOptions) EncounterOptions {
	return normalizeEncounterOptionsForRuleset(rulesets.Encounter2014, options)
}

func normalizeEncounterOptionsForRuleset(ruleset string, options EncounterOptions) EncounterOptions {
	if options.Archetype == "" {
		options.Archetype = "monsters"
	}
	if normalized, ok := NormalizeDifficulty(ruleset, options.Challenge); ok {
		options.Challenge = normalized
	} else {
		options.Challenge = "medium"
		if ruleset == rulesets.Encounter2024 {
			options.Challenge = "moderate"
		}
	}
	if options.EnemyCount < 1 {
		options.EnemyCount = 1
	}
	if options.EnemyCount > 6 {
		options.EnemyCount = 6
	}
	if options.Terrain == "" {
		options.Terrain = "location-theme"
	}
	return options
}

func matchingCreatures(creatures []models.Creature, terms []string) []models.Creature {
	byName := map[string]models.Creature{}
	order := []string{}
	for _, creature := range creatures {
		haystack := strings.ToLower(creature.Name + " " + creature.CreatureType + " " + creature.Description)
		if len(terms) > 0 {
			matched := false
			for _, term := range terms {
				if strings.Contains(haystack, term) {
					matched = true
					break
				}
			}
			if !matched {
				continue
			}
		}
		key := strings.ToLower(strings.TrimSpace(creature.Name))
		existing, found := byName[key]
		if !found {
			order = append(order, key)
		}
		if !found || existing.LibrarySource == "standard" && creature.LibrarySource != "standard" {
			byName[key] = creature
		}
	}
	result := make([]models.Creature, 0, len(order))
	for _, key := range order {
		result = append(result, byName[key])
	}
	return result
}

func targetedEnemies(
	ruleset string,
	creatures []models.Creature,
	count int,
	options EncounterOptions,
	players []models.Player,
	roll int,
) ([]EncounterEnemy, string) {
	if len(creatures) == 0 {
		return []EncounterEnemy{}, "No matching creatures are available for this preset."
	}
	if len(players) == 0 {
		return createEnemyDrafts(selectCreatures(creatures, count, roll), options, roll),
			"Add party members to tune this preview to a challenge target."
	}
	type scoredSelection struct {
		enemies       []EncounterEnemy
		difficulty    difficulty
		score         float64
		standardCount int
		key           string
	}
	selections := candidateSelections(creatures, count, roll)
	scored := make([]scoredSelection, 0, len(selections))
	for attempt, selected := range selections {
		enemies := createEnemyDrafts(selected, options, roll+attempt)
		result := encounterDifficultyForRuleset(ruleset, players, enemies)
		names := make([]string, 0, len(enemies))
		standardCount := 0
		for _, enemy := range enemies {
			names = append(names, enemy.Creature.Name)
			if enemy.Creature.LibrarySource == "standard" {
				standardCount++
			}
		}
		scored = append(scored, scoredSelection{
			enemies: enemies, difficulty: result,
			score:         challengeScore(options.Challenge, result),
			standardCount: standardCount, key: strings.Join(names, "|"),
		})
	}
	sort.SliceStable(scored, func(i, j int) bool {
		if scored[i].score != scored[j].score {
			return scored[i].score < scored[j].score
		}
		if scored[i].standardCount != scored[j].standardCount {
			return scored[i].standardCount < scored[j].standardCount
		}
		return scored[i].key < scored[j].key
	})
	best := scored[0]
	target := capitalize(options.Challenge)
	notice := ""
	if best.difficulty.Label != target {
		notice = fmt.Sprintf(
			"Closest available result is %s; this creature set cannot reliably hit %s.",
			best.difficulty.Label,
			target,
		)
	}
	return best.enemies, notice
}

func candidateSelections(creatures []models.Creature, count, roll int) [][]models.Creature {
	repeated := make([][]models.Creature, 0, len(creatures))
	if count > 1 {
		for _, creature := range creatures {
			selection := make([]models.Creature, count)
			for index := range selection {
				selection[index] = creature
			}
			repeated = append(repeated, selection)
		}
	}
	if count == 2 && len(creatures) >= 2 && len(creatures) <= 80 {
		result := append([][]models.Creature{}, repeated...)
		for first := 0; first < len(creatures); first++ {
			for second := first + 1; second < len(creatures); second++ {
				result = append(result, []models.Creature{creatures[first], creatures[second]})
			}
		}
		return result
	}
	attempts := min(160, max(48, len(creatures)*4))
	result := append(make([][]models.Creature, 0, attempts+len(repeated)), repeated...)
	for attempt := 0; attempt < attempts; attempt++ {
		result = append(result, selectCreatures(creatures, count, roll+attempt))
	}
	return result
}

func selectCreatures(creatures []models.Creature, count, roll int) []models.Creature {
	if len(creatures) == 0 {
		return nil
	}
	selected := []models.Creature{}
	used := map[string]bool{}
	for index := 0; index < min(count, len(creatures)); index++ {
		start := newSeededRandom(fmt.Sprintf("%d-%d", roll, index)).integer(0, len(creatures)-1)
		for offset := 0; offset < len(creatures); offset++ {
			creature := creatures[(start+index+offset)%len(creatures)]
			if used[creature.ID] {
				continue
			}
			selected = append(selected, creature)
			used[creature.ID] = true
			break
		}
	}
	return selected
}

func createEnemyDrafts(selected []models.Creature, options EncounterOptions, roll int) []EncounterEnemy {
	ordered := append([]models.Creature(nil), selected...)
	if options.IncludeBoss {
		sort.SliceStable(ordered, func(i, j int) bool { return ordered[i].XP > ordered[j].XP })
	} else if options.IncludeMinions {
		sort.SliceStable(ordered, func(i, j int) bool { return ordered[i].XP < ordered[j].XP })
	}
	enemies := make([]EncounterEnemy, 0, len(ordered))
	byCreatureID := map[string]int{}
	for index, creature := range ordered {
		quantity := 1
		if !(options.IncludeBoss && index == 0) {
			quantity = minionQuantity(options, index)
		}
		if options.EnemyCount <= 1 {
			quantity = 1
		}
		if existingIndex, ok := byCreatureID[creature.ID]; ok {
			enemies[existingIndex].Quantity += quantity
			continue
		}
		byCreatureID[creature.ID] = len(enemies)
		enemies = append(enemies, EncounterEnemy{
			ID:       fmt.Sprintf("generated-%s-%d-%d", creature.ID, roll, index),
			Creature: creature, Quantity: quantity, RolledHP: false, Side: "enemy",
		})
	}
	return enemies
}

func minionQuantity(options EncounterOptions, index int) int {
	if options.Archetype == "large-monster" && index == 0 {
		return 1
	}
	if !options.IncludeMinions {
		return 1
	}
	if options.EnemyCount <= 2 {
		return 1
	}
	if options.IncludeBoss {
		if index == 1 {
			return 2
		}
		return 1
	}
	if index == 0 {
		return 2
	}
	return 1
}

func locationContext(location *models.CampaignLocation, options EncounterOptions) string {
	if location == nil {
		return ""
	}
	parts := []string{}
	if options.UseLocationTheme {
		path := []string{}
		for _, segment := range location.Path {
			path = append(path, segment.Name)
		}
		if len(path) == 0 {
			path = append(path, location.Name)
		}
		parts = append(parts, strings.Join(path, " / "))
	}
	if options.UseLocationNotes {
		notes := strings.TrimSpace(strings.Join(nonEmpty(location.Summary, firstNonEmpty(location.PublicNotes, location.Notes), location.DMNotes), " "))
		if notes != "" {
			parts = append(parts, notes)
		}
	}
	return strings.Join(parts, " - ")
}

func nonEmpty(values ...string) []string {
	result := []string{}
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			result = append(result, strings.TrimSpace(value))
		}
	}
	return result
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func capitalize(value string) string {
	if value == "" {
		return ""
	}
	value = strings.ReplaceAll(value, "-", " ")
	return strings.ToUpper(value[:1]) + value[1:]
}
