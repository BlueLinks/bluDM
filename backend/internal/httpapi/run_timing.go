package httpapi

import "bludm/backend/internal/models"

func activeCombatantID(run models.EncounterRun) string {
	if run.CurrentTurnIndex >= 0 && run.CurrentTurnIndex < len(run.Combatants) {
		return run.Combatants[run.CurrentTurnIndex].ID
	}
	return ""
}
