package httpapi

import (
	"errors"
	"net/http"
	"strings"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/models"
	"bludm/backend/internal/store"
)

const markdownEncounterRequestLimit = 6 << 20

func (s *Server) previewMarkdownEncounters(w http.ResponseWriter, r *http.Request) {
	request, ok := s.decodeMarkdownEncounterRequest(w, r)
	if !ok {
		return
	}
	prepared, err := s.prepareMarkdownImport(
		r.Context(),
		strings.TrimSpace(r.PathValue("campaignID")),
		request,
	)
	if err != nil {
		s.writeMarkdownPreparationError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"preview": prepared.Preview})
}

func (s *Server) importMarkdownEncounters(w http.ResponseWriter, r *http.Request) {
	request, ok := s.decodeMarkdownEncounterRequest(w, r)
	if !ok {
		return
	}
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	prepared, err := s.prepareMarkdownImport(r.Context(), campaignID, request)
	if err != nil {
		s.writeMarkdownPreparationError(w, r, err)
		return
	}
	if !prepared.Preview.CanImport {
		if isExternalRequest(r) {
			writeExternalError(w, r, appdomain.NewError(
				appdomain.CodeUnsupported, "Markdown preview contains blocking errors",
				map[string]any{"preview": prepared.Preview},
			))
			return
		}
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{
			"error":   "Markdown preview contains blocking errors",
			"preview": prepared.Preview,
		})
		return
	}
	if isScopedExternalRequest(r) {
		result, err := s.app.ImportMarkdownEncounters(
			r.Context(), campaignID, idempotencyKey(r, ""), prepared.Inputs,
		)
		if err != nil {
			writeExternalError(w, r, err)
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{"import": result, "preview": prepared.Preview})
		return
	}
	results, err := s.stores.Encounters.ImportMarkdown(
		r.Context(), currentUserIDMust(r.Context()), campaignID, prepared.Inputs,
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
	campaigns, err := s.app.ListCampaigns(r.Context())
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	start, end, page, err := pageBounds(r, len(campaigns))
	if err != nil {
		writeExternalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"campaigns": campaigns[start:end],
		"page":      page,
	})
}

func (s *Server) decodeMarkdownEncounterRequest(
	w http.ResponseWriter,
	r *http.Request,
) (markdownEncounterRequest, bool) {
	var request markdownEncounterRequest
	ok := false
	if isExternalRequest(r) {
		ok = decodeExternalJSONLimit(w, r, &request, markdownEncounterRequestLimit)
	} else {
		r.Body = http.MaxBytesReader(w, r.Body, markdownEncounterRequestLimit)
		ok = decodeJSON(w, r, &request)
	}
	if !ok {
		return markdownEncounterRequest{}, false
	}
	if strings.TrimSpace(request.Markdown) == "" {
		if isExternalRequest(r) {
			writeExternalError(w, r, appdomain.ValidationError("missing_markdown", "markdown is required", nil))
		} else {
			writeError(w, http.StatusBadRequest, "markdown is required")
		}
		return markdownEncounterRequest{}, false
	}
	return request, true
}

func (s *Server) writeMarkdownPreparationError(w http.ResponseWriter, r *http.Request, err error) {
	if isExternalRequest(r) {
		if store.IsNotFound(err) {
			writeExternalError(w, r, appdomain.NewError(appdomain.CodeNotFound, "campaign not found", nil))
			return
		}
		if errors.Is(err, errInvalidMarkdownEncounter) {
			message := strings.TrimSpace(strings.TrimPrefix(err.Error(), errInvalidMarkdownEncounter.Error()+":"))
			writeExternalError(w, r, appdomain.ValidationError("invalid_markdown", message, nil))
			return
		}
		writeExternalError(w, r, err)
		return
	}
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
