package db

import "testing"

func TestParseStandardSpellsInfersNotoriousComplexSpells(t *testing.T) {
	spells, err := parseStandardSpells()
	if err != nil {
		t.Fatalf("parse standard spells: %v", err)
	}

	for _, slug := range []string{"srd-wall-of-fire", "srd-5-2-1-wall-of-fire"} {
		spell := findStandardSpell(t, spells, slug)
		assertSpellDamageEffect(t, spell, "damage", "fire", 5, 8)
		assertSpellHasEffect(t, spell, "battlefield_object")
		assertSpellHasEffectConfig(t, spell, "battlefield_object", "shape", "wall")
		assertSpellHasEffectConfig(t, spell, "area_trigger", "trigger", "enter_or_end_turn")
		assertSpellHasEffectConfig(t, spell, "area_trigger", "saveAbility", "dex")
	}

	for _, slug := range []string{"srd-cloudkill", "srd-5-2-1-cloudkill"} {
		spell := findStandardSpell(t, spells, slug)
		assertSpellDamageEffect(t, spell, "damage", "poison", 5, 8)
		assertSpellHasEffectConfig(t, spell, "battlefield_object", "shape", "sphere")
		assertSpellHasEffectConfig(t, spell, "battlefield_object", "moveDistanceFeet", "10")
		assertSpellHasEffectConfig(t, spell, "area_trigger", "saveAbility", "con")
	}
	assertSpellHasEffectConfig(t, findStandardSpell(t, spells, "srd-5-2-1-cloudkill"), "area_trigger", "trigger", "appear_move_enter_or_end_turn")

	bladeBarrier := findStandardSpell(t, spells, "srd-blade-barrier")
	assertSpellDamageEffect(t, bladeBarrier, "damage", "slashing", 6, 10)
	assertSpellHasEffect(t, bladeBarrier, "terrain_effect")
	assertSpellHasEffectConfig(t, bladeBarrier, "battlefield_object", "shape", "wall")

	wallOfThorns := findStandardSpell(t, spells, "srd-wall-of-thorns")
	assertSpellDamageEffect(t, wallOfThorns, "damage", "slashing", 7, 8)
	assertSpellHasEffect(t, wallOfThorns, "terrain_effect")
	assertSpellHasEffectConfig(t, wallOfThorns, "area_trigger", "trigger", "enter_or_end_turn")

	windWall := findStandardSpell(t, spells, "srd-wind-wall")
	assertSpellDamageEffect(t, windWall, "damage", "bludgeoning", 3, 8)
	assertSpellHasEffectConfig(t, windWall, "battlefield_object", "shape", "wall")

	insectPlague := findStandardSpell(t, spells, "srd-insect-plague")
	assertSpellDamageEffect(t, insectPlague, "damage", "piercing", 4, 10)
	assertSpellHasEffectConfig(t, insectPlague, "battlefield_object", "shape", "sphere")
	assertSpellHasEffect(t, insectPlague, "terrain_effect")

	iceStorm2024 := findStandardSpell(t, spells, "srd-5-2-1-ice-storm")
	assertSpellDamageEffect(t, iceStorm2024, "damage", "bludgeoning", 2, 10)
	assertSpellDamageEffect(t, iceStorm2024, "damage", "cold", 4, 6)
	assertSpellHasEffectConfig(t, iceStorm2024, "terrain_effect", "durationMode", "end_caster_next")
}

