package httpapi

import (
	"net/http"
	"strings"
	"time"

	"bludm/backend/internal/store"
)

const (
	apiTokenPrefix       = "bludm_v1_" // #nosec G101 -- Public token-format marker, not a credential.
	defaultAPITokenDays  = 90
	maximumAPITokenDays  = 365
	displayedTokenLength = 20
)

type createAPITokenRequest struct {
	Name       string `json:"name"`
	ExpiryDays int    `json:"expiryDays"`
}

func (s *Server) listAPITokens(w http.ResponseWriter, r *http.Request) {
	tokens, err := s.stores.Auth.ListAPITokens(r.Context(), currentUserIDMust(r.Context()))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list API tokens")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"tokens": tokens})
}

func (s *Server) createAPIToken(w http.ResponseWriter, r *http.Request) {
	var req createAPITokenRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" || len(req.Name) > 80 {
		writeError(w, http.StatusBadRequest, "name must be 1-80 characters")
		return
	}
	if req.ExpiryDays == 0 {
		req.ExpiryDays = defaultAPITokenDays
	}
	if req.ExpiryDays < 1 || req.ExpiryDays > maximumAPITokenDays {
		writeError(w, http.StatusBadRequest, "expiryDays must be between 1 and 365")
		return
	}

	random, err := randomToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create API token")
		return
	}
	secret := apiTokenPrefix + random
	expiresAt := time.Now().Add(time.Duration(req.ExpiryDays) * 24 * time.Hour)
	token, err := s.stores.Auth.CreateAPIToken(
		r.Context(),
		currentUserIDMust(r.Context()),
		req.Name,
		hashToken(secret),
		secret[:displayedTokenLength],
		&expiresAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create API token")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"token": token, "secret": secret})
}

func (s *Server) deleteAPIToken(w http.ResponseWriter, r *http.Request) {
	err := s.stores.Auth.DeleteAPIToken(
		r.Context(),
		currentUserIDMust(r.Context()),
		strings.TrimSpace(r.PathValue("tokenID")),
	)
	if store.IsNotFound(err) {
		writeError(w, http.StatusNotFound, "API token not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not revoke API token")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
