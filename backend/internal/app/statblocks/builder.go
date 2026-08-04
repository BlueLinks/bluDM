package statblocks

import (
	"fmt"
	"sort"
	"strings"

	"bludm/backend/internal/models"
)

func Build(input BuildInput) (Canonical5eStatBlock, CompatibilityReport) {
	creature := input.Creature
	sourceShape := "user"
	if creature.LibrarySource == "standard" {
		sourceShape = "standard"
	}
	report := CompatibilityReport{
		Profile: Profile, SourceShape: sourceShape, EntityID: creature.ID, ExportAllowed: true,
		MappedFields: []string{}, DerivedFields: []string{}, FlattenedFields: []string{},
		AdjacentOnlyFields: []string{},
		OmittedFields:      []string{}, BlockingFields: []string{}, UnmappedFields: []string{},
		MissingFields: []string{}, LossyFields: []string{}, Warnings: []string{},
	}
	block := Canonical5eStatBlock{
		Profile: Profile, SourceShape: sourceShape, EntityID: creature.ID,
		Name: creature.Name, Source: creature.SourceLabel, Size: creature.Size,
		Type: creature.CreatureType, Alignment: creature.Alignment, ArmorClass: creature.ArmorClass,
		HitPoints: creature.HitPoints, HitDice: creature.HitDice, ChallengeRating: creature.ChallengeRating,
		Saves: map[string]int{}, SkillSaves: map[string]int{}, Traits: []Feature{}, Spells: []string{},
		Actions: []Feature{}, BonusActions: []Feature{}, Reactions: []Feature{},
		LegendaryActions: []Feature{}, MythicActions: []Feature{}, LairActions: []Feature{},
		RegionalEffects: []Feature{}, AdjacentMetadata: map[string]any{}, StructuredMechanics: map[string]any{},
	}
	if safeImage(input.VaultImagePath) {
		block.Image = input.VaultImagePath
		report.MappedFields = append(report.MappedFields, "image")
	} else if safeImage(creature.AvatarURL) {
		block.Image = creature.AvatarURL
		report.MappedFields = append(report.MappedFields, "image")
	} else if creature.AvatarURL != "" || creature.ImageAssetID != "" {
		report.OmittedFields = append(report.OmittedFields, "image")
		report.Warnings = append(report.Warnings, "Authenticated or unsafe image URL omitted; provide a Vault image path.")
	}
	mapCore(&block, &report, creature)
	if sourceShape == "standard" {
		mapStandard(&block, &report, creature.StatBlock)
		enforceStandardLicense(&report, creature)
	} else {
		mapUser(&block, &report, creature.StatBlock)
		mapUserActions(&block, &report, input.Actions)
		mapUserSpellcasting(&block, &report, creature.StatBlock, input.Spellcasting)
	}
	if len(input.Snapshot) > 0 {
		block.AdjacentMetadata["encounterSnapshot"] = input.Snapshot
		report.AdjacentOnlyFields = appendUnique(report.AdjacentOnlyFields, "encounterSnapshot")
	}
	validate(&block, &report)
	sortReport(&report)
	return block, report
}

func mapCore(block *Canonical5eStatBlock, report *CompatibilityReport, creature models.Creature) {
	fields := map[string]bool{
		"name": creature.Name != "", "size": creature.Size != "", "type": creature.CreatureType != "",
		"alignment": creature.Alignment != "", "ac": creature.ArmorClass > 0, "hp": creature.HitPoints > 0,
		"hit_dice": creature.HitDice != "", "cr": creature.ChallengeRating != "", "source": creature.SourceLabel != "",
	}
	for field, present := range fields {
		if present {
			report.MappedFields = append(report.MappedFields, field)
		}
	}
	block.AdjacentMetadata["description"] = creature.Description
	block.AdjacentMetadata["xp"] = creature.XP
	block.AdjacentMetadata["librarySource"] = creature.LibrarySource
	block.AdjacentMetadata["sourceKey"] = creature.SourceKey
	block.AdjacentMetadata["entityId"] = creature.ID
	report.AdjacentOnlyFields = append(
		report.AdjacentOnlyFields,
		"description", "xp", "entityId", "librarySource", "sourceKey",
	)
}

