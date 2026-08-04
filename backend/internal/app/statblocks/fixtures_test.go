package statblocks

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"bludm/backend/internal/models"
	"github.com/google/jsonschema-go/jsonschema"

	"gopkg.in/yaml.v3"
)

func TestEveryCustomSectionAndTypedFeatureRenders(t *testing.T) {
	creature := completeCustomCreature("section-fixture", "Section Keeper")
	creature.StatBlock["traits"] = []any{
		map[string]any{"name": "Typed Trait", "description": "Preserved as a trait."},
	}
	creature.StatBlock["legendaryDescription"] = "The keeper can take three legendary actions."
	creature.StatBlock["mythicDescription"] = "When bloodied, the keeper reveals its mythic form."
	creature.StatBlock["regionalEffects"] = []any{
		map[string]any{"name": "Bent Paths", "desc": "Roads twist within one mile."},
	}
	sections := []string{
		"trait", "action", "bonus_action", "reaction",
		"legendary_action", "mythic_action", "lair_action",
	}
	actions := make([]models.CreatureAction, 0, len(sections))
	for _, section := range sections {
		actions = append(actions, models.CreatureAction{
			ID: section, Name: "Feature " + section,
			Description: "Visible meaning for " + section + ".", DisplaySection: section,
		})
	}

	result, err := BuildAndRender(BuildInput{Creature: creature, Actions: actions}, false)
	if err != nil {
		t.Fatal(err)
	}
	var document fantasyStatblockYAML
	if err := yaml.Unmarshal([]byte(statblockYAML(t, result.Markdown)), &document); err != nil {
		t.Fatal(err)
	}
	if document.LegendaryDescription != creature.StatBlock["legendaryDescription"] ||
		document.MythicDescription != creature.StatBlock["mythicDescription"] {
		t.Fatalf("typed descriptions were not preserved: %+v", document)
	}
	counts := []int{
		len(document.Traits), len(document.Actions), len(document.BonusActions),
		len(document.Reactions), len(document.LegendaryActions), len(document.MythicActions),
		len(document.LairActions), len(document.RegionalEffects),
	}
	for index, count := range counts {
		if count == 0 {
			t.Fatalf("section %d was empty: %+v", index, document)
		}
	}
	if !contains(result.Compatibility.LossyFields, "structuredActionMechanics") {
		t.Fatalf("flattened structured mechanics were not reported: %+v", result.Compatibility)
	}
}

func TestStrictPartialSnapshotAndImageSafety(t *testing.T) {
	creature := completeCustomCreature("snapshot-fixture", "Snapshot Warden")
	creature.AvatarURL = "http://bludm.local/api/assets/private-token/image"
	delete(creature.StatBlock, "speed")
	input := BuildInput{
		Creature: creature,
		Snapshot: map[string]any{"xp": 450, "authoring": map[string]any{"origin": "generated"}},
	}
	block, report := Build(input)
	if report.Status != "unsupported" || !contains(report.BlockingFields, "speed") {
		t.Fatalf("missing required field was not blocking: %+v", report)
	}
	if block.Image != "" || !contains(report.OmittedFields, "image") {
		t.Fatalf("authenticated image was not omitted: %+v %+v", block, report)
	}
	if _, err := RenderMarkdown(block, report, false); err == nil {
		t.Fatal("strict rendering accepted an unsupported creature")
	}
	partial, err := RenderMarkdown(block, report, true)
	if err != nil || !strings.HasPrefix(partial, "> [!warning] Partial bluDM stat block") {
		t.Fatalf("partial rendering did not emit a visible warning: %v\n%s", err, partial)
	}
	if _, found := block.AdjacentMetadata["encounterSnapshot"]; !found {
		t.Fatalf("encounter snapshot was not retained as adjacent metadata: %+v", block)
	}
	if strings.Contains(partial, "private-token") || strings.Contains(partial, "encounterSnapshot") {
		t.Fatalf("private or adjacent-only data leaked into Markdown:\n%s", partial)
	}
	creature.AvatarURL = "https://cdn.example.test/warden.webp?access_token=secret"
	unsafe, _ := Build(BuildInput{Creature: creature})
	if unsafe.Image != "" {
		t.Fatalf("credential-bearing public-looking image URL was exported: %q", unsafe.Image)
	}

	creature.StatBlock["speed"] = map[string]any{"walk": 30}
	safe, safeReport := Build(BuildInput{
		Creature: creature, VaultImagePath: "attachments/snapshot-warden.webp",
	})
	if safe.Image != "attachments/snapshot-warden.webp" ||
		!contains(safeReport.MappedFields, "image") {
		t.Fatalf("safe Vault path was not accepted: %+v %+v", safe, safeReport)
	}
}

