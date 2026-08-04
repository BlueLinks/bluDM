package httpapi

import (
	"net/http"
	"net/url"
	"strings"

	appdomain "bludm/backend/internal/app"
)

func (s *Server) withExternalPublicOrigin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !s.cfg.MCP.OIDCEnabled {
			next.ServeHTTP(w, r)
			return
		}
		expected, err := url.Parse(s.cfg.PublicAppURL)
		if err != nil {
			writeExternalError(
				w, r, appdomain.NewError(appdomain.CodeInternal, "public origin is invalid", nil),
			)
			return
		}
		scheme := "http"
		if r.TLS != nil {
			scheme = "https"
		}
		host := r.Host
		if s.cfg.MCP.TrustForwardedHeaders {
			if forwarded := firstForwardedValue(r.Header.Get("X-Forwarded-Proto")); forwarded != "" {
				scheme = forwarded
			}
			if forwarded := firstForwardedValue(r.Header.Get("X-Forwarded-Host")); forwarded != "" {
				host = forwarded
			}
		}
		if !strings.EqualFold(scheme, expected.Scheme) ||
			!strings.EqualFold(host, expected.Host) {
			writeExternalError(
				w, r, appdomain.NewError(
					appdomain.CodeForbidden,
					"request origin does not match the configured public HTTPS origin",
					nil,
				),
			)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func firstForwardedValue(value string) string {
	first, _, _ := strings.Cut(value, ",")
	return strings.TrimSpace(first)
}
