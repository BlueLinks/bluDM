package statblocks

import (
	"fmt"
	"math"
	"net/url"
	"sort"
	"strconv"
	"strings"
)

var abilityOrder = []string{"str", "dex", "con", "int", "wis", "cha"}

var skillAbilities = map[string]string{
	"acrobatics": "dex", "animal handling": "wis", "arcana": "int", "athletics": "str",
	"deception": "cha", "history": "int", "insight": "wis", "intimidation": "cha",
	"investigation": "int", "medicine": "wis", "nature": "int", "perception": "wis",
	"performance": "cha", "persuasion": "cha", "religion": "int", "sleight of hand": "dex",
	"stealth": "dex", "survival": "wis",
}

func mapValue(value any) map[string]any {
	if typed, ok := value.(map[string]any); ok {
		return typed
	}
	return map[string]any{}
}

func sliceValue(value any) []any {
	if typed, ok := value.([]any); ok {
		return typed
	}
	return []any{}
}

func stringValue(value any) string {
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	case fmt.Stringer:
		return strings.TrimSpace(typed.String())
	default:
		return ""
	}
}

func intValue(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	case float32:
		return int(typed)
	case string:
		result, _ := strconv.Atoi(strings.TrimSpace(typed))
		return result
	default:
		return 0
	}
}

func stringsValue(value any) []string {
	result := []string{}
	switch typed := value.(type) {
	case string:
		if strings.TrimSpace(typed) != "" {
			result = append(result, strings.TrimSpace(typed))
		}
	case []string:
		result = append(result, typed...)
	case []any:
		for _, item := range typed {
			if text := stringValue(item); text != "" {
				result = append(result, text)
			}
		}
	}
	return sortedUnique(result)
}

func featureValues(value any) []Feature {
	result := []Feature{}
	for _, raw := range sliceValue(value) {
		item := mapValue(raw)
		name := stringValue(item["name"])
		desc := stringValue(item["description"])
		if desc == "" {
			desc = stringValue(item["desc"])
		}
		if name != "" || desc != "" {
			result = append(result, Feature{Name: name, Desc: desc})
		}
	}
	return result
}

func speedString(speed map[string]any) string {
	labels := []struct{ key, label string }{
		{"walk", ""}, {"burrow", "burrow"}, {"climb", "climb"}, {"fly", "fly"}, {"swim", "swim"},
	}
	parts := []string{}
	for _, candidate := range labels {
		value := stringValue(speed[candidate.key])
		if value == "" {
			if number := intValue(speed[candidate.key]); number > 0 {
				value = fmt.Sprintf("%d ft.", number)
			}
		}
		if value == "" {
			continue
		}
		if candidate.label != "" {
			value = candidate.label + " " + value
		}
		if candidate.key == "fly" {
			if hover, ok := speed["hover"].(bool); ok && hover {
				value += " (hover)"
			}
		}
		parts = append(parts, value)
	}
	return strings.Join(parts, ", ")
}

func safeImage(value string) bool {
	if value == "" {
		return false
	}
	if strings.HasPrefix(value, "attachments/") || strings.HasPrefix(value, "_assets/") {
		return !strings.Contains(value, "..")
	}
	parsed, err := url.Parse(value)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" || parsed.User != nil {
		return false
	}
	host := strings.ToLower(parsed.Hostname())
	if host == "localhost" || strings.HasSuffix(host, ".local") || strings.HasPrefix(host, "127.") || host == "::1" {
		return false
	}
	if strings.Contains(parsed.Path, "/api/assets/") {
		return false
	}
	for key := range parsed.Query() {
		switch strings.ToLower(key) {
		case "token", "access_token", "key", "api_key", "signature", "sig", "auth", "credential", "expires":
			return false
		}
	}
	return true
}

func abilityModifier(score int) int {
	return int(math.Floor(float64(score-10) / 2))
}

func proficiencyBonus(challenge string) int {
	fractional := map[string]float64{"0": 0, "1/8": .125, "1/4": .25, "1/2": .5}
	value, found := fractional[strings.TrimSpace(challenge)]
	if !found {
		value, _ = strconv.ParseFloat(strings.TrimSpace(challenge), 64)
	}
	if value <= 4 {
		return 2
	}
	return 2 + int(math.Ceil((value-4)/4))
}

func title(value string) string {
	words := strings.Fields(strings.ReplaceAll(value, "_", " "))
	for index, word := range words {
		words[index] = strings.ToUpper(word[:1]) + word[1:]
	}
	return strings.Join(words, " ")
}

func sortedUnique(values []string) []string {
	result := []string{}
	seen := map[string]bool{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		result = append(result, value)
	}
	sort.Strings(result)
	return result
}

func appendUnique(values []string, value string) []string {
	if value == "" {
		return values
	}
	for _, existing := range values {
		if existing == value {
			return values
		}
	}
	return append(values, value)
}
