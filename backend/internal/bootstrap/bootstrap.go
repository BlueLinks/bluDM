package bootstrap

import (
	"context"
	"errors"
	"log/slog"
	"strings"

	"bludm/backend/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

func EnsureAdmin(ctx context.Context, pool *pgxpool.Pool, cfg config.Config, logger *slog.Logger) error {
	if !cfg.LocalAuthEnabled || cfg.AdminEmail == "" {
		return nil
	}

	email := strings.TrimSpace(strings.ToLower(cfg.AdminEmail))
	if !strings.Contains(email, "@") {
		return errors.New("ADMIN_EMAIL must be a valid email address")
	}

	var hasUser bool
	if err := pool.QueryRow(ctx, `select exists(select 1 from users)`).Scan(&hasUser); err != nil {
		return err
	}
	if hasUser {
		return nil
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(cfg.AdminPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	_, err = pool.Exec(ctx, `
		insert into users (email, password_hash)
		values ($1, $2)
	`, email, string(hash))
	if err != nil {
		return err
	}

	logger.Info("bootstrap admin account created", "email", email)
	return nil
}
