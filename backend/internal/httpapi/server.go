package httpapi

import (
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"bludm/backend/internal/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Server struct {
	cfg config.Config
	db  *pgxpool.Pool
	log *slog.Logger
}

func (s *Server) withCSRF(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}
		if strings.HasPrefix(r.URL.Path, "/api/auth/") && strings.HasSuffix(r.URL.Path, "/callback") {
			next.ServeHTTP(w, r)
			return
		}
		if !s.sameOrigin(r, r.Header.Get("Origin")) && !s.sameOrigin(r, r.Header.Get("Referer")) {
			writeError(w, http.StatusForbidden, "request origin is not allowed")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) sameOrigin(r *http.Request, raw string) bool {
	if raw == "" {
		return true
	}
	origin, err := url.Parse(raw)
	if err != nil {
		return false
	}
	if strings.EqualFold(origin.Host, r.Host) {
		return true
	}
	expected, err := url.Parse(s.cfg.PublicAppURL)
	if err != nil {
		return false
	}
	return strings.EqualFold(origin.Scheme, expected.Scheme) && strings.EqualFold(origin.Host, expected.Host)
}

func New(cfg config.Config, pool *pgxpool.Pool, logger *slog.Logger) *Server {
	return &Server{cfg: cfg, db: pool, log: logger}
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	if err := s.db.Ping(r.Context()); err != nil {
		writeError(w, http.StatusServiceUnavailable, "database unavailable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
