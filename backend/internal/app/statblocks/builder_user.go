package statblocks

import (
	"fmt"
	"sort"
	"strconv"
	"strings"

	"bludm/backend/internal/models"
)

func mapUser(block *Canonical5eStatBlock, report *CompatibilityReport, source map[string]any) {
	abilities := mapValue(source["abilityScores"])
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
	mapUserSavesAndSkills(block, report, source)
	block.DamageVulnerabilities = strings.Join(stringsValue(source["damageVulnerabilities"]), ", ")
	block.DamageResistances = strings.Join(stringsValue(source["damageResistances"]), ", ")
	block.DamageImmunities = strings.Join(stringsValue(source["damageImmunities"]), ", ")
	block.ConditionImmunities = strings.Join(stringsValue(source["conditionImmunities"]), ", ")
	report.MappedFields = append(report.MappedFields,
		"damage_vulnerabilities", "damage_resistances", "damage_immunities", "condition_immunities",
	)
	block.Senses = userSenses(source)
	block.Languages = strings.Join(stringsValue(source["languages"]), ", ")
	if block.Languages == "" {
		block.Languages = stringValue(source["languages"])
	}
	block.Traits = featureValues(source["traits"])
	block.LegendaryDescription = stringValue(source["legendaryDescription"])
	block.MythicDescription = stringValue(source["mythicDescription"])
	mapEmbeddedCustomSections(block, report, source)
	mapFeatureCoverage(block, report)
	block.AdjacentMetadata["environment"] = source["environment"]
	block.AdjacentMetadata["defaultDisposition"] = source["defaultDisposition"]
	block.AdjacentMetadata["passiveInvestigation"] = source["passiveInvestigation"]
	block.AdjacentMetadata["passiveInsight"] = source["passiveInsight"]
	report.AdjacentOnlyFields = append(report.AdjacentOnlyFields,
		"environment", "defaultDisposition", "passiveInvestigation", "passiveInsight",
	)
	known := map[string]bool{
		"abilityScores": true, "savingThrowProficiencies": true, "skillProficiencies": true,
		"skillExpertise": true, "speed": true, "creatureSubtype": true, "environment": true,
		"defaultDisposition": true, "languages": true, "passivePerception": true,
		"passiveInvestigation": true, "passiveInsight": true, "damageVulnerabilities": true,
		"damageResistances": true, "damageImmunities": true, "conditionImmunities": true,
		"senses": true, "spellcastingAbility": true, "innateSpellcastingAbility": true,
		"casterLevel": true, "spellSaveDC": true, "spellAttackBonus": true, "traits": true,
		"actions": true, "bonusActions": true, "reactions": true, "legendaryActions": true,
		"mythicActions": true, "lairActions": true, "regionalEffects": true,
		"legendaryDescription": true, "mythicDescription": true,
		"armorClassNotes": true,
	}
	addUnmapped(report, source, known)
}

func mapUserSavesAndSkills(
	block *Canonical5eStatBlock,
	report *CompatibilityReport,
	source map[string]any,
) {
	proficiency := proficiencyBonus(block.ChallengeRating)
	scores := map[string]int{}
	for index, ability := range abilityOrder {
		scores[ability] = block.Stats[index]
	}
	for _, ability := range stringsValue(source["savingThrowProficiencies"]) {
		key := strings.ToLower(ability)
		block.Saves[key] = abilityModifier(scores[key]) + proficiency
	}
	if len(block.Saves) > 0 {
		report.DerivedFields = append(report.DerivedFields, "saves")
	}
	expertise := map[string]bool{}
	for _, skill := range stringsValue(source["skillExpertise"]) {
		expertise[strings.ToLower(skill)] = true
	}
	for _, skill := range stringsValue(source["skillProficiencies"]) {
		key := strings.ToLower(skill)
		ability := skillAbilities[key]
		bonus := proficiency
		if expertise[key] {
			bonus *= 2
		}
		block.SkillSaves[title(key)] = abilityModifier(scores[ability]) + bonus
	}
	if len(block.SkillSaves) > 0 {
		report.DerivedFields = append(report.DerivedFields, "skillsaves")
	}
}

