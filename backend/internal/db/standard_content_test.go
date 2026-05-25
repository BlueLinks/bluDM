package db

import (
	"strings"
	"testing"
)

func TestParseStandardCreaturesIncludesVersionedSources(t *testing.T) {
	creatures, err := parseStandardCreatures()
	if err != nil {
		t.Fatalf("parse standard creatures: %v", err)
	}
	counts := map[string]int{}
	for _, creature := range creatures {
		counts[creature.SourceKey]++
		if creature.SourceKey == "srd-5-2-1" && len(creature.StatBlock) == 0 {
			t.Fatalf("expected SRD 5.2.1 creature %q to include a stat block", creature.Name)
		}
	}
	if counts["srd-2014"] < 300 {
		t.Fatalf("expected SRD 2014 creatures, got %d", counts["srd-2014"])
	}
	if counts["srd-5-2-1"] < 300 {
		t.Fatalf("expected SRD 5.2.1 creatures, got %d", counts["srd-5-2-1"])
	}
}

func TestParseStandardSpellsIncludesVersionedSources(t *testing.T) {
	spells, err := parseStandardSpells()
	if err != nil {
		t.Fatalf("parse standard spells: %v", err)
	}
	counts := map[string]int{}
	for _, spell := range spells {
		counts[spell.SourceKey]++
		if spell.SourceKey == "srd-5-2-1" && spell.Level < 0 {
			t.Fatalf("expected SRD 5.2.1 spell %q to include a valid level", spell.Name)
		}
	}
	if counts["srd-2014"] < 300 {
		t.Fatalf("expected SRD 2014 spells, got %d", counts["srd-2014"])
	}
	if counts["srd-5-2-1"] < 300 {
		t.Fatalf("expected SRD 5.2.1 spells, got %d", counts["srd-5-2-1"])
	}
}

func TestParseStandardSpellsInfersCombatAutomation(t *testing.T) {
	spells, err := parseStandardSpells()
	if err != nil {
		t.Fatalf("parse standard spells: %v", err)
	}

	burningHands := findStandardSpell(t, spells, "srd-burning-hands")
	if len(burningHands.Actions) != 1 {
		t.Fatalf("expected Burning Hands to include an inferred action, got %d", len(burningHands.Actions))
	}
	if burningHands.Actions[0].ActionType != "save" {
		t.Fatalf("expected Burning Hands to use a saving throw action, got %q", burningHands.Actions[0].ActionType)
	}
	if burningHands.Actions[0].SaveAbility != "dex" {
		t.Fatalf("expected Burning Hands save ability dex, got %q", burningHands.Actions[0].SaveAbility)
	}
	if burningHands.Actions[0].SuccessfulSaveEffect != "half" {
		t.Fatalf("expected Burning Hands half damage on save, got %q", burningHands.Actions[0].SuccessfulSaveEffect)
	}
	if roll := burningHands.Actions[0].Rolls[0]; roll.DiceCount != 3 || roll.DieSize != 6 || roll.ScalingDiceCount != 1 {
		t.Fatalf("expected Burning Hands 3d6 with 1d6 scaling, got %+v", roll)
	}
	burningHands2024 := findStandardSpell(t, spells, "srd-5-2-1-burning-hands")
	if burningHands2024.Actions[0].SaveAbility != "dex" || burningHands2024.Actions[0].SuccessfulSaveEffect != "half" {
		t.Fatalf("expected SRD 5.2.1 Burning Hands to infer dex half-save, got %+v", burningHands2024.Actions[0])
	}

	healingWord := findStandardSpell(t, spells, "srd-healing-word")
	if len(healingWord.Actions) != 1 || len(healingWord.Actions[0].Rolls) != 1 {
		t.Fatalf("expected Healing Word to include a healing roll, got %+v", healingWord.Actions)
	}
	if roll := healingWord.Actions[0].Rolls[0]; roll.RollKind != "healing" || roll.DiceCount != 1 || roll.DieSize != 4 || !roll.AddPrimaryStatModifier {
		t.Fatalf("expected Healing Word 1d4 + spellcasting modifier, got %+v", roll)
	}

	aid := findStandardSpell(t, spells, "srd-aid")
	if aid.ProjectileScaling == nil || aid.ProjectileScaling.BaseProjectiles != 3 {
		t.Fatalf("expected Aid to target up to three creatures, got %+v", aid.ProjectileScaling)
	}
	if len(aid.Actions[0].Rolls) != 2 {
		t.Fatalf("expected Aid to update max and current HP, got %+v", aid.Actions[0].Rolls)
	}
	if roll := aid.Actions[0].Rolls[0]; roll.RollKind != "max_hp" || roll.FixedValue != 5 || roll.ScalingFromLevel != 2 || roll.ScalingFixedValue != 5 {
		t.Fatalf("expected Aid fixed HP maximum increase with scaling, got %+v", roll)
	}
	if roll := aid.Actions[0].Rolls[1]; roll.RollKind != "healing" || roll.FixedValue != 5 || roll.ScalingFromLevel != 2 || roll.ScalingFixedValue != 5 {
		t.Fatalf("expected Aid fixed current HP increase with scaling, got %+v", roll)
	}

	aid2024 := findStandardSpell(t, spells, "srd-5-2-1-aid")
	if strings.Contains(aid2024.Description, "t aUrgseint") {
		t.Fatalf("expected SRD 5.2.1 Aid description to be cleaned, got %q", aid2024.Description)
	}
	if aid2024.ProjectileScaling == nil || aid2024.ProjectileScaling.BaseProjectiles != 3 {
		t.Fatalf("expected SRD 5.2.1 Aid to target up to three creatures, got %+v", aid2024.ProjectileScaling)
	}
	if len(aid2024.Actions) != 1 || len(aid2024.Actions[0].Rolls) != 2 {
		t.Fatalf("expected SRD 5.2.1 Aid max/current HP effects, got %+v", aid2024.Actions)
	}
	if roll := aid2024.Actions[0].Rolls[0]; roll.ScalingFromLevel != 2 {
		t.Fatalf("expected SRD 5.2.1 Aid to scale above 2nd level, got %+v", roll)
	}

	healingWord2024 := findStandardSpell(t, spells, "srd-5-2-1-healing-word")
	if roll := healingWord2024.Actions[0].Rolls[0]; roll.RollKind != "healing" || roll.DiceCount != 2 || roll.DieSize != 4 || !roll.AddPrimaryStatModifier || roll.ScalingDiceCount != 2 {
		t.Fatalf("expected SRD 5.2.1 Healing Word 2d4 + spellcasting modifier with 2d4 scaling, got %+v", roll)
	}

	heroism2024 := findStandardSpell(t, spells, "srd-5-2-1-heroism")
	if len(heroism2024.Actions) != 1 || len(heroism2024.Actions[0].Rolls) != 2 {
		t.Fatalf("expected SRD 5.2.1 Heroism temp HP and immunity effects, got %+v", heroism2024.Actions)
	}
	if roll := heroism2024.Actions[0].Rolls[0]; roll.RollKind != "temp_hp" || roll.Timing != "start_target_turn_each" || !roll.AddPrimaryStatModifier {
		t.Fatalf("expected SRD 5.2.1 Heroism start-turn temp HP, got %+v", roll)
	}
}

func findStandardSpell(t *testing.T, spells []standardSpellSeed, slug string) standardSpellSeed {
	t.Helper()
	for _, spell := range spells {
		if spell.Slug == slug {
			return spell
		}
	}
	t.Fatalf("standard spell %q not found", slug)
	return standardSpellSeed{}
}
