package httpapi

import (
	"errors"
	"net/http"
	"strings"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/store"
)

const markdownWorldRequestLimit = 14 << 20

func (s *Server) previewMarkdownWorld(w http.ResponseWriter, r *http.Request) {
	request, ok := s.decodeMarkdownWorldRequest(w, r)
	if !ok {
		return
	}
	prepared, err := s.prepareMarkdownWorldImport(
		r.Context(), strings.TrimSpace(r.PathValue("campaignID")), request,
	)
	if err != nil {
		s.writeMarkdownWorldPreparationError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"preview": prepared.Preview})
}

func (s *Server) importMarkdownWorld(w http.ResponseWriter, r *http.Request) {
	request, ok := s.decodeMarkdownWorldRequest(w, r)
	if !ok {
		return
	}
	campaignID := strings.TrimSpace(r.PathValue("campaignID"))
	prepared, err := s.prepareMarkdownWorldImport(r.Context(), campaignID, request)
	if err != nil {
		s.writeMarkdownWorldPreparationError(w, r, err)
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
			"error": "Markdown preview contains blocking errors", "preview": prepared.Preview,
		})
		return
	}
	if isScopedExternalRequest(r) {
		result, err := s.app.ImportMarkdownWorld(
			r.Context(), campaignID, idempotencyKey(r, ""), prepared.NPCs, prepared.Dungeons,
		)
		if err != nil {
			writeExternalError(w, r, err)
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{"import": result, "preview": prepared.Preview})
		return
	}
	result, err := s.stores.MarkdownWorld.Import(
		r.Context(), currentUserIDMust(r.Context()), campaignID, prepared.NPCs, prepared.Dungeons,
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

func (s *Server) decodeMarkdownWorldRequest(w http.ResponseWriter, r *http.Request) (markdownWorldRequest, bool) {
	var request markdownWorldRequest
	ok := false
	if isExternalRequest(r) {
		ok = decodeExternalJSONLimit(w, r, &request, markdownWorldRequestLimit)
	} else {
		r.Body = http.MaxBytesReader(w, r.Body, markdownWorldRequestLimit)
		ok = decodeJSON(w, r, &request)
	}
	if !ok {
		return markdownWorldRequest{}, false
	}
	if strings.TrimSpace(request.Markdown) == "" {
		if isExternalRequest(r) {
			writeExternalError(w, r, appdomain.ValidationError("missing_markdown", "markdown is required", nil))
		} else {
			writeError(w, http.StatusBadRequest, "markdown is required")
		}
		return markdownWorldRequest{}, false
	}
	return request, true
}

func (s *Server) writeMarkdownWorldPreparationError(w http.ResponseWriter, r *http.Request, err error) {
	if isExternalRequest(r) {
		if store.IsNotFound(err) {
			writeExternalError(w, r, appdomain.NewError(appdomain.CodeNotFound, "campaign not found", nil))
			return
		}
		if errors.Is(err, errInvalidMarkdownWorld) {
			message := strings.TrimSpace(strings.TrimPrefix(err.Error(), errInvalidMarkdownWorld.Error()+":"))
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
	if errors.Is(err, errInvalidMarkdownWorld) {
		message := strings.TrimSpace(strings.TrimPrefix(err.Error(), errInvalidMarkdownWorld.Error()+":"))
		writeError(w, http.StatusBadRequest, message)
		return
	}
	writeError(w, http.StatusInternalServerError, "could not prepare Markdown campaign content import")
}
