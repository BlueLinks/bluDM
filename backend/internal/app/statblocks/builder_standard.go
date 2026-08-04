package statblocks

import (
	"fmt"
	"strings"
)

func mapStandard(block *Canonical5eStatBlock, report *CompatibilityReport, source map[string]any) {
	abilities := mapValue(source["abilities"])
	for index, ability := range abilityOrder {
		block.Stats[index] = intValue(abilities[ability])
	}
	report.MappedFields = append(report.MappedFields, "stats")
	block.Subtype = stringValue(source["creatureSubtype"])
	block.ArmorClassNotes = stringValue(source["armorClassNotes"])
	if block.ArmorClassNotes != "" {
		report.MappedFields = append(report.MappedFields, "ac.notes")
	}
	block.Speed = speedString(mapValue(source["speed"]))
	report.MappedFields = append(report.MappedFields, "speed")

	for name, value := range mapValue(source["abilitySaveProficiencies"]) {
		block.Saves[strings.ToLower(name)] = intValue(value)
	}
	if len(block.Saves) > 0 {
		report.MappedFields = append(report.MappedFields, "saves")
	}
	for name, value := range mapValue(source["skills"]) {
		block.SkillSaves[title(name)] = intValue(value)
	}
	if len(block.SkillSaves) > 0 {
		report.MappedFields = append(report.MappedFields, "skillsaves")
	}
	mapStandardDefenses(block, report, mapValue(source["defenses"]))
	block.Senses = standardSenses(mapValue(source["senses"]))
	block.Languages = stringValue(source["languages"])
	if block.Senses != "" {
		report.MappedFields = append(report.MappedFields, "senses")
	}
	if block.Languages != "" {
		report.MappedFields = append(report.MappedFields, "languages")
	}

	block.Traits = featureValues(source["specialAbilities"])
	block.Actions = featureValues(source["actions"])
	block.BonusActions = featureValues(source["bonusActions"])
	block.Reactions = featureValues(source["reactions"])
	block.LegendaryActions = featureValues(source["legendaryActions"])
	block.MythicActions = featureValues(source["mythicActions"])
	block.LairActions = featureValues(source["lairActions"])
	block.RegionalEffects = featureValues(source["regionalEffects"])
	mapFeatureCoverage(block, report)
	mapStandardSpellcasting(block, report, source["spellcasting"])
	if len(block.Spells) > 0 {
		spellcastingName := stringValue(mapValue(source["spellcasting"])["name"])
		block.Traits = withoutFeature(block.Traits, spellcastingName)
	}

	block.AdjacentMetadata["defaultDisposition"] = source["defaultDisposition"]
	block.AdjacentMetadata["gear"] = source["gear"]
	block.AdjacentMetadata["proficiencyBonus"] = source["proficiencyBonus"]
	block.AdjacentMetadata["source"] = source["source"]
	block.StructuredMechanics["standardActions"] = source["actions"]
	block.StructuredMechanics["standardTraits"] = source["specialAbilities"]
	block.StructuredMechanics["standardBonusActions"] = source["bonusActions"]
	block.StructuredMechanics["standardReactions"] = source["reactions"]
	block.StructuredMechanics["standardLegendaryActions"] = source["legendaryActions"]
	block.StructuredMechanics["standardMythicActions"] = source["mythicActions"]
	block.StructuredMechanics["standardLairActions"] = source["lairActions"]
	block.StructuredMechanics["standardRegionalEffects"] = source["regionalEffects"]
	for _, section := range []string{
		"specialAbilities", "actions", "bonusActions", "reactions", "legendaryActions",
		"mythicActions", "lairActions", "regionalEffects",
	} {
		if featureDataHasStructuredMechanics(source[section]) {
			report.FlattenedFields = append(report.FlattenedFields, section+".structuredMechanics")
		}
	}
	report.AdjacentOnlyFields = append(
		report.AdjacentOnlyFields,
		"defaultDisposition", "gear", "proficiencyBonus", "rawText", "sourceMetadata",
	)
	known := map[string]bool{
		"abilities": true, "abilitySaveProficiencies": true, "actions": true, "bonusActions": true,
		"creatureSubtype": true, "defaultDisposition": true, "defenses": true, "gear": true,
		"languages": true, "legendaryActions": true, "mythicActions": true, "lairActions": true,
		"regionalEffects": true, "proficiencyBonus": true, "rawText": true, "reactions": true,
		"senses": true, "skills": true, "source": true, "specialAbilities": true, "speed": true,
		"spellcasting": true, "legendaryDescription": true, "mythicDescription": true,
		"armorClassNotes": true,
	}
	block.LegendaryDescription = stringValue(source["legendaryDescription"])
	block.MythicDescription = stringValue(source["mythicDescription"])
	if block.LegendaryDescription != "" {
		report.MappedFields = append(report.MappedFields, "legendary_description")
	}
	if block.MythicDescription != "" {
		report.MappedFields = append(report.MappedFields, "mythic_description")
	}
	if len(block.LegendaryActions) > 0 && block.LegendaryDescription == "" {
		block.LegendaryDescription = fmt.Sprintf(
			"%s can take legendary actions, choosing from the options below.", block.Name,
		)
		report.DerivedFields = append(report.DerivedFields, "legendary_description")
	}
	addUnmapped(report, source, known)
}

