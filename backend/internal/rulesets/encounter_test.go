package rulesets

import (
	"errors"
	"testing"
)

func TestResolveEncounterRuleset(t *testing.T) {
	tests := []struct {
		name     string
		sources  []string
		selected string
		want     string
		wantErr  error
	}{
		{name: "2014 source", sources: []string{Source2014}, want: Encounter2014},
		{name: "2024 source", sources: []string{Source2024}, want: Encounter2024},
		{
			name: "mixed sources require selection", sources: []string{Source2014, Source2024},
			wantErr: ErrExplicitEncounterRulesetRequired,
		},
		{
			name: "mixed sources select 2014", sources: []string{Source2014, Source2024},
			selected: Encounter2014, want: Encounter2014,
		},
		{
			name: "mixed sources select 2024", sources: []string{Source2014, Source2024},
			selected: Encounter2024, want: Encounter2024,
		},
		{name: "legacy empty sources", want: Encounter2014},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := ResolveEncounterRuleset(test.sources, test.selected)
			if !errors.Is(err, test.wantErr) || got != test.want {
				t.Fatalf("ResolveEncounterRuleset() = %q, %v; want %q, %v", got, err, test.want, test.wantErr)
			}
		})
	}
}
