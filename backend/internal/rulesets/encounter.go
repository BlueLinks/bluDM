package rulesets

import (
	"errors"
	"slices"
	"strings"
)

const (
	Encounter2014 = "dnd-5e-2014-xp-v1"
	Encounter2024 = "dnd-5e-2024-xp-v1"

	Source2014 = "srd-2014"
	Source2024 = "srd-5-2-1"
)

var ErrExplicitEncounterRulesetRequired = errors.New(
	"campaigns with both 2014 and 2024 sources require an explicit encounter ruleset",
)

func ResolveEncounterRuleset(sources []string, selected string) (string, error) {
	selected = strings.TrimSpace(selected)
	has2014 := slices.Contains(sources, Source2014)
	has2024 := slices.Contains(sources, Source2024)

	if selected != "" {
		switch selected {
		case Encounter2014:
			if has2024 && !has2014 {
				return "", errors.New("the 2014 encounter ruleset requires the srd-2014 source")
			}
			return Encounter2014, nil
		case Encounter2024:
			if has2014 && !has2024 {
				return "", errors.New("the 2024 encounter ruleset requires the srd-5-2-1 source")
			}
			return Encounter2024, nil
		default:
			return "", errors.New("unsupported encounter ruleset")
		}
	}

	switch {
	case has2014 && has2024:
		return "", ErrExplicitEncounterRulesetRequired
	case has2024:
		return Encounter2024, nil
	default:
		// Empty and legacy source lists historically meant SRD 2014.
		return Encounter2014, nil
	}
}

func IsEncounterRuleset(value string) bool {
	return value == Encounter2014 || value == Encounter2024
}
