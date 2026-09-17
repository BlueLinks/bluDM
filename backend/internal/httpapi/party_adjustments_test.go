package httpapi

import "testing"

func TestPartyAdjustmentInputEnforcesFeatureRules(t *testing.T) {
	input, err := partyAdjustmentInput(partyAdjustmentRequest{
		TargetIDs:        []string{"one", "two", "three"},
		Kind:             "aid",
		ActorID:          "caster",
		SlotLevel:        3,
		ConsumeSpellSlot: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if input.Amount != 10 {
		t.Fatalf("Aid amount = %d, want 10 for a level-three slot", input.Amount)
	}

	_, err = partyAdjustmentInput(partyAdjustmentRequest{
		TargetIDs: []string{"one", "two", "three", "four"},
		Kind:      "aid",
		Amount:    5,
		ActorID:   "caster",
		SlotLevel: 2,
	})
	if err == nil {
		t.Fatal("expected Aid to reject more than three targets")
	}

	_, err = partyAdjustmentInput(partyAdjustmentRequest{
		TargetIDs: []string{"one"},
		Kind:      "inspiring_leader",
		Amount:    8,
	})
	if err == nil {
		t.Fatal("expected Inspiring Leader to require a party member as leader")
	}

	_, err = partyAdjustmentInput(partyAdjustmentRequest{
		TargetIDs: []string{"one", "two", "three", "four", "five", "six", "seven"},
		Kind:      "inspiring_leader",
		Amount:    8,
		ActorID:   "leader",
	})
	if err == nil {
		t.Fatal("expected Inspiring Leader to reject more than six targets")
	}
}
