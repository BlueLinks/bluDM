package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
)

const markdownEncounterRequestLimit = 6 << 20

func (s *Server) previewMarkdownEncounters(w http.ResponseWriter, r *http.Request) {
	request, ok := decodeMarkdownEncounterRequest(w, r)
	if !ok {
		return
	}
	prepared, err := s.prepareMarkdownImport(
		r.Context(),
		strings.TrimSpace(r.PathValue("campaignID")),
		request,
	)
	if err != nil {
		writeMarkdownPreparationError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"preview": prepared.Preview})
}

func (s *Server) importMarkdownEncounters(w http.ResponseWriter, r *http.Request) {
	request, ok := decodeMarkdownEncounterRequest(w, r)
	if !ok {
		return
	}
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	prepared, err := s.prepareMarkdownImport(r.Context(), campaignID, request)
	if err != nil {
		writeMarkdownPreparationError(w, err)
		return
	}
	if !prepared.Preview.CanImport {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{
			"error":   "Markdown preview contains blocking errors",
			"preview": prepared.Preview,
		})
		return
	}
	results, err := s.stores.Encounters.ImportMarkdown(
		r.Context(),
		currentUserIDMust(r.Context()),
		campaignID,
		prepared.Inputs,
	)
	if err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "campaign or linked location not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not import Markdown encounters")
		return
	}
	response := markdownImportResponse{
		Encounters: make([]models.Encounter, 0, len(results)),
		Operations: make([]string, 0, len(results)),
	}
	for _, result := range results {
		response.Encounters = append(response.Encounters, result.Encounter)
		response.Operations = append(response.Operations, result.Operation)
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"import":  response,
		"preview": prepared.Preview,
	})
}

func (s *Server) listExternalCampaigns(w http.ResponseWriter, r *http.Request) {
	campaigns, err := s.stores.Campaigns.List(r.Context(), currentUserIDMust(r.Context()))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list campaigns")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"campaigns": campaigns})
}

func decodeMarkdownEncounterRequest(
	w http.ResponseWriter,
	r *http.Request,
) (markdownEncounterRequest, bool) {
	r.Body = http.MaxBytesReader(w, r.Body, markdownEncounterRequestLimit)
	var request markdownEncounterRequest
	if !decodeJSON(w, r, &request) {
		return markdownEncounterRequest{}, false
	}
	if strings.TrimSpace(request.Markdown) == "" {
		writeError(w, http.StatusBadRequest, "markdown is required")
		return markdownEncounterRequest{}, false
	}
	return request, true
}

func writeMarkdownPreparationError(w http.ResponseWriter, err error) {
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	if errors.Is(err, errInvalidMarkdownEncounter) {
		message := strings.TrimSpace(strings.TrimPrefix(err.Error(), errInvalidMarkdownEncounter.Error()+":"))
		writeError(w, http.StatusBadRequest, message)
		return
	}
	writeError(w, http.StatusInternalServerError, "could not prepare Markdown encounter import")
}