func TestCheckedInFantasyStatblocksFixturesParse(t *testing.T) {
	fixtures, err := filepath.Glob("../../../../docs/mcp/fixtures/*.md")
	if err != nil {
		t.Fatal(err)
	}
	expected := map[string]bool{
		"fantasy-statblocks-official-example.md": false,
		"statblock-ordinary.md":                  false,
		"statblock-spellcasting.md":              false,
		"statblock-legendary.md":                 false,
		"statblock-custom-sections.md":           false,
		"statblock-incomplete-partial.md":        false,
		"statblock-repeated-roster.md":           false,
		"statblock-snapshot.md":                  false,
	}
	for _, fixture := range fixtures {
		name := filepath.Base(fixture)
		if _, ok := expected[name]; !ok {
			continue
		}
		content, err := os.ReadFile(fixture)
		if err != nil {
			t.Fatal(err)
		}
		blocks := allStatblockYAML(string(content))
		if len(blocks) == 0 {
			t.Fatalf("%s contains no statblock fence", name)
		}
		for _, raw := range blocks {
			var document map[string]any
			if err := yaml.Unmarshal([]byte(raw), &document); err != nil {
				t.Fatalf("%s is not valid YAML: %v", name, err)
			}
			if document["layout"] != "Basic 5e Layout" || strings.TrimSpace(stringValue(document["name"])) == "" {
				t.Fatalf("%s is not a Basic 5e stat block: %+v", name, document)
			}
			// The verbatim upstream fixture intentionally exercises plugin-specific plain-scalar
			// parsing (notably unquoted spell lines containing colons). Generated bluDM exports
			// quote those values and must satisfy the stricter checked profile.
			if name != "statblock-incomplete-partial.md" && name != "fantasy-statblocks-official-example.md" {
				if err := validateStatblockInstance(raw); err != nil {
					t.Fatalf("%s violates the checked compatibility profile: %v", name, err)
				}
			}
		}
		expected[name] = true
	}
	for name, found := range expected {
		if !found {
			t.Errorf("missing compatibility fixture %s", name)
		}
	}

	schemaContent, err := os.ReadFile("../../../../docs/mcp/fantasy-statblocks-basic-5e.schema.json")
	if err != nil {
		t.Fatal(err)
	}
	var schema map[string]any
	if err := json.Unmarshal(schemaContent, &schema); err != nil {
		t.Fatal(err)
	}
	if schema["x-plugin-version"] != "4.10.3" || schema["x-layout-version"] != float64(9) {
		t.Fatalf("unexpected checked-in compatibility authority: %+v", schema)
	}
}

func validateStatblockInstance(raw string) error {
	schemaContent, err := os.ReadFile("../../../../docs/mcp/fantasy-statblocks-basic-5e.schema.json")
	if err != nil {
		return err
	}
	var schema jsonschema.Schema
	if err := json.Unmarshal(schemaContent, &schema); err != nil {
		return err
	}
	resolved, err := schema.Resolve(nil)
	if err != nil {
		return err
	}
	var yamlDocument any
	if err := yaml.Unmarshal([]byte(raw), &yamlDocument); err != nil {
		return err
	}
	encoded, err := json.Marshal(yamlDocument)
	if err != nil {
		return err
	}
	var instance any
	if err := json.Unmarshal(encoded, &instance); err != nil {
		return err
	}
	if err := resolved.Validate(instance); err != nil {
		return fmt.Errorf("schema validation failed: %w", err)
	}
	return nil
}

func completeCustomCreature(id, name string) models.Creature {
	return models.Creature{
		ID: id, Name: name, Size: "Medium", CreatureType: "humanoid",
		Alignment: "neutral", ArmorClass: 14, HitPoints: 45, HitDice: "6d8+18",
		ChallengeRating: "3", LibrarySource: "user", SourceLabel: "bluDM custom",
		StatBlock: map[string]any{
			"abilityScores": map[string]any{
				"str": 12, "dex": 14, "con": 16, "int": 11, "wis": 13, "cha": 10,
			},
			"speed": map[string]any{"walk": 30},
		},
	}
}

func statblockYAML(t *testing.T, markdown string) string {
	t.Helper()
	blocks := allStatblockYAML(markdown)
	if len(blocks) != 1 {
		t.Fatalf("expected one statblock fence, got %d", len(blocks))
	}
	return blocks[0]
}

func allStatblockYAML(markdown string) []string {
	const start = "```statblock\n"
	blocks := []string{}
	for {
		index := strings.Index(markdown, start)
		if index < 0 {
			return blocks
		}
		markdown = markdown[index+len(start):]
		end := strings.Index(markdown, "\n```")
		if end < 0 {
			return blocks
		}
		blocks = append(blocks, markdown[:end])
		markdown = markdown[end+4:]
	}
}
