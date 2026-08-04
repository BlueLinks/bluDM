package store

import "testing"

func TestActionTemplatePreservesDisplaySection(t *testing.T) {
	entity := actionTemplateEntityFromInput("owner", ActionInput{
		Name: "Parry", DisplaySection: "reaction",
	})
	if entity.DisplaySection != "reaction" {
		t.Fatalf("expected reaction section, got %q", entity.DisplaySection)
	}
	template := actionTemplateFromEntity(entity)
	if template.DisplaySection != "reaction" {
		t.Fatalf("expected mapped reaction section, got %q", template.DisplaySection)
	}
}

func TestActionTemplateDefaultsUnknownDisplaySection(t *testing.T) {
	entity := actionTemplateEntityFromInput("owner", ActionInput{
		Name: "Oddity", DisplaySection: "unknown",
	})
	if entity.DisplaySection != "action" {
		t.Fatalf("expected safe action default, got %q", entity.DisplaySection)
	}
}
