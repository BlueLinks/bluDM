package httpapi

import (
	"testing"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/models"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func assertMCPEncounterCreatureRepoint(
	t *testing.T,
	session *mcp.ClientSession,
	campaignID string,
	encounterID string,
	combatantID string,
	replacement models.Creature,
	expectedCurrentHitPoints int,
) {
	t.Helper()
	result := callMCPTool(t, session, "update_encounter", map[string]any{
		"campaignId": campaignID, "encounterId": encounterID,
		"encounter": map[string]any{
			"idempotencyKey": "mcp-repoint-authored-creature", "expectedRevision": 1,
			"updateCombatants": []map[string]any{{
				"combatantId": combatantID, "creatureId": replacement.ID,
			}},
		},
	})
	if result.IsError {
		t.Fatalf("update_encounter could not repoint one creature: %+v", result)
	}
	readResult := callMCPTool(t, session, "get_encounter", map[string]any{
		"campaignId": campaignID, "encounterId": encounterID,
	})
	var readback appdomain.EncounterDetails
	decodeMCPStructured(t, readResult, &readback)
	if readback.Encounter.Revision != 2 || len(readback.Combatants) != 2 {
		t.Fatalf("targeted creature repoint changed the surrounding roster: %+v", readback)
	}
	for _, combatant := range readback.Combatants {
		if combatant.ID == combatantID && combatant.CreatureID == replacement.ID &&
			combatant.DisplayName == replacement.Name &&
			combatant.ArmorClass == replacement.ArmorClass &&
			combatant.MaxHitPoints == replacement.HitPoints &&
			combatant.CurrentHitPoints == expectedCurrentHitPoints && combatant.Snapshot["actions"] != nil {
			return
		}
	}
	t.Fatalf("targeted creature repoint did not refresh linked mechanics: %+v", readback.Combatants)
}