func TestParseStandardSpellsInfersComplexSummonsAndTransformations(t *testing.T) {
	spells, err := parseStandardSpells()
	if err != nil {
		t.Fatalf("parse standard spells: %v", err)
	}

	conjureAnimals := findStandardSpell(t, spells, "srd-conjure-animals")
	assertSpellHasEffectConfig(t, conjureAnimals, "battlefield_object", "kind", "manual_object")

	conjureAnimals2024 := findStandardSpell(t, spells, "srd-5-2-1-conjure-animals")
	assertSpellDamageEffect(t, conjureAnimals2024, "damage", "slashing", 3, 10)
	assertSpellHasEffectConfig(t, conjureAnimals2024, "battlefield_object", "shape", "special")
	assertSpellHasEffectConfig(t, conjureAnimals2024, "battlefield_object", "moveDistanceFeet", "30")
	assertSpellHasEffectConfig(t, conjureAnimals2024, "area_trigger", "saveAbility", "dex")

	arcaneHand := findStandardSpell(t, spells, "srd-5-2-1-arcane-hand")
	assertSpellHasEffectConfig(t, arcaneHand, "battlefield_object", "kind", "manual_object")
	assertSpellDamageEffect(t, arcaneHand, "attack_damage_rider", "force", 5, 8)
	assertSpellHasEffect(t, arcaneHand, "forced_movement")

	polymorph := findStandardSpell(t, spells, "srd-polymorph")
	if polymorph.Actions[0].ActionType != "save" || polymorph.Actions[0].SaveAbility != "wis" {
		t.Fatalf("expected Polymorph to be a Wisdom save transformation, got %+v", polymorph.Actions[0])
	}
	assertSpellHasEffectConfig(t, polymorph, "battlefield_object", "kind", "manual_object")

	for _, slug := range []string{"srd-true-polymorph", "srd-shapechange"} {
		assertSpellHasEffectConfig(t, findStandardSpell(t, spells, slug), "battlefield_object", "kind", "manual_object")
	}
}

func TestParseStandardSpellsInfersComplexControlSpells(t *testing.T) {
	spells, err := parseStandardSpells()
	if err != nil {
		t.Fatalf("parse standard spells: %v", err)
	}

	fleshToStone := findStandardSpell(t, spells, "srd-flesh-to-stone")
	assertSpellHasEffectConfig(t, fleshToStone, "condition", "condition", "Restrained")
	assertSpellHasEffectConfig(t, fleshToStone, "saving_throw_repeat", "successOutcome", "three_successes_or_failures")

	hypnoticPattern := findStandardSpell(t, spells, "srd-hypnotic-pattern")
	assertSpellHasEffectConfig(t, hypnoticPattern, "condition", "condition", "Charmed")
	assertSpellHasEffect(t, hypnoticPattern, "speed_multiplier")

	sleep := findStandardSpell(t, spells, "srd-sleep")
	assertSpellHasEffectConfig(t, sleep, "battlefield_object", "kind", "manual_object")
	if sleep.Actions[0].Rolls[0].ScalingDiceCount != 2 {
		t.Fatalf("expected Sleep HP pool to scale by 2d8 per slot, got %+v", sleep.Actions[0].Rolls[0])
	}

	sleep2024 := findStandardSpell(t, spells, "srd-5-2-1-sleep")
	assertSpellHasEffectConfig(t, sleep2024, "condition", "condition", "Incapacitated")
	assertSpellHasEffectConfig(t, sleep2024, "condition", "condition", "Unconscious")
	assertSpellHasEffect(t, sleep2024, "saving_throw_repeat")

	for _, slug := range []string{"srd-antimagic-field", "srd-forcecage", "srd-maze", "srd-reverse-gravity"} {
		assertSpellHasEffectConfig(t, findStandardSpell(t, spells, slug), "battlefield_object", "kind", "manual_object")
	}

	storm := findStandardSpell(t, spells, "srd-5-2-1-storm-of-vengeance")
	assertSpellDamageEffect(t, storm, "damage", "thunder", 2, 6)
	assertSpellDamageEffect(t, storm, "recurring_hp_change", "lightning", 10, 6)
	assertSpellHasEffectConfig(t, storm, "condition", "condition", "Deafened")
	assertSpellHasEffect(t, storm, "battlefield_object")

	earthquake := findStandardSpell(t, spells, "srd-earthquake")
	assertSpellHasEffectConfig(t, earthquake, "battlefield_object", "shape", "special")
	assertSpellHasEffectConfig(t, earthquake, "area_trigger", "outcome", "dex_save_or_prone")
}

