package httpapi

import "testing"

func TestStandardSpellClassesPromotesMechanicsClasses(t *testing.T) {
	classes := standardSpellClasses(map[string]any{
		"classes": []any{"Druid", "Sorcerer", "Wizard"},
	})

	if len(classes) != 3 || classes[0] != "Druid" || classes[2] != "Wizard" {
		t.Fatalf("expected standard spell classes from mechanics, got %+v", classes)
	}
}
