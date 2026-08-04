package httpapi

import (
	"net/http"
	"strings"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/generation"
)

type encounterGenerationRequest struct {
	Options    generation.EncounterOptions `json:"options"`
	PlayerIDs  []string                    `json:"playerIds"`
	LocationID string                      `json:"locationId"`
	Roll       int                         `json:"roll"`
}

func (s *Server) previewGeneratedEncounter(w http.ResponseWriter, r *http.Request) {
	var request encounterGenerationRequest
	ok := false
	if isExternalRequest(r) {
		ok = decodeExternalJSON(s, w, r, &request)
	} else {
		ok = decodeJSON(w, r, &request)
	}
	if !ok {
		return
	}
	preview, err := s.app.PreviewGeneratedEncounter(
		r.Context(), r.PathValue("campaignID"), appdomain.GenerateEncounterCommand{
			PlayerIDs: request.PlayerIDs, LocationID: request.LocationID,
			Options: request.Options, Seed: request.Roll,
		},
	)
	if err != nil {
		if isExternalRequest(r) {
			writeExternalError(w, r, err)
			return
		}
		info := appdomain.ErrorInfo(err)
		status := http.StatusBadRequest
		if info.Code == appdomain.CodeNotFound {
			status = http.StatusNotFound
		} else if info.Code == appdomain.CodeForbidden {
			status = http.StatusForbidden
		} else if info.Code == appdomain.CodeInternal {
			status = http.StatusInternalServerError
		}
		writeError(w, status, info.Message)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"preview": preview, "previewFingerprint": appdomain.EncounterPreviewFingerprint(preview),
	})
}

func (s *Server) previewGeneratedDungeon(w http.ResponseWriter, r *http.Request) {
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	if _, err := s.campaignByID(r.Context(), campaignID); err != nil {
		if isExternalRequest(r) {
			writeExternalError(w, r, appdomain.NewError(appdomain.CodeNotFound, "campaign not found", nil))
		} else {
			writeError(w, http.StatusNotFound, "campaign not found")
		}
		return
	}
	var request struct {
		Settings generation.DungeonSettings `json:"settings"`
	}
	ok := false
	if isExternalRequest(r) {
		ok = decodeExternalJSON(s, w, r, &request)
	} else {
		ok = decodeJSON(w, r, &request)
	}
	if !ok {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"document": generation.GenerateDungeon(request.Settings),
	})
}
