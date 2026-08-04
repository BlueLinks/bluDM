package statblocks

import "bludm/backend/internal/models"

const Profile = "fantasy-statblocks-basic-5e@1"

type Feature struct {
	Name string `json:"name" yaml:"name"`
	Desc string `json:"desc" yaml:"desc"`
}

type Canonical5eStatBlock struct {
	Profile               string         `json:"profile"`
	SourceShape           string         `json:"sourceShape"`
	EntityID              string         `json:"entityId"`
	Name                  string         `json:"name"`
	Image                 string         `json:"image,omitempty"`
	Source                string         `json:"source,omitempty"`
	Size                  string         `json:"size"`
	Type                  string         `json:"type"`
	Subtype               string         `json:"subtype,omitempty"`
	Alignment             string         `json:"alignment,omitempty"`
	ArmorClass            int            `json:"armorClass"`
	ArmorClassNotes       string         `json:"armorClassNotes,omitempty"`
	HitPoints             int            `json:"hitPoints"`
	HitDice               string         `json:"hitDice"`
	Speed                 string         `json:"speed"`
	Stats                 [6]int         `json:"stats"`
	Saves                 map[string]int `json:"saves"`
	SkillSaves            map[string]int `json:"skillSaves"`
	DamageVulnerabilities string         `json:"damageVulnerabilities"`
	DamageResistances     string         `json:"damageResistances"`
	DamageImmunities      string         `json:"damageImmunities"`
	ConditionImmunities   string         `json:"conditionImmunities"`
	Senses                string         `json:"senses"`
	Languages             string         `json:"languages"`
	ChallengeRating       string         `json:"challengeRating"`
	Traits                []Feature      `json:"traits"`
	Spells                []string       `json:"spells"`
	SpellsNotes           string         `json:"spellsNotes,omitempty"`
	Actions               []Feature      `json:"actions"`
	BonusActions          []Feature      `json:"bonusActions"`
	Reactions             []Feature      `json:"reactions"`
	LegendaryDescription  string         `json:"legendaryDescription,omitempty"`
	LegendaryActions      []Feature      `json:"legendaryActions"`
	MythicDescription     string         `json:"mythicDescription,omitempty"`
	MythicActions         []Feature      `json:"mythicActions"`
	LairActions           []Feature      `json:"lairActions"`
	RegionalEffects       []Feature      `json:"regionalEffects"`
	AdjacentMetadata      map[string]any `json:"adjacentMetadata"`
	StructuredMechanics   map[string]any `json:"structuredMechanics"`
}

type CompatibilityReport struct {
	Status             string   `json:"status"`
	Profile            string   `json:"profile"`
	SourceShape        string   `json:"sourceShape"`
	EntityID           string   `json:"entityId"`
	MappedFields       []string `json:"mappedFields"`
	DerivedFields      []string `json:"derivedFields"`
	FlattenedFields    []string `json:"flattenedFields"`
	AdjacentOnlyFields []string `json:"adjacentOnlyFields"`
	OmittedFields      []string `json:"omittedFields"`
	BlockingFields     []string `json:"blockingFields"`
	UnmappedFields     []string `json:"unmappedFields"`
	MissingFields      []string `json:"missingFields"`
	LossyFields        []string `json:"lossyFields"`
	Warnings           []string `json:"warnings"`
	ExportAllowed      bool     `json:"exportAllowed"`
}

type BuildInput struct {
	Creature       models.Creature
	Actions        []models.CreatureAction
	Spellcasting   models.CreatureSpellcastingProfile
	Snapshot       map[string]any
	VaultImagePath string
}

type Result struct {
	Profile       string               `json:"profile"`
	Output        string               `json:"output"`
	AppURL        string               `json:"appUrl,omitempty"`
	ExportURL     string               `json:"exportUrl,omitempty"`
	Canonical     Canonical5eStatBlock `json:"canonical"`
	Compatibility CompatibilityReport  `json:"compatibility"`
	YAML          string               `json:"yaml,omitempty"`
	Markdown      string               `json:"markdown,omitempty"`
}
