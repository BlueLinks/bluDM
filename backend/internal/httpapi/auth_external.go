package httpapi

import (
	"context"
	"net/http"
	"strings"
)

func (s *Server) requireExternalAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, ok := bearerToken(r)
		if !ok {
			writeError(w, http.StatusUnauthorized, "bearer token required")
			return
		}
		user, err := s.stores.Auth.UserByAPITokenHash(r.Context(), hashToken(token))
		if err != nil {
			writeError(w, http.StatusUnauthorized, "invalid or expired bearer token")
			return
		}
		ctx := context.WithValue(r.Context(), userContextKey{}, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func bearerToken(r *http.Request) (string, bool) {
	scheme, token, ok := strings.Cut(strings.TrimSpace(r.Header.Get("Authorization")), " ")
	if !ok || !strings.EqualFold(scheme, "Bearer") {
		return "", false
	}
	token = strings.TrimSpace(token)
	return token, strings.HasPrefix(token, apiTokenPrefix)
}
