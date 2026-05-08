package db

import "testing"

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
