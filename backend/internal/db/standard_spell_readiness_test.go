package db

import (
	"fmt"
	"strings"
	"testing"
)

func TestStandardSpellsUseCombatReadySchemaValues(t *testing.T) {
	spells, err := parseStandardSpells()
	if err != nil {
		t.Fatalf("parse standard spells: %v", err)
	}
	var failures []string
	for _, spell := range spells {
		if needsStructuredCombatAction(spell) && len(spell.Actions) == 0 && !manualCombatAllowlist[spell.Slug] {
			failures = append(failures, fmt.Sprintf("%s has combat wording but no structured action", spell.Slug))
		}
		for actionIndex, action := range spell.Actions {
			if !allowedSpellActionTypes[action.ActionType] {
				failures = append(failures, fmt.Sprintf("%s action %d has unknown action type %q", spell.Slug, actionIndex, action.ActionType))
			}
			if action.ActionType == "save" && !allowedSaveAbilities[action.SaveAbility] {
				failures = append(failures, fmt.Sprintf("%s action %d has invalid save ability %q", spell.Slug, actionIndex, action.SaveAbility))
			}
			if action.ActionType == "save" && action.SaveAbility == "" {
				failures = append(failures, fmt.Sprintf("%s action %d is a save without a save ability", spell.Slug, actionIndex))
			}
			if action.ActionType == "save" && !allowedSaveEffects[action.SuccessfulSaveEffect] {
				failures = append(failures, fmt.Sprintf("%s action %d has unknown save effect %q", spell.Slug, actionIndex, action.SuccessfulSaveEffect))
			}
			for rollIndex, roll := range action.Rolls {
				failures = append(failures, validateStandardSpellRoll(spell.Slug, actionIndex, rollIndex, roll)...)
			}
		}
	}
	if len(failures) > 0 {
		t.Fatalf("standard spell readiness audit failed:\n- %s", strings.Join(failures, "\n- "))
	}
}

func validateStandardSpellRoll(slug string, actionIndex int, rollIndex int, roll standardSpellActionRollSeed) []string {
	var failures []string
	prefix := fmt.Sprintf("%s action %d roll %d", slug, actionIndex, rollIndex)
	if !allowedSpellRollKinds[roll.RollKind] {
		failures = append(failures, fmt.Sprintf("%s has unknown roll kind %q", prefix, roll.RollKind))
	}
	if !allowedSpellEffectTimings[roll.Timing] {
		failures = append(failures, fmt.Sprintf("%s has unknown timing %q", prefix, roll.Timing))
	}
	if isDamageLikeRoll(roll.RollKind) {
		hasConfigDice := stringValue(roll.EffectConfig["dice"]) != "" || intValue(roll.EffectConfig["diceCount"]) > 0
		hasAmountSource := stringValue(roll.EffectConfig["amountSource"]) != ""
		if roll.DiceCount <= 0 && roll.FixedValue == 0 && !roll.AddPrimaryStatModifier && !hasConfigDice && !hasAmountSource {
			failures = append(failures, fmt.Sprintf("%s has no dice, fixed amount, or spellcasting modifier", prefix))
		}
		if roll.DiceCount > 0 && roll.DieSize <= 0 {
			failures = append(failures, fmt.Sprintf("%s has invalid die size %d", prefix, roll.DieSize))
		}
	}
	if roll.RollKind == "condition" || roll.RollKind == "remove_condition" || roll.RollKind == "condition_immunity" {
		if roll.ConditionName == "" && stringValue(roll.EffectConfig["condition"]) == "" && stringValue(roll.EffectConfig["conditions"]) == "" {
			failures = append(failures, fmt.Sprintf("%s has no condition configured", prefix))
		}
	}
	if roll.RollKind == "roll_modifier" || roll.RollKind == "advantage_state" || roll.RollKind == "roll_reroll" {
		if len(stringSliceValue(roll.EffectConfig["categories"])) == 0 && stringValue(roll.EffectConfig["category"]) == "" {
			failures = append(failures, fmt.Sprintf("%s has no roll categories configured", prefix))
		}
	}
	if roll.RollKind == "damage_defense" {
		if stringValue(roll.EffectConfig["mode"]) == "" || len(stringSliceValue(roll.EffectConfig["damageTypes"])) == 0 {
			failures = append(failures, fmt.Sprintf("%s has incomplete damage defense config", prefix))
		}
	}
	if roll.RollKind == "area_trigger" {
		if !allowedAreaTriggers[stringValue(roll.EffectConfig["trigger"])] {
			failures = append(failures, fmt.Sprintf("%s has unknown area trigger %q", prefix, stringValue(roll.EffectConfig["trigger"])))
		}
		if !allowedAreaOutcomes[stringValue(roll.EffectConfig["outcome"])] {
			failures = append(failures, fmt.Sprintf("%s has unknown area outcome %q", prefix, stringValue(roll.EffectConfig["outcome"])))
		}
		outcome := stringValue(roll.EffectConfig["outcome"])
		if (outcome == "save_for_damage" || outcome == "dex_save_or_prone" || outcome == "restrained") && !allowedSaveAbilities[stringValue(roll.EffectConfig["saveAbility"])] {
			failures = append(failures, fmt.Sprintf("%s has area outcome %q without a valid save ability", prefix, outcome))
		}
	}
	if roll.RollKind == "battlefield_object" {
		if !allowedBattlefieldObjects[stringValue(roll.EffectConfig["kind"])] {
			failures = append(failures, fmt.Sprintf("%s has unknown battlefield object %q", prefix, stringValue(roll.EffectConfig["kind"])))
		}
		if stringValue(roll.EffectConfig["kind"]) == "spell_area" && !allowedBattlefieldShapes[stringValue(roll.EffectConfig["shape"])] {
			failures = append(failures, fmt.Sprintf("%s has unknown spell area shape %q", prefix, stringValue(roll.EffectConfig["shape"])))
		}
	}
	return failures
}

