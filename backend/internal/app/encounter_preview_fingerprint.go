package app

import (
	"sort"

	"bludm/backend/internal/generation"
)

type encounterPreviewRosterEntry struct {
	CreatureID string `json:"creatureId"`
	Quantity   int    `json:"quantity"`
	RolledHP   bool   `json:"rolledHp"`
}

func EncounterPreviewFingerprint(preview generation.EncounterPreview) string {
	entries := make([]encounterPreviewRosterEntry, 0, len(preview.Enemies))
	for _, enemy := range preview.Enemies {
		entries = append(entries, encounterPreviewRosterEntry{
			CreatureID: enemy.Creature.ID,
			Quantity:   enemy.Quantity,
			RolledHP:   enemy.RolledHP,
		})
	}
	return hashPreviewRoster(entries)
}

func authoredEnemyRosterFingerprint(combatants []EncounterCombatantCommand) string {
	quantities := map[encounterPreviewRosterEntry]int{}
	for _, combatant := range combatants {
		if combatant.SourceType != "creature" || combatant.Side != "enemy" {
			continue
		}
		key := encounterPreviewRosterEntry{
			CreatureID: combatant.CreatureID, RolledHP: combatant.RolledHP,
		}
		quantities[key]++
	}
	entries := make([]encounterPreviewRosterEntry, 0, len(quantities))
	for entry, quantity := range quantities {
		entry.Quantity = quantity
		entries = append(entries, entry)
	}
	return hashPreviewRoster(entries)
}

func hashPreviewRoster(entries []encounterPreviewRosterEntry) string {
	sort.Slice(entries, func(left, right int) bool {
		if entries[left].CreatureID == entries[right].CreatureID {
			if entries[left].RolledHP == entries[right].RolledHP {
				return entries[left].Quantity < entries[right].Quantity
			}
			return !entries[left].RolledHP
		}
		return entries[left].CreatureID < entries[right].CreatureID
	})
	hash, _ := normalizedHash(entries)
	return hash
}
