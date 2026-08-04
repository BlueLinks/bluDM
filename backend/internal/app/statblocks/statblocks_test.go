package statblocks

import (
	"encoding/json"
	"os"
	"strings"
	"testing"

	"bludm/backend/internal/models"
	"gopkg.in/yaml.v3"
)

func TestAllStandardCreaturesAreSupported(t *testing.T) {
	content, err := os.ReadFile("../../db/standard_creatures.json")
	if err != nil {
		t.Fatal(err)
	}
	var creatures []models.Creature
	if err := json.Unmarshal(content, &creatures); err != nil {
		t.Fatal(err)
	}
	if len(creatures) != 664 {
		t.Fatalf("expected 664 standard creatures, got %d", len(creatures))
	}
	unsupported := []string{}
	for _, creature := range creatures {
		creature.LibrarySource = "standard"
		block, report := Build(BuildInput{Creature: creature})
		if report.Status == "unsupported" {
			unsupported = append(unsupported, creature.Name+":"+strings.Join(report.BlockingFields, ","))
			continue
		}
		rendered, err := RenderMarkdown(block, report, false)
		if err != nil {
			t.Fatalf("%s did not render: %v", creature.Name, err)
		}
		if err := validateStatblockInstance(statblockYAML(t, rendered)); err != nil {
			t.Fatalf("%s emitted YAML outside the checked compatibility profile: %v", creature.Name, err)
		}
	}
	if len(unsupported) > 0 {
		t.Fatalf("unsupported standard creatures: %s", strings.Join(unsupported, "; "))
	}
}

func TestRepairedSRD521RecordsRemainComplete(t *testing.T) {
	content, err := os.ReadFile("../../db/standard_creatures.json")
	if err != nil {
		t.Fatal(err)
	}
	var creatures []models.Creature
	if err := json.Unmarshal(content, &creatures); err != nil {
		t.Fatal(err)
	}
	byName := map[string]models.Creature{}
	for _, creature := range creatures {
		if creature.SourceLabel == "SRD 5.2.1" {
			byName[creature.Name] = creature
		}
	}
	combatFields := []struct {
		name, cr string
		xp, int  int
	}{
		{"Gold Dragon Wyrmling", "3", 700, 14},
		{"Silver Dragon Wyrmling", "2", 450, 12},
		{"White Dragon Wyrmling", "2", 450, 5},
		{"Young White Dragon", "6", 2300, 6},
	}
	for _, expected := range combatFields {
		creature, ok := byName[expected.name]
		if !ok {
			t.Fatalf("missing repaired standard creature %q", expected.name)
		}
		abilities, _ := creature.StatBlock["abilities"].(map[string]any)
		if creature.ChallengeRating != expected.cr || creature.XP != expected.xp ||
			abilities["int"] != float64(expected.int) {
			t.Errorf("%s repair regressed: cr=%q xp=%d abilities=%v", expected.name, creature.ChallengeRating, creature.XP, abilities)
		}
	}
	speeds := map[string]map[string]string{
		"Darkmantle":       {"walk": "10 ft.", "fly": "30 ft."},
		"Sahuagin Warrior": {"walk": "30 ft.", "swim": "40 ft."},
		"Succubus":         {"walk": "30 ft.", "fly": "60 ft."},
		"Xorn":             {"walk": "20 ft.", "burrow": "20 ft."},
	}
	for name, expected := range speeds {
		creature, ok := byName[name]
		if !ok {
			t.Fatalf("missing repaired standard creature %q", name)
		}
		speed, _ := creature.StatBlock["speed"].(map[string]any)
		for mode, value := range expected {
			if speed[mode] != value {
				t.Errorf("%s %s speed = %v, want %q", name, mode, speed[mode], value)
			}
		}
	}
}