func needsStructuredCombatAction(spell standardSpellSeed) bool {
	text := strings.ToLower(spell.Description + "\n" + spell.HigherLevel)
	phrases := []string{
		"damage",
		"hit points",
		"armor class",
		"saving throw",
		"spell attack",
		"attack roll",
		"speed",
		"condition",
		"resistance",
		"immunity",
	}
	for _, phrase := range phrases {
		if strings.Contains(text, phrase) {
			return true
		}
	}
	return false
}

func isDamageLikeRoll(kind string) bool {
	return kind == "damage" || kind == "healing" || kind == "max_hp" || kind == "max_hp_reduction" ||
		kind == "temp_hp" || kind == "recurring_hp_change" || kind == "attack_damage_rider"
}

func intValue(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case float64:
		return int(typed)
	default:
		return 0
	}
}

var allowedSpellActionTypes = map[string]bool{
	"damage": true, "healing": true, "melee_weapon": true, "other": true,
	"ranged_weapon": true, "save": true, "spell_attack": true,
}

var allowedSaveAbilities = map[string]bool{
	"": true, "str": true, "dex": true, "con": true, "int": true, "wis": true, "cha": true,
}

var allowedSaveEffects = map[string]bool{
	"full": true, "half": true, "negates": true, "none": true,
}

var allowedSpellRollKinds = map[string]bool{
	"ac_bonus": true, "action_restriction": true, "advantage_state": true, "area_trigger": true,
	"attack_damage_rider": true, "base_ac": true, "battlefield_object": true, "condition": true,
	"condition_immunity": true, "custom": true, "damage": true, "damage_defense": true,
	"damage_transfer": true, "death_protection": true, "forced_movement": true, "heal_to_full": true,
	"healing": true, "healing_block": true, "healing_maximized": true, "layered_effect": true, "linked_healing": true,
	"max_hp": true, "max_hp_reduction": true, "movement_mode": true, "recurring_hp_change": true,
	"remove_condition": true, "revive": true, "roll_modifier": true, "roll_reroll": true, "roll_table": true,
	"saving_throw_repeat": true, "sense_effect": true, "speed_bonus": true, "speed_multiplier": true,
	"speed_reduction": true, "temp_hp": true, "terrain_effect": true, "visibility_effect": true,
}

var allowedSpellEffectTimings = map[string]bool{
	"end_caster_turn_each": true, "end_caster_turn_once": true, "end_spell": true,
	"end_target_turn_each": true, "end_target_turn_once": true, "immediate": true,
	"manual": true, "start_caster_turn_each": true, "start_caster_turn_once": true,
	"start_target_turn_each": true, "start_target_turn_once": true,
}

var allowedAreaTriggers = map[string]bool{
	"appear_move_enter_or_end_turn": true, "enter": true, "enter_or_end_turn": true,
	"enter_or_start_turn": true, "end_turn": true, "manual": true, "move_within": true,
	"moves_into_or_within": true, "start_turn": true, "web_burns": true,
}