func validate(block *Canonical5eStatBlock, report *CompatibilityReport) {
	required := []struct {
		field string
		ok    bool
	}{
		{"name", block.Name != ""}, {"size", block.Size != ""}, {"type", block.Type != ""},
		{"ac", block.ArmorClass > 0}, {"hp", block.HitPoints > 0},
		{"hit_dice", block.HitDice != ""}, {"speed", block.Speed != ""},
		{"stats", allStatsPresent(block.Stats)}, {"cr", block.ChallengeRating != ""},
	}
	for _, value := range required {
		if !value.ok {
			report.MissingFields = append(report.MissingFields, value.field)
			report.BlockingFields = append(report.BlockingFields, value.field)
		}
	}
	sections := []struct {
		name     string
		features []Feature
	}{
		{"traits", block.Traits}, {"actions", block.Actions},
		{"bonus_actions", block.BonusActions}, {"reactions", block.Reactions},
		{"legendary_actions", block.LegendaryActions}, {"mythic_actions", block.MythicActions},
		{"lair_actions", block.LairActions}, {"regional_effects", block.RegionalEffects},
	}
	for _, section := range sections {
		for index, feature := range section.features {
			if strings.TrimSpace(feature.Name) == "" {
				field := fmt.Sprintf("%s[%d].name", section.name, index)
				report.MissingFields = append(report.MissingFields, field)
				report.BlockingFields = append(report.BlockingFields, field)
				report.Warnings = append(report.Warnings, "Every visible feature requires a name; unnamed content was not exported silently.")
			}
		}
	}
	if !report.ExportAllowed {
		report.BlockingFields = appendUnique(report.BlockingFields, "sourceLicense")
	}
	if len(report.AdjacentOnlyFields) > 0 {
		report.Warnings = append(
			report.Warnings,
			"Fields classified as adjacent-only are retained in structured output but are not visible in Basic 5e Layout YAML.",
		)
	}
	switch {
	case len(report.BlockingFields) > 0:
		report.Status = "unsupported"
	case len(report.Warnings) > 0 || len(report.FlattenedFields) > 0 ||
		len(report.AdjacentOnlyFields) > 0 || len(report.OmittedFields) > 0 || len(report.UnmappedFields) > 0:
		report.Status = "complete_with_warnings"
	default:
		report.Status = "complete"
	}
}

func allStatsPresent(stats [6]int) bool {
	for _, value := range stats {
		if value <= 0 {
			return false
		}
	}
	return true
}

func enforceStandardLicense(report *CompatibilityReport, creature models.Creature) {
	label := strings.ToLower(creature.SourceLabel)
	if !strings.HasPrefix(creature.SourceKey, "srd-") && !strings.Contains(label, "srd") {
		report.ExportAllowed = false
		report.Warnings = append(report.Warnings, "The standard source is not marked as redistributable SRD content.")
	}
}

func sortReport(report *CompatibilityReport) {
	report.MappedFields = sortedUnique(report.MappedFields)
	report.DerivedFields = sortedUnique(report.DerivedFields)
	report.FlattenedFields = sortedUnique(report.FlattenedFields)
	report.AdjacentOnlyFields = sortedUnique(report.AdjacentOnlyFields)
	report.OmittedFields = sortedUnique(report.OmittedFields)
	report.BlockingFields = sortedUnique(report.BlockingFields)
	report.UnmappedFields = sortedUnique(report.UnmappedFields)
	report.MissingFields = sortedUnique(report.MissingFields)
	report.LossyFields = sortedUnique(report.LossyFields)
	report.Warnings = sortedUnique(report.Warnings)
	sort.Strings(report.Warnings)
}

func addUnmapped(report *CompatibilityReport, source map[string]any, known map[string]bool) {
	for key := range source {
		if !known[key] {
			report.UnmappedFields = append(report.UnmappedFields, key)
			report.Warnings = append(report.Warnings, fmt.Sprintf("Unknown stat-block field %q was not rendered.", key))
		}
	}
}
