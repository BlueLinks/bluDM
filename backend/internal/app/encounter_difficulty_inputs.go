package app

import (
	dbmodels "bludm/backend/internal/db"
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
				CharacterSheet: characterSheetFromCombatantSnapshot(combatant.Snapshot),
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
				XP: xpFromCombatantSnapshot(combatant.Snapshot),
			},
			Quantity: 1, Side: "enemy",
		})
	}
	return players, enemies
}

func characterSheetFromCombatantSnapshot(snapshot map[string]any) map[string]any {
	player, ok := objectFromAny(snapshot["player"])
	if !ok {
		return snapshot
	}
	characterSheet, ok := objectFromAny(player["characterSheet"])
	if !ok {
		return snapshot
	}
	return characterSheet
}

func xpFromCombatantSnapshot(snapshot map[string]any) int {
	if xp := integerFromAny(snapshot["xp"]); xp > 0 {
		return xp
	}
	creature, ok := objectFromAny(snapshot["creature"])
	if !ok {
		return 0
	}
	return integerFromAny(creature["xp"])
}

func objectFromAny(value any) (map[string]any, bool) {
	switch typed := value.(type) {
	case map[string]any:
		return typed, true
	case dbmodels.JSONMap:
		return map[string]any(typed), true
	default:
		return nil, false
	}
}
