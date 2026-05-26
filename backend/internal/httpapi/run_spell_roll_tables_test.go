package httpapi

import "testing"

func TestResolvedRollTableRowsUsesRowReminderForFollowUps(t *testing.T) {
	rows := []map[string]any{
		{"roll": 1, "name": "One"},
		{"roll": 2, "name": "Two"},
		{"roll": 8, "name": "Eight"},
	}

	applied, rolled, err := resolvedRollTableRows(rows, rows[2], 8, false, nil)
	if err != nil {
		t.Fatalf("ordinary d8 outcome should not require follow-ups: %v", err)
	}
	if len(applied) != 1 || len(rolled) != 1 || rolled[0] != 8 {
		t.Fatalf("expected only the selected row, got applied=%v rolled=%v", applied, rolled)
	}
}

func TestResolvedRollTableRowsRequiresConfiguredFollowUps(t *testing.T) {
	rows := []map[string]any{
		{"roll": 1, "name": "Red"},
		{"roll": 2, "name": "Orange"},
		{"roll": 8, "name": "Special", "effectText": "Roll twice more, rerolling any 8."},
	}

	applied, rolled, err := resolvedRollTableRows(rows, rows[2], 8, false, []int{1, 2})
	if err != nil {
		t.Fatalf("configured follow-ups should resolve: %v", err)
	}
	if len(applied) != 3 || len(rolled) != 3 {
		t.Fatalf("expected selected row and two follow-ups, got applied=%v rolled=%v", applied, rolled)
	}

	if _, _, err := resolvedRollTableRows(rows, rows[2], 8, false, []int{1, 8}); err == nil {
		t.Fatal("expected repeated special result to be rejected")
	}
}