var allowedAreaOutcomes = map[string]bool{
	"dex_save_or_prone": true, "fire_damage": true, "manual": true,
	"restrained": true, "save_for_damage": true,
}

var allowedBattlefieldObjects = map[string]bool{
	"body_part_regrowth": true, "manual_object": true, "spell_area": true,
	"spectral_object": true, "sphere": true, "summoned_object": true,
	"terrain_feature": true, "wall": true,
}

var allowedBattlefieldShapes = map[string]bool{
	"cone": true, "cube": true, "cylinder": true, "line": true,
	"special": true, "sphere": true, "wall": true,
}

var manualCombatAllowlist = mapFromStrings([]string{
	"srd-5-2-1-alter-self",
	"srd-5-2-1-animal-friendship",
	"srd-5-2-1-animal-messenger",
	"srd-5-2-1-animal-shapes",
	"srd-5-2-1-animate-objects",
	"srd-5-2-1-antimagic-field",
	"srd-5-2-1-antipathy-sympathy",
	"srd-5-2-1-arcane-sword",
	"srd-5-2-1-astral-projection",
	"srd-5-2-1-awaken",
	"srd-5-2-1-banishment",
	"srd-5-2-1-barkskin",
	"srd-5-2-1-blindness-deafness",
	"srd-5-2-1-blur",
	"srd-5-2-1-calm-emotions",
	"srd-5-2-1-charm-monster",
	"srd-5-2-1-charm-person",
	"srd-5-2-1-chromatic-orb",
	"srd-5-2-1-color-spray",
	"srd-5-2-1-compulsion",
	"srd-5-2-1-confusion",
	"srd-5-2-1-control-weather",
	"srd-5-2-1-counterspell",
	"srd-5-2-1-cure-wounds",
	"srd-5-2-1-death-ward",
	"srd-5-2-1-delayed-blast-fireball",
	"srd-5-2-1-demiplane",
	"srd-5-2-1-detect-thoughts",
	"srd-5-2-1-dispel-evil-and-good",
	"srd-5-2-1-divine-word",
	"srd-5-2-1-dominate-beast",
	"srd-5-2-1-dominate-monster",
	"srd-5-2-1-dominate-person",
	"srd-5-2-1-dragon-s-breath",
	"srd-5-2-1-enlarge-reduce",
	"srd-5-2-1-entangle",
	"srd-5-2-1-enthrall",
	"srd-5-2-1-etherealness",
	"srd-5-2-1-eyebite",
	"srd-5-2-1-false-life",
	"srd-5-2-1-fear",
	"srd-5-2-1-feather-fall",
	"srd-5-2-1-find-familiar",
	"srd-5-2-1-find-steed",
	"srd-5-2-1-find-traps",
	"srd-5-2-1-flame-blade",
	"srd-5-2-1-foresight",
	"srd-5-2-1-forbiddance",
	"srd-5-2-1-gaseous-form",
	"srd-5-2-1-giant-insect",
	"srd-5-2-1-glyph-of-warding",
	"srd-5-2-1-greater-restoration",
	"srd-5-2-1-guardian-of-faith",
	"srd-5-2-1-hallow",
	"srd-5-2-1-heal",
	"srd-5-2-1-heroes-feast",
	"srd-5-2-1-hideous-laughter",
	"srd-5-2-1-hold-monster",
	"srd-5-2-1-hold-person",
	"srd-5-2-1-holy-aura",
	"srd-5-2-1-imprisonment",
	"srd-5-2-1-irresistible-dance",
	"srd-5-2-1-lesser-restoration",
	"srd-5-2-1-levitate",
	"srd-5-2-1-magic-circle",
	"srd-5-2-1-magic-jar",
	"srd-5-2-1-magic-mouth",
	"srd-5-2-1-magic-weapon",
	"srd-5-2-1-major-image",
	"srd-5-2-1-mass-cure-wounds",
	"srd-5-2-1-mass-heal",
	"srd-5-2-1-mass-healing-word",
	"srd-5-2-1-mass-suggestion",
	"srd-5-2-1-mending",
	"srd-5-2-1-mind-blank",
	"srd-5-2-1-mirror-image",
	"srd-5-2-1-mislead",
	"srd-5-2-1-modify-memory",
	"srd-5-2-1-planar-binding",
	"srd-5-2-1-phantom-steed",
	"srd-5-2-1-power-word-stun",
	"srd-5-2-1-prestidigitation",
	"srd-5-2-1-prayer-of-healing",
	"srd-5-2-1-project-image",
	"srd-5-2-1-protection-from-evil-and-good",
	"srd-5-2-1-protection-from-poison",
	"srd-5-2-1-resilient-sphere",
	"srd-5-2-1-resistance",
	"srd-5-2-1-resurrection",
	"srd-5-2-1-sanctuary",
	"srd-5-2-1-scrying",
	"srd-5-2-1-seeming",
	"srd-5-2-1-sequester",
	"srd-5-2-1-shillelagh",
	"srd-5-2-1-silence",
	"srd-5-2-1-simulacrum",
	"srd-5-2-1-sorcerous-burst",
	"srd-5-2-1-spare-the-dying",
	"srd-5-2-1-spiritual-weapon",
	"srd-5-2-1-stinking-cloud",
	"srd-5-2-1-suggestion",
	"srd-5-2-1-telekinesis",
	"srd-5-2-1-true-resurrection",
	"srd-5-2-1-true-strike",
	"srd-5-2-1-unseen-servant",
	"srd-5-2-1-wall-of-force",
	"srd-5-2-1-wall-of-stone",
	"srd-5-2-1-water-walk",
	"srd-5-2-1-wind-walk",
	"srd-5-2-1-zone-of-truth",
	"srd-alter-self",
	"srd-animal-friendship",
	"srd-animal-shapes",
	"srd-antimagic-field",
	"srd-antipathy-sympathy",
	"srd-animate-objects",
	"srd-astral-projection",
	"srd-awaken",
	"srd-banishment",
	"srd-bestow-curse",
	"srd-blindness-deafness",
	"srd-blur",
	"srd-calm-emotions",
	"srd-charm-person",
	"srd-color-spray",
	"srd-compulsion",
	"srd-confusion",
	"srd-contact-other-plane",
	"srd-contagion",
	"srd-control-weather",
	"srd-death-ward",
	"srd-detect-thoughts",
	"srd-dispel-evil-and-good",
	"srd-divine-word",
	"srd-dominate-beast",
	"srd-dominate-monster",
	"srd-dominate-person",
	"srd-enlarge-reduce",
	"srd-enhance-ability",
	"srd-entangle",
	"srd-enthrall",
	"srd-etherealness",
	"srd-eyebite",
	"srd-fear",
	"srd-feather-fall",
	"srd-find-familiar",
	"srd-find-steed",
	"srd-fog-cloud",
	"srd-foresight",
	"srd-forbiddance",
	"srd-gaseous-form",
	"srd-geas",
	"srd-giant-insect",
	"srd-glyph-of-warding",
	"srd-hallow",
	"srd-heroes-feast",
	"srd-hideous-laughter",
	"srd-hold-monster",
	"srd-hold-person",
	"srd-holy-aura",
	"srd-imprisonment",
	"srd-irresistible-dance",
	"srd-lesser-restoration",
	"srd-levitate",
	"srd-light",
	"srd-magic-circle",
	"srd-magic-jar",
	"srd-magic-mouth",
	"srd-magic-weapon",
	"srd-major-image",
	"srd-mass-suggestion",
	"srd-meld-into-stone",
	"srd-mending",
	"srd-mind-blank",
	"srd-mirror-image",
	"srd-mislead",
	"srd-modify-memory",
	"srd-phantom-steed",
	"srd-planar-binding",
	"srd-plane-shift",
	"srd-power-word-kill",
	"srd-power-word-stun",
	"srd-programmed-illusion",
	"srd-project-image",
	"srd-protection-from-evil-and-good",
	"srd-protection-from-poison",
	"srd-raise-dead",
	"srd-resilient-sphere",
	"srd-resistance",
	"srd-resurrection",
	"srd-sanctuary",
	"srd-scrying",
	"srd-seeming",
	"srd-sequester",
	"srd-shillelagh",
	"srd-silence",
	"srd-simulacrum",
	"srd-spare-the-dying",
	"srd-stinking-cloud",
	"srd-suggestion",
	"srd-symbol",
	"srd-teleport",
	"srd-true-resurrection",
	"srd-true-strike",
	"srd-unseen-servant",
	"srd-wall-of-force",
	"srd-wall-of-stone",
	"srd-water-walk",
	"srd-weird",
	"srd-wind-walk",
	"srd-wish",
	"srd-zone-of-truth",
})

func mapFromStrings(values []string) map[string]bool {
	result := make(map[string]bool, len(values))
	for _, value := range values {
		result[value] = true
	}
	return result
}
