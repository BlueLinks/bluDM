package httpapi

import (
	"strings"
	"testing"
)

func TestRollTableRequestValidationAcceptsCompleteRanges(t *testing.T) {
	req := rollTableRequest{
		Name:          "Dungeon Clues",
		Category:      "custom",
		DieExpression: "1d4",
		Rows: []rollTableRowRequest{
			{MinRoll: 1, MaxRoll: 1, Label: "Boot print", ResultText: "A fresh print crosses the dust."},
			{MinRoll: 2, MaxRoll: 4, Label: "Old mark", ResultText: "A chalk symbol hides near the door."},
		},
	}
	req.normalize()
	if err := validateRollTableRequest(req); err != nil {
		t.Fatalf("expected valid roll table: %v", err)
	}
}

func TestRollTableRequestValidationRejectsInvalidRows(t *testing.T) {
	valid := rollTableRequest{
		Name:          "Dungeon Clues",
		Category:      "custom",
		DieExpression: "1d4",
		Rows: []rollTableRowRequest{
			{MinRoll: 1, MaxRoll: 1, Label: "One", ResultText: "First."},
			{MinRoll: 2, MaxRoll: 2, Label: "Two", ResultText: "Second."},
			{MinRoll: 3, MaxRoll: 3, Label: "Three", ResultText: "Third."},
			{MinRoll: 4, MaxRoll: 4, Label: "Four", ResultText: "Fourth."},
		},
	}
	tests := []struct {
		name    string
		mutate  func(*rollTableRequest)
		message string
	}{
		{name: "blank name", mutate: func(req *rollTableRequest) { req.Name = "" }, message: "name"},
		{name: "invalid die", mutate: func(req *rollTableRequest) { req.DieExpression = "2d6" }, message: "dieExpression"},
		{name: "invalid category", mutate: func(req *rollTableRequest) { req.Category = "chaos" }, message: "category"},
		{name: "gap", mutate: func(req *rollTableRequest) {
			req.Rows[1].MinRoll = 3
			req.Rows[1].MaxRoll = 3
		}, message: "gaps"},
		{name: "out of bounds", mutate: func(req *rollTableRequest) { req.Rows[3].MaxRoll = 5 }, message: "range"},
		{name: "blank label", mutate: func(req *rollTableRequest) { req.Rows[0].Label = "" }, message: "label"},
		{name: "blank result", mutate: func(req *rollTableRequest) { req.Rows[0].ResultText = "" }, message: "resultText"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			req := valid
			req.Rows = append([]rollTableRowRequest(nil), valid.Rows...)
			test.mutate(&req)
			req.normalize()
			err := validateRollTableRequest(req)
			if err == nil || !strings.Contains(err.Error(), test.message) {
				t.Fatalf("expected error containing %q, got %v", test.message, err)
			}
		})
	}
}

func TestProvidedRollTablesAreReadableAndCloneable(t *testing.T) {
	table, ok := providedRollTableByID("provided-tavern-rumors")
	if !ok {
		t.Fatal("expected provided tavern rumors table")
	}
	if table.Source != "provided" || table.CampaignID != "" {
		t.Fatalf("expected read-only provided table, got %+v", table)
	}
	req := requestFromRollTable(table)
	req.Name = "Copy of " + table.Name
	req.normalize()
	if err := validateRollTableRequest(req); err != nil {
		t.Fatalf("expected clone request to be valid: %v", err)
	}
}

func TestRollOnTableReturnsMatchingRange(t *testing.T) {
	table, ok := providedRollTableByID("provided-weather-prompts")
	if !ok {
		t.Fatal("expected provided weather table")
	}
	for range 20 {
		result, err := rollOnTable(table)
		if err != nil {
			t.Fatalf("expected roll result: %v", err)
		}
		if result.RolledValue < 1 || result.RolledValue > 6 {
			t.Fatalf("expected d6 roll, got %+v", result)
		}
		if result.Label == "" || result.ResultText == "" {
			t.Fatalf("expected matched row content, got %+v", result)
		}
	}
}
