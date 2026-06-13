package httpapi

import (
	"bludm/backend/internal/models"
	"strings"
)

func requestFromRollTable(table models.RollTable) rollTableRequest {
	rows := make([]rollTableRowRequest, 0, len(table.Rows))
	for _, row := range table.Rows {
		rows = append(rows, rollTableRowRequest{
			MinRoll:    row.MinRoll,
			MaxRoll:    row.MaxRoll,
			Label:      row.Label,
			ResultText: row.ResultText,
			Notes:      row.Notes,
		})
	}
	return rollTableRequest{
		Name:          table.Name,
		Description:   table.Description,
		Category:      table.Category,
		Tags:          table.Tags,
		DieExpression: table.DieExpression,
		Rows:          rows,
	}
}

func normalizeRollTableTags(tags []string) []string {
	seen := map[string]bool{}
	normalized := []string{}
	for _, tag := range tags {
		tag = strings.TrimSpace(strings.ToLower(tag))
		if tag == "" || seen[tag] {
			continue
		}
		seen[tag] = true
		normalized = append(normalized, tag)
		if len(normalized) == 12 {
			break
		}
	}
	return normalized
}

func normalizeRollTableOption(value string) string {
	return strings.ReplaceAll(strings.ToLower(strings.TrimSpace(value)), " ", "-")
}

func rollTableDieSize(expression string) int {
	switch strings.ToLower(strings.TrimSpace(expression)) {
	case "1d4":
		return 4
	case "1d6":
		return 6
	case "1d8":
		return 8
	case "1d10":
		return 10
	case "1d12":
		return 12
	case "1d20":
		return 20
	case "1d100":
		return 100
	default:
		return 0
	}
}

var rollTableCategories = map[string]bool{
	"custom": true, "weather": true, "rumor": true, "npc": true,
	"travel": true, "treasure": true, "encounter": true, "magic": true,
}
