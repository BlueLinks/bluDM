package app

import (
	"bludm/backend/internal/generation"
	"bludm/backend/internal/models"
)

func encounterDifficultyInputs(
	combatants []models.EncounterCombatant,
) ([]models.Player, []generation.EncounterEnemy) {
	players := []models.Player{}
	enemiesByID := map[string]int{}
	enemies := []generation.EncounterEnemy{}
	for _, combatant := range combatants {
		if combatant.SourceType == "player" {
			players = append(players, models.Player{
				ID: combatant.PlayerID, CharacterName: combatant.DisplayName,
				CharacterSheet: combatant.Snapshot,
			})
			continue
		}
		if combatant.Side != "enemy" {
			continue
		}
		key := combatant.CreatureID
		if key == "" {
			key = combatant.DisplayName
		}
		if index, ok := enemiesByID[key]; ok {
			enemies[index].Quantity++
			continue
		}
		enemiesByID[key] = len(enemies)
		enemies = append(enemies, generation.EncounterEnemy{
			Creature: models.Creature{
				ID: combatant.CreatureID, Name: combatant.DisplayName,
				XP: integerFromAny(combatant.Snapshot["xp"]),
			},
			Quantity: 1, Side: "enemy",
		})
	}
	return players, enemies
}
