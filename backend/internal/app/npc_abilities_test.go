package app

import "testing"

func TestNPCAbilityTokensPreserveCombatEnumValues(t *testing.T) {
	t.Parallel()

	actions := []NPCActionCommand{{
		Name:            "Root Scepter",
		ActionType:      "melee_weapon",
		DisplaySection:  "bonus_action",
		HitSpecialEvent: "heal_caster_full",
		Rolls: []NPCActionRollCommand{{
			RollKind: "max_hp_reduction", FixedValue: 5,
		}},
	}}
	command := NPCCommand{Actions: &actions}
	if err := validateNPCAbilities(command); err != nil {
		t.Fatalf("underscore-backed combat enums should validate: %v", err)
	}

	input := npcActionInput(actions[0])
	if input.ActionType != "melee_weapon" {
		t.Fatalf("action type was not preserved: %q", input.ActionType)
	}
	if input.DisplaySection != "bonus_action" {
		t.Fatalf("display section was not preserved: %q", input.DisplaySection)
	}
	if input.HitSpecialEvent != "heal_caster_full" {
		t.Fatalf("hit special event was not preserved: %q", input.HitSpecialEvent)
	}
	if len(input.Rolls) != 1 || input.Rolls[0].RollKind != "max_hp_reduction" {
		t.Fatalf("roll kind was not preserved: %+v", input.Rolls)
	}
}

func TestNPCAbilityTokensAcceptHyphenatedAliases(t *testing.T) {
	t.Parallel()

	actions := []NPCActionCommand{{
		Name:           "Longbow",
		ActionType:     "ranged-weapon",
		DisplaySection: "legendary-action",
	}}
	if err := validateNPCAbilities(NPCCommand{Actions: &actions}); err != nil {
		t.Fatalf("hyphenated MCP enum aliases should validate: %v", err)
	}
	input := npcActionInput(actions[0])
	if input.ActionType != "ranged_weapon" || input.DisplaySection != "legendary_action" {
		t.Fatalf("hyphenated aliases were not canonicalized: %+v", input)
	}
}
