package db

import "testing"

func TestParseStandardLibraryEntries(t *testing.T) {
	entries, err := parseStandardLibraryEntries()
	if err != nil {
		t.Fatalf("parse standard entries: %v", err)
	}
	if len(entries) < 800 {
		t.Fatalf("expected broad SRD library entries, got %d", len(entries))
	}

	categories := map[string]bool{}
	sources := map[string]bool{}
	sourceCategoryCounts := map[string]int{}
	for _, entry := range entries {
		categories[entry.Category] = true
		sources[entry.SourceKey] = true
		sourceCategoryCounts[entry.SourceKey+"."+entry.Category]++
	}
	for _, category := range []string{"equipment", "classes", "species", "conditions", "skills", "rules"} {
		if !categories[category] {
			t.Fatalf("expected category %q in standard entries", category)
		}
	}
	for _, source := range []string{"srd-2014", "srd-5-2-1"} {
		if !sources[source] {
			t.Fatalf("expected source %q in standard entries", source)
		}
	}
	for _, key := range []string{"srd-5-2-1.classes", "srd-5-2-1.species", "srd-5-2-1.backgrounds", "srd-5-2-1.feats"} {
		if sourceCategoryCounts[key] == 0 {
			t.Fatalf("expected SRD 5.2.1 character picker entries for %q", key)
		}
	}
}
