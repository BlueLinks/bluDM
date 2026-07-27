package markdownencounter

import (
	"strings"
	"testing"
)

func TestParseEmbeddedEncounterBlocks(t *testing.T) {
	markdown := `---
type: location
tags:
  - encounter
---

# Cairncut Survey Camp

The prose remains ordinary Obsidian Markdown.

` + "```bludm-encounter" + `
version: 1
id: hungry-scavengers
name: Hungry Scavengers
location: Cairncut Survey Camp
add_party: true
combatants:
  - creature: Wolf
    quantity: 2
  - creature: Dire Wolf
    rolled_hp: true
` + "```" + `

More authored campaign prose.
`
	blocks, err := Parse(markdown)
	if err != nil {
		t.Fatalf("parse embedded encounter: %v", err)
	}
	if len(blocks) != 1 {
		t.Fatalf("expected one encounter, got %d", len(blocks))
	}
	document := blocks[0].Document
	if document.ID != "hungry-scavengers" || document.Name != "Hungry Scavengers" {
		t.Fatalf("unexpected encounter: %+v", document)
	}
	if !document.AddParty || len(document.Combatants) != 2 || document.Combatants[0].Quantity != 2 {
		t.Fatalf("unexpected combatants: %+v", document.Combatants)
	}
}

func TestParseRejectsUnknownFieldsAndInvalidDocuments(t *testing.T) {
	tests := []struct {
		name     string
		markdown string
		want     string
	}{
		{
			name: "unknown AI field",
			markdown: fenced(`version: 1
id: ambush
name: Ambush
monsters: []`),
			want: "field monsters not found",
		},
		{
			name: "missing stable id",
			markdown: fenced(`version: 1
name: Ambush`),
			want: "id must be",
		},
		{
			name: "inline hit points required",
			markdown: fenced(`version: 1
id: ambush
name: Ambush
combatants:
  - name: Root Horror`),
			want: "hit_points",
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := Parse(test.markdown)
			if err == nil || !strings.Contains(err.Error(), test.want) {
				t.Fatalf("expected error containing %q, got %v", test.want, err)
			}
		})
	}
}

func TestRenderRoundTrip(t *testing.T) {
	source := Document{
		Version:     1,
		ID:          "forge-siege",
		Name:        "Forge Siege",
		Description: "Hold the bridge.\nProtect the command crystal.",
		Status:      "planned",
		AddParty:    true,
		Combatants: []Combatant{
			{Creature: "Animated Armor", Quantity: 3, Side: "enemy"},
		},
	}
	rendered, err := Render(source)
	if err != nil {
		t.Fatalf("render: %v", err)
	}
	blocks, err := Parse(rendered)
	if err != nil {
		t.Fatalf("parse rendered block: %v", err)
	}
	if len(blocks) != 1 || blocks[0].Document.Description != source.Description {
		t.Fatalf("round trip mismatch: %+v", blocks)
	}
}

func fenced(body string) string {
	return "```bludm-encounter\n" + body + "\n```\n"
}
