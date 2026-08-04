package httpapi

import (
	"net/http"
	"strings"

	"bludm/backend/internal/store"
)

func (s *Server) listOIDCLinks(w http.ResponseWriter, r *http.Request) {
	links, err := s.stores.Auth.ListOIDCSubjectLinks(
		r.Context(), currentUserIDMust(r.Context()),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list OIDC identity links")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"links": links})
}

func (s *Server) createOIDCLink(w http.ResponseWriter, r *http.Request) {
	if !s.cfg.MCP.OIDCEnabled {
		writeError(w, http.StatusNotFound, "remote OIDC is not configured")
		return
	}
	var request struct {
		Token string `json:"token"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}
	claims, err := s.resourceOIDC.verify(r.Context(), strings.TrimSpace(request.Token))
	if err != nil {
		writeError(w, http.StatusBadRequest, "OIDC token could not be verified")
		return
	}
	err = s.stores.Auth.LinkOIDCSubject(
		r.Context(), currentUserIDMust(r.Context()), s.cfg.MCP.OIDCIssuer, claims.Subject,
	)
	if err != nil {
		writeError(w, http.StatusConflict, "OIDC identity is already linked")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) deleteOIDCLink(w http.ResponseWriter, r *http.Request) {
	err := s.stores.Auth.DeleteOIDCSubjectLink(
		r.Context(), currentUserIDMust(r.Context()), r.PathValue("linkID"),
	)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "OIDC identity link not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not remove OIDC identity link")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
