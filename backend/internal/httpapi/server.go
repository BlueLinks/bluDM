package httpapi

import (
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	appdomain "bludm/backend/internal/app"
	"bludm/backend/internal/config"
	"bludm/backend/internal/mcpserver"
	"bludm/backend/internal/store"

	"github.com/jackc/pgx/v5/pgxpool"
	"gorm.io/gorm"
)

type Server struct {
	cfg             config.Config
	db              *pgxpool.Pool
	stores          *store.Stores
	app             *appdomain.Service
	mcpHandler      http.Handler
	externalLimiter requestRateLimiter
	resourceOIDC    *oidcResourceVerifier
	log             *slog.Logger
	exportCache     exportCache
}

type exportCache struct {
	mu      sync.Mutex
	entries map[string]cachedExport
}

type cachedExport struct {
	Filename  string
	Data      []byte
	CreatedAt time.Time
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
		if strings.HasPrefix(r.URL.Path, "/api/external/") {
			if _, ok := bearerToken(r); ok {
				next.ServeHTTP(w, r)
				return
			}
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

func New(cfg config.Config, pool *pgxpool.Pool, gormDB *gorm.DB, logger *slog.Logger) *Server {
	server := &Server{
		cfg:    cfg,
		db:     pool,
		stores: store.New(gormDB),
		app:    appdomain.NewService(gormDB, cfg.PublicAppURL),
		log:    logger,
		exportCache: exportCache{
			entries: map[string]cachedExport{},
		},
		externalLimiter: requestRateLimiter{windows: map[string]rateWindow{}},
		resourceOIDC: newOIDCResourceVerifier(
			cfg.MCP.OIDCEnabled, cfg.MCP.OIDCIssuer, cfg.MCP.OIDCAudience, cfg.MCP.ResourceURL,
		),
	}
	server.mcpHandler = mcpserver.NewHTTPHandler(
		server.app, logger, cfg.MCP.MaxRequestBytes, cfg.MCP.ToolExecutionTimeout,
	)
	return server
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	if err := s.db.Ping(r.Context()); err != nil {
		writeError(w, http.StatusServiceUnavailable, "database unavailable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) mcpHealth(w http.ResponseWriter, r *http.Request) {
	if err := s.db.Ping(r.Context()); err != nil {
		writeError(w, http.StatusServiceUnavailable, "database unavailable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"status": "ok", "transport": "streamable-http",
	})
}
