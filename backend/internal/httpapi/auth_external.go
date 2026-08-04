package httpapi

import (
	"context"
	"net/http"
	"net/netip"
	"strings"
	"time"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/models"
)

func (s *Server) requireExternalAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, ok := bearerToken(r)
		if !ok {
			s.writeBearerUnauthorized(w, r, "bearer token required")
			return
		}
		if !strings.HasPrefix(token, apiTokenPrefix) {
			user, principal, err := s.authenticateOIDCBearer(r, token)
			if err != nil {
				s.writeBearerUnauthorized(w, r, "invalid OIDC bearer token")
				return
			}
			ctx := appdomain.WithPrincipal(r.Context(), principal)
			ctx = context.WithValue(ctx, userContextKey{}, user)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}
		authentication, err := s.stores.Auth.AuthenticateAPIToken(r.Context(), hashToken(token))
		if err != nil {
			s.writeBearerUnauthorized(w, r, "invalid or expired bearer token")
			return
		}
		scopes, err := appdomain.ParseScopes(authentication.Token.Scopes)
		if err != nil {
			s.writeBearerUnauthorized(w, r, "token has invalid scopes")
			return
		}
		legacy := authentication.Token.AuthenticationVersion < 2 || len(scopes) == 0
		if legacy {
			scopes = appdomain.LegacyReadScopes()
		}
		principal := appdomain.Principal{
			UserID: authentication.User.ID, TokenID: authentication.Token.ID,
			AuthenticationMethod: appdomain.AuthenticationAPIToken, Scopes: scopes,
			AllowedCampaignIDs:      authentication.Token.AllowedCampaignIDs,
			CampaignRestrictionMode: authentication.Token.CampaignRestrictionMode,
			ExpiresAt:               authentication.Token.ExpiresAt, LegacyExternalCredentials: legacy,
			Audit: map[string]string{"tokenName": authentication.Token.Name},
		}
		ctx := appdomain.WithPrincipal(r.Context(), principal)
		ctx = context.WithValue(ctx, userContextKey{}, authentication.User)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func bearerToken(r *http.Request) (string, bool) {
	scheme, token, ok := strings.Cut(strings.TrimSpace(r.Header.Get("Authorization")), " ")
	if !ok || !strings.EqualFold(scheme, "Bearer") {
		return "", false
	}
	token = strings.TrimSpace(token)
	return token, token != ""
}

func (s *Server) authenticateOIDCBearer(
	r *http.Request,
	token string,
) (models.User, appdomain.Principal, error) {
	claims, err := s.resourceOIDC.verify(r.Context(), token)
	if err != nil {
		return models.User{}, appdomain.Principal{}, err
	}
	user, err := s.stores.Auth.UserByOIDCSubject(
		r.Context(), s.cfg.MCP.OIDCIssuer, claims.Subject,
	)
	if err != nil {
		return models.User{}, appdomain.Principal{}, err
	}
	principal, err := principalFromOIDCClaims(user, claims)
	return user, principal, err
}

func (s *Server) writeBearerUnauthorized(w http.ResponseWriter, r *http.Request, message string) {
	key := "auth-failure:" + requestPeerAddress(r)
	limit := s.cfg.MCP.AuthFailuresPerMinute
	if limit <= 0 {
		limit = 20
	}
	if !s.externalLimiter.allow(key, limit, time.Now()) {
		writeExternalError(w, r, &appdomain.DomainError{
			Code: appdomain.CodeRateLimited, Message: "authentication failure rate limit exceeded",
			Details: map[string]any{"class": "authentication"}, RetryAfter: 60,
		})
		return
	}
	if s.log != nil {
		s.log.WarnContext(
			r.Context(), "external authentication rejected",
			"request_id", externalRequestID(r), "method", r.Method,
			"path", r.URL.Path, "peer", requestPeerAddress(r),
		)
	}
	w.Header().Set(
		"WWW-Authenticate",
		`Bearer resource_metadata="`+s.cfg.PublicAppURL+`/.well-known/oauth-protected-resource/mcp"`,
	)
	writeExternalError(w, r, appdomain.NewError(appdomain.CodeUnauthorized, message, nil))
}

func requestPeerAddress(r *http.Request) string {
	value := strings.TrimSpace(r.RemoteAddr)
	if address, err := netip.ParseAddrPort(value); err == nil {
		return address.Addr().String()
	}
	if address, err := netip.ParseAddr(value); err == nil {
		return address.String()
	}
	return "unknown"
}
