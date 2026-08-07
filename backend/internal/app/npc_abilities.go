package app

import (
	"context"
	"strings"

	"bludm/backend/internal/models"
	"bludm/backend/internal/store"

	"gorm.io/gorm"
)

func validateNPCAbilities(command NPCCommand) error {
	if command.Actions != nil {
		for index, action := range *command.Actions {
			if strings.TrimSpace(action.Name) == "" {
				return ValidationError(
					"missing_action_name", "every supplied action needs a name",
					map[string]any{"index": index},
				)
			}
			if action.LimitedUses < 0 || action.Reach < 0 || action.Range < 0 || action.AOESize < 0 {
				return ValidationError(
					"invalid_action_number", "action numeric fields cannot be negative",
					map[string]any{"index": index},
				)
			}
			if !oneOfDefault(action.LimitType, "day", "day", "turn") {
				return ValidationError("invalid_limit_type", "limitType must be day or turn", map[string]any{"index": index})
			}
			if !oneOfDefault(action.ActionType, "other", "melee_weapon", "ranged_weapon", "spell_attack", "save", "damage", "healing", "other") {
				return ValidationError("invalid_action_type", "actionType is not supported", map[string]any{"index": index})
			}
			if !oneOfDefault(action.DisplaySection, "action", "trait", "action", "bonus_action", "reaction", "legendary_action", "mythic_action", "lair_action") {
				return ValidationError("invalid_display_section", "displaySection is not supported", map[string]any{"index": index})
			}
			if !oneOfDefault(action.MissEffect, "none", "none", "half", "full") {
				return ValidationError("invalid_miss_effect", "missEffect must be none, half, or full", map[string]any{"index": index})
			}
			for rollIndex, roll := range action.Rolls {
				fixedOnly := roll.DiceCount == 0 && roll.DieSize == 0 && roll.FixedValue != 0
				diceRoll := roll.DiceCount > 0 && roll.DieSize >= 2
				if !fixedOnly && !diceRoll {
					return ValidationError(
						"invalid_action_roll", "rolls need either diceCount with dieSize, or a non-zero fixedValue",
						map[string]any{"actionIndex": index, "rollIndex": rollIndex},
					)
				}
			}
		}
	}
	if profile := command.Spellcasting; profile != nil {
		if profile.CasterLevel < 0 || profile.SpellSaveDC < 0 || profile.SpellAttackBonus < 0 {
			return ValidationError("invalid_spellcasting_number", "spellcasting numeric fields cannot be negative", nil)
		}
		for index, spell := range profile.Spells {
			if strings.TrimSpace(spell.SpellID) == "" {
				return ValidationError("missing_spell_id", "every supplied spell needs a spellId", map[string]any{"index": index})
			}
			if source := normalizedToken(spell.LibrarySource, "standard"); source != "standard" && source != "user" {
				return ValidationError("invalid_spell_source", "librarySource must be standard or user", map[string]any{"index": index})
			}
			if spell.SpellLevel < 0 || spell.SpellLevel > 9 {
				return ValidationError("invalid_spell_level", "spellLevel must be between 0 and 9", map[string]any{"index": index})
			}
		}
	}
	return nil
}

func oneOfDefault(value, fallback string, allowed ...string) bool {
	value = normalizedAbilityToken(value, fallback)
	for _, candidate := range allowed {
		if value == normalizedAbilityToken(candidate, candidate) {
			return true
		}
	}
	return false
}

func normalizedAbilityToken(value, fallback string) string {
	return strings.ReplaceAll(normalizedToken(value, fallback), "-", "_")
}

func persistNPCAbilities(
	ctx context.Context,
	tx *gorm.DB,
	principal Principal,
	creatureID string,
	command NPCCommand,
) ([]models.CreatureAction, models.CreatureSpellcastingProfile, error) {
	txStores := store.New(tx)
	if command.Actions != nil {
		inputs := make([]store.ActionInput, 0, len(*command.Actions))
		for _, action := range *command.Actions {
			inputs = append(inputs, npcActionInput(action))
		}
		if _, err := txStores.Actions.ReplaceCreatureActions(ctx, principal.UserID, creatureID, inputs); err != nil {
			return nil, models.CreatureSpellcastingProfile{}, err
		}
	}
	if command.Spellcasting != nil {
		if _, err := txStores.Spellcasts.UpsertProfile(
			ctx, principal.UserID, creatureID, npcSpellcastingInput(*command.Spellcasting),
		); err != nil {
			return nil, models.CreatureSpellcastingProfile{}, storeError(err, "spell")
		}
	}
	actions, err := txStores.Actions.ListCreatureActions(ctx, principal.UserID, creatureID)
	if err != nil {
		return nil, models.CreatureSpellcastingProfile{}, err
	}
	spellcasting, err := txStores.Spellcasts.Profile(ctx, principal.UserID, creatureID)
	if err != nil {
		return nil, models.CreatureSpellcastingProfile{}, err
	}
	return actions, spellcasting, nil
}

func npcActionInput(command NPCActionCommand) store.ActionInput {
	rolls := make([]models.ActionRollPart, 0, len(command.Rolls))
	for _, roll := range command.Rolls {
		rolls = append(rolls, models.ActionRollPart{
			RollKind: normalizedAbilityToken(roll.RollKind, "damage"), DamageType: strings.ToLower(strings.TrimSpace(roll.DamageType)),
			Magical: roll.Magical, DiceCount: roll.DiceCount, DieSize: roll.DieSize, FixedValue: roll.FixedValue,
		})
	}
	return store.ActionInput{
		Name: strings.TrimSpace(command.Name), Description: strings.TrimSpace(command.Description),
		Recharge: strings.TrimSpace(command.Recharge), LimitedUses: command.LimitedUses,
		LimitType: normalizedToken(command.LimitType, "day"), Reach: command.Reach, Range: command.Range,
		AOEType: strings.TrimSpace(command.AOEType), AOESize: command.AOESize,
		ActionType: normalizedAbilityToken(command.ActionType, "other"), DisplaySection: normalizedAbilityToken(command.DisplaySection, "action"),
		AttackModifier: command.AttackModifier, MissEffect: normalizedToken(command.MissEffect, "none"),
		HitSpecialEvent: normalizedAbilityToken(command.HitSpecialEvent, "none"), IconSource: "none", Rolls: rolls,
	}
}

func npcSpellcastingInput(command NPCSpellcastingCommand) store.SpellcastingInput {
	spells := make([]store.CreatureSpellInput, 0, len(command.Spells))
	for _, spell := range command.Spells {
		spells = append(spells, store.CreatureSpellInput{
			SpellID: strings.TrimSpace(spell.SpellID), LibrarySource: normalizedToken(spell.LibrarySource, "standard"),
			SpellLevel: spell.SpellLevel, Prepared: spell.Prepared, Innate: spell.Innate,
		})
	}
	slots := command.Slots
	if slots == nil {
		slots = map[string]any{}
	}
	return store.SpellcastingInput{
		SpellcastingAbility:       strings.TrimSpace(command.SpellcastingAbility),
		InnateSpellcastingAbility: strings.TrimSpace(command.InnateSpellcastingAbility),
		CasterLevel:               command.CasterLevel, SpellSaveDC: command.SpellSaveDC,
		SpellAttackBonus: command.SpellAttackBonus, Slots: slots, Spells: spells,
	}
}
