package httpapi

import (
	"log/slog"
	"net/http"

	"bludm/backend/internal/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Server struct {
	cfg config.Config
	db  *pgxpool.Pool
	log *slog.Logger
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
