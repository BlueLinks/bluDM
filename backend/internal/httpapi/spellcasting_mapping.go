package httpapi

import "bludm/backend/internal/store"

func spellcastingInputFromRequest(req spellcastingRequest) store.SpellcastingInput {
	spells := make([]store.CreatureSpellInput, 0, len(req.Spells))
	for _, spell := range req.Spells {
		spells = append(spells, store.CreatureSpellInput{
			SpellID:       spell.SpellID,
			LibrarySource: spell.LibrarySource,
			SpellLevel:    spell.SpellLevel,
			Prepared:      spell.Prepared,
			Innate:        spell.Innate,
		})
	}
	return store.SpellcastingInput{
		SpellcastingAbility:       req.SpellcastingAbility,
		InnateSpellcastingAbility: req.InnateSpellcastingAbility,
		CasterLevel:               req.CasterLevel,
		SpellSaveDC:               req.SpellSaveDC,
		SpellAttackBonus:          req.SpellAttackBonus,
		Slots:                     req.Slots,
		Spells:                    spells,
	}
}
