package config

import (
	"errors"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Addr            string
	DatabaseURL     string
	SessionSecret   string
	AdminEmail      string
	AdminPassword   string
	CookieSecure    bool
	SessionLifetime time.Duration
}

func Load() (Config, error) {
	_ = godotenv.Load("../.env", ".env")

	cfg := Config{
		Addr:            env("ADDR", ":8080"),
		DatabaseURL:     env("DATABASE_URL", ""),
		SessionSecret:   env("SESSION_SECRET", ""),
		AdminEmail:      env("ADMIN_EMAIL", ""),
		AdminPassword:   env("ADMIN_PASSWORD", ""),
		CookieSecure:    envBool("COOKIE_SECURE", false),
		SessionLifetime: 30 * 24 * time.Hour,
	}

	if cfg.DatabaseURL == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}
	if len(cfg.SessionSecret) < 32 {
		return Config{}, errors.New("SESSION_SECRET must be at least 32 characters")
	}
	if cfg.AdminEmail != "" && len(cfg.AdminPassword) < 12 {
		return Config{}, errors.New("ADMIN_PASSWORD must be at least 12 characters when ADMIN_EMAIL is set")
	}

	return cfg, nil
}

func env(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func envBool(key string, fallback bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}
