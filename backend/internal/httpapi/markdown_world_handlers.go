package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"bludm/backend/internal/store"
)

const markdownWorldRequestLimit = 14 << 20

func (s *Server) previewMarkdownWorld(w http.ResponseWriter, r *http.Request) {
	request, ok := decodeMarkdownWorldRequest(w, r)
	if !ok {
		return
	}
	prepared, err := s.prepareMarkdownWorldImport(
		r.Context(), strings.TrimSpace(r.PathValue("campaignID")), request,
	)
	if err != nil {
		writeMarkdownWorldPreparationError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"preview": prepared.Preview})
}

func (s *Server) importMarkdownWorld(w http.ResponseWriter, r *http.Request) {
	request, ok := decodeMarkdownWorldRequest(w, r)
	if !ok {
		return
	}
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	prepared, err := s.prepareMarkdownWorldImport(r.Context(), campaignID, request)
	if err != nil {
		writeMarkdownWorldPreparationError(w, err)
		return
	}
	if !prepared.Preview.CanImport {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{
			"error": "Markdown preview contains blocking errors", "preview": prepared.Preview,
		})
		return
	}
	result, err := s.stores.MarkdownWorld.Import(
		r.Context(), currentUserIDMust(r.Context()), campaignID,
		prepared.NPCs, prepared.Dungeons,
	)
	if err != nil {
		if store.IsNotFound(err) {
			writeError(w, http.StatusNotFound, "campaign or linked location not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not import Markdown campaign content")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"import": result, "preview": prepared.Preview,
	})
}

func decodeMarkdownWorldRequest(w http.ResponseWriter, r *http.Request) (markdownWorldRequest, bool) {
	r.Body = http.MaxBytesReader(w, r.Body, markdownWorldRequestLimit)
	var request markdownWorldRequest
	if !decodeJSON(w, r, &request) {
		return markdownWorldRequest{}, false
	}
	if strings.TrimSpace(request.Markdown) == "" {
		writeError(w, http.StatusBadRequest, "markdown is required")
		return markdownWorldRequest{}, false
	}
	return request, true
}

func writeMarkdownWorldPreparationError(w http.ResponseWriter, err error) {
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "campaign not found")
		return
	}
	if errors.Is(err, errInvalidMarkdownWorld) {
		message := strings.TrimSpace(strings.TrimPrefix(err.Error(), errInvalidMarkdownWorld.Error()+":"))
		writeError(w, http.StatusBadRequest, message)
		return
	}
	writeError(w, http.StatusInternalServerError, "could not prepare Markdown campaign content import")
}