func userSenses(source map[string]any) string {
	parts := []string{}
	senses := mapValue(source["senses"])
	keys := make([]string, 0, len(senses))
	for key := range senses {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		value := mapValue(senses[key])
		if enabled, ok := value["enabled"].(bool); ok && !enabled {
			continue
		}
		distance := stringValue(value["range"])
		if distance == "" {
			if number := intValue(value["range"]); number > 0 {
				distance = strconv.Itoa(number)
			}
		}
		if distance != "" && !strings.Contains(distance, "ft") {
			distance += " ft."
		}
		if distance != "" {
			parts = append(parts, title(key)+" "+distance)
		}
	}
	if passive := intValue(source["passivePerception"]); passive > 0 {
		parts = append(parts, fmt.Sprintf("Passive Perception %d", passive))
	}
	return strings.Join(parts, ", ")
}

func mapEmbeddedCustomSections(
	block *Canonical5eStatBlock,
	report *CompatibilityReport,
	source map[string]any,
) {
	block.Actions = append(block.Actions, featureValues(source["actions"])...)
	block.BonusActions = append(block.BonusActions, featureValues(source["bonusActions"])...)
	block.Reactions = append(block.Reactions, featureValues(source["reactions"])...)
	block.LegendaryActions = append(block.LegendaryActions, featureValues(source["legendaryActions"])...)
	block.MythicActions = append(block.MythicActions, featureValues(source["mythicActions"])...)
	block.LairActions = append(block.LairActions, featureValues(source["lairActions"])...)
	block.RegionalEffects = append(block.RegionalEffects, featureValues(source["regionalEffects"])...)
	block.StructuredMechanics["embeddedCustomSections"] = map[string]any{
		"traits": source["traits"], "actions": source["actions"],
		"bonusActions": source["bonusActions"], "reactions": source["reactions"],
		"legendaryActions": source["legendaryActions"], "mythicActions": source["mythicActions"],
		"lairActions": source["lairActions"], "regionalEffects": source["regionalEffects"],
	}
	for _, section := range []string{
		"traits", "actions", "bonusActions", "reactions", "legendaryActions",
		"mythicActions", "lairActions", "regionalEffects",
	} {
		if featureDataHasStructuredMechanics(source[section]) {
			report.FlattenedFields = append(report.FlattenedFields, section+".structuredMechanics")
		}
	}
}

func mapUserActions(
	block *Canonical5eStatBlock,
	report *CompatibilityReport,
	actions []models.CreatureAction,
) {
	if len(actions) == 0 {
		return
	}
	block.StructuredMechanics["creatureActions"] = actions
	for _, action := range actions {
		feature := Feature{Name: action.Name, Desc: actionDescription(action)}
		switch action.DisplaySection {
		case "trait":
			block.Traits = append(block.Traits, feature)
		case "bonus_action":
			block.BonusActions = append(block.BonusActions, feature)
		case "reaction":
			block.Reactions = append(block.Reactions, feature)
		case "legendary_action":
			block.LegendaryActions = append(block.LegendaryActions, feature)
		case "mythic_action":
			block.MythicActions = append(block.MythicActions, feature)
		case "lair_action":
			block.LairActions = append(block.LairActions, feature)
		case "", "action":
			block.Actions = append(block.Actions, feature)
		default:
			report.BlockingFields = append(report.BlockingFields, "action:"+action.ID+":displaySection")
			report.Warnings = append(report.Warnings, "A custom action has an unsupported display section.")
		}
	}
	report.FlattenedFields = append(report.FlattenedFields, "structuredActionMechanics")
	report.LossyFields = append(report.LossyFields, "structuredActionMechanics")
	report.Warnings = append(report.Warnings, "Structured action mechanics were rendered as deterministic prose.")
	mapFeatureCoverage(block, report)
}

