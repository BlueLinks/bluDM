package config

import (
	"errors"
	"net"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Addr             string
	DatabaseURL      string
	SessionSecret    string
	AdminEmail       string
	AdminPassword    string
	CookieSecure     bool
	PublicAppURL     string
	LocalAuthEnabled bool
	OAuth            OAuthConfig
	SessionLifetime  time.Duration
}

type OAuthConfig struct {
	Google OAuthProviderConfig
	Apple  AppleOAuthConfig
}

type OAuthProviderConfig struct {
	ClientID     string
	ClientSecret string
}

type AppleOAuthConfig struct {
	ClientID   string
	TeamID     string
	KeyID      string
	PrivateKey string
}

func Load() (Config, error) {
	_ = godotenv.Load("../.env", ".env")

	cfg := Config{
		Addr:             env("ADDR", ":8080"),
		DatabaseURL:      DatabaseURLFromEnv(),
		SessionSecret:    env("SESSION_SECRET", ""),
		AdminEmail:       env("ADMIN_EMAIL", ""),
		AdminPassword:    env("ADMIN_PASSWORD", ""),
		CookieSecure:     envBool("COOKIE_SECURE", false),
		PublicAppURL:     strings.TrimRight(env("PUBLIC_APP_URL", "http://localhost:3000"), "/"),
		LocalAuthEnabled: envBool("LOCAL_AUTH_ENABLED", true),
		OAuth: OAuthConfig{
			Google: OAuthProviderConfig{
				ClientID:     env("OAUTH_GOOGLE_CLIENT_ID", ""),
				ClientSecret: env("OAUTH_GOOGLE_CLIENT_SECRET", ""),
			},
			Apple: AppleOAuthConfig{
				ClientID:   env("OAUTH_APPLE_CLIENT_ID", ""),
				TeamID:     env("OAUTH_APPLE_TEAM_ID", ""),
				KeyID:      env("OAUTH_APPLE_KEY_ID", ""),
				PrivateKey: env("OAUTH_APPLE_PRIVATE_KEY", ""),
			},
		},
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

func DatabaseURLFromEnv() string {
	if value := env("DATABASE_URL", ""); value != "" {
		return value
	}

	user := env("DATABASE_USER", env("POSTGRES_USER", ""))
	password := env("DATABASE_PASSWORD", env("POSTGRES_PASSWORD", ""))
	host := env("DATABASE_HOST", "postgres")
	port := env("DATABASE_PORT", "5432")
	name := env("DATABASE_NAME", env("POSTGRES_DB", ""))
	sslMode := env("DATABASE_SSLMODE", "disable")
	if user == "" || host == "" || name == "" {
		return ""
	}

	databaseURL := url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(user, password),
		Host:   net.JoinHostPort(host, port),
		Path:   name,
	}
	query := databaseURL.Query()
	query.Set("sslmode", sslMode)
	databaseURL.RawQuery = query.Encode()
	return databaseURL.String()
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
