package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"bludm/backend/internal/bootstrap"
	"bludm/backend/internal/config"
	"bludm/backend/internal/db"
	"bludm/backend/internal/httpapi"
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

	gormDB, err := db.ConnectGORM(cfg.DatabaseURL)
	if err != nil {
		logger.Error("gorm database connection failed", "error", err)
		os.Exit(1)
	}

	if err := db.EnsureSchema(ctx, gormDB, pool); err != nil {
		logger.Error("database schema check failed", "error", err)
		os.Exit(1)
	}

	if err := bootstrap.EnsureAdmin(ctx, pool, cfg, logger); err != nil {
		logger.Error("admin bootstrap failed", "error", err)
		os.Exit(1)
	}

	api := httpapi.New(cfg, pool, gormDB, logger)
	server := &http.Server{
		Addr:              cfg.Addr,
		Handler:           api.Routes(),
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	go func() {
		logger.Info("server listening", "addr", cfg.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("server shutdown failed", "error", err)
		os.Exit(1)
	}
}
