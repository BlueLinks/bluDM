package statblocks

import (
	"bytes"
	"fmt"
	"strings"

	"gopkg.in/yaml.v3"
)

type fantasyStatblockYAML struct {
	Layout                string         `yaml:"layout"`
	Image                 string         `yaml:"image,omitempty"`
	Name                  string         `yaml:"name"`
	Source                string         `yaml:"source,omitempty"`
	Size                  string         `yaml:"size"`
	Type                  string         `yaml:"type"`
	Subtype               string         `yaml:"subtype,omitempty"`
	Alignment             string         `yaml:"alignment,omitempty"`
	AC                    any            `yaml:"ac"`
	HP                    int            `yaml:"hp"`
	HitDice               string         `yaml:"hit_dice"`
	Speed                 string         `yaml:"speed"`
	Stats                 [6]int         `yaml:"stats,flow"`
	Saves                 map[string]int `yaml:"saves,omitempty"`
	SkillSaves            map[string]int `yaml:"skillsaves,omitempty"`
	DamageVulnerabilities string         `yaml:"damage_vulnerabilities"`
	DamageResistances     string         `yaml:"damage_resistances"`
	DamageImmunities      string         `yaml:"damage_immunities"`
	ConditionImmunities   string         `yaml:"condition_immunities"`
	Senses                string         `yaml:"senses"`
	Languages             string         `yaml:"languages"`
	CR                    string         `yaml:"cr"`
	Traits                []Feature      `yaml:"traits"`
	Spells                []string       `yaml:"spells,omitempty"`
	SpellsNotes           string         `yaml:"spellsNotes,omitempty"`
	Actions               []Feature      `yaml:"actions"`
	BonusActions          []Feature      `yaml:"bonus_actions,omitempty"`
	Reactions             []Feature      `yaml:"reactions,omitempty"`
	LegendaryDescription  string         `yaml:"legendary_description,omitempty"`
	LegendaryActions      []Feature      `yaml:"legendary_actions,omitempty"`
	MythicDescription     string         `yaml:"mythic_description,omitempty"`
	MythicActions         []Feature      `yaml:"mythic_actions,omitempty"`
	LairActions           []Feature      `yaml:"lair_actions,omitempty"`
	RegionalEffects       []Feature      `yaml:"regional_effects,omitempty"`
}

func RenderMarkdown(block Canonical5eStatBlock, report CompatibilityReport, allowPartial bool) (string, error) {
	rendered, err := RenderYAML(block, report, allowPartial)
	if err != nil {
		return "", err
	}
	prefix := ""
	if report.Status == "unsupported" {
		prefix = "> [!warning] Partial bluDM stat block\n> " +
			strings.Join(report.Warnings, " ") + "\n\n"
	}
	return prefix + "```statblock\n" + rendered + "```\n", nil
}

func RenderYAML(block Canonical5eStatBlock, report CompatibilityReport, allowPartial bool) (string, error) {
	if report.Status == "unsupported" && !allowPartial {
		return "", fmt.Errorf("stat block is unsupported: %s", strings.Join(report.BlockingFields, ", "))
	}
	ac := any(block.ArmorClass)
	if block.ArmorClassNotes != "" {
		ac = fmt.Sprintf("%d (%s)", block.ArmorClass, block.ArmorClassNotes)
	}
	document := fantasyStatblockYAML{
		Layout: "Basic 5e Layout", Image: block.Image, Name: block.Name, Source: block.Source,
		Size: block.Size, Type: block.Type, Subtype: block.Subtype, Alignment: block.Alignment,
		AC: ac, HP: block.HitPoints, HitDice: block.HitDice, Speed: block.Speed, Stats: block.Stats,
		Saves: block.Saves, SkillSaves: block.SkillSaves,
		DamageVulnerabilities: block.DamageVulnerabilities,
		DamageResistances:     block.DamageResistances, DamageImmunities: block.DamageImmunities,
		ConditionImmunities: block.ConditionImmunities, Senses: block.Senses,
		Languages: block.Languages, CR: block.ChallengeRating, Traits: block.Traits,
		Spells: block.Spells, SpellsNotes: block.SpellsNotes, Actions: block.Actions,
		BonusActions: block.BonusActions, Reactions: block.Reactions,
		LegendaryDescription: block.LegendaryDescription, LegendaryActions: block.LegendaryActions,
		MythicDescription: block.MythicDescription, MythicActions: block.MythicActions,
		LairActions: block.LairActions, RegionalEffects: block.RegionalEffects,
	}
	var buffer bytes.Buffer
	encoder := yaml.NewEncoder(&buffer)
	encoder.SetIndent(2)
	if err := encoder.Encode(document); err != nil {
		return "", err
	}
	if err := encoder.Close(); err != nil {
		return "", err
	}
	return buffer.String(), nil
}

func BuildAndRender(input BuildInput, allowPartial bool) (Result, error) {
	block, report := Build(input)
	renderedYAML, err := RenderYAML(block, report, allowPartial)
	if err != nil {
		return Result{Profile: Profile, Output: "structured", Canonical: block, Compatibility: report}, err
	}
	markdown, err := RenderMarkdown(block, report, allowPartial)
	if err != nil {
		return Result{Profile: Profile, Output: "structured", Canonical: block, Compatibility: report, YAML: renderedYAML}, err
	}
	return Result{
		Profile: Profile, Output: "structured", Canonical: block,
		Compatibility: report, YAML: renderedYAML, Markdown: markdown,
	}, nil
}