func TestParseStandardSpellsInfersPrismaticMechanics(t *testing.T) {
	spells, err := parseStandardSpells()
	if err != nil {
		t.Fatalf("parse standard spells: %v", err)
	}

	for _, slug := range []string{"srd-prismatic-spray", "srd-5-2-1-prismatic-spray"} {
		spell := findStandardSpell(t, spells, slug)
		assertSpellHasEffect(t, spell, "roll_table")
		assertSpellHasEffectConfig(t, spell, "roll_table", "dice", "1d8")
		assertSpellHasConfigArrayLength(t, spell, "roll_table", "rows", 8)
		assertPrismaticRollTableReady(t, spell)
		if len(spell.Actions[0].Rolls) != 1 {
			t.Fatalf("expected %s to keep prismatic rays nested in one roll table, got %+v", spell.Slug, spell.Actions[0].Rolls)
		}
	}
	assertSpellHasEffectConfig(t, findStandardSpell(t, spells, "srd-prismatic-spray"), "roll_table", "name", "Prismatic Rays")
	assertSpellHasEffectConfig(t, findStandardSpell(t, spells, "srd-5-2-1-prismatic-spray"), "roll_table", "name", "Prismatic Rays")

	for _, slug := range []string{"srd-prismatic-wall", "srd-5-2-1-prismatic-wall"} {
		spell := findStandardSpell(t, spells, slug)
		assertSpellHasEffectConfig(t, spell, "layered_effect", "kind", "wall")
		assertSpellHasEffectConfig(t, spell, "layered_effect", "shape", "wall")
		assertSpellHasEffectConfig(t, spell, "area_trigger", "saveAbility", "con")
		assertSpellHasEffectConfig(t, spell, "saving_throw_repeat", "ability", "con")
		assertSpellHasEffectConfig(t, spell, "saving_throw_repeat", "ability", "wis")
		assertSpellHasConfigArrayLength(t, spell, "layered_effect", "layers", 7)
		assertPrismaticLayeredEffectReady(t, spell)
	}
}

func assertPrismaticRollTableReady(t *testing.T, spell standardSpellSeed) {
	t.Helper()
	rows := nestedConfigRows(t, spell, "roll_table", "rows")
	if len(rows) != 8 {
		t.Fatalf("expected %s to include 8 prismatic ray rows, got %d", spell.Slug, len(rows))
	}
	for index, row := range rows {
		if stringValue(row["name"]) == "" || stringValue(row["effectText"]) == "" {
			t.Fatalf("expected %s ray %d to include friendly name and effect text, got %+v", spell.Slug, index+1, row)
		}
		if nestedConfigArrayLength(row, "effects") == 0 {
			t.Fatalf("expected %s ray %d to include nested effects, got %+v", spell.Slug, index+1, row)
		}
		if index < 7 && stringValue(row["saveAbility"]) == "" {
			t.Fatalf("expected %s ray %d to include save ability, got %+v", spell.Slug, index+1, row)
		}
	}
	if stringValue(rows[7]["rerollRule"]) == "" {
		t.Fatalf("expected %s ray 8 to include reroll rule, got %+v", spell.Slug, rows[7])
	}
}

func nestedConfigArrayLength(config map[string]any, key string) int {
	if values, ok := config[key].([]map[string]any); ok {
		return len(values)
	}
	if values, ok := config[key].([]any); ok {
		return len(values)
	}
	return 0
}

func assertPrismaticLayeredEffectReady(t *testing.T, spell standardSpellSeed) {
	t.Helper()
	layers := nestedConfigRows(t, spell, "layered_effect", "layers")
	if len(layers) != 7 {
		t.Fatalf("expected %s to include 7 prismatic wall layers, got %d", spell.Slug, len(layers))
	}
	for index, layer := range layers {
		if stringValue(layer["color"]) == "" || stringValue(layer["effectText"]) == "" || stringValue(layer["removal"]) == "" {
			t.Fatalf("expected %s layer %d to include friendly color, effect, and removal, got %+v", spell.Slug, index+1, layer)
		}
		if stringValue(layer["saveAbility"]) == "" || stringValue(layer["saveEffect"]) == "" {
			t.Fatalf("expected %s layer %d to include save details, got %+v", spell.Slug, index+1, layer)
		}
	}
}

func nestedConfigRows(t *testing.T, spell standardSpellSeed, rollKind string, key string) []map[string]any {
	t.Helper()
	for _, action := range spell.Actions {
		for _, roll := range action.Rolls {
			if roll.RollKind != rollKind {
				continue
			}
			if rows, ok := roll.EffectConfig[key].([]map[string]any); ok {
				return rows
			}
		}
	}
	t.Fatalf("expected %s to include %s config rows at %s, got %+v", spell.Slug, rollKind, key, spell.Actions)
	return nil
}
