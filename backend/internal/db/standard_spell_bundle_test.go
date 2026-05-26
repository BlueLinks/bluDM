package db

import (
	"encoding/json"
	"testing"
)

func TestParseStandardSpellsIncludesVersionedSources(t *testing.T) {
	spells, err := parseStandardSpells()
	if err != nil {
		t.Fatalf("parse standard spells: %v", err)
	}
	counts := map[string]int{}
	rawCounts := map[string]int{}
	var rawSpells []standardSpellSeed
	if err := json.Unmarshal(standardSpellsJSON, &rawSpells); err != nil {
		t.Fatalf("parse raw bundled spells: %v", err)
	}
	if len(rawSpells) != 658 {
		t.Fatalf("expected 658 bundled spells, got %d", len(rawSpells))
	}
	if len(spells) != len(rawSpells) {
		t.Fatalf("expected parsed spell count to match bundle count, got parsed=%d bundled=%d", len(spells), len(rawSpells))
	}
	seenSourceSlugs := map[string]bool{}
	for _, spell := range rawSpells {
		rawCounts[spell.SourceKey]++
		if spell.SourceKey != "srd-2014" && spell.SourceKey != "srd-5-2-1" {
			t.Fatalf("expected raw spell %q to use normalized source key, got %q", spell.Slug, spell.SourceKey)
		}
	}
	for _, spell := range spells {
		counts[spell.SourceKey]++
		key := spell.SourceKey + "/" + spell.Slug
		if seenSourceSlugs[key] {
			t.Fatalf("duplicate parsed standard spell source/slug %q", key)
		}
		seenSourceSlugs[key] = true
		if spell.SourceKey != "srd-2014" && spell.SourceKey != "srd-5-2-1" {
			t.Fatalf("expected %s to use a normalized source key, got %q", spell.Slug, spell.SourceKey)
		}
		if spell.Slug == "" || spell.Name == "" || spell.School == "" || spell.CastingTime == "" ||
			spell.Range == "" || spell.Duration == "" || spell.SourceLabel == "" {
			t.Fatalf("expected %s to include core spell metadata, got %+v", spell.Slug, spell)
		}
		if len(spell.Components) == 0 || len(spell.Mechanics) == 0 {
			t.Fatalf("expected %s to include components and mechanics JSON", spell.Slug)
		}
	}
	if rawCounts["srd-2014"] != 319 || counts["srd-2014"] != 319 {
		t.Fatalf("expected 319 SRD 2014 spells, got raw=%d parsed=%d", rawCounts["srd-2014"], counts["srd-2014"])
	}
	if rawCounts["srd-5-2-1"] != 339 || counts["srd-5-2-1"] != 339 {
		t.Fatalf("expected 339 SRD 5.2.1 spells, got raw=%d parsed=%d", rawCounts["srd-5-2-1"], counts["srd-5-2-1"])
	}
	findStandardSpell(t, spells, "srd-prismatic-wall")
	findStandardSpell(t, spells, "srd-5-2-1-prismatic-wall")
}