func actionDescription(action models.CreatureAction) string {
	parts := []string{}
	if action.Recharge != "" {
		parts = append(parts, "Recharge "+action.Recharge+".")
	}
	if action.LimitedUses > 0 {
		uses := "uses"
		if action.LimitedUses == 1 {
			uses = "use"
		}
		limit := strings.TrimSpace(action.LimitType)
		if limit == "" || strings.EqualFold(limit, "none") {
			parts = append(parts, fmt.Sprintf("%d %s.", action.LimitedUses, uses))
		} else {
			parts = append(parts, fmt.Sprintf("%d %s per %s.", action.LimitedUses, uses, limit))
		}
	}
	attackLabel := map[string]string{
		"melee_weapon": "Melee Weapon Attack", "ranged_weapon": "Ranged Weapon Attack",
		"spell_attack": "Spell Attack",
	}[strings.ToLower(strings.TrimSpace(action.ActionType))]
	if attackLabel != "" {
		details := []string{fmt.Sprintf("%+d to hit", action.AttackModifier)}
		if action.Reach > 0 {
			details = append(details, fmt.Sprintf("reach %d ft.", action.Reach))
		}
		if action.Range > 0 {
			details = append(details, fmt.Sprintf("range %d ft.", action.Range))
		}
		parts = append(parts, attackLabel+": "+strings.Join(details, ", ")+".")
	} else {
		if action.Reach > 0 {
			parts = append(parts, fmt.Sprintf("Reach %d ft.", action.Reach))
		}
		if action.Range > 0 {
			parts = append(parts, fmt.Sprintf("Range %d ft.", action.Range))
		}
	}
	if action.AOEType != "" && action.AOESize > 0 {
		parts = append(parts, fmt.Sprintf("%d-foot %s.", action.AOESize, action.AOEType))
	}
	for _, roll := range action.Rolls {
		dice := ""
		if roll.DiceCount > 0 && roll.DieSize > 0 {
			dice = fmt.Sprintf("%dd%d", roll.DiceCount, roll.DieSize)
		}
		if roll.FixedValue != 0 {
			dice += fmt.Sprintf("%+d", roll.FixedValue)
		}
		if dice == "" {
			continue
		}
		damageType := strings.TrimSpace(roll.DamageType)
		magical := ""
		if roll.Magical {
			magical = " (magical)"
		}
		switch strings.ToLower(strings.TrimSpace(roll.RollKind)) {
		case "damage", "":
			text := strings.TrimSpace(dice + " " + damageType)
			parts = append(parts, "Hit: "+text+" damage"+magical+".")
		case "healing":
			parts = append(parts, "The target regains "+dice+" hit points.")
		default:
			text := strings.TrimSpace(dice + " " + damageType)
			parts = append(parts, title(roll.RollKind)+": "+text+magical+".")
		}
	}
	if description := strings.TrimSpace(action.Description); description != "" {
		parts = append(parts, description)
	}
	if miss := strings.TrimSpace(action.MissEffect); miss != "" && !strings.EqualFold(miss, "none") {
		meaning := map[string]string{
			"half": "half damage", "full": "full damage",
		}[strings.ToLower(miss)]
		if meaning == "" {
			meaning = miss
		}
		parts = append(parts, "Miss: "+meaning+".")
	}
	if special := strings.TrimSpace(action.HitSpecialEvent); special != "" && !strings.EqualFold(special, "none") {
		meaning := map[string]string{
			"heal_caster_full": "On a hit, the attacker regains hit points equal to the damage dealt.",
			"heal_caster_half": "On a hit, the attacker regains hit points equal to half the damage dealt.",
			"reduce_max_hp":    "On a hit, reduce the target's hit point maximum.",
			"increase_max_hp":  "On a hit, increase the target's hit point maximum.",
			"grant_temp_hp":    "On a hit, grant temporary hit points.",
			"add_condition":    "On a hit, apply the configured condition.",
		}[strings.ToLower(special)]
		if meaning == "" {
			meaning = "On a hit: " + strings.ReplaceAll(special, "_", " ") + "."
		}
		parts = append(parts, meaning)
	}
	return strings.TrimSpace(strings.Join(parts, " "))
}