func TestHoverSpeedAndDefaultActionSentinels(t *testing.T) {
	creature := completeCustomCreature("hover-fixture", "Hover Warden")
	creature.StatBlock["speed"] = map[string]any{"walk": 30, "fly": "60 ft.", "hover": true}
	creature.StatBlock["armorClassNotes"] = "natural armor"
	action := models.CreatureAction{
		ID: "hover-bolt", Name: "Hover Bolt", DisplaySection: "action",
		Description: "The warden releases a bolt.", LimitedUses: 1, ActionType: "ranged_weapon",
		AttackModifier: 0, Range: 60, MissEffect: "half", HitSpecialEvent: "grant_temp_hp",
		Rolls: []models.ActionRollPart{{RollKind: "damage", DamageType: "force", Magical: true, DiceCount: 1, DieSize: 6}},
	}
	result, err := BuildAndRender(BuildInput{Creature: creature, Actions: []models.CreatureAction{action}}, false)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(result.Markdown, "speed: 30 ft., fly 60 ft. (hover)") {
		t.Fatalf("hover movement was not preserved:\n%s", result.Markdown)
	}
	for _, expected := range []string{
		"ac: 14 (natural armor)", "1 use.", "Ranged Weapon Attack: +0 to hit, range 60 ft.",
		"Hit: 1d6 force damage (magical).", "Miss: half damage.",
		"On a hit, grant temporary hit points.",
	} {
		if !strings.Contains(result.Markdown, expected) {
			t.Fatalf("structured action meaning %q was not visible:\n%s", expected, result.Markdown)
		}
	}
	if strings.Contains(result.Markdown, "Miss: none") || strings.Contains(result.Markdown, "NONE") {
		t.Fatalf("action sentinels leaked into visible prose:\n%s", result.Markdown)
	}
}

func TestUnnamedFeaturesBlockStrictExport(t *testing.T) {
	creature := completeCustomCreature("unnamed-fixture", "Unnamed Warden")
	creature.StatBlock["traits"] = []any{map[string]any{"description": "Meaning without a label."}}
	block, report := Build(BuildInput{Creature: creature})
	if report.Status != "unsupported" || !contains(report.BlockingFields, "traits[0].name") {
		t.Fatalf("unnamed feature was not reported as blocking: %+v", report)
	}
	if _, err := RenderMarkdown(block, report, false); err == nil {
		t.Fatal("strict rendering accepted a feature that violates the compatibility profile")
	}
}

func TestCustomSpellcasterAndSectionsRender(t *testing.T) {
	creature := models.Creature{
		ID: "custom-1", Name: "Oracle: of Snow", Size: "Medium", CreatureType: "humanoid",
		Alignment: "Neutral", ArmorClass: 14, HitPoints: 44, HitDice: "8d8+8",
		ChallengeRating: "3", LibrarySource: "user",
		StatBlock: map[string]any{
			"abilityScores": map[string]any{
				"str": 8, "dex": 14, "con": 12, "int": 13, "wis": 17, "cha": 11,
			},
			"speed":                     map[string]any{"walk": 30},
			"savingThrowProficiencies":  []any{"wis"},
			"skillProficiencies":        []any{"perception"},
			"skillExpertise":            []any{"perception"},
			"damageResistances":         []any{"cold"},
			"damageVulnerabilities":     []any{},
			"damageImmunities":          []any{},
			"conditionImmunities":       []any{},
			"senses":                    map[string]any{"darkvision": map[string]any{"enabled": true, "range": "60"}},
			"passivePerception":         15,
			"languages":                 []any{"Common", "Giant"},
			"legendaryDescription":      "The oracle takes two legendary actions.",
			"passiveInvestigation":      11,
			"passiveInsight":            15,
			"environment":               "arctic",
			"defaultDisposition":        "enemy",
			"spellcastingAbility":       "wis",
			"innateSpellcastingAbility": "",
		},
	}
	actions := []models.CreatureAction{
		{Name: "Snow Knife", Description: "A line with: punctuation and \"quotes\".", DisplaySection: "action"},
		{Name: "Foretell", Description: "The oracle warns an ally.", DisplaySection: "reaction"},
	}
	profile := models.CreatureSpellcastingProfile{
		CasterLevel: 5, SpellcastingAbility: "wis", SpellSaveDC: 13, SpellAttackBonus: 5,
		Slots: map[string]any{"1": 4, "2": 3},
		Spells: []models.CreatureSpell{
			{SpellName: "guidance", SpellLevel: 1},
			{SpellName: "ice storm", SpellLevel: 2},
		},
	}
	result, err := BuildAndRender(BuildInput{
		Creature: creature, Actions: actions, Spellcasting: profile,
	}, false)
	if err != nil {
		t.Fatal(err)
	}
	if result.Compatibility.Status != "complete_with_warnings" {
		t.Fatalf("unexpected compatibility: %+v", result.Compatibility)
	}
	if result.Profile != Profile || result.Output != "structured" || result.YAML == "" {
		t.Fatalf("missing versioned structured export contract: %+v", result)
	}
	var parsed map[string]any
	if err := yaml.Unmarshal([]byte(result.YAML), &parsed); err != nil {
		t.Fatalf("generated YAML is not parseable: %v\n%s", err, result.YAML)
	}
	if parsed["layout"] != "Basic 5e Layout" || parsed["name"] != creature.Name {
		t.Fatalf("unexpected generated YAML: %#v", parsed)
	}
	for _, expected := range []string{
		"```statblock", "name: 'Oracle: of Snow'", "reactions:",
		"spells:", "1st level (4 slots): guidance", "2nd level (3 slots): ice storm",
		"Darkvision 60 ft.", "Passive Perception 15",
	} {
		if !strings.Contains(result.Markdown, expected) {
			t.Fatalf("expected %q in output:\n%s", expected, result.Markdown)
		}
	}
}

