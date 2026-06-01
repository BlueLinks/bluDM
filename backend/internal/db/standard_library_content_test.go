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
	expectedEquipment := map[string]bool{
		"Backpack":                      false,
		"Chain Mail":                    false,
		"Horse, Riding":                 false,
		"Lifestyle, Aristocratic":       false,
		"Longsword":                     false,
		"Shield":                        false,
		"Spellcasting Service, Level 9": false,
		"Thieves' Tools":                false,
		"Warship":                       false,
	}
	srd521EquipmentCount := 0
	srd521EquipmentSummaries := map[string]bool{}
	for _, entry := range entries {
		if entry.SourceKey == "srd-5-2-1" && entry.Category == "equipment" {
			srd521EquipmentCount++
			srd521EquipmentSummaries[entry.Summary] = true
			if _, ok := expectedEquipment[entry.Name]; ok {
				expectedEquipment[entry.Name] = true
			}
		}
	}
	if srd521EquipmentCount < 200 {
		t.Fatalf("expected broad SRD 5.2.1 equipment entries, got %d", srd521EquipmentCount)
	}
	for _, summary := range []string{
		"Adventuring Gear · Standard Gear",
		"Armor · Shield",
		"Mounts and Vehicles",
		"Tools · Artisan's Tools",
		"Weapon · Martial Melee",
	} {
		if !srd521EquipmentSummaries[summary] {
			t.Fatalf("expected SRD 5.2.1 equipment summary %q", summary)
		}
	}
	for name, found := range expectedEquipment {
		if !found {
			t.Fatalf("expected SRD 5.2.1 equipment entry %q", name)
		}
	}
}
