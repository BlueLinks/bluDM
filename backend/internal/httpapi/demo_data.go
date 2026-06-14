package httpapi

import (
	"context"
	"errors"
	"net/http"
)

func (s *Server) seedTestData(w http.ResponseWriter, r *http.Request) {
	campaignID, err := s.seedDemoFixture(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not seed test data")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"campaignId": campaignID,
		"message":    "Demo campaign, player characters, NPCs, enemies, actions, and a starter encounter are ready.",
	})
}

func (s *Server) seedDemoFixture(ctx context.Context) (string, error) {
	ownerUserID, ok := currentUserID(ctx)
	if !ok {
		return "", errors.New("authentication required")
	}
	return s.stores.Demo.SeedFixture(ctx, ownerUserID)
}
