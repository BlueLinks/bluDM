package httpapi

import (
	"bludm/backend/internal/models"
	"context"
	"encoding/json"
)

func mapFromAny(value any) map[string]any {
	if mapped, ok := value.(map[string]any); ok {
		return mapped
	}
	return nil
}

func (s *Server) runSpellSlots(ctx context.Context, runID string) ([]models.EncounterRunSpellSlot, error) {
	return s.stores.Runs.SpellSlots(ctx, runID)
}

func (s *Server) runActiveEffects(ctx context.Context, runID string) ([]models.EncounterRunEffect, error) {
	return s.stores.Runs.ActiveEffects(ctx, runID)
}

func (s *Server) runAlerts(ctx context.Context, runID string) ([]models.EncounterRunAlert, error) {
	return s.stores.Runs.Alerts(ctx, runID)
}

func marshalEffectPayload(payload map[string]any) []byte {
	bytes, _ := json.Marshal(payload)
	return bytes
}
