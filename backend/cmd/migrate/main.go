package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"bludm/backend/internal/config"
	"bludm/backend/internal/db"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("configuration error", "error", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("database connection failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := db.EnsureSchema(ctx, pool); err != nil {
		logger.Error("database schema migration failed", "error", err)
		os.Exit(1)
	}

	logger.Info("database schema is ready")
}
