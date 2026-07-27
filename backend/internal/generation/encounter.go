package generation

import (
	"fmt"
	"sort"
	"strings"

	"bludm/backend/internal/models"
)

type EncounterOptions struct {
	Archetype        string `json:"archetype"`
	Challenge        string `json:"challenge"`
	EnemyCount       int    `json:"enemyCount"`
	IncludeBoss      bool   `json:"includeBoss"`
	IncludeHazards   bool   `json:"includeHazards"`
	IncludeMinions   bool   `json:"includeMinions"`
	Terrain          string `json:"terrain"`
	UseLocationTheme bool   `json:"useLocationTheme"`
	UseLocationNotes bool   `json:"useLocationNotes"`
}

type EncounterEnemy struct {
	ID       string          `json:"id"`
	Creature models.Creature `json:"creature"`
	Quantity int             `json:"quantity"`
	RolledHP bool            `json:"rolledHp"`
	Side     string          `json:"side"`
}

type EncounterPreview struct {
	Version      int              `json:"version"`
	Title        string           `json:"title"`
	Difficulty   string           `json:"difficulty"`
	EstimatedXP  int              `json:"estimatedXp"`
	TargetNotice string           `json:"targetNotice"`
	Summary      string           `json:"summary"`
	Enemies      []EncounterEnemy `json:"enemies"`
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
	options = normalizeEncounterOptions(options)
	selectedArchetype := encounterArchetypes[2]
	for _, candidate := range encounterArchetypes {
		if candidate.Value == options.Archetype {
			selectedArchetype = candidate
			break
		}
	}
	candidates := matchingCreatures(creatures, selectedArchetype.Terms)
	if len(candidates) == 0 {
		candidates = creatures
	}
	count := options.EnemyCount
	if options.IncludeMinions && count > 1 {
		count--
	}
	enemies, notice := targetedEnemies(candidates, count, options, players, roll)
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
	return EncounterPreview{
		Version:      1,
		Title:        fmt.Sprintf("%s at %s", capitalize(selectedArchetype.Label), place),
		Difficulty:   capitalize(options.Challenge),
		EstimatedXP:  estimatedXP,
		TargetNotice: notice,
		Summary:      strings.Join(summaryParts, " "),
		Enemies:      enemies,
	}
}

func normalizeEncounterOptions(options EncounterOptions) EncounterOptions {
	if options.Archetype == "" {
		options.Archetype = "monsters"
	}
	switch options.Challenge {
	case "easy", "medium", "hard", "deadly":
	default:
		options.Challenge = "medium"
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
		result := encounterDifficulty(players, enemies)
		names := make([]string, 0, len(enemies))
		standardCount := 0
		for index, enemy := range enemies {
			names = append(names, enemy.Creature.Name)
			if selected[index].LibrarySource == "standard" {
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
	if count == 2 && len(creatures) >= 2 && len(creatures) <= 80 {
		result := [][]models.Creature{}
		for first := 0; first < len(creatures); first++ {
			for second := first + 1; second < len(creatures); second++ {
				result = append(result, []models.Creature{creatures[first], creatures[second]})
			}
		}
		return result
	}
	attempts := min(160, max(48, len(creatures)*4))
	result := make([][]models.Creature, 0, attempts)
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
	if options.IncludeMinions {
		sort.SliceStable(ordered, func(i, j int) bool { return ordered[i].XP < ordered[j].XP })
	}
	enemies := make([]EncounterEnemy, 0, len(ordered))
	for index, creature := range ordered {
		quantity := 1
		if !(options.IncludeBoss && index == 0) {
			quantity = minionQuantity(options, index)
		}
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