func mapUserSpellcasting(
	block *Canonical5eStatBlock,
	report *CompatibilityReport,
	source map[string]any,
	profile models.CreatureSpellcastingProfile,
) {
	if profile.CasterLevel == 0 {
		profile.CasterLevel = intValue(source["casterLevel"])
	}
	if profile.SpellcastingAbility == "" {
		profile.SpellcastingAbility = stringValue(source["spellcastingAbility"])
	}
	if profile.InnateSpellcastingAbility == "" {
		profile.InnateSpellcastingAbility = stringValue(source["innateSpellcastingAbility"])
	}
	if profile.SpellSaveDC == 0 {
		profile.SpellSaveDC = intValue(source["spellSaveDC"])
	}
	if profile.SpellAttackBonus == 0 {
		profile.SpellAttackBonus = intValue(source["spellAttackBonus"])
	}
	block.Spells = userSpellcastingLines(profile)
	if len(block.Spells) == 0 && profile.CasterLevel == 0 && profile.SpellSaveDC == 0 {
		return
	}
	block.StructuredMechanics["spellcastingProfile"] = profile
	parts := []string{}
	if profile.CasterLevel > 0 {
		parts = append(parts, fmt.Sprintf("Caster level %d", profile.CasterLevel))
	}
	if profile.SpellcastingAbility != "" {
		parts = append(parts, "spellcasting ability "+title(profile.SpellcastingAbility))
	}
	if profile.InnateSpellcastingAbility != "" {
		parts = append(parts, "innate ability "+title(profile.InnateSpellcastingAbility))
	}
	if profile.SpellSaveDC > 0 {
		parts = append(parts, fmt.Sprintf("spell save DC %d", profile.SpellSaveDC))
	}
	if profile.SpellAttackBonus != 0 {
		parts = append(parts, fmt.Sprintf("%+d to hit with spell attacks", profile.SpellAttackBonus))
	}
	if len(parts) > 0 {
		block.SpellsNotes = strings.TrimSuffix(strings.Join(parts, "; "), ".") + "."
	}
	report.DerivedFields = append(report.DerivedFields, "spells", "spellsNotes")
	report.FlattenedFields = append(report.FlattenedFields, "spellcastingProfile")
	report.AdjacentOnlyFields = append(report.AdjacentOnlyFields, "resolvedSpellReferences")
}

func userSpellcastingLines(profile models.CreatureSpellcastingProfile) []string {
	byLevel := map[int][]string{}
	innate := []string{}
	for _, spell := range profile.Spells {
		name := strings.TrimSpace(spell.SpellName)
		if name == "" {
			continue
		}
		if spell.Innate {
			innate = append(innate, name)
			continue
		}
		byLevel[spell.SpellLevel] = append(byLevel[spell.SpellLevel], name)
	}
	levels := make([]int, 0, len(byLevel))
	for level := range byLevel {
		levels = append(levels, level)
	}
	sort.Ints(levels)
	lines := []string{}
	for _, level := range levels {
		names := sortedUnique(byLevel[level])
		label := "Cantrips (at will)"
		if level > 0 {
			label = ordinal(level) + " level"
			if slots, found := spellSlots(profile.Slots, level); found {
				label += fmt.Sprintf(" (%d slots)", slots)
			}
		}
		lines = append(lines, label+": "+strings.Join(names, ", "))
	}
	if len(innate) > 0 {
		lines = append(lines, "Innate spells (at will): "+strings.Join(sortedUnique(innate), ", "))
	}
	return lines
}

func spellSlots(slots map[string]any, level int) (int, bool) {
	keys := []string{strconv.Itoa(level), fmt.Sprintf("level%d", level), fmt.Sprintf("level_%d", level)}
	for _, key := range keys {
		if value, found := slots[key]; found {
			return intValue(value), true
		}
	}
	return 0, false
}

func ordinal(level int) string {
	suffix := "th"
	if level%100 < 11 || level%100 > 13 {
		switch level % 10 {
		case 1:
			suffix = "st"
		case 2:
			suffix = "nd"
		case 3:
			suffix = "rd"
		}
	}
	return strconv.Itoa(level) + suffix
}