func featureDataHasStructuredMechanics(value any) bool {
	for _, raw := range sliceValue(value) {
		for key, field := range mapValue(raw) {
			if key != "name" && key != "description" && key != "desc" && field != nil {
				return true
			}
		}
	}
	return false
}

func mapStandardDefenses(
	block *Canonical5eStatBlock,
	report *CompatibilityReport,
	defenses map[string]any,
) {
	block.DamageVulnerabilities = strings.Join(stringsValue(defenses["vulnerabilities"]), ", ")
	block.DamageResistances = strings.Join(stringsValue(defenses["resistances"]), ", ")
	block.DamageImmunities = strings.Join(stringsValue(defenses["immunities"]), ", ")
	block.ConditionImmunities = strings.Join(stringsValue(defenses["conditionImmunities"]), ", ")
	report.MappedFields = append(report.MappedFields,
		"damage_vulnerabilities", "damage_resistances", "damage_immunities", "condition_immunities",
	)
}

func standardSenses(senses map[string]any) string {
	normalized := map[string]any{}
	for key, value := range senses {
		normalized[strings.ToLower(key)] = value
	}
	keys := []string{"blindsight", "darkvision", "tremorsense", "truesight"}
	parts := []string{}
	for _, key := range keys {
		if value := stringValue(normalized[key]); value != "" {
			parts = append(parts, title(key)+" "+value)
		}
	}
	passive := intValue(normalized["passive_perception"])
	if passive == 0 {
		passive = intValue(normalized["passiveperception"])
	}
	if passive > 0 {
		parts = append(parts, fmt.Sprintf("Passive Perception %d", passive))
	}
	return strings.Join(parts, ", ")
}

func mapStandardSpellcasting(
	block *Canonical5eStatBlock,
	report *CompatibilityReport,
	value any,
) {
	spellcasting := mapValue(value)
	if len(spellcasting) == 0 {
		return
	}
	description := stringValue(spellcasting["description"])
	if description != "" {
		block.Spells = spellcastingLines(description)
		report.MappedFields = append(report.MappedFields, "spells")
	}
	if usage := stringValue(spellcasting["usage"]); usage != "" {
		block.SpellsNotes = usage
		report.MappedFields = append(report.MappedFields, "spellsNotes")
	}
	block.StructuredMechanics["standardSpellcasting"] = spellcasting
	for _, field := range []string{"name", "usage"} {
		if value, found := spellcasting[field]; found && value != nil && stringValue(value) != "" {
			report.AdjacentOnlyFields = append(report.AdjacentOnlyFields, "spellcasting."+field)
		}
	}
}

func spellcastingLines(description string) []string {
	lines := []string{}
	for _, line := range strings.Split(strings.ReplaceAll(description, "\r\n", "\n"), "\n") {
		line = strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(line), "-"))
		if line != "" {
			lines = append(lines, line)
		}
	}
	return lines
}

func withoutFeature(features []Feature, name string) []Feature {
	if strings.TrimSpace(name) == "" {
		return features
	}
	result := make([]Feature, 0, len(features))
	for _, feature := range features {
		if !strings.EqualFold(strings.TrimSpace(feature.Name), strings.TrimSpace(name)) {
			result = append(result, feature)
		}
	}
	return result
}

func mapFeatureCoverage(block *Canonical5eStatBlock, report *CompatibilityReport) {
	sections := []struct {
		name     string
		features []Feature
	}{
		{"traits", block.Traits}, {"actions", block.Actions}, {"bonus_actions", block.BonusActions},
		{"reactions", block.Reactions}, {"legendary_actions", block.LegendaryActions},
		{"mythic_actions", block.MythicActions}, {"lair_actions", block.LairActions},
		{"regional_effects", block.RegionalEffects},
	}
	for _, section := range sections {
		if len(section.features) > 0 {
			report.MappedFields = append(report.MappedFields, section.name)
		}
	}
}