func TestStandardSpellcastingTextIsPreservedAsPluginSpellLines(t *testing.T) {
	creature := models.Creature{
		ID: "srd-caster", Name: "Acolyte", Size: "Medium", CreatureType: "humanoid",
		ArmorClass: 10, HitPoints: 9, HitDice: "2d8", ChallengeRating: "1/4",
		LibrarySource: "standard", SourceKey: "srd-2014", SourceLabel: "SRD 2014",
		StatBlock: map[string]any{
			"abilities": map[string]any{
				"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 14, "cha": 11,
			},
			"speed": map[string]any{"walk": 30},
			"specialAbilities": []any{map[string]any{
				"name": "Spellcasting", "description": "duplicated source text",
			}},
			"spellcasting": map[string]any{
				"name":        "Spellcasting",
				"description": "The acolyte is a 1st-level spellcaster.\n\n- Cantrips (at will): light, sacred flame\n- 1st level (3 slots): bless, cure wounds",
			},
		},
	}
	result, err := BuildAndRender(BuildInput{Creature: creature}, false)
	if err != nil {
		t.Fatal(err)
	}
	for _, expected := range []string{
		"The acolyte is a 1st-level spellcaster.",
		"Cantrips (at will): light, sacred flame",
		"1st level (3 slots): bless, cure wounds",
	} {
		if !strings.Contains(result.Markdown, expected) {
			t.Fatalf("standard spellcasting line %q was lost:\n%s", expected, result.Markdown)
		}
	}
	if strings.Contains(result.Markdown, "duplicated source text") {
		t.Fatalf("spellcasting was rendered twice:\n%s", result.Markdown)
	}
	if !contains(result.Compatibility.AdjacentOnlyFields, "spellcasting.name") ||
		result.Canonical.StructuredMechanics["standardSpellcasting"] == nil {
		t.Fatalf("spellcasting metadata was not classified and retained: %+v", result)
	}
}

func TestUnknownAndRestrictedFieldsAreExplicit(t *testing.T) {
	creature := models.Creature{
		ID: "restricted", Name: "Unknown", Size: "Medium", CreatureType: "aberration",
		ArmorClass: 10, HitPoints: 10, HitDice: "2d8", ChallengeRating: "1",
		LibrarySource: "standard", SourceLabel: "Proprietary Bestiary", SourceKey: "paid-source",
		StatBlock: map[string]any{
			"abilities": map[string]any{"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10},
			"speed":     map[string]any{"walk": "30 ft."}, "mysteryField": true,
		},
	}
	_, report := Build(BuildInput{Creature: creature})
	if report.Status != "unsupported" || report.ExportAllowed {
		t.Fatalf("expected restricted source to be unsupported: %+v", report)
	}
	if !contains(report.UnmappedFields, "mysteryField") ||
		!contains(report.BlockingFields, "sourceLicense") {
		t.Fatalf("expected explicit unmapped and license fields: %+v", report)
	}
}

func contains(values []string, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}
	return false
}
